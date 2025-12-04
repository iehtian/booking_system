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
from config import Config, SKIP_NAMES
from datebase import (
    upsert_user,
    search_user_by_ID,
    upsert_booking,
    search_booking_by_date,
    search_booking_by_date_and_name,
    delete_booking,
    initialize_database,
    connect_to_database,
    upsert_plan_field,
    get_dateinfo,
    search_all_users,
)


app = Flask(__name__)
# 允许本地 http 与 https 的前端来源；开发推荐使用 Vite 代理后可不依赖 CORS
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
    # 仅控制接口缓存，静态文件由前端服务器/CDN 处理
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["Vary"] = "Authorization, Origin"
    return response


# JWT配置
app.config.from_object(Config)  # 加载配置类

# 初始化JWT管理器
jwt = JWTManager(app)


def hash_password(password):
    """使用bcrypt加密密码"""
    # 生成salt并加密密码
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")  # 返回字符串形式


def verify_password(password, hashed_password):
    """验证密码"""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception as e:
        print(f"密码验证出错: {e}")
        return False


def random_color():
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


# 统一的 Cookie 默认配置
DEFAULT_COOKIE_OPTIONS = {
    "httponly": True,
    "secure": True,
    "samesite": "Lax",  # 若需要跨站携带，改为 "None" 并确保 https
    "max_age": 30 * 24 * 60 * 60,  # 7 天
}


def set_cookie_with_defaults(response, key, value, **overrides):
    """在单处集中管理 Cookie 选项，避免到处手写。

    使用方式：set_cookie_with_defaults(response, "name", "value", max_age=3600)
    overrides 中的键将覆盖默认项。
    """
    options = {**DEFAULT_COOKIE_OPTIONS, **overrides}
    response.set_cookie(key, value, **options)
    return response


@app.route("/hello_world", methods=["GET"])
def hello_world():
    """用于验证服务是否正常运行"""
    # return jsonify({"message": "Hello, World!"})
    # 设置cookie示例
    response = jsonify({"message": "Hello, World!"})
    set_cookie_with_defaults(response, "test_cookie", "test_value")
    return response


@app.route("/api/info_save", methods=["POST"])
def save_info():
    """将预约信息保存"""
    try:
        data = request.get_json()
        print(f"接收到的预约数据: {data}")
        instrument = data.get("instrument") or data.get(
            "instrument", "a_instrument"
        )  # 默认为A仪器系统
        date = data.get("date")
        slots = data.get("slots")  # 现在接收时间段数组
        name = data.get("name")
        color = data.get("color")  # 如果没有提供颜色，则生成随机颜色

        if not date or not slots or not name:
            return jsonify({"error": "Missing required fields: date, slots, name"}), 400

        if not isinstance(slots, list) or len(slots) == 0:
            return jsonify({"error": "slots must be a non-empty array"}), 400

        search_by_date_result = search_booking_by_date(instrument, date)
        if search_by_date_result:
            tmies = [slot[1]["time"] for slot in search_by_date_result]
            for slot in slots:
                if slot in tmies:
                    return jsonify(
                        {"error": f"Time slot {slot} is already booked"}
                    ), 409

        # 所有时间段都可用，批量保存预约
        successful_slots = []
        for slot in slots:
            upsert_booking(
                booking_id=f"{instrument}:{date}:{slot}",
                instrument_id=instrument,
                date=date,
                time=slot,
                name=name,
                color=color,
            )
            successful_slots.append(slot)

        print(f"批量预约成功: {name} 在 {date} 预约了 {len(successful_slots)} 个时间段")
        print(f"预约的时间段: {successful_slots}")

        return jsonify(
            {
                "success": True,
                "message": f"Successfully booked {len(successful_slots)} time slots for {name} on {date}",
                "booked_slots": successful_slots,
            }
        )

    except Exception as e:
        print(f"保存预约时出错: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/cancel_booking", methods=["POST"])
def cancel_booking():
    """取消预约信息"""
    try:
        data = request.get_json()
        print(f"接收到的取消预约数据: {data}")
        instrument = data.get("instrument") or "a_instrument"
        date = data.get("date")
        slots = data.get("slots")

        if not date or not slots:
            return jsonify({"error": "Missing required fields: date, slots"}), 400
        if not isinstance(slots, list) or len(slots) == 0:
            return jsonify({"error": "slots must be a non-empty array"}), 400

        search_by_date_result = search_booking_by_date(instrument, date)
        if not search_by_date_result:
            return jsonify({"error": "No bookings found for the specified date"}), 404

        times = [slot[1]["time"] for slot in search_by_date_result]
        for slot in slots:
            if slot not in times:
                return jsonify({"error": f"Time slot {slot} is not booked"}), 404

        successful_cancellations = []
        for slot in slots:
            booking_id = f"{instrument}:{date}:{slot}"
            delete_booking(booking_id)
            successful_cancellations.append(slot)

        print(
            f"批量取消预约成功: {date} 取消了 {len(successful_cancellations)} 个时间段"
        )
        print(f"取消的时间段: {successful_cancellations}")
        return jsonify(
            {
                "success": True,
                "message": f"Successfully cancelled {len(successful_cancellations)} time slots on {date}",
                "cancelled_slots": successful_cancellations,
            }
        )
    except Exception as e:
        print(f"取消预约时出错: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/daily_plan/update", methods=["POST"])
