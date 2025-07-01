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
    index_name = 'user-idx'
    if index_exists(index_name):
        print(f"Index '{index_name}' already exists.")
        return
    r.execute_command(
        'FT.CREATE', index_name,
        'ON', 'JSON',
        'PREFIX', '1', 'user:',
        'SCHEMA',
        '$.user_name', 'AS', 'user_name', 'TAG',
        '$.real_name', 'AS', 'real_name', 'TAG'
    )
    print(f"Index '{index_name}' created.")

# 插入或更新预订记录
def upsert_user(user_id, user_name, password, real_name, color):
    key = f"user:{user_id}"
    data = {"user_name": user_name, "password": password, "real_name": real_name, "color": color}
    r.execute_command('JSON.SET', key, '$', json.dumps(data))
    print(f"Upserted {key}: {data}")

# 查询指定日期
def search_by_user_name(user_name):
    query = f"@user_name:{{{user_name}}}"
    return search(query)

# 查询指定姓名（支持中文）
def search_by_real_name(real_name):
    query = f"@real_name:{{{real_name}}}"
    return search(query)

# 执行查询并解析结果
def search(query):
    results = r.execute_command('FT.SEARCH', 'user-idx', query)
    data = []
    for i in range(1, len(results), 2):
        key = results[i]
        json_data = json.loads(results[i + 1][1])
        data.append((key, json_data))
    return data
def search_all():
    results = r.execute_command('FT.SEARCH', 'user-idx', '*')
    data = []
    for i in range(1, len(results), 2):
        key = results[i]
        json_data = json.loads(results[i + 1][1])
        data.append((key, json_data))
    return data
# 示例执行逻辑
if __name__ == '__main__':
    create_index()

    # 查询某天的预订
    print("\n📅 users on fea:")
    for key, data in search_by_user_name("fea"):
        print(f"{key}: {data}")

    # 查询 Alice
    print("\n🧑 users by Alice:")
    for key, data in search_by_real_name("Alice"):
        print(f"{key}: {data}")
    
    # 查询所有用户
    print("\n🧑 All users:")
    print(len(search_all()))
