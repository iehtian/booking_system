import mysql.connector
import datetime


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


def insert_plan(db, user_id, plan):
    cursor = db.cursor()
    sql = "INSERT INTO plans (user_id,date,plan) VALUES (%s, %s, %s)"
    today = datetime.date.today()
    val = (user_id, today, plan)

    cursor.execute(sql, val)
    db.commit()
    print("插入成功!")


if __name__ == "__main__":
    db = connect_to_database()
    insert_plan(db, 1, "完成代码编写")
    db.close()
