from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
import bcrypt
import random
from pathlib import Path
from config import Config, SKIP_NAMES
import datebase as db_api
import verify_code
from log_config import logger


# ──────────────────────────────────────────────
# Flask App
# ──────────────────────────────────────────────
app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent.parent

CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:5501",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost:5173",
        "https://127.0.0.1:5173",
    ],
)


@app.after_request
def add_cache_headers(response):
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["Vary"] = "Authorization, Origin"
    return response


app.config.from_object(Config)
jwt = JWTManager(app)


# ──────────────────────────────────────────────
# 工具函数
# ──────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception as e:
        logger.error("密码验证异常: %s", e)
        return False


def random_color() -> str:
    colors = [
        "#FFC48A",
        "#79CB9B",
        "#4292C5",
        "#FFAEB0",
        "#F28147",
        "#90BFF9",
        "#8B90CE",
    ]
    return random.choice(colors)


DEFAULT_COOKIE_OPTIONS = {
    "httponly": True,
    "secure": True,
    "samesite": "Lax",
    "max_age": 30 * 24 * 60 * 60,
}


def set_cookie_with_defaults(response, key, value, **overrides):
    options = {**DEFAULT_COOKIE_OPTIONS, **overrides}
    response.set_cookie(key, value, **options)
    return response


# ──────────────────────────────────────────────
# 路由
# ──────────────────────────────────────────────
@app.route("/hello_world", methods=["GET"])
def hello_world():
    logger.info("健康检查接口被访问")
    response = jsonify({"message": "Hello, World!"})
    set_cookie_with_defaults(response, "test_cookie", "test_value")
    return response


@app.route("/api/info_save", methods=["POST"])
@jwt_required()
def save_info():
    """保存预约信息"""
    try:
        current_user_name = get_jwt_identity()
        data = request.get_json()

        instrument = data.get("instrument") or "a_instrument"
        date = data.get("date")
        slots_ids = data.get("slots")

        if not date or not slots_ids:
            logger.warning(
                "用户 [%s] 提交预约失败 - 缺少必要字段: date=%s, slots=%s",
                current_user_name,
                date,
                slots_ids,
            )
            return jsonify(
                {"error": "Missing required fields: date, slots, user_name"}
            ), 400

        if not isinstance(slots_ids, list) or len(slots_ids) == 0:
            logger.warning(
                "用户 [%s] 提交预约失败 - slots 格式错误: %s",
                current_user_name,
                slots_ids,
            )
            return jsonify({"error": "slots_ids must be a non-empty array"}), 400

        logger.info(
            "用户 [%s] 请求预约 | 仪器: %s | 日期: %s | 时间段: %s",
            current_user_name,
            instrument,
            date,
            slots_ids,
        )

        search_by_date_result = db_api.search_booking_by_date(instrument, date)
        if search_by_date_result:
            booked_times = [slot["time_slot_id"] for slot in search_by_date_result]
            for slot in slots_ids:
                if slot in booked_times:
                    logger.warning(
                        "用户 [%s] 预约冲突 | 仪器: %s | 日期: %s | 时间段 %s 已被占用",
                        current_user_name,
                        instrument,
                        date,
                        slot,
                    )
                    return jsonify(
                        {"error": f"Time slot {slot} is already booked"}
                    ), 409

        successful_slots = []
        for slot in slots_ids:
            db_api.upsert_booking(current_user_name, instrument, date, slot)
            successful_slots.append(slot)

        logger.info(
            "用户 [%s] 预约成功 | 仪器: %s | 日期: %s | 时间段: %s | 共 %d 个",
            current_user_name,
            instrument,
            date,
            successful_slots,
            len(successful_slots),
        )
        return jsonify(
            {
                "success": True,
                "message": f"Successfully booked {len(successful_slots)} time slots for {current_user_name} on {date}",
                "booked_slots": successful_slots,
            }
        )

    except Exception as e:
        logger.error("保存预约时发生异常: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/cancel_booking", methods=["POST"])
