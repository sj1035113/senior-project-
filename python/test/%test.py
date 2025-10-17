import cv2

# ✅ 圖片路徑（你指定的檔案）
image_path = r"D:\DCIM\507NZ_50\DSC_9495.JPG"

# 讀取圖片
image = cv2.imread(image_path)

if image is None:
    print("❌ 無法讀取圖片，請檢查路徑是否正確")
    exit()

# ✅ 前 10 個信心值最高的像素座標 x0, y0
points = [
    (1931, 2569),
    (2786, 2528),
    (2427, 2256),
    (1592, 2151),
    (2048, 2267),
    (2440, 1583),
    (404, 1258),
    (1109, 1426),
    (313, 1415),
    (1337, 1653)
]

# 圓點設定
dot_color = (0, 0, 255)  # 紅色
dot_radius = 10
dot_thickness = -1       # 填滿

# 編號文字設定
text_color = (0, 255, 0)  # 綠色
font = cv2.FONT_HERSHEY_SIMPLEX
font_scale = 2
font_thickness = 3

# 畫點與文字
for idx, (x, y) in enumerate(points, start=1):
    cv2.circle(image, (x, y), dot_radius, dot_color, dot_thickness)
    cv2.putText(image, str(idx), (x + 20, y - 20), font, font_scale, text_color, font_thickness)

# ✅ 輸出圖片儲存路徑
output_path = r"C:\Users\sj103\Downloads\respiberry_annotated_top10.jpg"
cv2.imwrite(output_path, image)
print(f"✅ 標註完成，圖片已儲存至：{output_path}")
