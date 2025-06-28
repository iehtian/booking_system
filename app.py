from flask import Flask, request, jsonify, send_file,session
import json
import hashlib
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:5501", "http://127.0.0.1:5501"])


app.config.update(
    SESSION_COOKIE_SECURE=False      # 运行在HTTP环境，不用Secure
)


app.secret_key = 'your_secret_key'  # 用于会话加密
app.permanent_session_lifetime = 24*60 * 60 *30*6  # 设置会话过期时间为6个月

# 储存预约数据: { 'system_id': { '2025-06-01': { '09:00-09:30': '张三' } } }
# 使用嵌套字典结构，第一层是系统ID，然后是日期，然后是时间段
bookings = {
    'a_device': {},  # A仪器预约系统
}
users_db = {
    'admin': {
        'password': hashlib.md5('123456'.encode()).hexdigest(),
        'name': '管理员',
        'user_id': 1
    }
}

@app.route('/api/info_save', methods=['POST'])
def save_info():
    """将预约信息保存"""
    try:
        data = request.get_json()
        system_id = data.get('system', 'a_device')  # 默认为A仪器系统
        date = data.get('date')
        slots = data.get('slots')  # 现在接收时间段数组
        name = data.get('name')

        print(f"接收到的预约数据: {data}")
        
        if not date or not slots or not name:
            return jsonify({"error": "Missing required fields: date, slots, name"}), 400
        
        if not isinstance(slots, list) or len(slots) == 0:
            return jsonify({"error": "slots must be a non-empty array"}), 400
        
        # 确保系统存在
        if system_id not in bookings:
            bookings[system_id] = {}
        
        # 确保日期存在
        if date not in bookings[system_id]:
            bookings[system_id][date] = {}
        
        # 检查所有时间段是否已被预约
        conflicted_slots = []
        for slot in slots:
            if slot in bookings[system_id][date]:
                conflicted_slots.append({
                    "slot": slot,
                    "booked_by": bookings[system_id][date][slot]
                })
        
        if conflicted_slots:
            return jsonify({
                "error": "Some time slots are already booked",
                "conflicted_slots": conflicted_slots
            }), 409
        
        # 所有时间段都可用，批量保存预约
        successful_slots = []
        for slot in slots:
            bookings[system_id][date][slot] = name
            successful_slots.append(slot)
        
        print(f"批量预约成功: {name} 在 {date} 预约了 {len(successful_slots)} 个时间段")
        print(f"预约的时间段: {successful_slots}")
        print(f"当前预约数据: {bookings}")
        
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
    """获取预约信息并按时间段排序"""
    system_id = request.args.get('system', 'a_device')
    date = request.args.get('date')
    print(f"获取预约信息: system_id={system_id}, date={date}")
    if system_id not in bookings:
        return jsonify({"bookings": {}})
    
    if date:
        # 返回特定日期的预约
        print(f"查询特定日期的预约: {bookings}")
        date_bookings = bookings[system_id].get(date, {})
        print(f"特定日期的预约: {date_bookings}")
        sorted_bookings = dict(sorted(date_bookings.items()))
        return jsonify({"bookings": sorted_bookings})
    else:
        # 返回所有预约
        all_bookings = bookings[system_id]
        sorted_bookings = {date: dict(sorted(slots.items())) for date, slots in all_bookings.items()}
        return jsonify({"bookings": sorted_bookings})

@app.route('/api/register', methods=['POST'])
def get_register_info():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No registration data provided"}), 400
    
    user_name = data.get('username', 'default_user')
    password = data.get('password', 'default_password')
    name = data.get('name', 'default_name')
    print(f"获取注册信息: user_name={user_name}, password={password}, namespace={name}")
    if user_name and password and name:
        # 检查用户名是否已存在
        if user_name in users_db:
            return jsonify({"error": "Username already exists"}), 409
        
        # 保存用户信息
        user_id = len(users_db) + 1
        users_db[user_name] = {
            'password': hashlib.md5(password.encode()).hexdigest(),
            'name': name,
            'user_id': user_id
        }
    return jsonify({"message": "Please provide your registration details."})

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    """检查登录状态"""
    "打印当前session信息"
    print(f"当前session信息: {session}")
    if session.get('logged_in'):
        return jsonify({
            'logged_in': True,
            'user': {
                'username': session.get('username'),
                'name': session.get('name'),
                'user_id': session.get('user_id')
            }
        })
    else:
        return jsonify({'logged_in': False}), 401

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
    
    # 验证用户
    user = users_db.get(username)
    if not user or user['password'] != hashlib.md5(password.encode()).hexdigest():
        return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
    
    # 设置 session
    session.permanent = True  # 使 session 持久化
    session['logged_in'] = True
    session['user_id'] = user['user_id']
    session['username'] = username
    session['name'] = user['name']
    
    print(f"用户 {username} 登录成功，session contains: {', '.join(session.keys())}")
    
    return jsonify({
        'success': True,
        'message': '登录成功',
        'user': {
            'username': username,
            'name': user['name']
        }
    })

@app.route('/api/logout', methods=['POST'])
def logout():
    username = session.get('username', 'unknown')
    session.clear()  # 清除所有 session 数据
    
    print(f"用户 {username} 已登出")
    
    return jsonify({
        'success': True,
        'message': '已登出'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)