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
    ws.send(JSON.stringify(cameraData));
  }
  
  module.exports = { sendCoordinates };
  