import {
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
  window.location.href = `pages/login.html`
})

registerItem?.addEventListener("click", (event) => {
  event.preventDefault()
  window.location.href = `pages/register.html`
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

document.addEventListener("DOMContentLoaded", () => {
  initUser().catch(console.error)
  setupAnnouncements().catch(console.error)
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
  trigger.addEventListener("focus", () => setExpanded(true))
  trigger.addEventListener("blur", () => setExpanded(false))
}

async function openResetPasswordModal() {
  const result = await Swal.fire({
    title: "重置密码",
    html: `
      <input id="sw-identifier" class="swal2-input" placeholder="账号 (用户名/邮箱/手机)" />
      <div style="text-align: left; margin: 0 1.5em 10px;">
        <div style="font-size: 14px; color: #666; margin-bottom: 6px;">验证码接收方式</div>
        <div style="display: flex; gap: 16px; align-items: center;">
          <label style="display: flex; align-items: center; gap: 6px;">
            <input type="radio" name="sw-method" value="email" checked /> 邮箱
          </label>
          <label style="display: flex; align-items: center; gap: 6px;">
            <input type="radio" name="sw-method" value="phone" /> 手机
          </label>
        </div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; padding: 0 1.5em;">
        <input id="sw-code" class="swal2-input" placeholder="验证码" style="flex: 1; margin: 0;" />
        <button type="button" id="sw-send-code" class="swal2-confirm swal2-styled" style="margin: 0;">发送验证码</button>
      </div>
      <p id="sw-code-status" style="margin: 6px 1.5em 0; font-size: 13px; color: #666;"></p>
      <input id="sw-new-password" type="password" class="swal2-input" placeholder="新密码" />
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "提交",
    cancelButtonText: "取消",
    preConfirm: () => {
      const identifier = document.getElementById("sw-identifier").value.trim()
      const code = document.getElementById("sw-code").value.trim()
      const newPassword = document
        .getElementById("sw-new-password")
        .value.trim()

      if (!identifier || !code || !newPassword) {
        Swal.showValidationMessage("请填写完整信息")
        return false
      }

      return { identifier, code, newPassword }
    },
    didOpen: () => {
      const sendBtn = document.getElementById("sw-send-code")
      const identifierInput = document.getElementById("sw-identifier")
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
        const identifier = identifierInput.value.trim()
        if (!identifier) {
          showStatus("请先输入账号再发送验证码", true)
          identifierInput.focus()
          return
        }

        sendBtn.disabled = true
        const originalText = sendBtn.textContent
        sendBtn.textContent = "发送中..."
        try {
          const res = await sendResetCode(identifier, getMethod())
          if (res.success) {
            showStatus("验证码已发送，请查收")
            codeInput.focus()
          } else {
            showStatus(res.message || "发送失败，请稍后再试", true)
          }
        } catch (error) {
          console.error("发送重置验证码错误:", error)
          showStatus("发送请求出错", true)
        } finally {
          sendBtn.disabled = false
          sendBtn.textContent = originalText
        }
      }

      sendBtn?.addEventListener("click", sendCode)
    },
  })

  if (!result.isConfirmed) return

  const { identifier, code, newPassword } = result.value
  try {
    const res = await resetPassword(identifier, code, newPassword)
    if (res.success) {
      await Swal.fire({
        icon: "success",
        title: "密码重置成功",
        text: "请使用新密码重新登录。",
      })
      window.location.href = "pages/login.html"
    } else {
      await Swal.fire({
        icon: "error",
        title: "重置失败",
        text: res.message || "请检查验证码是否正确",
      })
    }
  } catch (error) {
    console.error("重置密码错误:", error)
    await Swal.fire({
      icon: "error",
      title: "重置失败",
      text: "提交请求出错，请稍后再试。",
    })
  }
}

async function handleUpdateProfile() {
  const auth = JSON.parse(sessionStorage.getItem("userAuth") || "null")
  const userId = auth?.user?.ID ?? auth?.user?.id ?? auth?.user?.username
  if (!userId) {
    alert("未能获取当前用户 ID，请重新登录后再试。")
    return
  }

  // 使用
  Swal.fire({
    title: "更新个人信息",
    html: `
    <div style="font-size: 18px; color: #888; margin-bottom: 10px;">无需更新的项可以留空</div>
    <input id="newpassword" type="password" class="swal2-input" placeholder="新密码">
    <input id="newemail" type="password" class="swal2-input" placeholder="新邮箱">
    <input id="newphone" type="text" class="swal2-input" placeholder="新手机号">
  `,
    confirmButtonText: "确认",
    showCancelButton: true,
    cancelButtonText: "取消",
    preConfirm: () => ({
      newPassword: document.getElementById("newpassword").value,
      newEmail: document.getElementById("newemail").value,
      newPhone: document.getElementById("newphone").value,
    }),
  }).then(async (result) => {
    console.log(result.value)
    if (result.isConfirmed) {
      const { newPassword, newEmail, newPhone } = result.value

      try {
        const res = await updateProfile(
          userId,
          newPassword || null,
          newEmail || null,
          newPhone || null
        )
        if (!res.success) {
          alert(res.message || "更新失败，请稍后再试。")
          return
        }
        alert("个人信息更新成功！")
      } catch (error) {
        console.error("更新个人信息错误:", error)
        alert("更新过程中出现错误，请稍后再试。")
      }
    }
  })
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
  const btn = document.querySelector("#announcementsBtn")
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
