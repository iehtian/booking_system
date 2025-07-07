"""
Database operations package for order management system.
This package contains Redis operations for users and bookings.
"""

# 导入Redis操作函数
from .redis_user import (
    upsert_user, 
    search_by_ID, 
    search_by_real_name, 
    create_index as create_user_index,
    search_all as search_all_users
)

from .redis_booking import (
    upsert_booking, 
    search_by_date, 
    search_by_name, 
    create_index as create_booking_index,
    search_all as search_all_bookings
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
    'search_by_ID', 
    'search_by_real_name',
    'search_all_users',
    'upsert_booking', 
    'search_by_date', 
    'search_by_name',
    'search_all_bookings',
    'initialize_database'
]