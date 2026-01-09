# 后端服务启动指南

基于 Flask + Redis + JWT 的预约管理后端。本文档介绍在本地开发和生产环境中启动该后端的步骤，并给出快速自检示例。

## 运行前提

- Python 3.10+
- Redis 6+（本地或远程实例）
- Linux bash（示例命令使用 bash）

可选：

- `gunicorn`（已在 `requirements.txt` 中），用于生产部署

## 获取代码与创建虚拟环境

```bash
# 进入项目根目录（本文件所在目录）
cd /path/to/order

# 创建并启用虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 升级 pip 并安装依赖
pip install -U pip
pip install -r requirements.txt
```

## 准备 Redis

默认配置会连接 `redis://localhost:6379/0`。若你本机未安装 Redis，可按需安装并启动：

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install -y redis-server
sudo systemctl enable --now redis-server

# 自检
redis-cli ping  # 预期输出：PONG
```

如需连接远程 Redis，可通过环境变量 `REDIS_URL` 覆盖（见下文“环境变量”）。

## 开发模式启动（推荐本地调试）

`back_end/app.py` 已包含 `if __name__ == '__main__':` 启动入口，默认监听 `0.0.0.0:5000` 且开启 debug。

```bash
# 在虚拟环境中
python back_end/app.py
```

启动后访问：

```
http://127.0.0.1:5000/hello_world
```

预期返回：`{"message": "Hello, World!"}`。

CORS 已允许以下前端来源（Vite 默认端口）：

- http://localhost:5173
- http://127.0.0.1:5173

## 生产模式启动（Gunicorn）

项目内包含 `gunicorn.conf.py`。使用如下命令启动：

```bash
gunicorn -c gunicorn.conf.py back_end.app:app
```

如需指定绑定地址或进程数（若未在配置文件中设置），可追加参数：

```bash
gunicorn -w 4 -b 0.0.0.0:5000 -c gunicorn.conf.py back_end.app:app
```

## 环境变量

后端使用 `config.py` 提供默认配置。你可以通过环境变量进行覆盖：

- `REDIS_URL`：Redis 连接串，默认 `redis://localhost:6379/0`
- `SECRET_KEY`：Flask 会话密钥（可覆盖）
- `JWT_SECRET_KEY`：JWT 签名密钥（强烈建议在生产设置为强随机值）
- 其他值请参考 `config.py`

示例（临时设置，仅当前 shell 有效）：

```bash
export REDIS_URL="redis://localhost:6379/0"
export SECRET_KEY="please_change_me"
export JWT_SECRET_KEY="please_change_me_too"
```

## 接口快速自检

- 健康检查：

```bash
curl -s http://127.0.0.1:5000/hello_world
```

- 注册并获取 token：

```bash
curl -s -X POST http://127.0.0.1:5000/api/register \
  -H 'Content-Type: application/json' \
  -d '{"ID":"demo","password":"Passw0rd!","name":"演示用户"}'
```

响应中包含 `access_token`。

- 登录获取 token：

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:5000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"ID":"demo","password":"Passw0rd!"}' | \
  python -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo $TOKEN
```

- 携带 token 访问受保护接口：

```bash
curl -s http://127.0.0.1:5000/api/check-auth \
  -H "Authorization: Bearer $TOKEN"
```

## 常见问题

- 401/Invalid token：确认客户端携带了 `Authorization: Bearer <token>`，并确保 `JWT_SECRET_KEY` 与签发 token 时一致。
- 连接 Redis 失败：确认 Redis 服务已启动、网络可达，或设置正确的 `REDIS_URL`。
- 跨域问题：确保前端来源在 `app.py` 的 CORS 白名单内，或在开发时使用 Vite 代理到后端。

---