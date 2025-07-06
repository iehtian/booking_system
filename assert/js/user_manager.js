// 登录功能
async function login(ID, password) {
  try {
    const res = await fetch(`${host}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID, password }),
    });
    const data = await res.json();
    console.log("登录响应:", data);
    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
    }
    return data;
  } catch (error) {
    console.error("登录错误:", error);
    return false;
  }
}

// 注册功能
async function register(ID, password, name) {
  try {
    const res = await fetch(`${host}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID, name, password }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
    }
    return data; // 返回注册结果
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

try {
  document.querySelector("#login").addEventListener("click", function (event) {
    event.preventDefault(); // 阻止默认行为
    const ID = document.querySelector("#ID").value;
    const password = document.querySelector("#password").value;

    if (ID === "" || password === "") {
      alert("Please fill in all fields.");
      return;
    }

    console.log("Logging in user:", ID, password);
    // 调用登录函数
    login(ID, password)
      .then((success) => {
        if (!success) {
          alert("Login failed. Please check your ID and password.");
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
      const ID = document.querySelector("#ID").value;
      const password = document.querySelector("#password").value;
      const name = document.querySelector("#name").value;

      if (ID === "" || password === "" || name === "") {
        alert("Please fill in all fields.");
        return;
      }

      console.log("Registering user:", ID, password, name);
      // 调用注册函数
      register(ID, password, name)
        .then((data) => {
          console.log("注册响应:", data);
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

export { login, register, logout };
