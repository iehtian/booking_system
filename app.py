from flask import Flask, request, jsonify, send_file,session
import json
import hashlib
import os
from flask_cors import CORS

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
CORS(app, supports_credentials=True, origins=["http://localhost:5501", "http://127.0.0.1:5501"])


app.config.update(
    SESSION_COOKIE_SECURE=False      # 运行在HTTP环境，不用Secure
)


app.secret_key = 'your_secret_key'  # 用于会话加密
app.permanent_session_lifetime = 24*60 * 60 *30*6  # 设置会话过期时间为6个月

# 方法3: HSL色彩空间生成（更好的色彩分布）
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

@app.route('/api/info_save', methods=['POST'])
def save_info():
    """将预约信息保存"""
    try:
        data = request.get_json()
        system_id = data.get('system', 'a_device')  # 默认为A仪器系统
        date = data.get('date')
        slots = data.get('slots')  # 现在接收时间段数组
        name = data.get('name')
        color = data.get('color')  # 如果没有提供颜色，则生成随机颜色

        print(f"接收到的预约数据: {data}")
        
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
                name=name
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
    print(f"获取注册信息: ID={ID}, password={password}, namespace={name}")

    if ID and password and name:
        if(search_by_ID(ID)):
            return jsonify({"error": "User already exists"}), 400
        
        user_color = random_hsl_color()  # 生成随机颜色
        # 保存用户信息
        user_order = len(search_all_users()) + 1
        upsert_user(user_order, ID, hashlib.md5(password.encode()).hexdigest(), name, user_color)
    return jsonify({"success": "注册成功", "user": {"ID": ID, "name": name, "color": user_color}})

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    """检查登录状态"""
    "打印当前session信息"
    print(f"当前session信息: {session}")
    if session.get('logged_in'):
        ID = session.get('ID', 'unknown')
        if search_by_ID(ID):
            print(f"用户 {ID} 已登录")
            return jsonify({
            'logged_in': True,
            'user': {
                'ID': session.get('ID'),
                'name': session.get('name'),
                'user_id': session.get('user_id'),
                'color': session.get('color')  # 添加用户颜色
            }
        })
        else:
            print(f"用户 {ID} 不存在，清除session")
            session.clear()
            return jsonify({'logged_in': False}), 401
    else:
        return jsonify({'logged_in': False}), 401

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    ID = data.get('ID')
    password = data.get('password')
    
    if not ID or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
    
    # 验证用户
    user =search_by_ID(ID)
    if not user or user[0][1]['password'] != hashlib.md5(password.encode()).hexdigest():
        return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
    
    user_data = user[0][1]
    # 设置 session
    session.permanent = True  # 使 session 持久化
    session['logged_in'] = True
    session['ID'] = ID
    session['name'] = user_data['real_name']
    session['color'] = user_data.get('color', '#FEE2E2')

    print(f"用户 {ID} 登录成功，session contains: {', '.join(session.keys())}")
    
    return jsonify({
        'success': True,
        'message': '登录成功',
        'user': {
            'ID': ID,
            'name': user[0][1]['real_name'],
        }
    })

@app.route('/api/logout', methods=['POST'])
def logout():
    ID = session.get('ID', 'unknown')
    session.clear()  # 清除所有 session 数据
    
    print(f"用户 {ID} 已登出")
    
    return jsonify({
        'success': True,
        'message': '已登出'
    })

if __name__ == '__main__':
    if initialize_database():
        print("数据库初始化完成，系统已准备好运行。")
    else:
        print("数据库初始化失败，请检查错误日志。")
    app.run(host='0.0.0.0', port=5000, debug=True)