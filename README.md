# 專案流程說明

本專案包含 Node.js 伺服器、Python 與 Cesium 前端三部分，流程簡述如下：

1. Python 週期性向伺服器請求 JSON，伺服器解析後若包含座標則回傳 `has_coordinate` 通知。
2. 首次接收到 `has_coordinate` 時，Python 會透過 WebSocket 傳送 `{ "action": "renew_cesium" }` 並等待 10 秒；之後若再次收到座標，只傳送更新指令不再等待。
3. 伺服器在解析 JSON 為 `Normal` 時僅通知 Python `has_coordinate`；待 Python 回傳 `renew_cesium` 指令後，伺服器才讀取對應的 `flight_information.json` 並傳送給 Cesium 更新視角。
4. 若伺服器收到 `no_coordinate`，Python 會要求 Cesium 取得畫面；Cesium 擷取完成後上傳圖片並在 1.5 秒後回報伺服器。
5. Cesium 在收到截圖指令時會以 `captureWait`（預設 1500ms）延遲後執行截圖，上傳成功後再次延遲 1.5 秒通知伺服器。

整體上首次收到座標會等待 10 秒，其餘僅更新視角；沒有座標時才進行截圖並在流程末端等待 1.5 秒。
