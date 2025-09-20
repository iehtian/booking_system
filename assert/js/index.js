import { logout, checkAuthStatus } from "./user_manager.js"

document.querySelector("#login").addEventListener("click", function (event) {
  event.preventDefault() // 阻止默认链接行为
  const loginUrl = `pages/login.html`
  // 跳转到登录页面，新页面打开
  window.open(loginUrl, "_blank")
})

document.querySelector("#register").addEventListener("click", function (event) {
  event.preventDefault() // 阻止默认链接行为
  const registerUrl = `pages/register.html`
  // 跳转到注册页面，新页面打开
  window.open(registerUrl, "_blank")
})

// ...existing code...
async function initUser() {
  // 兼容不同返回结构：true/false 或 { logged_in, user }
  const result = await checkAuthStatus()
  if (result.logged_in) {
    document.querySelector("#logout").classList.remove("hidden")
    const realName = result.user.name
    document.querySelector(".show-name").textContent = `你好，${realName}`
    document.querySelector(".show-name").classList.remove("hidden")
  } else {
    document.querySelector("#login").classList.remove("hidden")
    document.querySelector("#register").classList.remove("hidden")
  }
}
// ...existing code...
// 页面就绪后初始化用户状态
document.addEventListener("DOMContentLoaded", () => {
  initUser().catch(console.error)
})
