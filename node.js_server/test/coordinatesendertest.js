const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { sendCoordinates } = require(path.join(__dirname, "..", "modules", "coordinateSender.js")); // 引用模組

const HTTP_PORT = 3000;      // HTTP 伺服器的埠號（可供其他 API 使用）
const WS_PORT = 8080;        // WebSocket 伺服器的埠號
const UPLOAD_PORT = 8081;    // 圖片上傳用的 HTTP 伺服器埠號（與 WebSocket 分開）

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('HTTP Server is running');
});

// Modified: 新增圖片上傳路由(需加入)
app.post('/upload', (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).send("No image provided");
  }
  
  // 移除 data URL 的前綴
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const filename = `screenshot_${Date.now()}.png`;
  const uploadDir = path.join(__dirname, "uploads");

  // 確保上傳目錄存在
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);

  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error("Error saving image:", err);
      return res.status(500).send("Error saving image");
    }
    res.json({ message: "Image saved", filename });
  });
});

// 建立 HTTP 伺服器供 API 使用(需加入)
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP Server running on http://localhost:${HTTP_PORT}`);
});

// 建立另一個 HTTP 伺服器專門處理圖片上傳(需加入)
const uploadServer = http.createServer(app);
uploadServer.listen(UPLOAD_PORT, () => {
  console.log(`Upload Server running on http://localhost:${UPLOAD_PORT}`);
});

// 建立 WebSocket 伺服器
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`WebSocket Server running on ws://localhost:${WS_PORT}`);

// 監聽新的 WebSocket 連線(需加入)
wss.on('connection', (ws, req) => {
  console.log('✅ New client connected');

  // 監聽客戶端傳來的訊息
  ws.on('message', (message) => {
    const messageStr = message.toString();
    console.log('Received message:', messageStr);

    try {
      const data = JSON.parse(messageStr);

      // 判斷是否為 Cesium 客戶端，傳送座標並設定旗標
      if (data.identify && data.identify.toLowerCase() === 'cesium') {
        console.log('🌐 Cesium client identified, sending coordinates...');
        ws.isCesium = true;  // Modified: 設定旗標
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
