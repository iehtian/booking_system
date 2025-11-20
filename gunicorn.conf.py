bind = "0.0.0.0:5000"
timeout = 120
# 将日志写到站点根目录之外，避免与前端静态资源目录混杂
accesslog = "/var/log/order/access.log"
errorlog = "/var/log/order/error.log"
loglevel = "info"
