import logging
import logging.handlers
import os

# ──────────────────────────────────────────────
# 日志配置
# ──────────────────────────────────────────────
LOG_DIR = "/var/log/order"


def _build_logger() -> logging.Logger:
    """构建应用级 Logger。
    优先同时写文件和控制台；若日志目录无写入权限则降级为仅控制台输出。
    格式：[时间] [级别] [模块:行号] 消息
    """
    fmt = logging.Formatter(
        fmt="[%(asctime)s] [%(levelname)s] [%(module)s:%(lineno)d] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    logger = logging.getLogger("app")
    logger.setLevel(logging.DEBUG)

    # 控制台 Handler（始终启用）
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(fmt)
    logger.addHandler(console_handler)

    # 滚动文件 Handler（每天一个文件，保留 30 天）
    # 若目录不存在或无权限，跳过并打印警告
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        file_handler = logging.handlers.TimedRotatingFileHandler(
            filename=os.path.join(LOG_DIR, "app.log"),
            when="midnight",
            backupCount=30,
            encoding="utf-8",
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(fmt)
        logger.addHandler(file_handler)
    except (PermissionError, OSError) as e:
        logger.warning("无法写入日志文件 (%s)，仅输出到控制台", e)

    return logger


logger = _build_logger()
