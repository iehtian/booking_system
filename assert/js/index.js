import { logout, checkAuthStatus } from "./user_manager.js"

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
  setupAnnouncements()
})

// 公告/Changelog 配置与逻辑
const CHANGELOG = [
  {
    version: "2025-11-30",
    date: "2025-11-30",
    items: [
      "新增首页右上角公告入口与弹窗",
      "弹窗支持不再提醒（按版本号持久化）",
      "预约打印与每日计划体验优化",
    ],
  },
  // 可在此追加历史记录:
  // { version: "2025-11-15", date: "2025-11-15", items: ["...", "..."] },
]

const LATEST = CHANGELOG[0]
const ANNOUNCEMENT_VERSION = LATEST.version
const ANNOUNCEMENT_STORAGE_KEY = "announcementDismissed" // 仅一个键，值为版本号

function renderEntryHTML(entry) {
  const items = entry.items.map((t) => `<li>${t}</li>`).join("")
  return `
    <p><strong>更新日期：</strong>${entry.date}</p>
    <ul>${items}</ul>
  `
}

function renderFullChangelogHTML(entries) {
  return entries
    .map(
      (e) => `
      <section class="changelog-entry">
        <h3>版本：${e.version}</h3>
        ${renderEntryHTML(e)}
      </section>
    `
    )
    .join("<hr />")
}

function setupAnnouncements() {
  const btn = document.querySelector("#announcementsBtn")
  const modal = document.querySelector("#announcementModal")
  const backdrop = document.querySelector("#announcementBackdrop")
  const closeBtn = document.querySelector("#announcementClose")
  const knowBtn = document.querySelector("#announcementKnow")
  const dontRemindBtn = document.querySelector("#announcementDontRemind")
  const content = document.querySelector("#announcementContent")

  if (!modal || !backdrop || !content) return

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

  // 打开按钮
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      // 点击“公告”显示完整历史
      content.innerHTML = renderFullChangelogHTML(CHANGELOG)
      // 在查看历史的场景下，保留两个按钮但不自动写入不再提醒
      open()
    })
  }

  // 关闭按钮与我知道了
  if (closeBtn) closeBtn.addEventListener("click", close)
  if (knowBtn) knowBtn.addEventListener("click", close)

  // 不再提醒：记录本次版本
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

  // 首次加载若未被忽略就弹出
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
    // 自动弹出：只展示最新版本内容
    content.innerHTML = renderEntryHTML(LATEST)
    open()
  }
}
