import json
import numpy as np
import cv2
from pyproj import Transformer

def run_solvepnp_from_json(json_path):
    """
    從 JSON 檔案中讀取像素與 WGS84 世界座標點，使用 solvePnPRansac 解算相機位置。
    僅回傳計算出的 WGS84 相機座標 (lat, lon, height)
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    points = data["points"]

    # 建立投影轉換器
    wgs84_to_utm = Transformer.from_crs("epsg:4326", "epsg:32651", always_xy=True)
    utm_to_wgs84 = Transformer.from_crs("epsg:32651", "epsg:4326", always_xy=True)

    # 提取像素點與 UTM 世界點
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

    # 區域座標系轉換
    mean_xy = np.mean(object_points_utm[:, :2], axis=0)
    mean_z = np.mean(object_points_utm[:, 2])
    mean_point = np.array([mean_xy[0], mean_xy[1], mean_z])
    object_points_local = object_points_utm - mean_point

    # 相機內參（請依實際需求替換）
    camera_matrix = np.array([
        [1204.40713462100, 0, 315.398819104802],
        [0, 1208.57726271458, 262.082380860140],
        [0, 0, 1]
    ], dtype=np.float32)


    # 使用 RANSAC + EPNP 進行解算
    success, rvec, tvec, _ = cv2.solvePnPRansac(
        object_points_local, image_points,
        camera_matrix, None,
        flags=cv2.SOLVEPNP_EPNP,
        reprojectionError=6.0,
        iterationsCount=150
    )

    if not success:
        raise RuntimeError("solvePnPRansac 解算失敗")

    R, _ = cv2.Rodrigues(rvec)
    cam_pos_local = (-R.T @ tvec).flatten()
    cam_pos_utm = cam_pos_local + mean_point
    lon, lat = utm_to_wgs84.transform(cam_pos_utm[0], cam_pos_utm[1])
    height = cam_pos_utm[2]

    return lat, lon, height
