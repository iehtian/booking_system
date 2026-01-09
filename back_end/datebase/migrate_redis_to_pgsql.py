import redis
import psycopg2
from psycopg2.extras import execute_values
import json

# Redis 配置
redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)

# PostgreSQL 配置
DB_CONFIG = {
    "host": "localhost",
    "user": "user_order_user",
    "password": "user_order_pass",
    "database": "user_order",
    "port": 5434,
}

USER_TABLE = "users"


def fetch_all_users_from_redis():
    """从 Redis 中获取所有用户数据"""
    results = redis_client.execute_command(
        "FT.SEARCH", "user-idx", "*", "LIMIT", "0", "1000"
    )
    users = []
    for i in range(1, len(results), 2):
        user_data = json.loads(results[i + 1][1])
        users.append(user_data)
    return users


def insert_users_into_pgsql(users):
    """将用户数据插入到 PostgreSQL"""
    sql = f"""
        INSERT INTO {USER_TABLE} (user_name, password, color)
        VALUES %s
        ON CONFLICT (user_name) DO NOTHING
    """
    values = [(user["real_name"], user["password"], user["color"]) for user in users]

    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, values)
            conn.commit()


def migrate_users():
    """迁移 Redis 用户到 PostgreSQL"""
    print("Fetching users from Redis...")
    users = fetch_all_users_from_redis()
    print(f"Fetched {len(users)} users from Redis.")

    print("Inserting users into PostgreSQL...")
    insert_users_into_pgsql(users)
    print("Migration completed.")


if __name__ == "__main__":
    migrate_users()
