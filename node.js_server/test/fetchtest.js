const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = 3000;

// 創建 HTTP 伺服器
const server = http.createServer(app);

// 啟用 CORS，允許跨域請求
app.use(cors());

// 當有新的 HTTP 連線時，顯示訊息
server.on('connection', (socket) => {
    console.log("⚡ 有新的連線進來:", socket.remoteAddress);
});

// 記錄請求資訊
app.use((req, res, next) => {
    console.log(`📡 收到請求: ${req.method} ${req.url} 從 ${req.ip}`);
    next();
});

// API: 模擬延遲回應
app.get('/fetch-test', async (req, res) => {
    console.log("✅ 進行 /fetch-test 請求處理");
    setTimeout(() => {
        res.json({ message: "成功收到請求，連線未斷" });
    }, 2000); // 模擬 2 秒的延遲
});

// 啟動伺服器
server.listen(PORT, () => {
    console.log(`🚀 伺服器運行於 http://localhost:${PORT}`);
});
