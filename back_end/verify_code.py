import requests
import redis
import json
from redis.exceptions import ResponseError
from config import spug_key, TENCENTCLOUD_SECRET_ID, TENCENTCLOUD_SECRET_KEY
import random
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.common.exception.tencent_cloud_sdk_exception import (
    TencentCloudSDKException,
)
from tencentcloud.ses.v20201002 import ses_client, models

r = redis.Redis(host="localhost", port=6379, decode_responses=True)


def send_sms(phone, code):
    """使用腾讯云短信服务发送验证码"""
    try:
        body = {"name": "cpulab", "code": code, "targets": phone}
        requests.post(f"https://push.spug.cc/send/{spug_key}", json=body)
    except Exception as e:
        print(f"发送短信失败: {e}")


def send_email(email, code):
    """使用腾讯云邮件服务发送验证码"""
    try:
        # 1. 配置密钥(从环境变量读取)

        cred = credential.Credential(
            TENCENTCLOUD_SECRET_ID,
            TENCENTCLOUD_SECRET_KEY,
        )

        # 2. 配置HTTP和客户端选项
        httpProfile = HttpProfile()
        httpProfile.endpoint = "ses.tencentcloudapi.com"

        clientProfile = ClientProfile()
        clientProfile.httpProfile = httpProfile

        # 3. 创建SES客户端
        client = ses_client.SesClient(cred, "ap-hongkong", clientProfile)

        # 4. 创建发送邮件请求
        req = models.SendEmailRequest()

        # 5. 配置邮件参数(这是关键部分)
        params = {
            "FromEmailAddress": "cpulab@cpulab.cn",  # 发件人邮箱地址(需要先在腾讯云验证)
            "Destination": [email],  # 收件人邮箱列表
            "Subject": "cpulab重置验证码",  # 邮件主题
            "Template": {  # 使用模板方式(二选一)
                "TemplateID": 160678,  # 模板ID
                "TemplateData": json.dumps(
                    {  # 模板变量
                        "code": code,
                    }
                ),
            },
        }

        req.from_json_string(json.dumps(params))

        # 6. 发送邮件
        resp = client.SendEmail(req)

        # 7. 输出响应结果
        print(resp.to_json_string())
        print("邮件发送成功!")

    except TencentCloudSDKException as err:
        print(f"邮件发送失败: {err}")


def send_reset(user_name=None, phone=None, email=None):
    """发送密码重置验证码的辅助函数"""
    reset_code = f"{random.randint(100000, 999999)}"
    print(f"生成的重置验证码: {reset_code}")
    if phone:
        send_sms(phone, reset_code)
    elif email:
        send_email(email, reset_code)
    else:
        print("没有提供手机号或邮箱，无法发送验证码")
        return

    # 保存到 Redis，有效期10分钟
    r.setex(f"reset_code:{user_name}", 600, reset_code)


def verify_reset_code(user_name, code):
    """验证用户提供的重置验证码是否正确"""
    try:
        stored_code = r.get(f"reset_code:{user_name}")
        if stored_code is None:
            return False  # 验证码不存在或已过期
        return stored_code == code
    except ResponseError as e:
        print(f"Redis错误: {e}")
        return False
