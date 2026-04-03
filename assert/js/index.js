import {
  login,
  register,
  logout,
  checkAuthStatus,
  updateProfile,
  sendResetCode,
} from "./user_manager.js"
import { marked } from "marked"
import { host } from "./config.js"
import Swal from "sweetalert2"

// 包装 Swal.fire 以打印调试调用栈
const debugSwal = async (...args) => {
  console.trace("Swal.fire 调用栈")
  return Swal.fire(...args)
}

const loginItem = document.querySelector("#menu-login")
const registerItem = document.querySelector("#menu-register")
const resetPasswordItem = document.querySelector("#menu-reset-password")
const logoutItem = document.querySelector("#menu-logout")
const UpdateEmailItem = document.querySelector("#menu-update-email")
const UpdatePasswordItem = document.querySelector("#menu-update-password")
const deleteAccountItem = document.querySelector("#menu-delete-account")

loginItem?.addEventListener("click", (event) => {
  event.preventDefault()
  openLoginModal().catch(console.error)
})

registerItem?.addEventListener("click", (event) => {
  event.preventDefault()
  openRegisterModal().catch(console.error)
})

resetPasswordItem?.addEventListener("click", (event) => {
  event.preventDefault()
  openResetPasswordModal().catch(console.error)
})

logoutItem?.addEventListener("click", (event) => {
  event.preventDefault()
  logout()
    .then(() => {
      console.log("用户已退出登录")
      window.location.reload()
    })
    .catch((error) => {
      console.error("退出登录失败:", error)
    })
})

UpdateEmailItem?.addEventListener("click", (event) => {
  event.preventDefault()
  handleUpdateEmail().catch(console.error)
})

UpdatePasswordItem?.addEventListener("click", (event) => {
  event.preventDefault()
  handleUpdatePassword().catch(console.error)
})

deleteAccountItem?.addEventListener("click", (event) => {
  event.preventDefault()
  alert("注销账号功能暂未开放，请联系管理员。")
})

async function initUser() {
  // 兼容不同返回结构：true/false 或 { logged_in, user }
  await checkAuthStatus()
  const result = JSON.parse(sessionStorage.getItem("userAuth") || "null")
  const loginHintEl = document.querySelector("#login-hint")
  const guestMenu = document.querySelector("#guestMenu")
  const authedMenu = document.querySelector("#authedMenu")
  if (result) {
    const realName = result.user.user_name
    document.querySelector(".show-name").textContent = `你好，${realName}`
    document.querySelector(".show-name").classList.remove("hidden")
    if (loginHintEl) loginHintEl.classList.add("hidden")
    guestMenu?.classList.add("hidden")
    authedMenu?.classList.remove("hidden")
  } else {
    if (loginHintEl) loginHintEl.classList.remove("hidden")
    guestMenu?.classList.remove("hidden")
    authedMenu?.classList.add("hidden")
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await initUser().catch(console.error)
  await setupAnnouncements().catch(console.error)
  setupUserMenuAria()
})

function setupUserMenuAria() {
  const menu = document.querySelector("#userMenu")
  const trigger = document.querySelector("#userMenuTrigger")
  if (!menu || !trigger) return

  const setExpanded = (expanded) =>
    trigger.setAttribute("aria-expanded", expanded ? "true" : "false")

  menu.addEventListener("mouseenter", () => setExpanded(true))
  menu.addEventListener("mouseleave", () => setExpanded(false))
}

