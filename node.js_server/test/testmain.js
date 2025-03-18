const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const PORT = 8080;
const WS_PORT = 8081;

// 啟用 CORS
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 處理 JSON 資料

// 建立 HTTP 伺服器
const server = http.createServer(app);

// 建立 WebSocket 伺服器
const wss = new WebSocket.Server({ server });

// 監聽 WebSocket 連線
wss.on('connection', (ws, req) => {
    console.log(`⚡ WebSocket 連線建立: ${req.socket.remoteAddress}`);
    
    ws.on('message', (message) => {
        console.log(`📩 收到 WebSocket 訊息: ${message}`);
        
        // 回傳訊息確認
        ws.send(JSON.stringify({ status: "connected", message: "WebSocket 伺服器已連接" }));
    });

    ws.on('close', () => {
        console.log("❌ WebSocket 連線關閉");
    });
});

// HTTP API: 測試 Fetch 請求
app.post('/upload', (req, res) => {
    console.log("📥 收到 HTTP POST 請求 /upload");
    if (req.body.image) {
        console.log("✅ 收到影像資料");
        res.json({ status: "success", message: "影像已接收" });
    } else {
        console.log("❌ 未收到影像資料");
        res.status(400).json({ status: "error", message: "未提供影像資料" });
    }
});

// 啟動 HTTP 伺服器
server.listen(PORT, () => {
    console.log(`🚀 HTTP 伺服器運行於 http://localhost:${PORT}`);
});
