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
  console.log(`Server is listening on port ${PORT}`);
});

// 在同一個 HTTP 伺服器上建立 WebSocket 伺服器
const wss = new WebSocket.Server({ server });

// 當有新的 WebSocket 連線時
wss.on('connection', (ws, req) => {
  console.log('New client connected');

  // 接收訊息
  ws.on('message', (message) => {
    console.log('Received message:', message);
    try {
      // 嘗試解析傳來的 JSON 字串
      const data = JSON.parse(message);
      if (data.identify && data.identify.toLowerCase() === 'python') {
        // 如果 identify 為 python，則建立一個專門處理 python 相關的 websocket 連線
        ws.pythonws = true;  // 標記此連線為 python 客戶端
        console.log('Python client connected, establishing pythonws...');
        // 在這裡你可以進一步設計專屬於 python 客戶端的邏輯或路由
      } else {
        console.log('Non-python client connected');
      }
    } catch (error) {
      console.error('Error parsing JSON message:', error);
    }
  });

  // 可選：發送初始歡迎訊息
  ws.send(JSON.stringify({ message: 'Welcome to the WebSocket server!' }));
});


const checkPythonConnection = setInterval(() => {
  for (let client of wss.clients) {
    if (client.pythonws) {
      console.log('檢查到至少一個連線具備 pythonws 屬性！');
      jsonHandler.processJsonFile("D:\\vscode\\D-project\\formal\\data_base\\test\\test.json", client);
      clearInterval(checkPythonConnection);
      break;
    }
  }
}, 1000);
// 先確認python有連結上在決定做這一個動作，在新增一個else條件。如果沒有python clint會報錯