def update_daily_plan():
    """统一的每日计划字段更新接口。
    请求体可包含 plan / status / remark 中的任意组合；缺失的字段不更新。
    示例 JSON:
    {"user_id":1,"date":"2025-11-22","plan":"学习","status":"进行中","remark":"加油"}
    """
    try:
        data = request.get_json() or {}
        print(f"接收到的每日计划更新数据: {data}")
        user_id = data.get("user_id")
        date = data.get("date")
        if not user_id or not date:
            return jsonify({"error": "Missing required fields: user_id, date"}), 400

        # 前端字段与数据库字段的映射
        field_key_map = {
            "plan": "plan",  # 兼容旧前端命名
            "status": "status",
            "remark": "remark",
        }

        db = connect_to_database()
        updated = []
        for payload_key, db_field in field_key_map.items():
            value = data.get(payload_key)
            if value is not None and value != "":  # 仅在有值时更新
                upsert_plan_field(db, user_id, date, db_field, value)
                updated.append(db_field)
        db.close()

        if not updated:
            return jsonify({"error": "No updatable fields provided"}), 400

        return jsonify({"success": True, "updated": updated})

    except Exception as e:
        print(f"更新每日计划字段时出错: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/bookings", methods=["GET"])
def get_bookings():
    """获取预约信息并按时间段排序，返回 {time: {name,color}} 字典"""
    instrument = request.args.get("instrument") or "a_instrument"
    date = request.args.get("date")
    print(f"获取预约信息: instrument={instrument}, date={date}")

    if not date:
        return jsonify({"error": "Date parameter is required"}), 400

    search_by_date_result = search_booking_by_date(instrument, date)
    print(f"原始数据库查询结果: {search_by_date_result}")

    if not search_by_date_result:
        return jsonify({"booking": ""}), 200

    bookings_dict = {}
    for slot in search_by_date_result:
        time_slot = slot[1]["time"]
        name = slot[1]["name"]
        color = slot[1].get("color", "#ffffff")
        bookings_dict[time_slot] = {"name": name, "color": color}

    print(f"时间段和预约人 (字典格式): {bookings_dict}")
    return jsonify({"bookings": bookings_dict})


