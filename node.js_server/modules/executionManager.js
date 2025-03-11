const fs = require('fs').promises;
const path = require('path');

/**
 * 讀取 execution.json 並回傳 serial_numbers 屬性
 * @returns {Promise<any>} 回傳 JSON 中 serial_numbers 屬性的內容
 */
async function getSerialNumbers() {
  try {
    // 組合檔案路徑
    const filePath = path.join('D:', 'vscode', 'D-project', 'formal', 'execution.json');
    // 讀取檔案內容（UTF-8 編碼）
    const fileContent = await fs.readFile(filePath, 'utf8');
    // 解析 JSON 字串
    const data = JSON.parse(fileContent);
    // 回傳 serial_numbers 屬性，如果沒有則回傳 null
    return data.serial_numbers || null;
  } catch (error) {
    console.error('讀取或解析 execution.json 時發生錯誤:', error);
    throw error;
  }
}

module.exports = {
  getSerialNumbers,
};