@jwt_required()
def cancel_booking():
    """取消预约"""
    try:
        current_user_name = get_jwt_identity()
        data = request.get_json()

        instrument = data.get("instrument") or "a_instrument"
        date = data.get("date")
        slots = data.get("slots")

        if not date or not slots:
            logger.warning(
                "用户 [%s] 取消预约失败 - 缺少字段: date=%s, slots=%s",
                current_user_name,
                date,
                slots,
            )
            return jsonify({"error": "Missing required fields: date, slots"}), 400

        if not isinstance(slots, list) or len(slots) == 0:
            logger.warning(
                "用户 [%s] 取消预约失败 - slots 格式错误: %s", current_user_name, slots
            )
            return jsonify({"error": "slots must be a non-empty array"}), 400

        logger.info(
            "用户 [%s] 请求取消预约 | 仪器: %s | 日期: %s | 时间段: %s",
            current_user_name,
            instrument,
            date,
            slots,
        )

        search_by_date_result = db_api.search_booking_by_date(instrument, date)
        if not search_by_date_result:
            logger.warning(
                "用户 [%s] 取消预约失败 - 指定日期 %s 无预约记录",
                current_user_name,
                date,
            )
            return jsonify({"error": "No bookings found for the specified date"}), 404

        booked_slot_ids = [slot["time_slot_id"] for slot in search_by_date_result]
        for slot in slots:
            if slot not in booked_slot_ids:
                logger.warning(
                    "用户 [%s] 取消预约失败 - 时间段 %s 在 %s 不存在",
                    current_user_name,
                    slot,
                    date,
                )
                return jsonify({"error": f"Time slot {slot} is not booked"}), 404

        deleted_count = db_api.delete_bookings_by_slots(instrument, date, slots)

        logger.info(
            "用户 [%s] 取消预约成功 | 仪器: %s | 日期: %s | 时间段: %s | 共取消 %d 个",
            current_user_name,
            instrument,
            date,
            slots,
            deleted_count,
        )
        return jsonify(
            {
                "success": True,
                "message": f"Successfully cancelled {deleted_count} time slots on {date}",
                "cancelled_slots": list(slots),
            }
        )

    except Exception as e:
        logger.error("取消预约时发生异常: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/daily_plan/update", methods=["POST"])
def update_daily_plan():
    """更新每日计划字段"""
    try:
        data = request.get_json() or {}
        user_name = data.get("user_name")
        date = data.get("date")

        if not user_name or not date:
            logger.warning(
                "更新每日计划失败 - 缺少字段: user_name=%s, date=%s", user_name, date
            )
            return jsonify({"error": "Missing required fields: user_name, date"}), 400

        field_key_map = {"plan": "plan", "status": "status", "remark": "remark"}

        updated = []
        for payload_key, db_field in field_key_map.items():
            value = data.get(payload_key)
            if value is not None and value != "":
                db_api.upsert_plan_field(user_name, date, db_field, value)
                updated.append(db_field)

        if not updated:
            logger.warning("用户 [%s] 更新每日计划失败 - 无有效字段", user_name)
            return jsonify({"error": "No updatable fields provided"}), 400

        logger.info(
            "用户 [%s] 更新每日计划 | 日期: %s | 更新字段: %s",
            user_name,
            date,
            updated,
        )
        return jsonify({"success": True, "updated": updated})

    except Exception as e:
        logger.error("更新每日计划时发生异常: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/bookings", methods=["GET"])
