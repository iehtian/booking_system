"""
Database operations package for order management system.
This package contains Redis operations for users and bookings.
"""


from .redis import (
    upsert_user,
    search_user_by_ID,
    search_user_by_real_name,
    search_all_users,
    create_user_index,
    upsert_booking,
    search_booking_by_date,
    search_booking_by_name,
    search_booking_by_date_and_name,
    search_all_bookings,
    create_booking_index,
    delete_booking,
    initialize_database
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
        print("📊 Database indexes initialized successfully!")
        return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

# 导出所有公共接口
__all__ = [
    'upsert_user',
    'search_user_by_ID',
    'search_user_by_real_name',
    'search_all_users',
    'create_user_index',
    'upsert_booking',
    'search_booking_by_date',
    'search_booking_by_name',
    'search_booking_by_date_and_name',
    'search_all_bookings',
    'create_booking_index',
    'delete_booking',
    'initialize_database'
]