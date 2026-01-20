import {
  login,
  register,
  logout,
  checkAuthStatus,
  updateProfile,
  sendResetCode,
  resetPassword,
} from "./user_manager.js"
import { marked } from "marked"
import { host } from "./config.js"

const loginItem = document.querySelector("#menu-login")
const registerItem = document.querySelector("#menu-register")
const resetPasswordItem = document.querySelector("#menu-reset-password")
const logoutItem = document.querySelector("#menu-logout")
const UpdateProfileItem = document.querySelector("#menu-update-profile")
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

UpdateProfileItem?.addEventListener("click", (event) => {
  event.preventDefault()
  handleUpdateProfile().catch(console.error)
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

document.addEventListener("DOMContentLoaded", async() => {
  await initUser().catch(console.error)
  await setupAnnouncements().catch(console.error)
  setupUserMenuAria()
  await Forced_add_email()
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

async function openLoginModal() {
  const result = await Swal.fire({
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

  await checkAuthStatus()
  await Swal.fire({
    icon: "success",
    title: "登录成功",
    timer: 1200,
    showConfirmButton: false,
  })
  window.location.reload()
}

async function openRegisterModal() {
  const result = await Swal.fire({
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
  await Swal.fire({
    icon: "success",
    title: "注册成功",
    text: "已自动登录，如未登录请再试一次。",
    timer: 1500,
    showConfirmButton: false,
  })
  window.location.reload()
}

async function openResetPasswordModal() {
  const result = await Swal.fire({
    title: "重置密码",
    html: `
      <style>
        .reset-container {
          padding: 0 20px;
        }
        .reset-form-group {
          margin-bottom: 12px;
          text-align: center;
        }
        .reset-radio-group {
          display: flex;
          gap: 32px;
          justify-content: center;
          align-items: center;
        }
        .reset-radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #666;
        }
        .reset-radio-label input[type="radio"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        .reset-code-group {
          display: flex;
          gap: 10px;
          align-items: center;
          max-width: 100%;
        }
        .reset-code-input {
          flex: 1;
          margin: 0 !important;
          height: 42px !important;
          box-sizing: border-box !important;
        }
        .reset-send-btn {
          padding: 0 20px !important;
          margin: 0 !important;
          font-size: 14px !important;
          white-space: nowrap;
          height: 42px !important;
          border-radius: 6px !important;
          flex-shrink: 0;
          line-height: 1 !important;
        }
        .reset-status {
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
      <div class="reset-container">
        <div class="reset-form-group">
          <input id="sw-user_name" class="swal2-input" placeholder="姓名" />
        </div>
        <div class="reset-form-group">
          <div class="reset-radio-group">
            <label class="reset-radio-label">
              <input type="radio" name="sw-method" value="email"  checked/> 邮箱
            </label>

          </div>
        </div>
        <div class="reset-form-group">
          <div class="reset-code-group">
            <input id="sw-code" class="swal2-input reset-code-input" placeholder="验证码" />
            <button type="button" id="sw-send-code" class="swal2-confirm swal2-styled reset-send-btn">发送验证码</button>
          </div>
          <div id="sw-code-status" class="reset-status"></div>
        </div>
        <div class="reset-form-group">
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
    await Swal.fire({
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

async function handleUpdateProfile() {
  const result = await Swal.fire({
    title: "更新个人信息",
    html: `
      <div style="font-size: 14px; color: #888; margin-bottom: 15px;">
        无需更新的项可以留空
      </div>
      <input id="newpassword" type="password" class="swal2-input" placeholder="新密码">
      <input id="newemail" type="email" class="swal2-input" placeholder="新邮箱">
    `,
    confirmButtonText: "确认更新",
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

      const newPassword = document.getElementById("newpassword").value.trim()
      const newEmail = document.getElementById("newemail").value.trim()
      const newPhone = null

      if (!newPassword && !newEmail && !newPhone) {
        showTempValidationMessage("请至少填写一项需要更新的信息")
        return false
      }

      if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        showTempValidationMessage("请输入有效的邮箱地址")
        return false
      }

      if (newPhone && !/^1[3-9]\d{9}$/.test(newPhone)) {
        showTempValidationMessage("请输入有效的手机号码")
        return false
      }

      try {
        const res = await updateProfile(
          userId,
          newPassword || null,
          newEmail || null,
          newPhone || null
        )

        if (!res.success) {
          showTempValidationMessage(res.message || "更新失败，请稍后再试")
          return false
        }

        return { success: true } // 成功后才关闭对话框
      } catch (error) {
        console.error("更新个人信息错误:", error)
        showTempValidationMessage("更新过程中出现错误，请稍后再试")
        return false
      }
    },
  })

  if (result.isConfirmed) {
    await Swal.fire({
      icon: "success",
      title: "更新成功",
      text: "个人信息更新成功！",
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

async function Forced_add_email() {
  const userAuth = JSON.parse(sessionStorage.getItem("userAuth") || "null")
  if (!userAuth) return
  const res = await fetch(
    `${host}/api/is_email_configured?user_name=${encodeURIComponent(userAuth.user.user_name)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )
  const data = await res.json()
  console.log("邮箱配置状态:", data)
  if (!data.is_email_configured) {
    await Swal.fire({
      icon: "warning",
      title: "请设置邮箱",
      text: "为了保障账号安全，请尽快在个人资料中设置邮箱地址。",
      confirmButtonText: "去设置",
    })
    await handleUpdateProfile()
  }
}