def get_bookings():
    """获取指定日期的预约信息"""
    instrument = request.args.get("instrument") or "a_instrument"
    date = request.args.get("date")

    if not date:
        logger.warning("获取预约信息失败 - 未提供 date 参数")
        return jsonify({"error": "Date parameter is required"}), 400

    logger.debug("查询预约信息 | 仪器: %s | 日期: %s", instrument, date)

    search_by_date_result = db_api.search_booking_by_date(instrument, date)
    if not search_by_date_result:
        return jsonify({"booking": ""}), 200

    bookings_dict = {
        slot["time_slot_id"]: {
            "user_name": slot["user_name"],
            "color": slot.get("color", "#ffffff"),
        }
        for slot in search_by_date_result
    }

    logger.debug(
        "预约查询结果 | 仪器: %s | 日期: %s | 共 %d 条",
        instrument,
        date,
        len(bookings_dict),
    )
    return jsonify({"bookings": bookings_dict})


@app.route("/api/bookings_user", methods=["GET"])
@jwt_required()
def get_user_bookings():
    """获取当前用户在指定日期的预约"""
    try:
        date = request.args.get("date")
        instrument = request.args.get("instrument")

        if not date or not instrument:
            return jsonify(
                {"error": "Date and instrument parameters are required"}
            ), 400

        current_user_name = get_jwt_identity()
        user = db_api.search_user_by_name(current_user_name)
        if not user:
            logger.warning("查询个人预约失败 - 用户 [%s] 不存在", current_user_name)
            return jsonify({"error": "User not found"}), 404

        user_bookings = db_api.search_booking_by_user_and_date(user["id"], date)
        times = [slot["time_slot_id"] for slot in user_bookings]

        logger.debug(
            "用户 [%s] 查询个人预约 | 仪器: %s | 日期: %s | 结果: %s",
            current_user_name,
            instrument,
            date,
            times,
        )
        return jsonify(times)

    except Exception as e:
        logger.error("获取用户预约信息时发生异常: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/register", methods=["POST"])
