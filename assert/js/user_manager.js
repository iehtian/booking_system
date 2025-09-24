import { host } from "./config.js"

// 登录功能
async function login(ID, password) {
  try {
    const res = await fetch(`${host}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID, password }),
    })
    const data = await res.json()
    console.log("登录响应:", data)
    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token)
      return { success: true, ...data }
    }
    // 没有 token 当作登录失败
    return { success: false, message: data.message || "登录失败", ...data }
  } catch (error) {
    console.error("登录错误:", error)
    return { success: false, message: "网络或服务器错误" }
  }
}

// 注册功能
async function register(ID, password, name) {
  try {
    const res = await fetch(`${host}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID, name, password }),
    })
    const data = await res.json()
    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token)
    }
    return data // 返回注册结果
  } catch (error) {
    console.error("注册错误:", error)
    return { success: false, message: "注册失败" }
  }
}

async function logout() {
  try {
    const token = localStorage.getItem("access_token")
    if (!token) {
      // 没 token 直接当已退出
      localStorage.removeItem("access_token")
      localStorage.removeItem("userInfo")
      return true
    }

    const response = await fetch(`${host}/api/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    })

    if (response.status === 401) {
      // token 无效/过期，也当退出处理
      console.warn("登出时 token 无效或已过期")
      localStorage.removeItem("access_token")
      localStorage.removeItem("userInfo")
      return true
    }

    const data = await response.json()
    if (data.success) {
      console.log("登出成功")
    } else {
      console.warn("后端返回登出失败:", data.message)
    }

    localStorage.removeItem("access_token")
    localStorage.removeItem("userInfo")
    return true
  } catch (error) {
    console.error("登出错误:", error)
    localStorage.removeItem("access_token")
    localStorage.removeItem("userInfo")
    return false
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.querySelector("#login")
  if (loginBtn) {
    loginBtn.addEventListener("click", function (event) {
      event.preventDefault()
      const ID = document.querySelector("#ID").value
      const password = document.querySelector("#password").value

      if (ID === "" || password === "") {
        alert("Please fill in all fields.")
        return
      }

      console.log("Logging in user:", ID, password)
      // 调用登录函数
      login(ID, password)
        .then((res) => {
          if (!res.success) {
            alert(
              res.message || "Login failed. Please check your ID and password."
            )
            return
          }
          window.location.href = "../index.html"
        })
        .catch((error) => {
          console.error("登录错误:", error)
          alert("An error occurred during login. Please try again later.")
        })
    })
  }

  const registerBtn = document.querySelector("#register")
  if (registerBtn) {
    registerBtn.addEventListener("click", function (event) {
      event.preventDefault()
      const ID = document.querySelector("#ID").value
      const password = document.querySelector("#password").value
      const name = document.querySelector("#name").value

      if (ID === "" || password === "" || name === "") {
        alert("Please fill in all fields.")
        return
      }

      console.log("Registering user:", ID, password, name)
      // 调用注册函数
      register(ID, password, name)
        .then((data) => {
          console.log("注册响应:", data)
          if (!data.success) {
            alert(`Registration failed: ${data.message}`)
            return
          }
          console.log("注册成功:", data)
          alert("Registration successful! You can now log in.")
          window.location.href = "../index.html"
        })
        .catch((error) => {
          console.error("注册错误:", error)
          alert(
            "An error occurred during registration. Please try again later."
          )
        })
    })
  }
})

// 检查登录状态
async function checkAuthStatus() {
  try {
    const token = localStorage.getItem("access_token")
    if (!token) return { logged_in: false }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort() // 超时后中止请求
    }, 1000) // 设置超时时间为1秒
    const res = await fetch(`${host}/api/check-auth`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
    const data = await res.json()
    clearTimeout(timeoutId) // 清除超时定时器
    return data
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("检查认证状态请求超时，检查后端链接")
      return { logged_in: false }
    }
    console.error("检查认证状态错误:", error)
    return { logged_in: false }
  }
}

export { logout, checkAuthStatus }
