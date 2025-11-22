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


def get_planinfo(db, user_id, date):
    cursor = db.cursor()
    sql = "SELECT plan,status,remark FROM plans WHERE user_id = %s AND date = %s"
    val = (user_id, date)

    cursor.execute(sql, val)
    results = cursor.fetchall()
    print(f"查询结果: {results}")
    return results


def update_plan(db, user_id, plan, date):
    cursor = db.cursor()
    if get_planinfo(db, user_id, date):
        sql = "UPDATE plans SET plan = %s WHERE user_id = %s AND date = %s"
        val = (plan, user_id, date)
    else:
        sql = "INSERT INTO plans (user_id,date,plan) VALUES (%s, %s, %s)"
        val = (user_id, date, plan)
    cursor.execute(sql, val)
    db.commit()
    print("更新成功!")


if __name__ == "__main__":
    db = connect_to_database()
    update_plan(db, 1, "完成代码编写", "2024-06-15")
    db.close()
