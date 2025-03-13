import asyncio
import json
from module.websocket import connect_and_handshake, listen_one

def process_message(message: str):
    """
    解析 JSON 格式訊息並判斷是否含有座標。
    若收到 "has_coordinate"，回傳 True；
    若收到 "no_coordinate"，回傳 False；
    其他情況回傳 None。
    """
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        print("訊息格式錯誤，無法解析")
        return None

    match data.get("type"):
        case "notification":
            match data.get("command"):
                case "has_coordinate":
                    print("收到通知: has_coordinate")
                    return True
                case "no_coordinate":
                    print("收到通知: no_coordinate")
                    return False
                case other:
                    print(f"收到未知通知命令: {other}")
                    return None
        case other:
            print(f"收到非通知類型訊息: {other}")
            return None

async def send_request_periodically(websocket):
    """
    每三秒傳送一次包含 action=request_json 的訊息。
    """
    while True:
        await asyncio.sleep(3)
        request_msg = json.dumps({"action": "request_json"})
        await websocket.send(request_msg)
        print(f"送出請求訊息：{request_msg}")

async def main():
    uri = "ws://localhost:8080"
    # 非同步初始化連線與握手
    websocket = await connect_and_handshake(uri)
    try:
        # 建立一個背景任務用於每三秒傳送請求
        send_task = asyncio.create_task(send_request_periodically(websocket))
        while True:
            # 非同步監聽一次訊息
            message = await listen_one(websocket)
            print(f"收到訊息：{message}")
            # 將收到的訊息交由 process_message() 處理
            result = process_message(message)
            # 若判斷為無座標則停止傳送 request_json 並改傳 get_cesium_picture
            if result is False:
                print("沒有座標，停止定時請求並傳送 get_cesium_picture")
                send_task.cancel()
                picture_msg = json.dumps({"action": "get_cesium_picture"})
                await websocket.send(picture_msg)
                print(f"送出圖片請求訊息：{picture_msg}")
                break
    except KeyboardInterrupt:
        print("手動停止監聽。")
    finally:
        if not send_task.cancelled():
            send_task.cancel()
        await websocket.close()

if __name__ == '__main__':
    asyncio.run(main())
