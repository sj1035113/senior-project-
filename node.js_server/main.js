const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');
const triggerPhoto = require("./modules/trigger_photo.js");
const { waitForFile } = require('./modules/waitForFile');

// 模組引入
const jsonHandler = require(path.join(__dirname, "modules", "jsonhandler.js"));
const coordinateSender = require(path.join(__dirname, "modules", "coordinateSender.js"));

// Port 設定
const HTTP_PORT = 3000;
const WS_PORT = 8080;
const UPLOAD_PORT = 8081;
const JSON_SERVER_PORT = 5000;

// -------------------- HTTP API Server (HTTP_PORT) --------------------
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json({ limit: '50mb' }));

apiApp.get('/', (req, res) => {
  res.send('HTTP Server is running');
});

const apiServer = http.createServer(apiApp);
apiServer.listen(HTTP_PORT, () => {
  console.log(`🌐 HTTP Server running on http://localhost:${HTTP_PORT}`);
});

// -------------------- Upload Server (UPLOAD_PORT) --------------------
const uploadApp = express();
uploadApp.use(cors());
uploadApp.use(express.json({ limit: '50mb' }));

uploadApp.post('/upload', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).send("No image provided");
  }

  const executionPath = path.join(__dirname, '..', 'execution.json');
  let serialNumber = null;

  try {
    const executionData = JSON.parse(fs.readFileSync(executionPath, 'utf8'));
    serialNumber = executionData.serial_numbers;
    if (!serialNumber) {
      return res.status(500).send("serial_numbers not found in execution.json");
    }
  } catch (err) {
    console.error("Error reading execution.json:", err);
    return res.status(500).send("Failed to read execution.json");
  }

  const baseFolder = path.join(__dirname, '..', 'data_base');
  const uploadDir = path.join(baseFolder, String(serialNumber), 'b');

  // Buffer directory one level above this server directory
  const bufferDir = path.join(__dirname, '..', 'buffer');
  if (!fs.existsSync(bufferDir)) {
    fs.mkdirSync(bufferDir, { recursive: true });
  }

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const filename = `cesium.png`;
  const filePath = path.join(uploadDir, filename);

  // Temporary buffer file path using serial number
  const bufferPath = path.join(bufferDir, `${serialNumber}.png`);
  fs.writeFileSync(bufferPath, base64Data, 'base64');

  const exists = await waitForFile(bufferPath, 5000);
  if (!exists) {
    console.error('Buffered file not found:', bufferPath);
    return res.status(500).send('Buffer write failed');
  }

  fs.renameSync(bufferPath, filePath);

  console.log(`🖼️ Image uploaded and saved as ${filePath}`);
  res.json({ message: 'Image saved', filename });
});

const uploadServer = http.createServer(uploadApp);
uploadServer.listen(UPLOAD_PORT, () => {
  console.log(`🖼️ Upload Server running on http://localhost:${UPLOAD_PORT}`);
});

// -------------------- WebSocket Server (WS_PORT) --------------------
const wsHttpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server is running...\n');
});

wsHttpServer.listen(WS_PORT, () => {
  console.log(`🔌 WebSocket Server listening on port ${WS_PORT}`);
});

const wss = new WebSocket.Server({ server: wsHttpServer });

// -------------------- JSON Upload & Trigger Server (JSON_SERVER_PORT) --------------------
let takePhotoFlag = false;
const jsonApp = express();
jsonApp.use(bodyParser.json({ limit: '20mb' }));

jsonApp.get("/", (req, res) => {
  res.send("📡 JS JSON Server running");
});

jsonApp.get("/need_photo", (req, res) => {
  res.json({ take_photo: takePhotoFlag });
  takePhotoFlag = false;
});

jsonApp.post("/trigger_photo", (req, res) => {
  takePhotoFlag = true;
  res.json({ status: "Flag set to TRUE" });
});

