const path = require('path');
const http = require('http');
const WebSocket = require('ws');  // 使用 ws 模組
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const sendCoordinates  = require(path.join(__dirname, "modules", "coordinateSender.js")); // 引用模組
const jsonHandler = require(path.join(__dirname, "modules", "jsonhandler.js"));
const HTTP_PORT = 3000;      // HTTP 伺服器的埠號（可供其他 API 使用）
const WS_PORT = 8080;        // WebSocket 伺服器的埠號
const UPLOAD_PORT = 8081;    // 圖片上傳用的 HTTP 伺服器埠號（與 WebSocket 分開）

// 建立 HTTP 伺服器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server is running...\n');
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});

// 在同一個 HTTP 伺服器上建立 WebSocket 伺服器
const wss = new WebSocket.Server({ server });
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * 🟢 監聽新的 WebSocket 連線
 */
wss.on('connection', (ws, req) => {
  console.log('✅ New client connected');

  // 發送歡迎訊息
  ws.send(JSON.stringify({ message: 'Welcome to the WebSocket server!' }));

  // 監聽客戶端傳來的訊息
  ws.on('message', (message) => {
    const messageStr = message.toString();
    console.log('Received message:', messageStr);
    
    try {
      const data = JSON.parse(message); // 解析 JSON 訊息

      // Modified: 如果有 identify 屬性則進行後續處理
      if (data.identify) {
        if (data.identify.toLowerCase() === 'python') {
          ws.pythonws = true;  // 標記此連線為 Python 客戶端
          console.log('🐍 Python client connected, establishing pythonws...');
          handlePythonClient(ws);  // 設定 Python 客戶端的專屬監聽器
        } else {
          console.log('Non-python client connected with identify:', data.identify);
          handleDefaultClient(ws); // 設定一般客戶端的監聽器
        }
      } else {
        // Modified: 如果沒有 identify 屬性且該客戶端未被註冊，則輸出提示訊息
        if (!ws.pythonws) {
          console.log("有來亂的");
        }
      }
    } catch (error) {
      console.error('❌ Error parsing JSON message:', error);
    }
  });

  // 監聽客戶端斷線
  ws.on('close', () => {
    //console.log("❌ Client disconnected");
  });
});


app.get('/', (req, res) => {
  res.send('HTTP Server is running');
});

// 圖片上傳路由
app.post('/upload', (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).send("No image provided");
  }
  
  // 移除 data URL 前綴
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const filename = 'screenshot_${Date.now()}.png';
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

// 建立 HTTP 伺服器供 API 使用 (API 埠：HTTP_PORT)
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP Server running on http://localhost:${HTTP_PORT}`);
});

// 建立另一個 HTTP 伺服器專門處理圖片上傳 (上傳埠：UPLOAD_PORT)
const uploadServer = http.createServer(app);
uploadServer.listen(UPLOAD_PORT, () => {
  console.log(`Upload Server running on http://localhost:${UPLOAD_PORT}`);
});

/**
 * 🔹 處理 Python 客戶端的 WebSocket 連線
 */
function handlePythonClient(ws) {
  ws.on('message', (message) => {
    const messageStr = message.toString();
    console.log("🐍 Python client message:", messageStr);
    try {
      const data = JSON.parse(message);
      if (data.action === "request_json") {
        // 立即處理 JSON 檔案並回應
        jsonHandler.processJsonFile("D:\\vscode\\D-project\\formal\\data_base\\test\\test.json", ws);
      }
      else if (data.action === "get_cesium_picture"){
        console.log("finish")
      }
      else {
        ws.send(JSON.stringify({ event: "error", message: "未知的指令" }));
      }
    } catch (error) {
      console.error("❌ Python 客戶端 JSON 解析錯誤:", error);
    }
  });
}

/**
 * 🔹 處理一般客戶端的 WebSocket 連線
 */
function handleDefaultClient(ws) {
  ws.on('message', (message) => {
    const messageStr = message.toString();
    console.log("💻 Default client message:", messageStr);
    ws.send(JSON.stringify({ event: "response", message: "這是一般 WebSocket 客戶端的回應。" }));
  });
}