function getVerificationModalStyleBlock() {
  return `
    <style>
      .verification-container {
        padding: 0 20px;
      }
      .verification-form-group {
        margin-bottom: 12px;
        text-align: center;
      }
      .verification-radio-group {
        display: flex;
        gap: 32px;
        justify-content: center;
        align-items: center;
      }
      .verification-radio-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 14px;
        color: #666;
      }
      .verification-radio-label input[type="radio"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
      .verification-code-group {
        display: flex;
        gap: 10px;
        align-items: center;
        max-width: 100%;
      }
      .verification-code-input {
        flex: 1;
        margin: 0 !important;
        height: 42px !important;
        box-sizing: border-box !important;
      }
      .verification-send-btn {
        padding: 0 20px !important;
        margin: 0 !important;
        font-size: 14px !important;
        white-space: nowrap;
        height: 42px !important;
        border-radius: 6px !important;
        flex-shrink: 0;
        line-height: 1 !important;
      }
      .verification-status {
        margin: 6px 0 0;
        font-size: 13px;
        min-height: 16px;
        text-align: center;
      }
      .swal2-input {
        border: 1px solid #ddd !important;
        border-radius: 6px !important;
        padding: 10px 14px !important;
        font-size: 14px !important;
        transition: border-color 0.3s ease !important;
        height: 42px !important;
        box-sizing: border-box !important;
        width: 100% !important;
        margin: 0 !important;
      }
      .swal2-input:focus {
        border-color: #3085d6 !important;
        box-shadow: 0 0 0 3px rgba(48, 133, 214, 0.1) !important;
      }
      .swal2-html-container {
        margin: 0 !important;
        padding: 15px 0 !important;
      }
    </style>
  `
}

async function openLoginModal() {
  const result = await debugSwal({
    title: "登录",
    html: `
      <input id="sw-login-username" class="swal2-input" placeholder="姓名" autocomplete="username" />
      <input id="sw-login-password" type="password" class="swal2-input" placeholder="密码" autocomplete="current-password" />
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "登录",
    cancelButtonText: "取消",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      const user_name = document
        .getElementById("sw-login-username")
        .value.trim()
      const password = document.getElementById("sw-login-password").value

      if (!user_name || !password) {
        Swal.showValidationMessage("请填写账号和密码")
        return false
      }

      const res = await login(user_name, password)
      const isOk = res.success ?? !!res.access_token
      if (!isOk) {
        Swal.showValidationMessage(res.message || "登录失败，请重试")
        return false
      }
      return { user_name }
    },
  })

  if (!result.isConfirmed) return

  debugSwal({
    title: "登录中",
    text: "正在同步登录状态...",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading()
    },
  })

  try {
    await checkAuthStatus()
    await debugSwal({
      icon: "success",
      title: "登录成功",
      timer: 1200,
      showConfirmButton: false,
    })
  } catch (error) {
    await debugSwal({
      icon: "error",
      title: "登录状态刷新失败",
      text: "请稍后重试或手动刷新页面。",
      confirmButtonText: "知道了",
    })
    throw error
  }

  window.location.reload()
}

async function openRegisterModal() {
  const result = await debugSwal({
    title: "注册",
    html: `
      <input id="sw-register-username" class="swal2-input" placeholder="姓名" />
      <input id="sw-register-email" class="swal2-input" placeholder="邮箱" />
      <input id="sw-register-password" type="password" class="swal2-input" placeholder="密码" />
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "注册",
    cancelButtonText: "取消",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      const user_name = document
        .getElementById("sw-register-username")
        .value.trim()
      const email = document.getElementById("sw-register-email").value.trim()
      const phone = null
      const password = document.getElementById("sw-register-password").value

      if (!user_name || !password) {
        Swal.showValidationMessage("姓名和密码为必填项")
        return false
      }

      const res = await register(
        user_name,
        email || null,
        phone || null,
        password
      )
      const isOk = res.success ?? !!res.access_token
      if (!isOk) {
        Swal.showValidationMessage(res.message || "注册失败，请稍后再试")
        return false
      }
      return { user_name }
    },
  })

  if (!result.isConfirmed) return

  await checkAuthStatus()
  await debugSwal({
    icon: "success",
    title: "注册成功",
    text: "已自动登录，如未登录请再试一次。",
    timer: 1500,
    showConfirmButton: false,
  })
  window.location.reload()
}

