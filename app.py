from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import timedelta
import bcrypt
from config import Config
from datebase import (
    upsert_user, 
    search_by_ID, 
    search_by_real_name,
    search_all_users,
    upsert_booking, 
    search_by_date, 
    search_by_name,
    initialize_database,
    search_all_bookings
)



app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:5501", "http://127.0.0.1:5501","http://127.0.0.1:5502", "http://localhost:5502"])

# JWT配置
app.config.from_object(Config)  # 加载配置类

# 初始化JWT管理器
jwt = JWTManager(app)

def hash_password(password):
    """使用bcrypt加密密码"""
    # 生成salt并加密密码
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')  # 返回字符串形式

def verify_password(password, hashed_password):
    """验证密码"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"密码验证出错: {e}")
        return False

def random_hsl_color():
    import colorsys
    import random
    # 随机色相(0-360度)，固定饱和度和亮度保证颜色鲜艳
    hue = random.random()  # 0-1
    saturation = random.uniform(0.6, 0.9)  # 60%-90%饱和度
    lightness = random.uniform(0.4, 0.7)   # 40%-70%亮度
    
    rgb = colorsys.hls_to_rgb(hue, lightness, saturation)
    r, g, b = [int(x * 255) for x in rgb]
    return f"#{r:02x}{g:02x}{b:02x}"

@app.route('/hello_world', methods=['GET'])
def hello_world():
    """用于验证服务是否正常运行"""
    return jsonify({"message": "Hello, World!"})

@app.route('/api/info_save', methods=['POST'])
def save_info():
    """将预约信息保存"""
    try:
        
        data = request.get_json()
        print(f"接收到的预约数据: {data}")
        system_id = data.get('system', 'a_device')  # 默认为A仪器系统
        date = data.get('date')
        slots = data.get('slots')  # 现在接收时间段数组
        name = data.get('name')
        color = data.get('color')  # 如果没有提供颜色，则生成随机颜色

        
        
        if not date or not slots or not name:
            return jsonify({"error": "Missing required fields: date, slots, name"}), 400
        
        if not isinstance(slots, list) or len(slots) == 0:
            return jsonify({"error": "slots must be a non-empty array"}), 400
        
        search_by_date_result = search_by_date(system_id, date)
        if search_by_date_result:
            tmies = [slot[1]['time'] for slot in search_by_date_result]
            for slot in slots:
                if slot in tmies:
                    return jsonify({"error": f"Time slot {slot} is already booked"}), 409
        
        # 所有时间段都可用，批量保存预约
        successful_slots = []
        for slot in slots:
            upsert_booking(
                booking_id=f"{system_id}:{date}:{slot}", 
                system_id=system_id, 
                date=date, 
                time=slot, 
                name=name,
                color= color
            )
            successful_slots.append(slot)
        
        print(f"批量预约成功: {name} 在 {date} 预约了 {len(successful_slots)} 个时间段")
        print(f"预约的时间段: {successful_slots}")
        
        return jsonify({
            "success": True, 
            "message": f"Successfully booked {len(successful_slots)} time slots for {name} on {date}",
            "booked_slots": successful_slots
        })
        
    except Exception as e:
        print(f"保存预约时出错: {e}")
        return jsonify({"error": "Internal server error"}), 500
    
@app.route('/api/orderd', methods=['GET'])
def get_ordered_bookings():
    """获取预约信息并按时间段排序，返回 {time: name} 字典"""
    system_id = request.args.get('system', 'a_device')
    date = request.args.get('date')
    print(f"获取预约信息: system_id={system_id}, date={date}")
    
    if date:
        # 返回特定日期的预约
        search_by_date_result = search_by_date(system_id, date)
        print(f"原始数据库查询结果: {search_by_date_result}") # 保持原始结果的打印
        
        if not search_by_date_result:
            return jsonify({"error": "No bookings found for the specified date"}), 404
        
        # 将结果转换为 {时间段: 预约人} 的字典格式
        ordered_bookings_dict = {}
        for slot in search_by_date_result:
            time_slot = slot[1]['time']
            name = slot[1]['name']
            # 假设数据库中有 color 字段，如果没有则设置默认值
            color = slot[1].get('color', '#ffffff')  # 默认黑色
            
            ordered_bookings_dict[time_slot] = {
                "name": name,
                "color": color
            }
        # 打印转换后的字典，保持风格
        print(f"时间段和预约人 (字典格式): {ordered_bookings_dict}")
        
        # 将字典打包成 JSON 响应
        res = jsonify({"bookings": ordered_bookings_dict})
        return res
    else:
        # 如果没有提供日期，返回错误提示
        return jsonify({"error": "Date parameter is required"}), 400

@app.route('/api/register', methods=['POST'])
def get_register_info():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No registration data provided"}), 400
    
    ID = data.get('ID', 'default_user')
    password = data.get('password', 'default_password')
    name = data.get('name', 'default_name')
    print(f"获取注册信息: ID={ID}, password=[已隐藏], namespace={name}")

    if ID and password and name:
        if(search_by_ID(ID)):
            return jsonify({"error": "User already exists"}), 400
        
        user_color = random_hsl_color()  # 生成随机颜色
        
        # 使用bcrypt加密密码
        hashed_password = hash_password(password)
        
        # 保存用户信息
        user_order = len(search_all_users()) + 1
        upsert_user(user_order, ID, hashed_password, name, user_color)
        
        # 注册成功后自动生成JWT token
        access_token = create_access_token(
            identity=ID,
            additional_claims={
                'name': name,
                'color': user_color
            }
        )
        print(f"用户 {ID} 注册成功，生成JWT token")
        return jsonify({
            "success": True, 
            "user": {"ID": ID, "name": name, "color": user_color},
            "access_token": access_token
        })
    
    return jsonify({"error": "Missing required fields"}), 400

@app.route('/api/check-auth', methods=['GET'])
@jwt_required()
def check_auth():
    """检查登录状态"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        print(f"当前用户: {current_user_id}")
        
        # 验证用户是否仍然存在
        user = search_by_ID(current_user_id)
        if not user:
            print(f"用户 {current_user_id} 不存在")
            return jsonify({'logged_in': False, 'message': 'User not found'}), 401
        
        user_data = user[0][1]
        print(f"用户 {current_user_id} 已登录")
        
        return jsonify({
            'logged_in': True,
            'user': {
                'ID': current_user_id,
                'name': user_data['real_name'],
                'color': user_data.get('color', '#FEE2E2')
            }
        })
        
    except Exception as e:
        print(f"检查认证时出错: {e}")
        return jsonify({'logged_in': False, 'message': 'Invalid token'}), 401

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    ID = data.get('ID')
    password = data.get('password')
    
    if not ID or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
    
    # 验证用户
    user = search_by_ID(ID)
    if not user:
        return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
    
    user_data = user[0][1]
    
    # 使用bcrypt验证密码
    if not verify_password(password, user_data['password']):
        return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
    
    # 创建JWT token
    access_token = create_access_token(
        identity=ID,
        additional_claims={
            'name': user_data['real_name'],
            'color': user_data.get('color', '#FEE2E2')
        }
    )

    print(f"用户 {ID} 登录成功，生成JWT token")
    
    return jsonify({
        'success': True,
        'message': '登录成功',
        'access_token': access_token,
        'user': {
            'ID': ID,
            'name': user_data['real_name'],
            'color': user_data.get('color', '#FEE2E2')
        }
    })

@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        current_user_id = get_jwt_identity()
        
        return jsonify({
            'success': True,
            'message': '已登出'
        })
        
    except Exception as e:
        print(f"登出时出错: {e}")
        return jsonify({'success': False, 'message': 'Logout failed'}), 500

@app.route('/api/refresh', methods=['POST'])
@jwt_required()
def refresh():
    """刷新JWT token"""
    try:
        current_user_id = get_jwt_identity()
        user = search_by_ID(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 401
        
        user_data = user[0][1]
        
        # 创建新的token
        new_token = create_access_token(
            identity=current_user_id,
            additional_claims={
                'name': user_data['real_name'],
                'color': user_data.get('color', '#FEE2E2')
            }
        )
        
        return jsonify({
            'success': True,
            'access_token': new_token
        })
        
    except Exception as e:
        print(f"刷新token时出错: {e}")
        return jsonify({'success': False, 'message': 'Token refresh failed'}), 500

if __name__ == '__main__':
    if initialize_database():
        print("数据库初始化完成，系统已准备好运行。")
    else:
        print("数据库初始化失败，请检查错误日志。")
    app.run(host='0.0.0.0', port=5000, debug=True)