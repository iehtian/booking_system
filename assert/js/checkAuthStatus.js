let authCheckPromise = null;
let authCheckResolve = null;

// 创建一个Promise来跟踪认证状态检查的完成
function createAuthCheckPromise() {
  authCheckPromise = new Promise((resolve) => {
    authCheckResolve = resolve;
  });
}

// 初始化Promise
createAuthCheckPromise();

// 检查登录状态
async function checkAuthStatus() {
  try {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${host}/api/check-auth`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("检查认证状态错误:", error);
    return { logged_in: false };
  }
} // async function checkAuth() {
//   const token = getToken();
//   const res = await fetch(`${API_BASE}/api/check-auth`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });
//   const data = await res.json();
//   showMessage(data);
// }

// 等待认证检查完成的函数
function waitForAuthCheck() {
  return authCheckPromise;
}

// 页面加载时检查登录状态
window.addEventListener(`DOMContentLoaded`, async () => {
  const authStatus = await checkAuthStatus();

  if (authStatus.logged_in) {
    console.log("用户已登录:", authStatus.user);
    usr_info = authStatus.user;
  } else {
    console.log("用户未登录");
    localStorage.removeItem("access_token");
  }

  // 通知认证检查已完成
  if (authCheckResolve && authStatus.logged_in) {
    authCheckResolve({
      completed: true,
      logged_in: authStatus.logged_in,
      user: usr_info,
    });
  } else if (authCheckResolve) {
    authCheckResolve({
      completed: true,
      logged_in: false,
    });
  }
});

// // 使用示例：等待认证检查完成后再执行其他代码
// waitForAuthCheck().then((result) => {
//     console.log('认证检查完成:', result);
//     // 在这里可以执行依赖于认证状态的代码
// });
