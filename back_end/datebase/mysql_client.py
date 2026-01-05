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


def get_dateinfo(db, user_name, date):
    cursor = db.cursor()
    sql = "SELECT plan,status,remark FROM plans WHERE user_name = %s AND date = %s"
    val = (user_name, date)

    cursor.execute(sql, val)
    results = cursor.fetchall()
    print(f"查询结果: {results}")
    return results


def upsert_plan_field(db, user_name, date, field, value):
    """根据是否已有记录插入或更新指定字段。
    仅允许更新 plan / status / remark 三个字段以避免 SQL 注入。
    若更新字段为 status，则其值只能是 0 或 1。
    """
    allowed_fields = {"plan", "status", "remark"}
    if field not in allowed_fields:
        raise ValueError(f"不支持的字段: {field}")

    # 针对 status 字段的值范围校验，只允许 0 或 1（可接受数字或字符串形式）
    if field == "status":
        if isinstance(value, bool):  # 若传入 True/False，转换为 1/0
            value = 1 if value else 0
        if isinstance(value, str):
            value = value.strip()
        allowed_status_values = {0, 1, 2, "0", "1", "2"}
        if value not in allowed_status_values:
            raise ValueError(f"status 只能是 0 或 1 或 2，收到: {value}")
        # 统一转换为整型写入（数据库字段若为 TINYINT/INT 更规范）
        value = int(value)

    cursor = db.cursor()
    exists = get_dateinfo(db, user_name, date)
    if exists:
        sql = f"UPDATE plans SET {field} = %s WHERE user_name = %s AND date = %s"
        val = (value, user_name, date)
    else:
        sql = f"INSERT INTO plans (user_name,date,{field}) VALUES (%s, %s, %s)"
        val = (user_name, date, value)
    cursor.execute(sql, val)
    db.commit()
    print(f"{field} 字段更新成功！")


def delete_user_data(db, user_name):
    cursor = db.cursor()
    sql = "DELETE FROM plans WHERE user_name = %s"
    val = (user_name,)
    cursor.execute(sql, val)
    db.commit()
    print(f"user_name 为 {user_name} 的数据已删除！")


if __name__ == "__main__":
    db = connect_to_database()
    # upsert_plan_field(db, 1, "2024-06-15", "plan", "完成代码编写")
    upsert_plan_field(db, 1, "2024-06-15", "status", 1)
    db.close()
