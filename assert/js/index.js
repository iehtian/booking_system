import { logout, checkAuthStatus } from "./user_manager.js"
import { marked } from "marked"

document.querySelector("#login").addEventListener("click", function (event) {
  event.preventDefault() // 阻止默认链接行为
  const loginUrl = `pages/login.html`
  window.location.href = loginUrl
})

document.querySelector("#register").addEventListener("click", function (event) {
  event.preventDefault() // 阻止默认链接行为
  const registerUrl = `pages/register.html`
  window.location.href = registerUrl
})

document.querySelector("#logout").addEventListener("click", function (event) {
  event.preventDefault() // 阻止默认链接行为
  logout()
    .then(() => {
      console.log("用户已退出登录")
      window.location.reload() // 刷新页面
    })
    .catch((error) => {
      console.error("退出登录失败:", error)
    })
})

async function initUser() {
  // 兼容不同返回结构：true/false 或 { logged_in, user }
  await checkAuthStatus()
  const result = JSON.parse(sessionStorage.getItem("userAuth") || "null")
  const loginHintEl = document.querySelector("#login-hint")
  if (result) {
    document.querySelector("#logout").classList.remove("hidden")
    const realName = result.user.name
    document.querySelector(".show-name").textContent = `你好，${realName}`
    document.querySelector(".show-name").classList.remove("hidden")
    if (loginHintEl) loginHintEl.classList.add("hidden")
  } else {
    document.querySelector("#login").classList.remove("hidden")
    document.querySelector("#register").classList.remove("hidden")
    if (loginHintEl) loginHintEl.classList.remove("hidden")
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initUser().catch(console.error)
  setupAnnouncements().catch(console.error)
})

// 公告/Changelog：从 changelog.md 读取并以 Markdown 展示
const ANNOUNCEMENT_STORAGE_KEY = "announcementDismissed" // 保存最近已知版本

async function fetchChangelogText() {
  const resp = await fetch("/changelog.md", { cache: "no-cache" })
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
