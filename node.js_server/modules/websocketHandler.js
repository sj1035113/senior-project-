// D:\vscode\D-project\formal\node.js_server\modules\websocketHandler.js
function sendMessage(ws, message) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    console.error('WebSocket 連線尚未開啟或已關閉，無法傳送訊息。');
  }
}

module.exports = {
  sendMessage,
};