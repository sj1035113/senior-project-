// coordinateSender.js
function sendCoordinates(ws) {
  // 模擬產生經緯度與其他相機資料
  const cameraData = {
    action: "send_Coordinates",
    longitude: 120.648803, // 模擬經度變化
    latitude: 24.177211,  // 模擬緯度變化
    height: 140.3697528082066,
    heading: 330,            // 朝向隨機變動
    pitch: -1.7,
    roll: 0
  };

  
  // 先傳送經緯度等相機數據
  ws.send(JSON.stringify(cameraData));
  // 傳送一個 JSON 訊息 { event: "action", message: "get_cesium_picture" }
  const actionMessage = {
    action: "get_cesium_picture"
  };
  ws.send(JSON.stringify(actionMessage));
}

module.exports = { sendCoordinates };

  