jsonApp.post("/upload", async (req, res) => {
  const jsonData = req.body;

  const hasCoordinate = jsonData.coordinates && jsonData.coordinates.latitude != null && jsonData.coordinates.longitude != null;
  if (!hasCoordinate && jsonData.photo) {
    wss.clients.forEach((client) => {
      if (client.cesiumws === true && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ action: "no_gps_photo", photo: jsonData.photo }));
      }
    });
  }

  // 讀取 execution serial number
  const executionPath = path.join(__dirname, '..', 'execution.json');
  let serialNumber = null;

  try {
    const executionData = JSON.parse(fs.readFileSync(executionPath, 'utf8'));
    serialNumber = executionData.serial_numbers;
    if (!serialNumber) {
      return res.status(500).send('serial_numbers not found in execution.json');
    }
  } catch (err) {
    console.error('Error reading execution.json:', err);
    return res.status(500).send('Failed to read execution.json');
  }

  // 緩衝資料夾
  const bufferDir = path.join(__dirname, '..', 'buffer');
  if (!fs.existsSync(bufferDir)) fs.mkdirSync(bufferDir, { recursive: true });

  const bufferPath = path.join(bufferDir, `${serialNumber}.json`);
  fs.writeFileSync(bufferPath, JSON.stringify(jsonData, null, 2));

  const found = await waitForFile(bufferPath, 5000);
  if (!found) {
    console.error('Buffered file not found:', bufferPath);
    return res.status(500).send('Buffer write failed');
  }

  try {
    const result = await jsonHandler.processJsonFile(bufferPath, null);
    console.log(`✅ Received JSON processed from: ${bufferPath}`);

    res.json({ status: 'Upload success', saved_as: `${serialNumber}.json` });
  } catch (err) {
    console.error('Error processing JSON:', err);
    res.status(500).send('Failed to process JSON');
  }
});

jsonApp.listen(JSON_SERVER_PORT, '0.0.0.0', () => {
  console.log(`📡 JSON Upload Server running at http://localhost:${JSON_SERVER_PORT}`);
});


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
  
    let data;
    try {
      data = JSON.parse(messageStr);
    } catch (err) {
      console.error("❌ JSON 解析錯誤:", err);
      return; // ❌ 錯誤就直接中止，不再繼續處理
    }
  
    // ✅ 確認 action 是世界座標（不噴整份 JSON）
    if (data.action === "got_match_world_coordinates") {
      
    } else {
      console.log('Received message:', messageStr);
    }
  
    // ✅ 客戶端身份識別流程（只需要一次 JSON 物件）
    if (data.identify) {
      if (data.identify.toLowerCase() === 'python') {
        ws.pythonws = true;
        console.log('🐍 Python client connected, establishing pythonws...');
        handlePythonClient(ws);
      } else if (data.identify.toLowerCase() === 'cesium') {
        ws.cesiumws = true;
        console.log('🪐 Cesium client connected, establishing cesiumws...');
        //handlehtml.join
        handleCesiumClient(ws);
      } else {
        console.log('👀 Unknown client identify:', data.identify);
        handleDefaultClient(ws);
      }
    } else {
      if (!ws.pythonws && !ws.cesiumws) {
        console.log("🚨 未註冊的客戶端，請確認 identify 是否正確");
      }
    }
  });
  ws.on('close', () => {
    //console.log("❌ Client disconnected");
  });
});

/**
 * 🔹 處理 Python 客戶端的 WebSocket 連線
 */
