const fs = require('fs');

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
  const cameraData = {
    action: "send_Coordinates",
    longitude: 120.648803,
    latitude: 24.177211,
    height: 140.3697528082066,
    heading: 330,
    pitch: -1.7,
    roll: 0
  };

  ws.send(JSON.stringify(cameraData));
  console.log("📡 已傳送 camera 座標資訊");

  const actionMessage = {
    action: "get_cesium_picture"
  };

  ws.send(JSON.stringify(actionMessage));
  console.log("📸 已要求 Cesium 擷取畫面");
}

module.exports = {
  sendPixelCoordinate,
  sendPixelCoordinateFromFile,
  sendCoordinates
};
