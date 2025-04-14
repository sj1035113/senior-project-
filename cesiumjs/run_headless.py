from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument("--enable-webgl")
options.add_argument("--ignore-gpu-blocklist")
options.add_argument("--enable-accelerated-2d-canvas")
options.add_argument("--enable-gpu-rasterization")
options.add_argument("--use-gl=desktop")
options.add_argument("--disable-software-rasterizer")
options.add_argument("--window-size=1920,1080")
driver = webdriver.Chrome(options=options)
driver.get("http://localhost:5500/main.html")

print("✅ 無頭 Cesium 已啟動，按 Enter 以關閉...")
input()  # 👈 這一行會暫停直到你按 Enter

driver.quit()
