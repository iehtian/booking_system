import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# 判断索引是否存在
def index_exists(index_name):
    try:
        return index_name in r.execute_command('FT._LIST')
    except redis.exceptions.ResponseError:
        return False

# 创建索引
def create_index():
    index_name = 'booking-idx'
    if index_exists(index_name):
        print(f"Index '{index_name}' already exists.")
        return
    r.execute_command(
        'FT.CREATE', index_name,
        'ON', 'JSON',
        'PREFIX', '1', 'booking:',
        'SCHEMA',
        '$.date', 'AS', 'date', 'TAG',
        '$.time', 'AS', 'time', 'TEXT',
        '$.name', 'AS', 'name', 'TAG'
    )
    print(f"Index '{index_name}' created.")

# 插入或更新预订记录
def upsert_booking(booking_id, date, time, name):
    key = f"booking:{booking_id}"
    data = {"date": date, "time": time, "name": name}
    r.execute_command('JSON.SET', key, '$', json.dumps(data))
    print(f"Upserted {key}: {data}")

# 查询指定日期
def search_by_date(date):
    date = date.replace('-', '\\-')  # 格式化日期为 YYYYMMDD
    query = f"@date:{{{date}}}"
    return search(query)

# 查询指定姓名（支持中文）
def search_by_name(name):
    query = f"@name:{{{name}}}"
    return search(query)

# 执行查询并解析结果
def search(query):
    results = r.execute_command('FT.SEARCH', 'booking-idx', query)
    data = []
    for i in range(1, len(results), 2):
        key = results[i]
        json_data = json.loads(results[i + 1][1])
        data.append((key, json_data))
    return data

def search_all():
    results = r.execute_command('FT.SEARCH', 'booking-idx', '*')
    data = []
    for i in range(1, len(results), 2):
        key = results[i]
        json_data = json.loads(results[i + 1][1])
        data.append((key, json_data))
    return data

# 示例执行逻辑
if __name__ == '__main__':
    create_index()

    # 插入或更新数据（含中文）
    # upsert_booking(2, "2025-06-21", "10:00-11:00", "Bob")
    # upsert_booking(3, "2025-06-22", "09:00-10:00", "Alice")

    # 查询某天的预订
    print("\n📅 Bookings on 2025-06-21:")
    for key, data in search_by_date("2025-06-21"):
        print(f"{key}: {data}")

    # 查询 Alice
    print("\n🧑 Bookings by Alice:")
    for key, data in search_by_name("Alice"):
        print(f"{key}: {data}")
