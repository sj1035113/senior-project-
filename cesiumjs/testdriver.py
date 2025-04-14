import sys
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time

sys.path.append(os.path.abspath("../python"))
options = Options()
options.headless = True
options.add_argument("--window-size=1920,1080")

driver = webdriver.Chrome(options=options)
driver.get("http://localhost:5500/main.html?cam_id=cam1")

print("✅ Chrome 無頭瀏覽器啟動成功")
time.sleep(2)
driver.save_screenshot("example.png")
driver.quit()
