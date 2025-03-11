# 在 module/websocket.py 中
import asyncio
import websockets

async def connect_and_handshake(uri: str) -> websockets.WebSocketClientProtocol:
    websocket = await websockets.connect(uri)
    # 傳送握手訊息
    identify_msg = '{"identify": "python"}'
    await websocket.send(identify_msg)
    print(f"傳送 identify 訊息: {identify_msg}")
    print("握手成功，開始進行其他操作...")
    return websocket

async def listen_one(websocket: websockets.WebSocketClientProtocol) -> str:
    """
    等待一次訊息並返回該訊息
    """
    try:
        message = await websocket.recv()
        return message
    except websockets.ConnectionClosed:
        print("連線已關閉")
        return ""