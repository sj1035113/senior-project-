const path = require('path');
const http = require('http');
const WebSocket = require('ws');  // 使用 ws 模組
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const jsonHandler = require(path.join(__dirname, "modules", "jsonhandler.js"));
const coordinateSender  = require(path.join(__dirname, "modules", "coordinateSender.js")); // 引用模組


// 宣告伺服器port腳
const HTTP_PORT = 3000;      // HTTP 伺服器的埠號（可供其他 API 使用）
const WS_PORT = 8080;        // WebSocket 伺服器的埠號
const UPLOAD_PORT = 8081;    // 圖片上傳用的 HTTP 伺服器埠號（與 WebSocket 分開）

// --------------------- API 伺服器 (HTTP_PORT) ---------------------
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json({ limit: '50mb' }));

apiApp.get('/', (req, res) => {
  res.send('HTTP Server is running');
});

const apiServer = http.createServer(apiApp);
apiServer.listen(HTTP_PORT, () => {
  console.log(`HTTP Server running on http://localhost:${HTTP_PORT}`);
});

// --------------------- 圖片上傳伺服器 (UPLOAD_PORT) ---------------------
const uploadApp = express();
uploadApp.use(cors());
uploadApp.use(express.json({ limit: '50mb' }));

uploadApp.post('/upload', (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).send("No image provided");
  }
  
  // 移除 data URL 前綴
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const filename = `screenshot_${Date.now()}.png`;
  const uploadDir = path.join("D:\\vscode\\D-project\\test\\SuperGluePretrainedNetwork-master\\test_file\\test_photo");
  //console.log('hello world'); // 取得 base64 長度
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const filePath = path.join(uploadDir, filename);
  //以下
  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error("Error saving image:", err);
      return res.status(500).send("Error saving image");
    }
    res.json({ message: "Image saved", filename });
  });
  console.log(`Image uploaded and saved as ${filePath}`);
  // 以上
});

const uploadServer = http.createServer(uploadApp);
uploadServer.listen(UPLOAD_PORT, () => {
  console.log(`Upload Server running on http://localhost:${UPLOAD_PORT}`);
});

// 建立 websocket HTTP 伺服器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server is running...\n');
});

server.listen(WS_PORT, () => {
  console.log(`🚀 Server is listening on port ${WS_PORT}`);
});

// 在同一個 HTTP 伺服器上建立 WebSocket 伺服器
const wss = new WebSocket.Server({ server });

/**
 * 🟢 監聽新的 WebSocket 連線
 */
wss.on('connection', (ws, req) => {
  console.log('✅ New client connected');
  console.log(`👥 目前連線的客戶端數量: ${wss.clients.size}`);

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
        }
        else if (data.identify.toLowerCase() === 'cesium') {
          ws.cesiumws = true;  // 標記此連線為cesium客戶端
          console.log('Cesium client connected, establishing cesiumws...');
          handleCesiumClient(ws);  // 設定 Cesium 客戶端的監聽器
        }
        else {
          console.log('Non-python client connected with identify:', data.identify);
          handleDefaultClient(ws); // 設定一般客戶端的監聽器
        }
      } else {
        // Modified: 如果沒有 identify 屬性且該客戶端未被註冊，則輸出提示訊息
        if (!ws.pythonws && !ws.cesiumws) {
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
        console.log("test")
        jsonHandler.processJsonFile(path.join(__dirname, "..", "data_base", "test", "test.json"), ws);
      }
      else if (data.action === "get_cesium_picture"){
        console.log("🔍 搜尋所有 WebSocket 客戶端以找到 Cesium 客戶端...");

        let cesiumWs = null;

        // 遍歷所有已連接的 WebSocket 客戶端
        wss.clients.forEach((client) => {
          if (client.cesiumws === true && client.readyState === WebSocket.OPEN) {
            cesiumWs = client; // 找到 Cesium WebSocket 客戶端
          }
        });

        if (cesiumWs) {
          console.log("✅ 找到 Cesium 客戶端，傳送座標...");
          coordinateSender.sendCoordinates(cesiumWs);
        } else {
          console.log("❌ 沒有找到 Cesium 客戶端，請確認 Cesium 是否已連接");
        }

      }
      else if (data.action === "request_coordinate") {
        console.log("📡 收到 Python 的 request_coordinate 訊息，準備搜尋 Cesium 客戶端並傳送座標要求...");
      
        let cesiumWs = null;
      
        // 遍歷所有 WebSocket 客戶端
        wss.clients.forEach((client) => {
          if (client.cesiumws === true && client.readyState === WebSocket.OPEN) {
            cesiumWs = client;
          }
        });
      
        if (cesiumWs) {
          console.log("✅ 找到 Cesium 客戶端，傳送 action: send_Coordinates");
          cesiumWs.send(JSON.stringify({
            action: "send_Coordinates"
          }));
        } else {
          console.log("❌ 找不到任何 Cesium 客戶端，請確認是否已連接");
        }
      }
      // 加入else if  叫main.py執行superglue
      else {
        ws.send(JSON.stringify({ event: "error", message: "未知的指令" }));
      }
    } catch (error) {
      console.error("❌ Python 客戶端 JSON 解析錯誤:", error);
    }
  });
}

/**
 * 🔹 處理cesium的 WebSocket 連線
 */
function handleCesiumClient(ws) {
  console.log("開啟 cesium 監聽器");
  
  ws.on('message', (message) => {
    const messageStr = message.toString();
    console.log("💻 : cesium client message:", messageStr);
  
    try {
      const data = JSON.parse(messageStr);
  
      if (data.action === "upload_success") {
        console.log("✅ 收到來自 Cesium 的上傳成功通知！");
      
        // 🔁 遍歷所有連線中的 client
        wss.clients.forEach((client) => {
          // 找出已標記為 Python client 且連線正常的
          if (client.pythonws === true && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              notification: "got_cesium_picture",
            }));
            console.log("📤 已通知 Python 客戶端：got_cesium_picture");
          }
        });
      } else {
        console.log("⚠️ 收到未知 action:", data.action);
      }
  
    } catch (error) {
      console.error("❌ JSON 解析錯誤：", error);
    }
  });
  
  ws.on('close', () => {
    console.log("❌ : cesium client connection closed");
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


