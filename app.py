from flask import Flask, request, jsonify, send_file
import json
import os

from flask_cors import CORS

app = Flask(__name__)
CORS(app)
# 储存预约数据: { 'system_id': { '2025-06-01': { '09:00-09:15': '张三' } } }
# 使用嵌套字典结构，第一层是系统ID，然后是日期，然后是时间段
bookings = {
    'a_device': {},  # A仪器预约系统
}
def generate_time_slots():
    """生成00:00到24:00的半小时时间段"""
    slots = []
    for hour in range(0, 24):
        for minute in (0, 30):
            # 格式化开始时间 (HH:MM)
            start_time = f"{hour:02d}:{minute:02d}"
            
            # 计算结束时间
            if minute == 30:
                end_hour = hour + 1
                end_minute = 0
            else:
                end_hour = hour
                end_minute = 30
            
            # 处理24:00特殊情况
            if end_hour == 24:
                end_time = "24:00"
            else:
                end_time = f"{end_hour:02d}:{end_minute:02d}"
            
            slots.append({
                "start": start_time,
                "end": end_time,
                "display": f"{start_time} - {end_time}"
            })
    return slots

@app.route('/api/time_slots', methods=['GET'])
def get_time_slots():
    """返回时间段数据的API端点"""
    return jsonify({
        "time_slots": generate_time_slots()
    })

@app.route('/api/info_save', methods=['POST'])
def save_info():
    """将预约信息保存"""
    data = request.get_json()
    system_id = data.get('system', 'a_device')  # 默认为A仪器系统
    date = data.get('date')
    slot = data.get('slot')
    name = data.get('name')
    if not date or not slot or not name:
        return jsonify({"error": "Missing fields"}), 400
    bookings[system_id][date][slot] = name
    return jsonify({"success": True})

@app.route('/api/names', methods=['GET'])
def get_names():
    """获取所有预约的姓名"""
    name_file = 'data/names.json'
    if not os.path.exists(name_file):
        return jsonify({"error": "Names file not found"}), 404
    with open(name_file, 'r', encoding='utf-8') as f:
        names = json.load(f)
    return jsonify(names)
    
    result = save_info(test_data)
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)