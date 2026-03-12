import psycopg2
from contextlib import contextmanager

DB_CONFIG = {
    "host": "localhost",
    "user": "user_order_user",
    "password": "user_order_pass",
    "dbname": "user_order",
    "port": 5434,
}

PLANS_TABLE = "date_plans"
USERS_TABLE = "users"


# ──────────────────────────────────────────────
# 连接
# ──────────────────────────────────────────────


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


@contextmanager
def get_connection():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


# ──────────────────────────────────────────────
# 查询
# ──────────────────────────────────────────────


def get_dateinfo(user_name: str, date: str) -> list[tuple]:
    """根据 user_name 和 date 查询 plan / status / remark"""
    sql = f"""
        SELECT dp.plan, dp.status, dp.remark
        FROM {PLANS_TABLE} dp
        JOIN {USERS_TABLE} u ON dp.user_id = u.id
        WHERE u.user_name = %s AND dp.date = %s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_name, date))
            results = cur.fetchall()
    print(f"查询结果: {results}")
    return results


# ──────────────────────────────────────────────
# 插入 / 更新
# ──────────────────────────────────────────────


def upsert_plan_field(user_name: str, date: str, field: str, value) -> None:
    """根据是否已有记录插入或更新指定字段。
    仅允许操作 plan / status / remark 三个字段。
    status 只能是 0 / 1 / 2。
    """
    allowed_fields = {"plan", "status", "remark"}
    if field not in allowed_fields:
        raise ValueError(f"不支持的字段: {field}")

    if field == "status":
        if isinstance(value, bool):
            value = 1 if value else 0
        if isinstance(value, str):
            value = value.strip()
        if value not in {0, 1, 2, "0", "1", "2"}:
            raise ValueError(f"status 只能是 0、1 或 2，收到: {value}")
        value = int(value)

    # 先通过 user_name 取 user_id
    get_user_sql = f"SELECT id FROM {USERS_TABLE} WHERE user_name = %s"

    # 检查是否已存在该用户该日期的记录
    check_sql = f"""
        SELECT dp.id FROM {PLANS_TABLE} dp
        JOIN {USERS_TABLE} u ON dp.user_id = u.id
        WHERE u.user_name = %s AND dp.date = %s
    """

    update_sql = f"UPDATE {PLANS_TABLE} SET {field} = %s WHERE id = %s"

    insert_sql = f"""
        INSERT INTO {PLANS_TABLE} (user_id, date, {field})
        VALUES (%s, %s, %s)
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            # 获取 user_id
            cur.execute(get_user_sql, (user_name,))
            row = cur.fetchone()
            if row is None:
                raise ValueError(f"用户 '{user_name}' 不存在")
            user_id = row[0]

            # 检查记录是否存在
            cur.execute(check_sql, (user_name, date))
            existing = cur.fetchone()

            if existing:
                cur.execute(update_sql, (value, existing[0]))
            else:
                cur.execute(insert_sql, (user_id, date, value))

            conn.commit()

    print(f"{field} 字段更新成功！")


# ──────────────────────────────────────────────
# 删除
# ──────────────────────────────────────────────


def delete_user_data(user_name: str) -> None:
    """删除某用户的全部 date_plans 记录"""
    sql = f"""
        DELETE FROM {PLANS_TABLE}
        WHERE user_id = (SELECT id FROM {USERS_TABLE} WHERE user_name = %s)
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_name,))
            conn.commit()
    print(f"user_name 为 {user_name} 的数据已删除！")


# ──────────────────────────────────────────────
# 入口
# ──────────────────────────────────────────────

if __name__ == "__main__":
    # upsert_plan_field("alice", "2024-06-15", "plan", "完成代码编写")
    upsert_plan_field("alice", "2024-06-15", "status", 1)
