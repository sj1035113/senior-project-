const fs = require('fs'); // 注意：這裡用的是同步的 fs
const path = require('path');

function getSerialNumbers() {
  try {
    // 組合檔案路徑
    const filePath = path.join(__dirname, '..', '..', 'execution.json');
    // 同步讀取檔案內容（UTF-8 編碼）
    const fileContent = fs.readFileSync(filePath, 'utf8');
    // 解析 JSON 字串
    const data = JSON.parse(fileContent);
    // 回傳 serial_numbers 屬性，如果沒有則回傳 null
    console.log("序列號為", data.serial_numbers);
    return data.serial_numbers || null;
  } catch (error) {
    console.error('同步讀取或解析 execution.json 時發生錯誤:', error);
    throw error;
  }
}

module.exports = {
  getSerialNumbers,
};