function handlePythonClient(ws) {
  ws.on('message', async (message) => {
    const messageStr = message.toString();
    console.log("🐍 Python client message:", messageStr);
    try {
      const data = JSON.parse(message);
      if (data.action === "request_json") {
        try {
          // 1. 先觸發拍照（原本流程不變）
          await triggerPhoto.triggerPhoto();
          wss.clients.forEach((client) => {
            if (client.cesiumws === true && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ action: "status_update", step: "waiting_drone" }));
            }
          });

          // 2. 取得目前 serial number
          const serialNumber = require('./modules/executionManager.js').getSerialNumbers();
          if (!serialNumber) {
            ws.send(JSON.stringify({ error: "找不到 execution serial number" }));
            return;
          }

          // 3. 組 buffer 檔案路徑：../buffer/{serialNumber}.json
          const bufferDir = path.join(__dirname, '..', 'buffer');
          const bufferPath = path.join(bufferDir, `${serialNumber}.json`);

          // 4. 等待 buffer 檔案出現（最長等 10 秒）
          const found = await waitForFile(bufferPath, 10000);
          if (!found) {
            ws.send(JSON.stringify({ error: "等待 buffer JSON 超時，檔案未寫入" }));
            return;
          }

          console.log(`✅ 找到 buffer 檔案：${bufferPath}`);

          // 5. 把 buffer 檔案內容丟給 jsonHandler 處理
          const result = await jsonHandler.processJsonFile(bufferPath, ws);
          console.log("✅ JSON 處理完成，結果：", result);

          if (result === 'NO_COORDINATES') {
            wss.clients.forEach((client) => {
              if (client.cesiumws === true && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ action: 'status_update', step: 'waiting_drone' }));
              }
            });
          } else if (result === 'Normal') {
            // jsonHandler 已直接通知 Python，此處不額外處理
          }

        } catch (err) {
          console.error("❌ request_json 處理失敗:", err);
          ws.send(JSON.stringify({ error: "處理 request_json 時發生錯誤", detail: err.message }));
        }
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
      else if (data.action === "renew_cesium") {
        console.log("🔄 收到 Python 的 renew_cesium 指令");

        let cesiumWs = null;
        wss.clients.forEach((client) => {
          if (client.cesiumws === true && client.readyState === WebSocket.OPEN) {
            cesiumWs = client;
          }
        });

        if (cesiumWs) {
          const serialNumber = require('./modules/executionManager.js').getSerialNumbers();
          coordinateSender.renewCesium(cesiumWs, serialNumber);
        } else {
          console.log("❌ 沒有找到 Cesium 客戶端，無法更新視角");
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
          console.log("✅ 找到 Cesium 客戶端，傳送 action: send_pixel_Coordinates");
      
          // 通知 Cesium 即將接收匹配點
          cesiumWs.send(JSON.stringify({
            action: "send_pixel_Coordinates"
          }));
      
          // 📦 呼叫模組載入匹配點並傳送（這裡會讀 JSON 檔）
          const executionPath = path.join(__dirname, '..', 'execution.json');
          let serialNumber = null;

          try {
            const executionData = JSON.parse(fs.readFileSync(executionPath, 'utf8'));
            serialNumber = executionData.serial_numbers;
            if (!serialNumber) {
              throw new Error("serial_numbers not found");
            }
          } catch (err) {
            console.error("⚠️ 無法讀取 execution.json:", err);
            // 根據你的應用情境可選擇中止流程或使用預設值
            return;
          }

          // 組合 JSON 路徑
          const matchJsonPath = path.join(
            __dirname, '..', 'data_base',
            String(serialNumber), 'c', 'respiberry_cesium_matches.json'
          );


          coordinateSender.sendPixelCoordinateFromFile(matchJsonPath, cesiumWs)
            .then(success => {
              if (success) {
                console.log("✅ 匹配點資料已成功送給 Cesium");
              } else {
                console.log("❌ 匹配點資料傳送失敗");
              }
            });
      
        } else {
          console.log("❌ 找不到任何 Cesium 客戶端，請確認是否已連接");
        }
      }
      else if (data.action === "status_update") {
        wss.clients.forEach((client) => {
          if (client.cesiumws === true && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ action: "status_update", step: data.step }));
          }
        });
      }
      else if (data.action === "calculation_result") {
        wss.clients.forEach((client) => {
          if (client.cesiumws === true && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              action: "calculation_result",
              latitude: data.latitude,
              longitude: data.longitude,
              height: data.height,
              status: data.status,
              note: data.note
            }));
          }
        });
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
 * 🔹 處理cesium的 WebSocket 連線
 */
function handleCesiumClient(ws) {
  console.log("開啟 cesium 監聽器");
  
  ws.on('message', (message) => {
    const messageStr = message.toString();
    try {
      const data = JSON.parse(messageStr);
    
      if (data.action === "got_match_world_coordinates") {
        console.log(`🌍 收到世界座標，共 ${data.points.length} 點`);
      } else {
        console.log("💻 : cesium client message:", messageStr);
      }
    } catch (err) {
      console.error("❌ JSON 解析錯誤:", err);
    }
  
    try {
      const data = JSON.parse(messageStr);
  
      switch (data.action) {
        case "upload_success":
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
          break;
      
        case "got_match_world_coordinates":
          console.log("🌍 收到世界座標");

          const executionPath = path.join(__dirname, '..', 'execution.json');
          let serialNumber = null;

          try {
            const executionData = JSON.parse(fs.readFileSync(executionPath, 'utf8'));
            serialNumber = executionData.serial_numbers;
            if (!serialNumber) throw new Error("serial_numbers not found in execution.json");
          } catch (err) {
            console.error("❌ 無法讀取 execution.json:", err);
            return;
          }

          // ✅ 動態組成儲存路徑
          const savePath = path.join(
            __dirname, '..', 'data_base',
            String(serialNumber), 'c', 'respiberry_cesium_matches.json'
          );
        
          fs.writeFileSync(savePath, JSON.stringify(data, null, 2), "utf8");
          console.log(`📁 已成功儲存座標至 ${savePath}`);
        
          // 🔁 通知所有 Python 客戶端：got the coordinate
          wss.clients.forEach((client) => {
            if (client.pythonws === true && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                notification: "got_match_world_coordinates"
              }));
              console.log("📤 已通知 Python 客戶端：got_match_world_coordinates");
            }
          });

          break;
      
      
        default:
          console.log("⚠️ 收到未知 action:", data.action);
          break;
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