def get_register_info():
    """用户注册"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No registration data provided"}), 400

    user_name = data.get("user_name")
    password = data.get("password")
    email = data.get("email")
    phone = data.get("phone")

    if not user_name or not password:
        logger.warning("注册失败 - 缺少必要字段: user_name=%s", user_name)
        return jsonify({"error": "Missing required fields: user_name, password"}), 400

    if db_api.search_user_by_name(user_name):
        logger.warning("注册失败 - 用户名 [%s] 已存在", user_name)
        return jsonify({"error": "User name already exists"}), 400

    user_color = random_color()
    hashed_password = hash_password(password)
    db_api.upsert_user(user_name, hashed_password, user_color, email, phone)

    access_token = create_access_token(
        identity=user_name, additional_claims={"color": user_color}
    )
    logger.info("新用户注册成功 | 用户名: [%s]", user_name)
    return jsonify(
        {
            "success": True,
            "user": {"user_name": user_name, "color": user_color},
            "access_token": access_token,
        }
    )


@app.route("/api/check-auth", methods=["GET"])
@jwt_required()
def check_auth():
    """检查登录状态"""
    try:
        current_user_name = get_jwt_identity()
        user = db_api.search_user_by_name(current_user_name)
        if not user:
            logger.warning("认证检查失败 - 用户 [%s] 不存在", current_user_name)
            return jsonify({"logged_in": False, "message": "User not found"}), 401

        logger.debug("用户 [%s] 认证检查通过", current_user_name)
        return jsonify(
            {
                "logged_in": True,
                "user": {
                    "user_name": user["user_name"],
                    "id": user["id"],
                    "color": user.get("color", "#FEE2E2"),
                },
            }
        )

    except Exception as e:
        logger.error("认证检查时发生异常: %s", e, exc_info=True)
        return jsonify({"logged_in": False, "message": "Invalid token"}), 401


@app.route("/api/login", methods=["POST"])
def login():
    """用户登录"""
    data = request.get_json()
    user_name = data.get("user_name")
    password = data.get("password")

    if not user_name or not password:
        logger.warning("登录失败 - 请求缺少用户名或密码")
        return jsonify({"success": False, "message": "姓名和密码不能为空"}), 400

    user = db_api.search_user_by_name(user_name)
    if not user:
        logger.warning("登录失败 - 用户名 [%s] 不存在", user_name)
        return jsonify({"success": False, "message": "姓名或密码错误"}), 401

    if not verify_password(password, user["password"]):
        logger.warning("登录失败 - 用户 [%s] 密码错误", user_name)
        return jsonify({"success": False, "message": "姓名或密码错误"}), 401

    access_token = create_access_token(
        identity=user_name,
        additional_claims={"color": user.get("color", "#FEE2E2")},
    )
    logger.info("用户 [%s] 登录成功", user_name)

    response = jsonify(
        {
            "success": True,
            "message": "登录成功",
            "access_token": access_token,
            "user": {
                "user_name": user["user_name"],
                "color": user.get("color", "#FEE2E2"),
            },
        }
    )
    set_cookie_with_defaults(response, "user_name", user["user_name"])
    return response


@app.route("/api/logout", methods=["POST"])
@jwt_required()
def logout():
    """用户登出"""
    try:
        current_user_name = get_jwt_identity()
        logger.info("用户 [%s] 已登出", current_user_name)
        return jsonify({"success": True, "message": "已登出"})
    except Exception as e:
        logger.error("登出时发生异常: %s", e, exc_info=True)
        return jsonify({"success": False, "message": "Logout failed"}), 500


@app.route("/api/refresh", methods=["POST"])
@jwt_required()
def refresh():
    """刷新 JWT Token"""
    try:
        current_user_name = get_jwt_identity()
        user = db_api.search_user_by_name(current_user_name)
        if not user:
            logger.warning("Token 刷新失败 - 用户 [%s] 不存在", current_user_name)
            return jsonify({"success": False, "message": "User not found"}), 401

        new_token = create_access_token(
            identity=current_user_name,
            additional_claims={"color": user.get("color", "#FEE2E2")},
        )
        logger.debug("用户 [%s] Token 刷新成功", current_user_name)
        return jsonify({"success": True, "access_token": new_token})

    except Exception as e:
        logger.error("刷新 Token 时发生异常: %s", e, exc_info=True)
        return jsonify({"success": False, "message": "Token refresh failed"}), 500


@app.route("/api/daily_plan/all", methods=["GET"])
def get_all_daily_plans():
    """获取所有用户某日的每日计划"""
    try:
        date = request.args.get("date")
        if not date:
            return jsonify({"error": "Date parameter is required"}), 400

        res = db_api.get_all_dateinfo_by_date(date, SKIP_NAMES)

        logger.debug("查询所有用户每日计划 | 日期: %s | 共 %d 条", date, len(res))
        return jsonify({"success": True, "data": res})

    except Exception as e:
        logger.error("获取所有用户每日计划时发生异常: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/changelog", methods=["GET"])
def serve_changelog_md():
    """提供 changelog.md 文件"""
    changelog_path = BASE_DIR / "changelog.md"
    if not changelog_path.exists():
        logger.warning("changelog.md 文件不存在: %s", changelog_path)
        return jsonify({"error": "changelog.md not found"}), 404
    return send_from_directory(changelog_path.parent, changelog_path.name)


@app.route("/api/update_password", methods=["POST"])
@jwt_required()
def update_password():
    """更新当前用户的个人信息"""
    try:
        current_user_name = get_jwt_identity()
        data = request.get_json()

        user = db_api.search_user_by_name(current_user_name)
        if not user:
            logger.warning("更新信息失败 - 用户 [%s] 不存在", current_user_name)
            return jsonify({"error": "User not found"}), 404

        new_password = data.get("new_password")
        new_email = data.get("new_email")
        new_phone = data.get("new_phone")

        hashed_password = (
            hash_password(new_password) if new_password else user.get("password")
        )

        db_api.upsert_user(
            current_user_name,
            hashed_password,
            user.get("color", None),
            new_email if new_email else user.get("email"),
            new_phone if new_phone else user.get("phone"),
        )

        updated_fields = []
        if new_password:
            updated_fields.append("password")
        if new_email:
            updated_fields.append("email")
        if new_phone:
            updated_fields.append("phone")

        logger.info(
            "用户 [%s] 更新个人信息成功 | 修改字段: %s",
            current_user_name,
            updated_fields,
        )
        return jsonify({"success": True, "message": "Profile updated successfully"})

    except Exception as e:
        logger.error("更新个人信息时发生异常: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/send_reset_code", methods=["POST"])
def send_reset_code():
    """发送密码重置验证码"""
    try:
        data = request.get_json()
        user_name = data.get("user_name")
        method = data.get("method", "sms")

        if not user_name:
            return jsonify({"error": "User name is required"}), 400

        user = db_api.search_user_by_name(user_name)
        if not user:
            logger.warning("发送验证码失败 - 用户 [%s] 不存在", user_name)
            return jsonify({"error": "User not found"}), 404

        if method == "phone":
            phone = user.get("phone")
            if not phone:
                logger.warning("发送验证码失败 - 用户 [%s] 未绑定手机号", user_name)
                return jsonify({"error": "User has no phone number on record"}), 400
            verify_code.send_reset(user_name=user_name, phone=phone)
            logger.info("向用户 [%s] 手机发送重置验证码成功", user_name)

        elif method == "email":
            email = user.get("email")
            if not email:
                logger.warning("发送验证码失败 - 用户 [%s] 未绑定邮箱", user_name)
                return jsonify({"error": "User has no email on record"}), 400
            verify_code.send_reset(user_name=user_name, email=email)
            logger.info("向用户 [%s] 邮箱发送重置验证码成功", user_name)

        else:
            logger.warning("发送验证码失败 - 不支持的方式: %s", method)
            return jsonify({"error": "Unsupported method"}), 400

        return jsonify({"success": True, "message": "Reset code sent"})

    except Exception as e:
        logger.error("发送重置验证码时发生异常: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/reset_password", methods=["POST"])
def reset_password():
    """使用验证码重置密码"""
    try:
        data = request.get_json()
        user_name = data.get("user_name")
        code = data.get("code")
        new_password = data.get("new_password")

        if not user_name or not code or not new_password:
            return jsonify({"error": "Missing required fields"}), 400

        if not verify_code.verify_reset_code(user_name, code):
            logger.warning(
                "密码重置失败 - 用户 [%s] 提供的验证码无效或已过期", user_name
            )
            return jsonify({"error": "Invalid or expired reset code"}), 400

        hashed_password = hash_password(new_password)
        user = db_api.search_user_by_name(user_name)
        if not user:
            logger.warning("密码重置失败 - 用户 [%s] 不存在", user_name)
            return jsonify({"error": "User not found"}), 404

        db_api.upsert_user(
            user_name,
            hashed_password,
            user.get("color", None),
            user.get("email"),
            user.get("phone"),
        )

        logger.info("用户 [%s] 通过验证码重置密码成功", user_name)
        return jsonify({"success": True, "message": "Password has been reset"})

    except Exception as e:
        logger.error("重置密码时发生异常: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/is_email_configured", methods=["GET"])
def is_email_configured():
    """检查用户是否已绑定邮箱"""
    try:
        user_name = request.args.get("user_name")
        if not user_name:
            return jsonify({"error": "User name is required"}), 400

        user = db_api.search_user_by_name(user_name)
        if not user:
            logger.warning("检查邮箱配置失败 - 用户 [%s] 不存在", user_name)
            return jsonify({"error": "User not found"}), 404

        is_configured = bool(user.get("email"))
        logger.debug("用户 [%s] 邮箱配置状态: %s", user_name, is_configured)
        return jsonify({"is_email_configured": is_configured})

    except Exception as e:
        logger.error("检查邮箱配置时发生异常: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    if db_api.initialize_database():
        logger.info("数据库初始化完成（users/bookings/date_plans），系统已准备好运行")
    else:
        logger.error("数据库初始化失败，请检查错误日志")
    app.run(host="0.0.0.0", port=5000, debug=True)
