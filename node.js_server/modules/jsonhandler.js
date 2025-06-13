const fs = require('fs').promises;
const path = require('path');
const pythonConnector = require("./websocketHandler.js");
const folderManager = require("./folderManager.js");
const execution = require("./executionManager.js");
/**
 * 處理 JSON 檔案，並根據是否包含座標資料回傳狀態碼
 * @param {string} jsonFilePath JSON 檔案路徑
 * @param {object} ws 傳入的 WebSocket 物件
 * @returns {Promise<string>} 回傳 'Normal' 或 'NO_COORDINATES'
 */
async function processJsonFile(jsonFilePath, ws) {
  try {
    // 1. 讀取 JSON 檔案
    const fileContent = await fs.readFile(jsonFilePath, 'utf8');
    const data = JSON.parse(fileContent);
    console.log('結束讀取 json');

    const hasCoordinate =
      data.coordinates &&
      data.coordinates.latitude !== null &&
      data.coordinates.longitude !== null;

    // 2. 取得序號並建立資料夾結構
    const folderNumber = execution.getSerialNumbers();
    const parentFolder = path.join(
      __dirname,
      '..',
      '..',
      'data_base',
      folderNumber.toString()
    );
    const folderA = path.join(parentFolder, 'a');
    const folderB = path.join(parentFolder, 'b');
    await folderManager.createFolder(parentFolder);
    await folderManager.createFolder(folderA);
    await folderManager.createFolder(folderB);

    if (hasCoordinate) {
      console.log('包含座標資料');

      // 3. 解析 drone 姿態資料
      const orientation =
        (data.drone_pose && data.drone_pose.orientation) ||
        (data.cameraPose && data.cameraPose.orientation) ||
        {};

      const flightInformation = {
        longitude: data.coordinates.longitude,
        latitude: data.coordinates.latitude,
        height: data.coordinates.height,
        heading:
          orientation.heading !== undefined
            ? orientation.heading
            : orientation.yaw,
        pitch: orientation.pitch,
        roll: orientation.roll,
      };

      const jsonOutputPath = path.join(folderA, 'flight_information.json');
      await fs.writeFile(
        jsonOutputPath,
        JSON.stringify(flightInformation, null, 2),
        'utf8'
      );
      console.log('已儲存 flight_information 至:', jsonOutputPath);

      await pythonConnector.sendMessage(ws, { notification: 'has_coordinate' });
      return 'Normal';
    }

    // 沒有座標但有照片時，保存照片
    if (data.photo || data.image) {
      const base64 = data.photo || data.image;
      const photoBuffer = Buffer.from(base64, 'base64');
      const photoPath = path.join(folderB, 'respiberry.jpg');
      await fs.writeFile(photoPath, photoBuffer);
      console.log('已儲存相片至:', photoPath);
    } else {
      console.warn('JSON 中未包含相片資料');
    }

    await pythonConnector.sendMessage(ws, { notification: 'no_coordinate' });
    return 'NO_COORDINATES';
  } catch (error) {
    console.error('處理 JSON 檔案時發生錯誤:', error);
    throw error;
  }
}

module.exports = {
  processJsonFile
};
