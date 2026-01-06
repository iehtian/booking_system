import psycopg2
from contextlib import contextmanager
import logging


DB_CONFIG = {
    "host": "localhost",
    "user": "user_order_user",
    "password": "user_order_pass",
    "database": "user_order",
    "port": 5434,
}

USER_TABLE = "users"
BOOKING_TABLE = "bookings"


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


@contextmanager
def get_connection():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


# -------- 用户相关 --------
def user_index_exists(index_name=USER_TABLE):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass(%s)", (f"public.{index_name}",))
            exists = cur.fetchone()[0] is not None
    return exists


def create_user_index():
    with get_connection() as conn:
        with conn.cursor() as cur:
            # 创建用户表，使用 SERIAL 作为主键
            cur.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {USER_TABLE} (
                    id SERIAL PRIMARY KEY,
                    password TEXT NOT NULL,
                    user_name TEXT UNIQUE NOT NULL,
                    color TEXT NOT NULL,
                    email TEXT CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{(2,)}$'),
                    phone TEXT CHECK (phone ~* '^1[3-9]\d{9}$'),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + INTERVAL '8 HOURS'
                )
                """
            )
            # 为常用查询字段创建索引
            cur.execute(
                f"CREATE INDEX IF NOT EXISTS idx_{USER_TABLE}_user_name ON {USER_TABLE}(user_name)"
            )
            conn.commit()
    print(f"Table '{USER_TABLE}' ensured.")


def upsert_user(user_name, password=None, color=None, email=None, phone=None):
    """插入或更新用户信息"""
    # 构建字段列表
    insert_fields = ["user_name"]
    insert_values = [user_name]
    update_clauses = []

    # 动态添加字段
    if password:
        insert_fields.append("password")
        insert_values.append(password)
        update_clauses.append("password = EXCLUDED.password")

    if color:
        insert_fields.append("color")
        insert_values.append(color)
        update_clauses.append("color = EXCLUDED.color")

    if email:
        insert_fields.append("email")
        insert_values.append(email)
        update_clauses.append("email = EXCLUDED.email")

    if phone:
        insert_fields.append("phone")
        insert_values.append(phone)
        update_clauses.append("phone = EXCLUDED.phone")

    if not update_clauses:
        raise ValueError("没有提供要更新的字段")

    # 构建 SQL
    placeholders = ", ".join(["%s"] * len(insert_fields))
    sql = f"""
        INSERT INTO {USER_TABLE} ({", ".join(insert_fields)})
        VALUES ({placeholders})
        ON CONFLICT (user_name) DO UPDATE
        SET {", ".join(update_clauses)}
        RETURNING id
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(insert_values))
            user_id = cur.fetchone()[0]
            conn.commit()

    print(f"Upserted user '{user_name}' (id={user_id})")
    return user_id


def _row_to_user(row):
    """将数据库行转换为用户字典，字段顺序与 SELECT 对齐"""
    return {
        "id": row[0],
        "user_name": row[1],
        "password": row[2],
        "color": row[3],
        "email": row[4],
        "phone": row[5],
        "created_at": row[6].isoformat() if row[6] else None,
    }


def search_user_by_name(user_name):
    """根据用户名查询用户"""
    sql = f"""
        SELECT id, user_name, password, color, email, phone, created_at
        FROM {USER_TABLE}
        WHERE user_name = %s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_name,))
            row = cur.fetchone()
            logging.debug(
                f"search_user_by_name('{user_name}') returned {'1 row' if row else '0 rows'}"
            )
    return _row_to_user(row) if row else None


def search_all_users():
    """查询所有用户"""
    sql = f"""
        SELECT id, user_name, password, color, email, phone, created_at
        FROM {USER_TABLE}
        ORDER BY user_name
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    return [_row_to_user(row) for row in rows]


