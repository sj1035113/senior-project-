// coordinateSender.js
function sendCoordinates(ws) {
  // 模擬產生經緯度與其他相機資料
  const cameraData = {
    longitude: 121.5 + Math.random() * 0.01, // 模擬經度變化
    latitude: 25.03 + Math.random() * 0.01,  // 模擬緯度變化
    height: 1000,
    heading: Math.random() * 360,            // 朝向隨機變動
    pitch: -30,
    roll: 0
  };

  // 先傳送經緯度等相機數據
  ws.send(JSON.stringify(cameraData));
  // 傳送一個 JSON 訊息 { event: "action", message: "get_cesium_picture" }
  const actionMessage = {
    event: "action",
    message: "get_cesium_picture"
  };
  ws.send(JSON.stringify(actionMessage));

}

module.exports = { sendCoordinates };

  