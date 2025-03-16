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
    // 1. 讀取 JSON 檔案，檔案內容中包含座標、相機姿態與相片
    const fileContent = await fs.readFile(jsonFilePath, 'utf8');
    const data = JSON.parse(fileContent);
    console.log('結束讀取 json');

    // 2. 檢查是否包含座標資料
    if (data.coordinates.latitude !== null && data.coordinates.longitude !== null) {
      console.log(data.coordinates)
      // 有座標，向 Python 請求一個資料夾編號
      const folderNumber = execution.getSerialNumbers();
      console.log('取得的資料夾編號:', folderNumber);
      // 3. 設定父資料夾與子資料夾路徑
      const parentFolder = path.join("D:\\vscode\\D-project\\formal\\data_base", folderNumber.toString());
      const folderA = path.join(parentFolder, 'a');
      const folderB = path.join(parentFolder, 'b');

      // 使用 folderManager 建立這些資料夾
      await folderManager.createFolder(parentFolder);
      await folderManager.createFolder(folderA);
      await folderManager.createFolder(folderB);

      // 4. 將座標和相機姿態存入 a 資料夾
      const outputData = {
        coordinates: data.coordinates,
        cameraPose: data.cameraPose
      };
      const jsonOutputPath = path.join(folderA, folderNumber + 'flight_information.json');
      await fs.writeFile(jsonOutputPath, JSON.stringify(outputData, null, 2), 'utf8');
      console.log('已儲存座標與相機姿態至:', jsonOutputPath);

      // 5. 將相片存入 b 資料夾
      if (data.photo) {
        const photoBuffer = Buffer.from(data.photo, 'base64');
        const photoPath = path.join(folderB, folderNumber + '.jpg');
        await fs.writeFile(photoPath, photoBuffer);
        console.log('已儲存相片至:', photoPath);
      } else {
        console.warn('JSON 中未包含相片資料。');
      }
      // 回傳狀態碼：有座標，並傳送訊息時引用 ws 參數
      await pythonConnector.sendMessage(ws, {
        type: 'notification',
        command: 'has_coordinate'
      });
      return 'Normal';
    } else if(data.coordinates.latitude === null || data.coordinates.longitude === null) {
      console.log('JSON 中未包含座標，傳送代碼給 Python 處理。');
      await pythonConnector.sendMessage(ws, {
        type: 'notification',
        command: 'no_coordinate'
      });
      return 'NO_COORDINATES';
    }
  } catch (error) {
    console.error('處理 JSON 檔案時發生錯誤:', error);
    throw error;
  }
}

module.exports = {
  processJsonFile
};