# -------- 预约相关 --------
def create_booking_index():
    with get_connection() as conn:
        with conn.cursor() as cur:
            # 创建预约表
            cur.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {BOOKING_TABLE} (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    instrument_id TEXT NOT NULL,
                    booking_date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_user 
                        FOREIGN KEY (user_id) 
                        REFERENCES {USER_TABLE}(id) 
                        ON DELETE CASCADE,
                    CONSTRAINT unique_time_slot 
                        UNIQUE (instrument_id, booking_date, start_time, end_time),
                    CONSTRAINT check_time_order 
                        CHECK (end_time > start_time)
                )
                """
            )
            # 创建索引优化查询
            cur.execute(
                f"CREATE INDEX IF NOT EXISTS idx_{BOOKING_TABLE}_user_id ON {BOOKING_TABLE}(user_id)"
            )
            cur.execute(
                f"CREATE INDEX IF NOT EXISTS idx_{BOOKING_TABLE}_date ON {BOOKING_TABLE}(booking_date)"
            )
            cur.execute(
                f"CREATE INDEX IF NOT EXISTS idx_{BOOKING_TABLE}_instrument_date ON {BOOKING_TABLE}(instrument_id, booking_date)"
            )
            conn.commit()
    print(f"Table '{BOOKING_TABLE}' ensured.")


def upsert_booking(user_name, instrument_id, date, start_time, end_time):
    """插入预约，通过 user_name 获取 user_id"""
    # 先根据 user_name 查询 user_id
    get_user_sql = f"SELECT id FROM {USER_TABLE} WHERE user_name = %s"

    insert_sql = f"""
        INSERT INTO {BOOKING_TABLE}
            (user_id, instrument_id, booking_date, start_time, end_time)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """
    logging.info(
        f"Creating booking -> "
        f"{{'user_name': {user_name}, 'instrument_id': {instrument_id}, "
        f"'date': {date}, 'time': {start_time}-{end_time}}}"
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            # 获取 user_id
            cur.execute(get_user_sql, (user_name,))
            result = cur.fetchone()

            if result is None:
                raise ValueError(f"用户 '{user_name}' 不存在")

            user_id = result[0]

            # 插入预约
            cur.execute(
                insert_sql, (user_id, instrument_id, date, start_time, end_time)
            )
            booking_id = cur.fetchone()[0]
            conn.commit()

    print(
        f"Created booking id={booking_id} -> "
        f"{{'user_name': {user_name}, 'user_id': {user_id}, "
        f"'instrument_id': {instrument_id}, 'date': {date}, "
        f"'time': {start_time}-{end_time}}}"
    )
    return booking_id


def _row_to_booking(row):
    """将数据库行转换为预约字典

    期望行格式: (id, user_id, instrument_id, booking_date, start_time, end_time, user_name)
    """
    return {
        "id": row[0],
        "user_id": row[1],
        "instrument_id": row[2],
        "date": row[3].isoformat() if row[3] else None,
        "start_time": row[4].strftime("%H:%M") if row[4] else None,
        "end_time": row[5].strftime("%H:%M") if row[5] else None,
        "time": f"{row[4].strftime('%H:%M')}-{row[5].strftime('%H:%M')}"
        if row[4] and row[5]
        else None,
        "user_name": row[6] if len(row) > 6 else None,
    }


def search_booking_by_date(instrument_id, date):
    """查询某仪器某日期的所有预约（关联用户信息）"""
    sql = f"""
        SELECT b.id, b.user_id, b.instrument_id, b.booking_date, 
               b.start_time, b.end_time,
               u.user_name, u.color
        FROM {BOOKING_TABLE} b
        JOIN {USER_TABLE} u ON b.user_id = u.id
        WHERE b.instrument_id = %s AND b.booking_date = %s
        ORDER BY b.start_time
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            logging.info(f"Executing SQL: {sql} with params: {(instrument_id, date)}")
            cur.execute(sql, (instrument_id, date))
            rows = cur.fetchall()

    # 包含用户信息的结果
    results = []
    for row in rows:
        booking = _row_to_booking(row[:7])  # 前7个字段包含 user_name
        booking["color"] = row[7]  # 添加颜色信息
        results.append(booking)
    return results


def search_booking_by_user_and_date(user_id, date):
    """查询某人某日期的所有预约"""
    sql = f"""
        SELECT b.id, b.user_id, b.instrument_id, b.booking_date, 
               b.start_time, b.end_time, u.user_name
        FROM {BOOKING_TABLE} b
        JOIN {USER_TABLE} u ON b.user_id = u.id
        WHERE b.user_id = %s AND b.booking_date = %s
        ORDER BY b.start_time
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, date))
            rows = cur.fetchall()
    return [_row_to_booking(row) for row in rows]


def delete_booking(booking_id):
    """删除预约"""
    sql = f"DELETE FROM {BOOKING_TABLE} WHERE id = %s"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (booking_id,))
            conn.commit()
    print(f"Deleted booking id={booking_id}")


# -------- 初始化 --------
def initialize_database():
    try:
        create_user_index()
        create_booking_index()
        return True
    except Exception as e:
        print(f"数据库初始化失败: {e}")
        return False


if __name__ == "__main__":
    if initialize_database():
        print("数据库初始化成功")
    else:
        print("数据库初始化失败")
