const fs = require('fs').promises;
const path = require('path');
const pythonConnector = require("./websocketHandler.js");
const folderManager = require("./folderManager.js");
const execution = require("./executionManager.js");

/**
 * 處理 JSON 檔案，並根據是否包含座標與相片資料回傳狀態碼
 * @param {string} jsonFilePath JSON 檔案路徑
 * @param {object} ws 傳入的 WebSocket 物件
 * @returns {Promise<object>} A result object, e.g., { status: 'Normal' }, { status: 'NO_COORDINATES', photo: 'base64...' }, or { status: 'NO_DATA' }
 */
async function processJsonFile(jsonFilePath, ws) {
  try {
    // 1. 讀取 execution.json，取得當前序號
    const execPath = path.join(__dirname, '..', '..', 'execution.json');
    const execContent = await fs.readFile(execPath, 'utf8');
    const execData = JSON.parse(execContent);
    const serialNumber = execData.serial_numbers;
    if (serialNumber == null) {
      throw new Error('execution.json 中缺少 serial_numbers 欄位');
    }

    // 2. 建立父資料夾與子資料夾 a, b, c
    const baseFolder = path.join(__dirname, '..', '..', 'data_base', String(serialNumber));
    const folderA = path.join(baseFolder, 'a');
    const folderB = path.join(baseFolder, 'b');
    const folderC = path.join(baseFolder, 'c');
    await folderManager.createFolder(baseFolder);
    await folderManager.createFolder(folderA);
    await folderManager.createFolder(folderB);
    await folderManager.createFolder(folderC);

    // 3. 讀取並解析 JSON 檔案內容
    const fileContent = await fs.readFile(jsonFilePath, 'utf8');
    const data = JSON.parse(fileContent);
    console.log('✅ 結束讀取 JSON:', jsonFilePath);

    const hasCoordinate =
      data.coordinates &&
      data.coordinates.latitude != null &&
      data.coordinates.longitude != null;
    const hasPhoto = data.photo || data.image;

    // 4. 根據資料情況做處理
    if (hasCoordinate) {
      console.log('📍 包含座標資料，儲存 flight_information.json');
      const orientation =
        (data.drone_pose && data.drone_pose.orientation) ||
        (data.cameraPose && data.cameraPose.orientation) || {};

      const flightInfo = {
        longitude: data.coordinates.longitude,
        latitude: data.coordinates.latitude,
        height: data.coordinates.height,
        heading: orientation.heading !== undefined ? orientation.heading : orientation.yaw,
        pitch: orientation.pitch,
        roll: orientation.roll,
      };

      const jsonOutputPath = path.join(folderA, 'flight_information.json');
      await fs.writeFile(jsonOutputPath, JSON.stringify(flightInfo, null, 2), 'utf8');
      console.log('📝 已儲存 flight_information 至:', jsonOutputPath);

      await pythonConnector.sendMessage(ws, { notification: 'has_coordinate' });
      return { status: 'Normal' };
    } else if (hasPhoto) {
      console.log('📷 沒有座標，但有相片，儲存圖片');
      const base64 = hasPhoto;
      const photoBuffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const photoPath = path.join(folderB, 'respiberry.jpg');
      await fs.writeFile(photoPath, photoBuffer);
      console.log('🖼️ 已儲存相片至:', photoPath);

      await pythonConnector.sendMessage(ws, { notification: 'no_coordinate' });
      return { status: 'NO_COORDINATES', photo: hasPhoto };
    } else {
      console.warn('⚠️ JSON 中未包含座標與相片資料，回傳 NO_DATA');
      await pythonConnector.sendMessage(ws, { notification: 'no_data' });
      return { status: 'NO_DATA' };
    }
  } catch (error) {
    console.error('❌ 處理 JSON 檔案時發生錯誤:', error);
    throw error;
  }
}

module.exports = {
  processJsonFile
};
