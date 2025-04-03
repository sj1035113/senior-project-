import asyncio
import json
import sys, os
from pathlib import Path

# 匯入 SuperGlue 模型
sys.path.append(os.path.join(os.path.dirname(__file__), 'module'))
from module.superglue import init_model, run_matching
from module.websocket import connect_and_handshake, listen_one

requesting_coordinate = True
matching, device = init_model()

# 狀態變數：是否要定時傳送 request_coordinate
requesting_coordinate = True

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
    img0_path = r"D:\vscode\simu_db\1\b\match_test_respiberry.jpg"
    img1_path = r"D:\vscode\simu_db\1\b\match_test_cesium.png"
    output_dir = Path(r"D:\vscode\simu_db\1\c")

    run_matching(matching, device, img0_path, img1_path,
                 enable_viz=True, top_k='all', output_dir=output_dir)

async def run_pnp():
    """
    這是執行 PnP 計算的假函式，你可以改成真實版本。
    """
    print("執行 PnP 計算相機座標...")
    await asyncio.sleep(1)  # 模擬處理時間
    print("相機座標計算完成")

async def handle_message(result: str, websocket):
    """
    根據伺服器回傳的 notification 做處理
    """
    global requesting_coordinate

    match result:
        case "has_coordinate":
            print("有座標，等待下一輪")

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
            print("✅ 匹配流程完成（暫時結束）")
            raise SystemExit("測試完畢")
        


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
    asyncio.run(main())