@app.route("/api/bookings_user", methods=["GET"])
@jwt_required()
def get_user_bookings():
    """获取特定日期当前用户的所有预约信息"""
    try:
        date = request.args.get("date")
        instrument = request.args.get("instrument") or request.args.get("instrument")

        if not date or not instrument:
            return jsonify(
                {"error": "Date and instrument parameters are required"}
            ), 400

        current_user_id = get_jwt_identity()
        user = search_user_by_ID(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        user_name = user[0][1]["real_name"]
        print(f"获取用户 {current_user_id} 的预约信息，用户名: {user_name}")
        user_bookings = search_booking_by_date_and_name(instrument, date, user_name)
        print(f"用户 {user_name} 在 {date} 的预约记录: {user_bookings}")
        times = [slot[1]["time"] for slot in user_bookings]
        print(f"当前用户在 {date} 的预约时间段: {times}")
        return jsonify(times)

    except Exception as e:
        print(f"获取用户预约信息时出错: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/register", methods=["POST"])
def get_register_info():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No registration data provided"}), 400

    ID = data.get("ID", "default_user")
    password = data.get("password", "default_password")
    name = data.get("name", "default_name")
    print(f"获取注册信息: ID={ID}, password=[已隐藏], namespace={name}")

    if ID and password and name:
        if search_user_by_ID(ID):
            return jsonify({"error": "User already exists"}), 400

        user_color = random_color()  # 生成随机颜色

        # 使用bcrypt加密密码
        hashed_password = hash_password(password)

        upsert_user(f"byID:{ID}", ID, hashed_password, name, user_color)

        # 注册成功后自动生成JWT token
        access_token = create_access_token(
            identity=ID, additional_claims={"name": name, "color": user_color}
        )
        print(f"用户 {ID} 注册成功，生成JWT token")
        return jsonify(
            {
                "success": True,
                "user": {"ID": ID, "name": name, "color": user_color},
                "access_token": access_token,
            }
        )

    return jsonify({"error": "Missing required fields"}), 400


@app.route("/api/check-auth", methods=["GET"])
@jwt_required()
def check_auth():
    """检查登录状态"""
    try:
        current_user_id = get_jwt_identity()

        print(f"当前用户: {current_user_id}")

        # 验证用户是否仍然存在
        user = search_user_by_ID(current_user_id)
        if not user:
            print(f"用户 {current_user_id} 不存在")
            return jsonify({"logged_in": False, "message": "User not found"}), 401

        user_data = user[0][1]
        print(f"用户 {current_user_id} 已登录")

        return jsonify(
            {
                "logged_in": True,
                "user": {
                    "ID": current_user_id,
                    "name": user_data["real_name"],
                    "color": user_data.get("color", "#FEE2E2"),
                },
            }
        )

    except Exception as e:
        print(f"检查认证时出错: {e}")
        return jsonify({"logged_in": False, "message": "Invalid token"}), 401


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    ID = data.get("ID")
    password = data.get("password")

    if not ID or not password:
        return jsonify({"success": False, "message": "用户名和密码不能为空"}), 400

    # 验证用户
    user = search_user_by_ID(ID)
    if not user:
        return jsonify({"success": False, "message": "用户名或密码错误"}), 401

    user_data = user[0][1]

    # 使用bcrypt验证密码
    if not verify_password(password, user_data["password"]):
        return jsonify({"success": False, "message": "用户名或密码错误"}), 401

    # 创建JWT token
    access_token = create_access_token(
        identity=ID,
        additional_claims={
            "name": user_data["real_name"],
            "color": user_data.get("color", "#FEE2E2"),
        },
    )

    print(f"用户 {ID} 登录成功，生成JWT token")
    response = jsonify(
        {
            "success": True,
            "message": "登录成功",
            "access_token": access_token,
            "user": {
                "ID": ID,
                "name": user_data["real_name"],
                "color": user_data.get("color", "#FEE2E2"),
            },
        }
    )
    response.set_cookie("user_ID", ID, httponly=True, secure=True)
    # 统一使用集中配置；如需覆盖，在此传入额外参数
    set_cookie_with_defaults(response, "user_ID", ID)
    set_cookie_with_defaults(response, "user_name", user_data["real_name"])

    return response


@app.route("/api/logout", methods=["POST"])
@jwt_required()
def logout():
    try:
        return jsonify({"success": True, "message": "已登出"})

    except Exception as e:
        print(f"登出时出错: {e}")
        return jsonify({"success": False, "message": "Logout failed"}), 500


@app.route("/api/refresh", methods=["POST"])
@jwt_required()
def refresh():
    """刷新JWT token"""
    try:
        current_user_id = get_jwt_identity()
        user = search_user_by_ID(current_user_id)

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 401

        user_data = user[0][1]

        # 创建新的token
        new_token = create_access_token(
            identity=current_user_id,
            additional_claims={
                "name": user_data["real_name"],
                "color": user_data.get("color", "#FEE2E2"),
            },
        )

        return jsonify({"success": True, "access_token": new_token})

    except Exception as e:
        print(f"刷新token时出错: {e}")
        return jsonify({"success": False, "message": "Token refresh failed"}), 500


@app.route("/api/daily_plan/get", methods=["GET"])
def get_daily_plan():
    """获取每日计划"""
    try:
        user_id = request.args.get("user_id")
        date = request.args.get("date")

        if not user_id or not date:
            return jsonify({"error": "Missing required fields: user_id, date"}), 400

        db = connect_to_database()
        info = get_dateinfo(db, user_id, date)
        db.close()

        return jsonify({"success": True, "info": info})

    except Exception as e:
        print(f"获取每日计划时出错: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/daily_plan/all", methods=["GET"])
def get_all_daily_plans():
    """获取用户所有每日计划"""
    try:
        date = request.args.get("date")
        if not date:
            return jsonify({"error": "Date parameter is required"}), 400
        db = connect_to_database()
        data = search_all_users()
        res = []
        # search_all_users 返回形如 (key, user_dict) 的元组列表
        for _, user in data:
            user_id = user.get("ID")
            real_name = user.get("real_name")
            if real_name and real_name in SKIP_NAMES:
                continue  # 跳过名单中的用户
            info = get_dateinfo(db, user_id, date)
            res.append({"user": real_name, "info": info})
        db.close()
        return jsonify({"success": True, "data": res})
    except Exception as e:
        print(f"获取所有用户每日计划时出错: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/changelog", methods=["GET"])
def serve_changelog_md():
    """在生产环境通过后端路由提供 changelog.md。
    前端以 `/changelog.md` 访问即可，无需静态服务器额外配置。
    """
    return send_from_directory(app.root_path, "changelog.md")


if __name__ == "__main__":
    if initialize_database():
        print("数据库初始化完成，系统已准备好运行。")
    else:
        print("数据库初始化失败，请检查错误日志。")
    app.run(host="0.0.0.0", port=5000, debug=True)
