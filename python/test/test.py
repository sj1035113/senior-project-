import asyncio
import websockets
import asyncio
import json
import websockets

async def communicate():
    uri = "ws://localhost:8080"
    async with websockets.connect(uri) as websocket:
        # 一建立連線就發送 identify 訊息
        identify_msg = json.dumps({"identify": "python"})
        await websocket.send(identify_msg)
        print(f"傳送 identify 訊息: {identify_msg}")

        # 等待伺服器發來的歡迎訊息
        welcome = await websocket.recv()
        print(f"收到伺服器訊息: {welcome}")

        # 等待伺服器回應
        response = await websocket.recv()
        print(f"收到伺服器回應: {response}")

        # 進行其他雙向通訊：發送另一則訊息
        another_msg = "Python 再次發送訊息。"
        # await websocket.send(another_msg)
        # print(f"傳送訊息: {another_msg}")

        response = await websocket.recv()
        print(f"收到伺服器回應: {response}")
        print("hello world")

asyncio.run(communicate())
