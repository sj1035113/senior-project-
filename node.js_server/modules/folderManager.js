// my_project/modules/folderManager.js

const fs = require('fs');
const path = require('path');

/**
 * 建立指定的資料夾，如果該資料夾已存在則不動作
 * @param {string} folderPath 資料夾路徑
 * @returns {Promise<void>}
 */
async function createFolder(folderPath) {
  try {
    // 檢查資料夾是否存在
    await fs.promises.access(folderPath, fs.constants.F_OK);
    console.log(`資料夾已存在：${folderPath}`);
  } catch (error) {
    // 資料夾不存在，建立資料夾
    await fs.promises.mkdir(folderPath, { recursive: true });
    console.log(`已建立資料夾：${folderPath}`);
  }
}

// 若有需要，也可以擴充其他功能，例如刪除資料夾
/**
 * 刪除指定的資料夾及其所有內容
 * @param {string} folderPath 資料夾路徑
 * @returns {Promise<void>}
 */
async function removeFolder(folderPath) {
  try {
    await fs.promises.rm(folderPath, { recursive: true, force: true });
    console.log(`已刪除資料夾：${folderPath}`);
  } catch (error) {
    console.error(`刪除資料夾失敗：${folderPath}`, error);
    throw error;
  }
}

module.exports = {
  createFolder,
  removeFolder  // 如不需要，可選擇不匯出此方法
};
