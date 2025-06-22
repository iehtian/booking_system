from flask import Flask, request, jsonify, send_file
import json
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 储存预约数据: { 'system_id': { '2025-06-01': { '09:00-09:30': '张三' } } }
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
                "display": f"{start_time}-{end_time}"
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

@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    """获取所有预约信息"""
    system_id = request.args.get('system', 'a_device')
    date = request.args.get('date')
    if system_id not in bookings:
        return jsonify({"bookings": {}})
    
    if date:
        # 返回特定日期的预约
        date_bookings = bookings[system_id].get(date, {})
        return jsonify({"bookings": date_bookings})
    else:
        # 返回所有预约
        return jsonify({"bookings": bookings[system_id]})
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
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)