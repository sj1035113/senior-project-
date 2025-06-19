import numpy as np
import cv2
import time
import pandas as pd
from pyproj import Transformer

def run_solvepnp_from_dataframe(points_df, use_top_confidence=False, top_n=45):
    """
    從 DataFrame 中讀取像素與 WGS84 世界座標點，使用 solvePnPRansac 解算相機位置。
    可選擇使用全部點或信心值最高的點進行計算。
    """
    if use_top_confidence:
        points_df = points_df.sort_values(by='confidence', ascending=False).head(top_n)
    
    wgs84_to_utm = Transformer.from_crs("epsg:4326", "epsg:32651", always_xy=True)
    utm_to_wgs84 = Transformer.from_crs("epsg:32651", "epsg:4326", always_xy=True)

    object_points_utm = []
    image_points = []
    for _, pt in points_df.iterrows():
        x, y = pt['x0'], pt['y0']
        lon, lat, height = pt['longitude'], pt['latitude'], pt['height']
        easting, northing = wgs84_to_utm.transform(lon, lat)
        object_points_utm.append([easting, northing, height])
        image_points.append([x, y])

    object_points_utm = np.array(object_points_utm, dtype=np.float32)
    image_points = np.array(image_points, dtype=np.float32)

    mean_xy = np.mean(object_points_utm[:, :2], axis=0)
    mean_z = np.mean(object_points_utm[:, 2])
    mean_point = np.array([mean_xy[0], mean_xy[1], mean_z])
    object_points_local = object_points_utm - mean_point

    camera_matrix = np.array([
        [1204.40713462100, 0, 315.398819104802],
        [0, 1208.57726271458, 262.082380860140],
        [0, 0, 1]
    ], dtype=np.float32)

    start_time = time.time()
    success, rvec, tvec, _ = cv2.solvePnPRansac(
        object_points_local, image_points,
        camera_matrix, None,
        flags=cv2.SOLVEPNP_EPNP,
        reprojectionError=8.0,
        iterationsCount=100
    )
    end_time = time.time()
    
    if not success:
        print("solvePnPRansac 解算失敗")
        return -1
    return end_time - start_time

def main():
    # 讀取指定的CSV檔案
    csv_path = r"C:\D-project\數據\學思\數據結果\Swapped_Pixel-Cesium_Data.csv"
    data = pd.read_csv(csv_path)

    # 測試全點和最高信心點的執行時間
    time_all_points = run_solvepnp_from_dataframe(data, use_top_confidence=False)
    time_top_45 = run_solvepnp_from_dataframe(data, use_top_confidence=True, top_n=45)

    print(f"使用全部點的執行時間: {time_all_points:.6f} 秒")
    print(f"使用信心最高 45 點的執行時間: {time_top_45:.6f} 秒")

if __name__ == "__main__":
    main()
