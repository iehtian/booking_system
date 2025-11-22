import mysql.connector


def connect_to_database():
    db = mysql.connector.connect(
        host="localhost",
        user="dateplan_user",
        password="dateplan_pass",
        database="dateplan",
        port=3308,
    )

    print("数据库连接成功!")
    return db


def get_dateinfo(db, user_id, date):
    cursor = db.cursor()
    sql = "SELECT plan,status,remark FROM plans WHERE user_id = %s AND date = %s"
    val = (user_id, date)

    cursor.execute(sql, val)
    results = cursor.fetchall()
    print(f"查询结果: {results}")
    return results


def upsert_plan_field(db, user_id, date, field, value):
    """根据是否已有记录插入或更新指定字段。
    仅允许更新 plan / status / remark 三个字段以避免 SQL 注入。
    """
    allowed_fields = {"plan", "status", "remark"}
    if field not in allowed_fields:
        raise ValueError(f"不支持的字段: {field}")

    cursor = db.cursor()
    exists = get_dateinfo(db, user_id, date)
    if exists:
        sql = f"UPDATE plans SET {field} = %s WHERE user_id = %s AND date = %s"
        val = (value, user_id, date)
    else:
        sql = f"INSERT INTO plans (user_id,date,{field}) VALUES (%s, %s, %s)"
        val = (user_id, date, value)
    cursor.execute(sql, val)
    db.commit()
    print(f"{field} 字段更新成功！")

    # 如果需要一次性更新多个字段，可在外部多次调用 upsert_plan_field。


if __name__ == "__main__":
    db = connect_to_database()
    upsert_plan_field(db, 1, "2024-06-15", "plan", "完成代码编写")
    db.close()