async function openResetPasswordModal() {
  const result = await debugSwal({
    title: "重置密码",
    html: `
      ${getVerificationModalStyleBlock()}
      <div class="verification-container">
        <div class="verification-form-group">
          <input id="sw-user_name" class="swal2-input" placeholder="姓名" />
        </div>
        <div class="verification-form-group">
          <div class="verification-radio-group">
            <label class="verification-radio-label">
              <input type="radio" name="sw-method" value="email"  checked/> 邮箱
            </label>

          </div>
        </div>
        <div class="verification-form-group">
          <div class="verification-code-group">
            <input id="sw-code" class="swal2-input verification-code-input" placeholder="验证码" />
            <button type="button" id="sw-send-code" class="swal2-confirm swal2-styled verification-send-btn">发送验证码</button>
          </div>
          <div id="sw-code-status" class="verification-status"></div>
        </div>
        <div class="verification-form-group">
          <input id="sw-new-password" type="password" class="swal2-input" placeholder="新密码" />
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "提交",
    cancelButtonText: "取消",
    width: "480px",
    showLoaderOnConfirm: true, // ✅ 启用加载状态
    allowOutsideClick: () => !Swal.isLoading(), // ✅ 加载时禁止点击外部
    customClass: {
      popup: "reset-password-popup",
      confirmButton: "reset-confirm-btn",
      cancelButton: "reset-cancel-btn",
    },
    preConfirm: async () => {
      const user_name = document.getElementById("sw-user_name").value.trim()
      const code = document.getElementById("sw-code").value.trim()
      const newPassword = document
        .getElementById("sw-new-password")
        .value.trim()
      const showTempValidationMessage = (message) => {
        Swal.showValidationMessage(message)
        setTimeout(() => {
          Swal.resetValidationMessage()
        }, 3000)
      }

      // 验证输入
      if (!user_name) {
        showTempValidationMessage("请填写姓名")
        return false
      }

      if (!code) {
        showTempValidationMessage("请填写验证码")
        return false
      }

      if (!newPassword) {
        showTempValidationMessage("请填写新密码")
        return false
      }

      try {
        const res = await resetPassword(user_name, code, newPassword)

        if (!res.success) {
          showTempValidationMessage(res.message || "请检查验证码是否正确")
          return false
        }

        return { success: true } // 成功后才关闭对话框
      } catch (error) {
        console.error("重置密码错误:", error)
        showTempValidationMessage("提交请求出错，请稍后再试")
        return false
      }
    },
    didOpen: () => {
      const sendBtn = document.getElementById("sw-send-code")
      const user_nameInput = document.getElementById("sw-user_name")
      const methodInputs = document.querySelectorAll("input[name='sw-method']")
      const statusEl = document.getElementById("sw-code-status")
      const codeInput = document.getElementById("sw-code")

      const getMethod = () => {
        const checked = Array.from(methodInputs).find((el) => el.checked)
        return checked ? checked.value : "email"
      }

      const showStatus = (text, isError = false) => {
        if (statusEl) {
          statusEl.textContent = text
          statusEl.style.color = isError ? "#d33" : "#3085d6"
        }
      }

      const sendCode = async () => {
        const user_name = user_nameInput.value.trim()
        if (!user_name) {
          showStatus("请先输入账号再发送验证码", true)
          user_nameInput.focus()
          return
        }

        sendBtn.disabled = true
        const originalText = sendBtn.textContent
        sendBtn.textContent = "发送中..."

        try {
          const res = await sendResetCode(user_name, getMethod())
          if (res.success) {
            showStatus("验证码已发送，请查收")
            codeInput.focus()

            // 倒计时功能
            let countdown = 60
            const timer = setInterval(() => {
              countdown--
              if (countdown > 0) {
                sendBtn.textContent = `${countdown}秒后重发`
              } else {
                clearInterval(timer)
                sendBtn.disabled = false
                sendBtn.textContent = originalText
              }
            }, 1000)
          } else {
            showStatus(res.message || "发送失败，请稍后再试", true)
            sendBtn.disabled = false
            sendBtn.textContent = originalText
          }
        } catch (error) {
          console.error("发送重置验证码错误:", error)
          showStatus("发送请求出错", true)
          sendBtn.disabled = false
          sendBtn.textContent = originalText
        }
      }

      sendBtn?.addEventListener("click", sendCode)
    },
  })

  if (result.isConfirmed) {
    await debugSwal({
      icon: "success",
      title: "密码重置成功",
      text: "请使用新密码重新登录。",
      confirmButtonText: "确定",
      timer: 2000,
      timerProgressBar: true,
    })
    await openLoginModal()
  }
}

async function handleUpdatePassword() {
  const result = await debugSwal({
    title: "更新密码",
    html: `
      ${getVerificationModalStyleBlock()}
      <div class="verification-container">
        <div style="font-size: 14px; color: #888; margin-bottom: 12px; text-align: center;">
          将向已绑定邮箱发送验证码
        </div>
        <div class="verification-form-group">
          <div class="verification-code-group">
            <input id="sw-update-password-code" class="swal2-input verification-code-input" placeholder="验证码" />
            <button type="button" id="sw-update-password-send-code" class="swal2-confirm swal2-styled verification-send-btn">发送验证码</button>
          </div>
          <div id="sw-update-password-code-status" class="verification-status"></div>
        </div>
        <div class="verification-form-group">
          <input id="newpassword" type="password" class="swal2-input" placeholder="新密码" autocomplete="new-password">
        </div>
        <div class="verification-form-group">
          <input id="confirmnewpassword" type="password" class="swal2-input" placeholder="确认新密码" autocomplete="new-password">
        </div>
      </div>
    `,
    confirmButtonText: "确认更新密码",
    showCancelButton: true,
    cancelButtonText: "取消",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      const showTempValidationMessage = (message) => {
        Swal.showValidationMessage(message)
        setTimeout(() => {
          Swal.resetValidationMessage()
        }, 3000)
      }

      const auth = JSON.parse(sessionStorage.getItem("userAuth") || "null")
      const userId = auth?.user?.ID ?? auth?.user?.id ?? auth?.user?.username

      if (!userId) {
        showTempValidationMessage("未能获取当前用户 ID，请重新登录后再试")
        return false
      }

      const userName = auth?.user?.user_name
      if (!userName) {
        showTempValidationMessage("未能获取当前用户名，请重新登录后再试")
        return false
      }

      const code = document
        .getElementById("sw-update-password-code")
        .value.trim()
      const newPassword = document.getElementById("newpassword").value.trim()
      const confirmNewPassword = document
        .getElementById("confirmnewpassword")
        .value.trim()

      if (!code) {
        showTempValidationMessage("请填写验证码")
        return false
      }

      if (!newPassword) {
        showTempValidationMessage("请输入新密码")
        return false
      }

      if (newPassword.length < 6) {
        showTempValidationMessage("新密码长度不能少于 6 位")
        return false
      }

      if (newPassword !== confirmNewPassword) {
        showTempValidationMessage("两次输入的新密码不一致")
        return false
      }

      try {
        const res = await updateProfile(userId, newPassword, null, null, code)

        if (!res.success) {
          showTempValidationMessage(
            res.message || res.error || "密码更新失败，请稍后再试"
          )
          return false
        }

        return { success: true } // 成功后才关闭对话框
      } catch (error) {
        console.error("更新密码错误:", error)
        showTempValidationMessage("密码更新过程中出现错误，请稍后再试")
        return false
      }
    },
    didOpen: () => {
      const sendBtn = document.getElementById("sw-update-password-send-code")
      const statusEl = document.getElementById("sw-update-password-code-status")
      const codeInput = document.getElementById("sw-update-password-code")

      const showStatus = (text, isError = false) => {
        if (!statusEl) return
        statusEl.textContent = text
        statusEl.style.color = isError ? "#d33" : "#3085d6"
      }

      const sendCode = async () => {
        const auth = JSON.parse(sessionStorage.getItem("userAuth") || "null")
        const userName = auth?.user?.user_name

        if (!userName) {
          showStatus("未获取到当前用户名，请重新登录", true)
          return
        }

        sendBtn.disabled = true
        const originalText = sendBtn.textContent
        sendBtn.textContent = "发送中..."

        try {
          const res = await sendResetCode(userName, "email")
          if (res.success) {
            showStatus("验证码已发送，请查收邮箱")
            codeInput.focus()

            let countdown = 60
            const timer = setInterval(() => {
              countdown--
              if (countdown > 0) {
                sendBtn.textContent = `${countdown}秒后重发`
              } else {
                clearInterval(timer)
                sendBtn.disabled = false
                sendBtn.textContent = originalText
              }
            }, 1000)
          } else {
            showStatus(res.message || res.error || "发送失败，请稍后再试", true)
            sendBtn.disabled = false
            sendBtn.textContent = originalText
          }
        } catch (error) {
          console.error("发送更新密码验证码错误:", error)
          showStatus("发送请求出错", true)
          sendBtn.disabled = false
          sendBtn.textContent = originalText
        }
      }

      sendBtn?.addEventListener("click", sendCode)
    },
  })

  if (result.isConfirmed) {
    await debugSwal({
      icon: "success",
      title: "密码更新成功",
      text: "请使用新密码重新登录。",
      timer: 1500,
      timerProgressBar: true,
      showConfirmButton: false,
    })
    await logout()
    window.location.reload()
  }
}

async function handleUpdateEmail() {
  const result = await debugSwal({
    title: "更新邮箱",
    html: `
      ${getVerificationModalStyleBlock()}
      <div class="verification-container">
        <div style="font-size: 14px; color: #888; margin-bottom: 12px; text-align: center;">
          将向当前已绑定邮箱发送验证码
        </div>
        <div class="verification-form-group">
          <div class="verification-code-group">
            <input id="sw-update-email-code" class="swal2-input verification-code-input" placeholder="验证码" />
            <button type="button" id="sw-update-email-send-code" class="swal2-confirm swal2-styled verification-send-btn">发送验证码</button>
          </div>
          <div id="sw-update-email-code-status" class="verification-status"></div>
        </div>
        <div class="verification-form-group">
          <input id="sw-update-email-new" type="email" class="swal2-input" placeholder="新邮箱" autocomplete="email">
        </div>
        <div class="verification-form-group">
          <input id="sw-update-email-confirm" type="email" class="swal2-input" placeholder="确认新邮箱" autocomplete="email">
        </div>
      </div>
    `,
    confirmButtonText: "确认更新邮箱",
    showCancelButton: true,
    cancelButtonText: "取消",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      const showTempValidationMessage = (message) => {
        Swal.showValidationMessage(message)
        setTimeout(() => {
          Swal.resetValidationMessage()
        }, 3000)
      }

      const auth = JSON.parse(sessionStorage.getItem("userAuth") || "null")
      const userId = auth?.user?.ID ?? auth?.user?.id ?? auth?.user?.username

      if (!userId) {
        showTempValidationMessage("未能获取当前用户 ID，请重新登录后再试")
        return false
      }

      const code = document.getElementById("sw-update-email-code").value.trim()
      const newEmail = document
        .getElementById("sw-update-email-new")
        .value.trim()
      const confirmNewEmail = document
        .getElementById("sw-update-email-confirm")
        .value.trim()

      if (!code) {
        showTempValidationMessage("请填写验证码")
        return false
      }

      if (!newEmail) {
        showTempValidationMessage("请输入新邮箱")
        return false
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        showTempValidationMessage("请输入有效的邮箱地址")
        return false
      }

      if (newEmail !== confirmNewEmail) {
        showTempValidationMessage("两次输入的新邮箱不一致")
        return false
      }

      try {
        const res = await updateProfile(userId, null, newEmail, null, code)
        if (!res.success) {
          showTempValidationMessage(
            res.message || res.error || "邮箱更新失败，请稍后再试"
          )
          return false
        }
        return { success: true }
      } catch (error) {
        console.error("更新邮箱错误:", error)
        showTempValidationMessage("邮箱更新过程中出现错误，请稍后再试")
        return false
      }
    },
    didOpen: () => {
      const sendBtn = document.getElementById("sw-update-email-send-code")
      const statusEl = document.getElementById("sw-update-email-code-status")
      const codeInput = document.getElementById("sw-update-email-code")

      const showStatus = (text, isError = false) => {
        if (!statusEl) return
        statusEl.textContent = text
        statusEl.style.color = isError ? "#d33" : "#3085d6"
      }

      const sendCode = async () => {
        const auth = JSON.parse(sessionStorage.getItem("userAuth") || "null")
        const userName = auth?.user?.user_name

        if (!userName) {
          showStatus("未获取到当前用户名，请重新登录", true)
          return
        }

        sendBtn.disabled = true
        const originalText = sendBtn.textContent
        sendBtn.textContent = "发送中..."

        try {
          const res = await sendResetCode(userName, "email")
          if (res.success) {
            showStatus("验证码已发送，请查收邮箱")
            codeInput.focus()

            let countdown = 60
            const timer = setInterval(() => {
              countdown--
              if (countdown > 0) {
                sendBtn.textContent = `${countdown}秒后重发`
              } else {
                clearInterval(timer)
                sendBtn.disabled = false
                sendBtn.textContent = originalText
              }
            }, 1000)
          } else {
            showStatus(res.message || res.error || "发送失败，请稍后再试", true)
            sendBtn.disabled = false
            sendBtn.textContent = originalText
          }
        } catch (error) {
          console.error("发送更新邮箱验证码错误:", error)
          showStatus("发送请求出错", true)
          sendBtn.disabled = false
          sendBtn.textContent = originalText
        }
      }

      sendBtn?.addEventListener("click", sendCode)
    },
  })

  if (result.isConfirmed) {
    await debugSwal({
      icon: "success",
      title: "邮箱更新成功",
      text: "新邮箱已保存。",
      timer: 1500,
      timerProgressBar: true,
      showConfirmButton: false,
    })
  }
}

// 公告/Changelog：从 changelog.md 读取并以 Markdown 展示
const ANNOUNCEMENT_STORAGE_KEY = "announcementDismissed" // 保存最近已知版本

async function fetchChangelogText() {
  const resp = await fetch(`${host}/api/changelog`, { cache: "no-cache" })
  if (!resp.ok) throw new Error(`加载 changelog.md 失败：${resp.status}`)
  return await resp.text()
}

function splitSectionsByH2(mdText) {
  const lines = mdText.split(/\r?\n/)
  const sections = []
  let current = null
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/)
    if (m) {
      if (current) sections.push(current)
      current = { heading: m[1], content: "" }
    } else if (current) {
      current.content += line + "\n"
    }
  }
  if (current) sections.push(current)
  return sections
}

function extractVersionFromHeading(heading) {
  // 直接使用整段作为版本标识，通常形如 "2025-11-30" 或 "2025-11-30 更新"
  return heading.trim()
}

async function setupAnnouncements() {
  const btn = document.querySelector("#announcements-btn")
  const modal = document.querySelector("#announcementModal")
  const backdrop = document.querySelector("#announcementBackdrop")
  const closeBtn = document.querySelector("#announcementClose")
  const knowBtn = document.querySelector("#announcementKnow")
  const dontRemindBtn = document.querySelector("#announcementDontRemind")
  const content = document.querySelector("#announcementContent")

  if (!modal || !backdrop || !content) return

  // 拉取并解析 Markdown
  let changelogText = ""
  let sections = []
  try {
    changelogText = await fetchChangelogText()
    sections = splitSectionsByH2(changelogText)
  } catch (err) {
    console.warn("读取 changelog.md 失败，回退为空：", err)
  }

  // 计算最新版本（优先第一节标题）
  const latestSection = sections[0]
  const ANNOUNCEMENT_VERSION = latestSection
    ? extractVersionFromHeading(latestSection.heading)
    : "unknown"

  const open = () => {
    modal.classList.remove("hidden")
    backdrop.classList.remove("hidden")
    modal.setAttribute("aria-hidden", "false")
    backdrop.setAttribute("aria-hidden", "false")
  }

  const close = () => {
    modal.classList.add("hidden")
    backdrop.classList.add("hidden")
    modal.setAttribute("aria-hidden", "true")
    backdrop.setAttribute("aria-hidden", "true")
  }

  // 打开按钮：显示全文（完整 Markdown）
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      content.innerHTML = marked.parse(changelogText || "")
      open()
    })
  }

  // 关闭按钮与我知道了
  if (closeBtn) closeBtn.addEventListener("click", close)
  if (knowBtn) knowBtn.addEventListener("click", close)

  // 不再提醒：记录本次版本（按 Markdown 第一节标题）
  if (dontRemindBtn) {
    dontRemindBtn.addEventListener("click", () => {
      try {
        localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, ANNOUNCEMENT_VERSION)
      } catch (err) {
        console.warn("无法保存不再提醒：", err)
      }
      close()
    })
  }

  // 点击遮罩关闭
  backdrop.addEventListener("click", close)

  // 首次加载若未被忽略就弹出（仅展示最新节内容）
  const dismissed = (() => {
    try {
      const storedVersion = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY)
      return storedVersion === ANNOUNCEMENT_VERSION
    } catch (err) {
      void err
      return false
    }
  })()
  if (!dismissed) {
    const latestHtml = latestSection
      ? marked.parse(`# ${latestSection.heading}\n\n${latestSection.content}`)
      : marked.parse(changelogText || "")
    content.innerHTML = latestHtml
    open()
  }
}
