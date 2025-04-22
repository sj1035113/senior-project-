const fs = require('fs');
const path = require('path')

/**
 * 傳送前 45 個 SuperGlue 匹配點（像素座標）給 Cesium 前端
 * @param {Array} matches - 匹配點陣列，格式為 [{x:..., y:...}, ...]
 * @param {WebSocket} ws - Cesium WebSocket 連線物件
 * @returns {boolean}
 */
async function sendPixelCoordinate(pixels, ws) {
  try {
    const message = {
      action: "top_match_pixels",
      pixels
    };

    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
      console.log("✅ 已將像素座標傳送給 Cesium");
      return true;
    } else {
      console.warn("❌ WebSocket 尚未連線，無法傳送像素座標");
      return false;
    }
  } catch (err) {
    console.error("❌ 傳送失敗:", err);
    return false;
  }
}

/**
 * 從 SuperGlue 匹配結果 JSON 檔讀取，取前 45 筆像素座標，傳送給 Cesium
 * @param {string} jsonPath - 匹配 JSON 檔路徑
 * @param {WebSocket} ws - Cesium WebSocket 連線物件
 * @returns {Promise<boolean>}
 */
async function sendPixelCoordinateFromFile(jsonPath, ws) {
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    const matches = JSON.parse(content);

    const topMatches = matches.slice(0, 45);
    const pixels = topMatches.map(match => ({
      x: match.x1,
      y: match.y1
    }));

    return sendPixelCoordinate(pixels, ws);
  } catch (err) {
    console.error("❌ 讀取或傳送匹配點失敗:", err);
    return false;
  }
}

/**
 * 傳送模擬的相機經緯度資料與擷取畫面請求給 Cesium
 * @param {WebSocket} ws - Cesium WebSocket 連線物件
 */
function sendCoordinates(ws) {
  // 1️⃣ 讀取 execution.json
  const executionPath = path.join(__dirname, '..', '..', 'execution.json');
  let serialNumber = null;

  try {
    const executionData = JSON.parse(fs.readFileSync(executionPath, 'utf8'));
    serialNumber = executionData.serial_numbers;
    if (!serialNumber) throw new Error("serial_numbers not found in execution.json");
  } catch (err) {
    console.error("❌ 無法讀取 execution.json:", err);
    return;
  }

  // 2️⃣ 根據 serial_number 讀取 flight_information.json
  const flightInfoPath = path.join(
    __dirname, '..', '..', 'data_base',
    String(serialNumber - 1), 'a', 'flight_information.json'
  );

  let cameraData;
  try {
    cameraData = JSON.parse(fs.readFileSync(flightInfoPath, 'utf8'));
    cameraData.action = "send_Coordinates"; // 加入 action
  } catch (err) {
    console.error("❌ 無法讀取 flight_information.json:", err);
    return;
  }

  // 3️⃣ 傳送相機姿態資訊
  ws.send(JSON.stringify(cameraData));
  console.log("📡 已傳送 camera 座標資訊:", cameraData);

  // 4️⃣ 要求 Cesium 擷取畫面
  const actionMessage = { action: "get_cesium_picture" };
  ws.send(JSON.stringify(actionMessage));
  console.log("📸 已要求 Cesium 擷取畫面");
}

module.exports = {
  sendPixelCoordinate,
  sendPixelCoordinateFromFile,
  sendCoordinates
};
