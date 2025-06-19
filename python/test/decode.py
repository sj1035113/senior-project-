import json
import base64
import os

# 修改這一行，拿掉多餘引號！
json_file_path = r"C:\Users\sj103\Downloads\第二點角度二.json"
output_folder = r'C:\D-project\testphoto'
output_filename = 'respiberry.jpg'

os.makedirs(output_folder, exist_ok=True)

with open(json_file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

base64_photo = data.get('photo')

if base64_photo:
    image_data = base64.b64decode(base64_photo)
    output_path = os.path.join(output_folder, output_filename)
    with open(output_path, 'wb') as img_file:
        img_file.write(image_data)
    print(f"✅ 照片已成功儲存到 {output_path}")
else:
    print("❌ 找不到 photo 欄位")
