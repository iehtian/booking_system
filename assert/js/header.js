function ensureHeader() {
  let header = document.querySelector("header.navbar")
  if (!header) {
    header = document.createElement("header")
    header.className = "navbar"

    const logo = document.createElement("div")
    logo.className = "logo"
    logo.textContent = "实验平台"
    header.appendChild(logo)
    const body = document.body
    if (body.firstChild) {
      body.insertBefore(header, body.firstChild)
    } else {
      body.appendChild(header)
    }
  }
}

function computeHomeUrl() {
  const { pathname } = window.location
  if (pathname.includes("/pages/")) {
    const base = pathname.split("/pages/")[0]
    return base.endsWith("/") ? base + "index.html" : base + "/index.html"
  }
  const lastSlash = pathname.lastIndexOf("/")
  const dir = lastSlash >= 0 ? pathname.slice(0, lastSlash + 1) : "/"
  return dir + "index.html"
}

function wireLogoNavigation() {
  const logo = document.querySelector("header.navbar .logo")
  if (!logo) return

  logo.setAttribute("role", "link")
  logo.setAttribute("tabindex", "0")
  logo.setAttribute("title", "返回首页")

  const goHome = (ev) => {
    ev.preventDefault?.()
    const url = computeHomeUrl()
    window.location.href = url
  }

  logo.addEventListener("click", goHome)
  logo.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      goHome(ev)
    }
  })
}

document.addEventListener("DOMContentLoaded", () => {
  ensureHeader()
  ensureUserMenu()
  wireLogoNavigation()
  synchronizeNavHeightVar()
})

function ensureUserMenu() {
  const header = document.querySelector("header.navbar")
  if (!header || header.querySelector(".user-menu")) return

  const nav =
    header.querySelector("nav.user-actions") || document.createElement("nav")
  nav.classList.add("user-actions")

  if (!nav.parentElement) {
    header.appendChild(nav)
  }

  let showName = nav.querySelector(".show-name")
  if (!showName) {
    showName = document.createElement("span")
    showName.className = "show-name hidden"
    showName.id = "showname"
    showName.textContent = "你好，user"
    nav.appendChild(showName)
  }

  const menu = document.createElement("div")
  menu.className = "user-menu"
  menu.id = "userMenu"
  menu.innerHTML = `
    <button
      class="user-menu-trigger"
      id="userMenuTrigger"
      aria-haspopup="true"
      aria-expanded="false"
    >
      用户管理
    </button>
    <ul class="user-menu-panel" id="userMenuPanel" role="menu">
      <li class="menu-group menu-guest" id="guestMenu" aria-label="未登录操作">
        <a href="#" id="menu-login" role="menuitem">登录</a>
        <a href="#" id="menu-register" role="menuitem">注册</a>
        <a href="#" id="menu-reset-password" role="menuitem">重置密码</a>
      </li>
      <li class="menu-group menu-authed hidden" id="authedMenu" aria-label="已登录操作">
        <a href="#" id="menu-change-id" role="menuitem">修改ID</a>
        <a href="#" id="menu-change-password" role="menuitem">修改密码</a>
        <a href="#" id="menu-logout" role="menuitem">退出登录</a>
        <a href="#" id="menu-delete-account" role="menuitem">注销账号</a>
      </li>
    </ul>
  `

  nav.appendChild(menu)

  if (!nav.querySelector("#announcementsBtn")) {
    const announcementsLink = document.createElement("a")
    announcementsLink.href = "#"
    announcementsLink.id = "announcementsBtn"
    announcementsLink.textContent = "公告"
    nav.appendChild(announcementsLink)
  }
}

function synchronizeNavHeightVar() {
  const header = document.querySelector("header.navbar")
  if (!header) return

  const apply = () => {
    const h = Math.round(header.getBoundingClientRect().height)
    if (h > 0) {
      document.documentElement.style.setProperty("--nav-h", `${h}px`)
    }
  }

  // 初次应用
  apply()
  // 窗口尺寸或缩放变化时也更新一次
  window.addEventListener("resize", apply)
}
