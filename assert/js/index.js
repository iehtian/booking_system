import { logout, checkAuthStatus, updatePassword } from "./user_manager.js"
import { marked } from "marked"
import { host } from "./config.js"

const loginItem = document.querySelector("#menu-login")
const registerItem = document.querySelector("#menu-register")
const resetPasswordItem = document.querySelector("#menu-reset-password")
const logoutItem = document.querySelector("#menu-logout")
const changeIdItem = document.querySelector("#menu-change-id")
const changePasswordItem = document.querySelector("#menu-change-password")
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
  alert("重置密码功能即将上线，请联系管理员协助处理。")
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

changeIdItem?.addEventListener("click", (event) => {
  event.preventDefault()
  alert("修改 ID 功能暂未开放，请联系管理员。")
})

changePasswordItem?.addEventListener("click", (event) => {
  event.preventDefault()
  handleChangePassword().catch(console.error)
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

async function handleChangePassword() {
  const auth = JSON.parse(sessionStorage.getItem("userAuth") || "null")
  const userId = auth?.user?.ID ?? auth?.user?.id ?? auth?.user?.username
  if (!userId) {
    alert("未能获取当前用户 ID，请重新登录后再试。")
    return
  }

  const oldPassword = prompt("请输入当前密码：")
  if (!oldPassword) return

  const newPassword = prompt("请输入新密码：")
  if (!newPassword) return

  const res = await updatePassword(userId, oldPassword, newPassword)
  if (res?.success) {
    alert("密码已更新，请重新登录。")
    await logout()
    window.location.reload()
    return
  }

  alert(res?.message || "修改密码失败，请稍后再试。")
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
