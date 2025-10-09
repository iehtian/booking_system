import redis
import json
from redis.exceptions import ResponseError

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# -------- 用户相关 --------
def user_index_exists(index_name='user-idx'):
    try:
        return index_name in r.execute_command('FT._LIST')
    except ResponseError:
        return False

def create_user_index():
    index_name = 'user-idx'
    if user_index_exists(index_name):
        print(f"Index '{index_name}' already exists.")
        return
    r.execute_command(
        'FT.CREATE', index_name,
        'ON', 'JSON',
        'PREFIX', '1', 'user:',
        'SCHEMA',
        '$.ID', 'AS', 'ID', 'TAG',
        '$.real_name', 'AS', 'real_name', 'TAG'
    )
    print(f"Index '{index_name}' created.")

def escape_redis_search_value(value):
    """转义RediSearch中的特殊字符"""
    special_chars = {'-', '+', '=', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':', '\\', '/'}
    out = []
    for ch in value:
        if ch in special_chars:
            out.append('\\' + ch)
        else:
            out.append(ch)
    return ''.join(out)

def upsert_user(user_id, ID, password, real_name, color):
    key = f"user:{user_id}"
    data = {"ID": ID, "password": password, "real_name": real_name, "color": color}
    r.execute_command('JSON.SET', key, '$', json.dumps(data))
    print(f"Upserted {key}: {data}")

def search_user_by_ID(ID):
    escaped_id = escape_redis_search_value(ID)
    query = f'@ID:{{{escaped_id}}}'
    return search_user(query)

def search_user(query):
    results = r.execute_command('FT.SEARCH', 'user-idx', query)
    data = []
    for i in range(1, len(results), 2):
        key = results[i]
        json_data = json.loads(results[i + 1][1])
        data.append((key, json_data))
    return data

def search_all_users():
    results = r.execute_command('FT.SEARCH', 'user-idx', '*')
    data = []
    for i in range(1, len(results), 2):
        key = results[i]
        json_data = json.loads(results[i + 1][1])
        data.append((key, json_data))
    return data

# -------- 预约相关 --------
def booking_index_exists(index_name='booking-idx'):
    try:
        return index_name in r.execute_command('FT._LIST')
    except ResponseError:
        return False

def create_booking_index():
    index_name = 'booking-idx'
    if booking_index_exists(index_name):
        print(f"Index '{index_name}' already exists.")
        return
    r.execute_command(
        'FT.CREATE', index_name,
        'ON', 'JSON',
        'PREFIX', '1', 'booking:',
        'SCHEMA',
        '$.date', 'AS', 'date', 'TAG',
        '$.instrument_id', 'AS', 'instrument_id', 'TAG',
        '$.time', 'AS', 'time', 'TEXT',
        '$.name', 'AS', 'name', 'TAG'
    )
    print(f"Index '{index_name}' created.")

def upsert_booking(booking_id, instrument_id, date, time, name, color):
    key = f"booking:{booking_id}"
    data = {"date": date, "instrument_id": instrument_id, "time": time, "name": name, "color": color}
    r.execute_command('JSON.SET', key, '$', json.dumps(data))
    print(f"Upserted {key}: {data}")

def search_booking_by_date(instrument_id, date):
    date = escape_redis_search_value(date)
    instrument_id = escape_redis_search_value(instrument_id)
    query = f"@date:{{{date}}} @instrument_id:{{{instrument_id}}}"
    return search_booking(query)

def search_booking_by_date_and_name(instrument_id, date, name):
    date = escape_redis_search_value(date)
    name = escape_redis_search_value(name)
    instrument_id = escape_redis_search_value(instrument_id)
    query = f"@date:{{{date}}} @name:{{{name}}} @instrument_id:{{{instrument_id}}}"
    return search_booking(query)

def search_booking(query):
    results = r.execute_command('FT.SEARCH', 'booking-idx', query, 'LIMIT', '0', '50')
    data = []
    for i in range(1, len(results), 2):
        key = results[i]
        json_data = json.loads(results[i + 1][1])
        data.append((key, json_data))
    return data

def search_all_bookings():
    results = r.execute_command('FT.SEARCH', 'booking-idx', '*')
    data = []
    for i in range(1, len(results), 2):
        key = results[i]
        json_data = json.loads(results[i + 1][1])
        data.append((key, json_data))
    return data

def delete_booking(booking_id):
    key = f"booking:{booking_id}"
    r.delete(key)
    print(f"Deleted {key}")

# -------- 初始化 --------
def initialize_database():
    try:
        create_user_index()
        create_booking_index()
        return True
    except Exception as e:
        print(f"数据库初始化失败: {e}")
        return False

# -------- 示例逻辑 --------
if __name__ == '__main__':
    initialize_database()
    # 用户示例
    print("\n📅 users on fea:")
    for key, data in search_user_by_ID("fea"):
        print(f"{key}: {data}")

    print("\n🧑 users by Alice:")

    # 预约示例
    print("\n📅 Bookings on 2025-06-21:")
    for res in search_booking_by_date("a_device", "2025-06-21"):
        print(f"{res[0]}: {res[1]}")

    data = search_all_users()
    for key, user in data:
        print(f"Upserting user {user['real_name']}")
        upsert_user(user_id=key.split(':')[1], ID=user['ID'], password=user['password'], real_name=user['real_name'], color=user['color'])