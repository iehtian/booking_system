"""
Database operations package for order management system.
This package now uses PostgreSQL for users and bookings to replace Redis.
"""

from .pgsql_client import (
    get_db_connection,
    upsert_user,
    search_user_by_name,
    search_all_users,
    create_user_index,
    upsert_booking,
    search_booking_by_date,
    search_booking_by_user_and_date,
    create_booking_index,
    create_date_plan_index,
    delete_bookings_by_dates,
    delete_bookings_by_slots,
    upsert_plan_field,
    get_dateinfo,
)

# 包版本信息
__version__ = "1.0.0"
__author__ = "Order Management System"


# 包级别的初始化函数
def initialize_database():
    """初始化数据库索引"""
    try:
        create_user_index()
        create_booking_index()
        create_date_plan_index()
        conn = get_db_connection()
        conn.close()
        print("📊 Database indexes initialized successfully!")
        return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False


# 导出所有公共接口
__all__ = [
    "upsert_user",
    "search_user_by_name",
    "search_all_users",
    "upsert_booking",
    "search_booking_by_date",
    "search_booking_by_user_and_date",
    "delete_bookings_by_dates",
    "delete_bookings_by_slots",
    "create_date_plan_index",
    "initialize_database",
    "get_db_connection",
    "upsert_plan_field",
    "get_dateinfo",
]
