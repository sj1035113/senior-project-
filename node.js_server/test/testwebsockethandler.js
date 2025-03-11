const WebSocket = require('ws');
const websocketHandler = require('D:\\vscode\\D-project\\formal\\node.js_server\\modules\\websocketHandler.js');

// 建立 WebSocket 伺服器，監聽 8080 埠口
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  console.log('有新的客戶端連線');

  // 當收到訊息時，印出並回應
  ws.on('message', function incoming(message) {
    console.log(`收到客戶端訊息: ${message}`);
    // 回傳訊息給連線中的客戶端
    websocketHandler.sendMessage(ws, `伺服器收到: ${message}`);
  });

  // 可在連線建立後主動發送一個歡迎訊息
  websocketHandler.sendMessage(ws, '歡迎連線到 Node.js WebSocket 伺服器！')
});

console.log('WebSocket 伺服器已啟動，監聽 ws://localhost:8080');
