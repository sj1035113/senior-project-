import cv2

# 圖片路徑
image_path = r"C:\Users\sj103\Downloads\da_pang_test.jpg"

# 讀取圖片
image = cv2.imread(image_path)

# 確保圖片讀取成功
if image is None:
    print("無法讀取圖片，請檢查路徑是否正確！")
    exit()

# 指定的六個點 (x, y)
points = [
    (2458, 1832),
    (602, 1528),
    (2202, 1700),
    (2512, 1268),
    (4038, 964),
    (3450, 1112)
]

# 設定圓點顏色、大小與標號字體
dot_color = (0, 0, 255)  # 紅色 (BGR 格式)
dot_radius = 10
dot_thickness = -1  # 填滿圓點

text_color = (0, 255, 0)  # 綠色標號
font = cv2.FONT_HERSHEY_SIMPLEX
font_scale = 2
font_thickness = 3

# 在圖片上標註紅色點與標號
for idx, (x, y) in enumerate(points, start=1):
    cv2.circle(image, (x, y), dot_radius, dot_color, dot_thickness)
    cv2.putText(image, str(idx), (x + 20, y - 20), font, font_scale, text_color, font_thickness)

# 儲存新圖片
output_path = r"C:\Users\sj103\Downloads\da_pang_test_annotated.jpg"
cv2.imwrite(output_path, image)

print(f"標註完成！已儲存於 {output_path}")
