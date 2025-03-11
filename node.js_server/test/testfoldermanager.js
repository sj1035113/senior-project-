// my_project/testFolderManager.js

const folderManager = require('D:\\vscode\\D-project\\formal\\node.js_server\\modules\\folderManager.js');
const path = require('path');

async function testFolderManager() {
  try {
    // 定義一個測試用的資料夾路徑（會在專案目錄下建立一個 test_folder）
    const testFolder = path.join(__dirname, 'test_folder');

    // 嘗試建立資料夾
    await folderManager.createFolder(testFolder);
    console.log('測試：成功建立資料夾。');

    // 模擬一些處理時間，例如等待 3 秒後刪除資料夾
    setTimeout(async () => {
      try {
        await folderManager.removeFolder(testFolder);
        console.log('測試：成功刪除資料夾。');
      } catch (err) {
        console.error('測試：刪除資料夾失敗', err);
      }
    }, 3000);
  } catch (err) {
    console.error('測試失敗', err);
  }
}

testFolderManager();
