// main.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { sendCoordinates } = require('D:\\vscode\\D-project\\formal\\node.js_server\\modules\\coordinateSender.js'); // 引用模組

const HTTP_PORT = 3000;
const WS_PORT = 8080;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('HTTP Server is running');
});

// 建立 HTTP 伺服器
const server = http.createServer(app);
server.listen(HTTP_PORT, () => {
  console.log(`HTTP Server running on http://localhost:${HTTP_PORT}`);
});

// 建立 WebSocket 伺服器
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`WebSocket Server running on ws://localhost:${WS_PORT}`);

// 監聽新的 WebSocket 連線
wss.on('connection', (ws, req) => {
  console.log('✅ New client connected');

  // 發送歡迎訊息
  ws.send(JSON.stringify({ message: 'Welcome to the WebSocket server!' }));

  // 監聽客戶端傳來的訊息
  ws.on('message', (message) => {
    const messageStr = message.toString();
    console.log('Received message:', messageStr);

    try {
      const data = JSON.parse(messageStr);

      // 判斷是否為 Cesium 客戶端
      if (data.identify && data.identify.toLowerCase() === 'cesium') {
        console.log('🌐 Cesium client identified, sending coordinates...');
        // 呼叫模組核心功能，送出經緯度座標
        sendCoordinates(ws);
      } else {
        console.log('收到非 Cesium 客戶端的訊息或未提供 identify');
      }
    } catch (error) {
      console.error('❌ Error parsing JSON message:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});
