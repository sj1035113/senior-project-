import json
import numpy as np
import cv2
import time
from pyproj import Transformer

# === JSON 檔案路徑 ===
json_path = r'D:\vscode\simu_db\1\c\match_test_respiberry_match_test_cesium_matches.json'
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

points = data["points"]

# === 投影系統設定 ===
wgs84_to_utm = Transformer.from_crs("epsg:4326", "epsg:32651", always_xy=True)
utm_to_wgs84 = Transformer.from_crs("epsg:32651", "epsg:4326", always_xy=True)

# === 建立 UTM 3D 點與 2D 像素點 ===
object_points_utm = []
image_points = []

for pt in points:
    x, y = pt["x"], pt["y"]
    lon, lat, height = pt["longitude"], pt["latitude"], pt["height"]
    easting, northing = wgs84_to_utm.transform(lon, lat)
    object_points_utm.append([easting, northing, height])
    image_points.append([x, y])

object_points_utm = np.array(object_points_utm, dtype=np.float32)
image_points = np.array(image_points, dtype=np.float32)

# === 區域座標系中心點處理 ===
mean_xy = np.mean(object_points_utm[:, :2], axis=0)
mean_z = np.mean(object_points_utm[:, 2])
mean_point = np.array([mean_xy[0], mean_xy[1], mean_z])
object_points_local = object_points_utm - mean_point

# === 相機內參矩陣 ===
camera_matrix = np.array([
    [1204.40713462100, 0, 315.398819104802],
    [0, 1208.57726271458, 262.082380860140],
    [0, 0, 1]
], dtype=np.float32)

# === 共用執行函式 ===
def run_solvePnP(method_name, solve_function):
    print(f"\n🔎 使用方法：{method_name}")
    start_time = time.time()
    result = solve_function()
    elapsed = (time.time() - start_time) * 1000  # 毫秒

    if len(result) >= 3:
        success, rvec, tvec = result[:3]
    else:
        raise ValueError("solve_function 回傳格式錯誤")

    if success:
        R, _ = cv2.Rodrigues(rvec)
        cam_pos_local = (-R.T @ tvec).flatten()
        cam_pos_utm = cam_pos_local + mean_point
        lon, lat = utm_to_wgs84.transform(cam_pos_utm[0], cam_pos_utm[1])
        height = cam_pos_utm[2]

        print(f"✅ 解算成功，用時：{elapsed:.2f} ms")
        print(f"🌍 經緯度：{lat:.6f}, {lon:.6f} / 高度：{height:.2f} m")
        print(f"📌 區域座標：x={cam_pos_local[0]:.2f}, y={cam_pos_local[1]:.2f}, z={cam_pos_local[2]:.2f}")
        return elapsed
    else:
        print(f"❌ 解算失敗，用時：{elapsed:.2f} ms")
        return None

# === 執行 ITERATIVE 方法 ===
iter_time = run_solvePnP(
    "cv2.SOLVEPNP_ITERATIVE",
    lambda: cv2.solvePnP(
        object_points_local, image_points,
        camera_matrix, None,
        flags=cv2.SOLVEPNP_ITERATIVE
    )
)

# === 執行 RANSAC + EPNP 方法 ===
ransac_time = run_solvePnP(
    "cv2.solvePnPRansac + EPNP",
    lambda: cv2.solvePnPRansac(
        object_points_local, image_points,
        camera_matrix, None,
        flags=cv2.SOLVEPNP_EPNP,
        reprojectionError=8.0,
        iterationsCount=100
    )
)

# === 時間比較 ===
if iter_time is not None and ransac_time is not None:
    print("\n⏱️ 時間比較：")
    print(f"   ITERATIVE：{iter_time:.2f} ms")
    print(f"   RANSAC   ：{ransac_time:.2f} ms")
    print(f"   差異     ：{abs(ransac_time - iter_time):.2f} ms")
