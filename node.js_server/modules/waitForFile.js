// utils/waitForFile.js
const fs = require('fs/promises');

async function waitForFile(filepath, timeout = 5000, interval = 200) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      await fs.access(filepath); // 嘗試存取檔案
      return true;               // 有就成功
    } catch (err) {
      await new Promise(res => setTimeout(res, interval)); // 沒有就等 interval 時間
    }
  }
  return false; // 超時還沒找到
}

module.exports = { waitForFile };
