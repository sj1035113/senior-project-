const jsonHandler = require('D:\\vscode\\D-project\\formal\\node.js_server\\modules\\jsonhandler.js');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');  // 使用 ws 模組

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
