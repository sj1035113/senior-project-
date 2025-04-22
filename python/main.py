import asyncio
import json
import sys, os
from pathlib import Path

# 匯入 SuperGlue 模型
sys.path.append(os.path.join(os.path.dirname(__file__), 'module'))
from module.superglue import init_model, run_matching
from module.websocket import connect_and_handshake, listen_one
from module.pnp import run_solvepnp_from_json



requesting_coordinate = True
matching, device = init_model()

# 狀態變數：是否要定時傳送 request_coordinate
requesting_coordinate = True
 #重置，初始化
def reset_serial_number():
    execution_path = Path(__file__).resolve().parent.parent / "execution.json"
    with open(execution_path, "w", encoding="utf-8") as f:
        json.dump({"serial_numbers": 1}, f, indent=4, ensure_ascii=False)
    print("🔄 已將 serial_number 重置為 1")


def process_message(message: str):
    """
    解析 JSON 格式訊息並回傳代表命令的字串。
    期望格式：{"notification": "xxx"}
    """
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        print("訊息格式錯誤，無法解析")
        return None

    notification = data.get("notification")
    if notification:
        print(f"收到通知: {notification}")
        return notification
    else:
        print("訊息中未包含 notification 欄位")
        return None

async def send_request_coordinate(websocket):
    """
    持續每 3 秒傳送一次 request_coordinate
    """
    global requesting_coordinate
    while True:
        if requesting_coordinate:
            request_msg = json.dumps({"action": "request_json"})
            await websocket.send(request_msg)
            print(f"送出請求訊息：{request_msg}")
        await asyncio.sleep(3)

def run_superglue(matching, device):
    # 1. 讀取 execution.json
    execution_path = Path(__file__).resolve().parent.parent / "execution.json"
    with open(execution_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    serial_number = str(config['serial_numbers'])  # 確保轉成字串

    # 2. 根據 serial_number 決定路徑
    base_path = Path(__file__).resolve().parent.parent / "data_base" / serial_number
    input_dir = base_path / "b"
    output_dir = base_path / "c"

    img0_path = input_dir / "respiberry.jpg"
    img1_path = input_dir / "cesium.png"

    run_matching(matching, device, img0_path, img1_path,
                 enable_viz=True, top_k='all', output_dir=output_dir)

async def handle_message(result: str, websocket):
    """
    根據伺服器回傳的 notification 做處理
    """
    global requesting_coordinate

    match result:
        case "has_coordinate":
            print("有座標，等待下一輪")
            execution_path = Path(__file__).resolve().parent.parent / "execution.json"
            with open(execution_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            config["serial_numbers"] += 1
            with open(execution_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=4, ensure_ascii=False)

            print(f"已更新 serial_number 為 {config['serial_numbers']}")
            requesting_coordinate = True

        case "no_coordinate":
            print("沒有座標，請求 Cesium 畫面")
            requesting_coordinate = False  # 暫停 request
            picture_msg = json.dumps({"action": "get_cesium_picture"})
            await websocket.send(picture_msg)
            print(f"送出圖片請求訊息：{picture_msg}")

        case "got_cesium_picture":
            print("收到 got_cesium_picture，開始匹配")
            run_superglue(matching, device)

            # SuperGlue 完成後，送出座標請求
            request_msg = json.dumps({"action": "request_coordinate"})
            await websocket.send(request_msg)
            print(f"✅ SuperGlue 匹配完成，重新送出請求：{request_msg}")

        case "got_match_world_coordinates":
            print("開始進行pnp配對")
            execution_path = Path(__file__).resolve().parent.parent / "execution.json"

            with open(execution_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            serial_number = str(config["serial_numbers"])

            base_path = Path(__file__).resolve().parent.parent
            match_json_path = base_path / "data_base" / serial_number / "c" / "respiberry_cesium_matches.json"
            with open(match_json_path, "r", encoding="utf-8") as f:
                match_data = json.load(f)

            # 降低所有點的 height 值 20 公尺
            for pt in match_data.get("points", []):
                pt["height"] -= 20
            with open(match_json_path, "w", encoding="utf-8") as f:
                json.dump(match_data, f, indent=4, ensure_ascii=False)
            lat, lon, height = run_solvepnp_from_json(str(match_json_path))
            print(f"相機 WGS84 位置：緯度 = {lat:.6f}, 經度 = {lon:.6f}, 高度 = {height:.2f} m")

            # === 寫入 flight_information.json ===
            flight_info_path = base_path / "data_base" / serial_number / "a" / "flight_information.json"

            # 嘗試讀取 flight_information.json
            if flight_info_path.exists():
                with open(flight_info_path, "r", encoding="utf-8") as f:
                    flight_data = json.load(f)
            else:
                flight_data = {}

            # 更新三維座標與標記為計算產生
            flight_data["latitude"] = lat
            flight_data["longitude"] = lon
            flight_data["height"] = height
            flight_data["calculated"] = True  # 標記這是由 PnP 算出來的結果

            with open(flight_info_path, "w", encoding="utf-8") as f:
                json.dump(flight_data, f, indent=4, ensure_ascii=False)

            print(f"📝 已將定位結果寫入 {flight_info_path}")

            # === 更新 serial_number 並寫回 execution.json ===
            config["serial_numbers"] += 1
            with open(execution_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=4, ensure_ascii=False)

            print(f"🔁 更新 serial_number 為 {config['serial_numbers']}，準備下一輪")
            requesting_coordinate = True  # 重新啟動 request 流程
        case None:
            print("未能解析的訊息，略過")

        case other:
            print(f"收到未知通知: {other}")

async def main():
    uri = "ws://localhost:8080"
    websocket = await connect_and_handshake(uri)
    try:
        # 啟動定時 request_coordinate 任務
        coordinate_task = asyncio.create_task(send_request_coordinate(websocket))

        while True:
            # 監聽伺服器回應
            message = await listen_one(websocket)
            print(f"收到訊息：{message}")
            result = process_message(message)
            await handle_message(result, websocket)

    except KeyboardInterrupt:
        print("手動停止程式。")
    finally:
        coordinate_task.cancel()
        await websocket.close()

if __name__ == '__main__':
    #reset_serial_number()
    asyncio.run(main())
