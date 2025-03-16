const path = require("path");
const jsonHandler = require(path.join(__dirname,"..", "modules", "jsonhandler.js"));
const http = require('http');
const WebSocket = require('ws');  // 使用 ws 模組
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const HTTP_PORT = 3000;      // HTTP 伺服器的埠號（可供其他 API 使用）
const WS_PORT = 8080;        // WebSocket 伺服器的埠號
const UPLOAD_PORT = 8081;    // 圖片上傳用的 HTTP 伺服器埠號（與 WebSocket 分開）

// 建立 HTTP 伺服器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server is running...\n');
});

server.listen(WS_PORT, () => {
  console.log(`🚀 Server is listening on port ${WS_PORT}`);
});

// ... 前面的程式碼保持不變

// 在同一個 HTTP 伺服器上建立 WebSocket 伺服器
const wss = new WebSocket.Server({ server });
console.log(`WebSocket Server running on ws://localhost:${WS_PORT}`);

// 監聽 WebSocket 連線
wss.on('connection', (ws, req) => {
  console.log('New WebSocket client connected');

  // 增加一個監聽器，顯示收到的所有訊息內容
  ws.on('message', (message) => {
    console.log('監聽器收到訊息：', message.toString());
  });

  // 你也可以在這裡加入其他訊息處理邏輯，例如依據 identify 呼叫不同模組
});
