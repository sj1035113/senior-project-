const fs = require('fs').promises;
const fsSync = require('fs'); // ✅【新增】為了讀取 base64 檔案（路徑）
const path = require('path');
const pythonConnector = require("./websocketHandler.js");
const folderManager = require("./folderManager.js");
const execution = require("./executionManager.js");

/**
 * 處理 JSON 檔案，並根據是否包含座標資料回傳狀態碼
 */
async function processJsonFile(jsonFilePath, ws) {
  try {
    const fileContent = await fs.readFile(jsonFilePath, 'utf8');
    const data = JSON.parse(fileContent);
    console.log('✅ 結束讀取 json');

    const hasCoordinates = data.coordinates &&
      data.coordinates.latitude != null &&
      data.coordinates.longitude != null;

    const folderNumber = execution.getSerialNumbers();
    console.log('📁 取得的資料夾編號:', folderNumber);

    const parentFolder = path.join(__dirname, "..", "..", "data_base", folderNumber.toString());
    const folderA = path.join(parentFolder, 'a');
    const folderB = path.join(parentFolder, 'b');

    await folderManager.createFolder(parentFolder);
    await folderManager.createFolder(folderA);

    // ✅【這段沒改】儲存 flight_information.json（展平格式）
    const outputData = {
      longitude: data.coordinates?.longitude ?? null,
      latitude: data.coordinates?.latitude ?? null,
      height: data.coordinates?.height ?? null,
      heading: data.drone_pose?.orientation?.heading ?? null,
      pitch: data.drone_pose?.orientation?.pitch ?? null,
      roll: data.drone_pose?.orientation?.roll ?? null
    };

    const jsonOutputPath = path.join(folderA, 'flight_information.json');
    await fs.writeFile(jsonOutputPath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log('📝 已儲存座標與相機姿態至:', jsonOutputPath);

    // ✅✅✅【這整段是改動的部分】：支援 base64 或檔案路徑儲存圖片
    if (data.photo) {
      const folderB = path.join(parentFolder, 'b');
      await folderManager.createFolder(folderB);
    
      try {
        const photoBuffer = Buffer.from(data.photo, 'base64');
        const photoPath = path.join(folderB, 'respiberry.jpg');
        await fs.writeFile(photoPath, photoBuffer);
        console.log('🖼️ 已儲存相片至:', photoPath);
      } catch (err) {
        console.error('❌ base64 轉圖失敗:', err.message);
      }
    } else {
      console.warn('⚠️ JSON 中未包含相片資料，跳過圖片儲存與資料夾建立');
    }

    // ✅【這段原本就有】通知 Python 狀態
    if (hasCoordinates) {
      console.log("✔️ 有座標，通知 Python: has_coordinate");
      await pythonConnector.sendMessage(ws, {
        notification: 'has_coordinate'
      });
      return 'Normal';
    } else {
      console.log("⚠️ 沒有座標，通知 Python: no_coordinate");
      await pythonConnector.sendMessage(ws, {
        notification: 'no_coordinate'
      });
      return 'NO_COORDINATES';
    }

  } catch (error) {
    console.error('❌ 處理 JSON 檔案時發生錯誤:', error);
    throw error;
  }
}

module.exports = {
  processJsonFile
};
