import asyncio
import json
from module.websocket import connect_and_handshake, listen_one

def process_message(message: str):
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        print("訊息格式錯誤，無法解析")
        return

    # 外層根據 type 來判斷
    match data.get("type"):
        case "notification":
            # 內層根據 command 來判斷
            match data.get("command"):
                case "has_coordinate":
                    print("收到通知: has_coordinate")
                case "another_command":
                    print("收到通知: another_command")
                case other:
                    print(f"收到未知通知命令: {other}")
        case other:
            print(f"收到非通知類型訊息: {other}")

async def main():
    uri = "ws://localhost:8080"
    # 非同步初始化連線與握手
    websocket = await connect_and_handshake(uri)
    try:
        while True:
            # 非同步監聽一次訊息
            message = await listen_one(websocket)
            print(f"收到訊息：{message}")
            # 將收到的訊息交由同步函式處理
            process_message(message)
    except KeyboardInterrupt:
        print("手動停止監聽。")
    finally:
        # 非同步關閉連線
        await websocket.close()

if __name__ == '__main__':
    asyncio.run(main())
