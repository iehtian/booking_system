// 登录功能
async function login(username, password) {
  try {
    const response = await fetch(`${host}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 重要：包含 cookies
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("登录成功:", data.user);
      // 可以保存用户信息到内存或 localStorage（非敏感信息）
      localStorage.setItem("userInfo", JSON.stringify(data.user));
      return true;
    } else {
      console.log("登录失败:", data.message);
      return false;
    }
  } catch (error) {
    console.error("登录错误:", error);
    return false;
  }
}

// 注册功能
async function register(username, password, name) {
  try {
    const response = await fetch(`${host}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password, name }),
    });
    // 处理返回值是409的情况
    if (response.status === 409) {
      return { success: false, message: "用户名已存在" };
    }
    const data = await response.json();
    console.log("注册响应:", data);
    return data;
  } catch (error) {
    console.error("注册错误:", error);
    return { success: false, message: "注册失败" };
  }
}

// 登出功能
async function logout() {
  try {
    const response = await fetch(`${host}/api/logout`, {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      localStorage.removeItem("userInfo");
      console.log("登出成功");
      return true;
    }
    return false;
  } catch (error) {
    console.error("登出错误:", error);
    throw error;
  }
}

// 发送需要认证的请求
async function fetchWithAuth(url, options = {}) {
  const config = {
    ...options,
    credentials: "include", // 重要：自动包含 session cookie
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      console.log("登录已过期，请重新登录");
      localStorage.removeItem("userInfo");
      window.location.href = "/login.html";
      return null;
    }

    return response;
  } catch (error) {
    console.error("请求错误:", error);
    throw error;
  }
}

// 使用示例
async function getUserProfile() {
  try {
    const response = await fetchWithAuth(`${host}/api/user/profile`);
    if (response) {
      const data = await response.json();
      console.log("用户资料:", data);
      return data;
    }
  } catch (error) {
    console.error("获取用户资料失败:", error);
  }
}

async function getOrders() {
  try {
    const response = await fetchWithAuth(`${host}/api/orders`);
    if (response) {
      const data = await response.json();
      console.log("订单列表:", data);
      return data;
    }
  } catch (error) {
    console.error("获取订单失败:", error);
  }
}

try {
  document.querySelector("#login").addEventListener("click", function (event) {
    event.preventDefault(); // 阻止默认行为
    const username = document.querySelector("#username").value;
    const password = document.querySelector("#password").value;

    if (username === "" || password === "") {
      alert("Please fill in all fields.");
      return;
    }

    console.log("Logging in user:", username, password);
    // 调用登录函数
    login(username, password)
      .then((success) => {
        if (!success) {
          alert("Login failed. Please check your username and password.");
          return;
        }
        alert("Login successful!");
        window.location.href = "../index.html";
      })
      .catch((error) => {
        console.error("登录错误:", error);
        alert("An error occurred during login. Please try again later.");
      });
  });
} catch (error) {
  console.error("没有登陆按钮:", error);
}

try {
  document
    .querySelector("#register")
    .addEventListener("click", function (event) {
      event.preventDefault(); // 阻止默认行为
      const username = document.querySelector("#username").value;
      const password = document.querySelector("#password").value;
      const name = document.querySelector("#name").value;

      if (username === "" || password === "" || name === "") {
        alert("Please fill in all fields.");
        return;
      }

      console.log("Registering user:", username, password, name);
      // 调用注册函数
      register(username, password, name)
        .then((data) => {
          if (!data.success) {
            alert(`Registration failed: ${data.message}`);
            return;
          }
          console.log("注册成功:", data);
          alert("Registration successful! You can now log in.");
          window.location.href = "../index.html";
          // 可以在这里处理注册成功后的逻辑，比如自动登录或跳转到登录页面
        })
        .catch((error) => {
          console.error("注册错误:", error);
          alert(
            "An error occurred during registration. Please try again later."
          );
        });
    });
} catch (error) {
  console.error("没有注册按钮:", error);
}

export { login, register, logout, fetchWithAuth, getUserProfile, getOrders };
