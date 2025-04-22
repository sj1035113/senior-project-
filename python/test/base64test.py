import base64
import json

# 圖片路徑
image_path = r"C:\D-project\senior-project-\data_base\1\b\respiberry.jpg"

# 輸出 JSON 路徑
output_path = r"C:\D-project\senior-project-\data_base\test\test1.json"

# 將圖片轉成 base64 字串
with open(image_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

# 建立 JSON 資料
data = {
    "camera_pose": {
        "position": {
            "x": 1.0,
            "y": 2.0,
            "z": 3.0
        }
    },
    "drone_pose": {
        "orientation": {
            "heading": 330,
            "pitch": -1.7,
            "roll": 0
        }
    },
    "coordinates": {
        "latitude": 24.177211,
        "longitude": 120.648803,
        "height": 140.3697528082066
    },
    "photo": encoded_string
}

# 輸出 JSON 檔案
with open(output_path, "w") as f:
    json.dump(data, f, indent=2)

print("✅ JSON 檔案已儲存：", output_path)
