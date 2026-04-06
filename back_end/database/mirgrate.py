"""
MySQL plans -> PostgreSQL date_plans 数据迁移脚本

依赖安装:
    pip install mysql-connector-python psycopg2-binary

使用前请修改下方 MySQL/PostgreSQL 连接配置。
"""

import mysql.connector
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime

# ──────────────────────────────────────────────
# 连接配置（按实际情况修改）
# ──────────────────────────────────────────────
MYSQL_CONFIG = {
    "host": "localhost",
    "port": 3308,  # 注意是 3308 不是默认的 3306
    "user": "dateplan_user",
    "password": "dateplan_pass",
    "database": "dateplan",
}

PG_CONFIG = {
    "host": "localhost",
    "user": "user_order_user",
    "password": "user_order_pass",
    "database": "user_order",
    "port": 5434,
}

# 批量插入每批条数
BATCH_SIZE = 500
# ──────────────────────────────────────────────


def fetch_mysql_plans(mysql_conn) -> list[dict]:
    """从 MySQL plans 表读取全量数据"""
    cur = mysql_conn.cursor(dictionary=True)
    cur.execute("""
        SELECT date, plan, status, remark, created_at, updated_at, user_name
        FROM plans
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()
    return rows


def fetch_pg_user_map(pg_conn) -> dict[str, int]:
    """返回 {user_name: user_id} 映射"""
    with pg_conn.cursor() as cur:
        cur.execute("SELECT id, user_name FROM users")
        return {row[1]: row[0] for row in cur.fetchall()}


def migrate():
    print(f"[{datetime.now():%H:%M:%S}] 开始迁移 plans -> date_plans")

    # ── 连接 ──────────────────────────────────
    mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
    pg_conn = psycopg2.connect(**PG_CONFIG)
    print("数据库连接成功")

    try:
        # ── 读取源数据 ─────────────────────────
        rows = fetch_mysql_plans(mysql_conn)
        print(f"MySQL 共读取 {len(rows)} 条记录")

        # ── 构建 user_name -> user_id 映射 ──────
        user_map = fetch_pg_user_map(pg_conn)
        print(f"PostgreSQL users 表共 {len(user_map)} 个用户")

        # ── 转换数据 ───────────────────────────
        records = []
        skipped = []
        for row in rows:
            uname = row["user_name"]
            uid = user_map.get(uname)
            if uid is None:
                skipped.append(uname)
                continue
            records.append(
                (
                    uid,
                    row["date"],
                    row["plan"],
                    row["status"],
                    row["remark"],
                    row["created_at"],
                    row["updated_at"],
                )
            )

        if skipped:
            unique_skipped = sorted(set(skipped))
            print(
                f"⚠️  以下 user_name 在 PostgreSQL users 表中不存在，共跳过 {len(skipped)} 条："
            )
            for name in unique_skipped:
                print(f"   - {name}")

        print(f"准备写入 {len(records)} 条记录")

        # ── 批量写入 PostgreSQL ─────────────────
        insert_sql = """
            INSERT INTO date_plans
                (user_id, date, plan, status, remark, created_at, updated_at)
            VALUES %s
            ON CONFLICT DO NOTHING
        """

        with pg_conn.cursor() as cur:
            for i in range(0, len(records), BATCH_SIZE):
                batch = records[i : i + BATCH_SIZE]
                execute_values(cur, insert_sql, batch)
                print(f"  已写入 {min(i + BATCH_SIZE, len(records))} / {len(records)}")

        pg_conn.commit()
        print(
            f"[{datetime.now():%H:%M:%S}] 迁移完成 ✅  成功 {len(records)} 条，跳过 {len(skipped)} 条"
        )

    except Exception as e:
        pg_conn.rollback()
        print(f"迁移失败，已回滚: {e}")
        raise
    finally:
        mysql_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    migrate()
