import sys
import os

# 获取当前文件所在目录
pwd = os.path.dirname(os.path.abspath(__file__))
# 将 back_end 目录添加到 Python 搜索路径
sys.path.append(os.path.join(pwd, "back_end"))

bind = "0.0.0.0:5000"
timeout = 120
# 将日志写到站点根目录之外，避免与前端静态资源目录混杂
accesslog = "/var/log/order/access.log"
errorlog = "/var/log/order/error.log"
loglevel = "info"
