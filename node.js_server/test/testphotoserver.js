// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

let takePhotoFlag = false;

function startServer(port = 5000) {
  const app = express();

  app.use(bodyParser.json({ limit: '20mb' }));

  app.get("/", (req, res) => {
    res.send("📡 JS Server running");
  });

  app.get("/need_photo", (req, res) => {
    res.json({ take_photo: takePhotoFlag });
    takePhotoFlag = false;
  });

  app.post("/trigger_photo", (req, res) => {
    takePhotoFlag = true;
    res.json({ status: "Flag set to TRUE" });
  });

  app.post("/upload", (req, res) => {
    const jsonData = req.body;
    const folder = path.join(__dirname, "received_json");
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);

    const filename = `${jsonData.timestamp || Date.now()}.json`;
    const filepath = path.join(folder, filename);
    fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2));

    console.log(`✅ Received JSON uploaded: ${filename}`);
    res.json({ status: "Upload success" });
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });
}

// 讓其他主程式可以呼叫
module.exports = { startServer };

// 如果是直接執行 server.js，才啟動 server
if (require.main === module) {
  startServer();
}