const fs = require('fs');
const path = require('path');

// 讀取的 JSON 路徑
const jsonPath = path.resolve('C:/D-project/senior-project-/data_base/test/test1.json');

// 儲存圖片的資料夾
const outputDir = path.resolve('C:/D-project/senior-project-/data_base/2/a');
const outputImagePath = path.join(outputDir, 'photo.jpg');

// 確保資料夾存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 讀取 JSON 檔案
fs.readFile(jsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('❌ 無法讀取 JSON：', err);
    return;
  }

  try {
    const jsonData = JSON.parse(data);

    // 檢查 photo 欄位
    if (!jsonData.photo) {
      console.warn('⚠️ JSON 中沒有 photo 欄位或其為 null。');
      return;
    }

    // 將 base64 轉換為圖片 buffer 並儲存
    const buffer = Buffer.from(jsonData.photo, 'base64');
    fs.writeFile(outputImagePath, buffer, (err) => {
      if (err) {
        console.error('❌ 寫入圖片失敗：', err);
      } else {
        console.log('✅ 已成功將圖片儲存為：', outputImagePath);
      }
    });
  } catch (e) {
    console.error('❌ JSON 格式錯誤：', e);
  }
});
