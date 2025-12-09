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

function wireUserMenuHover() {
  const menu = document.querySelector(".user-menu")
  const panel = document.querySelector(".user-menu-panel")
  if (!menu || !panel) return

  const showPanel = () => {
    panel.style.opacity = "1"
    panel.style.pointerEvents = "auto"
    panel.style.transform = "translateY(0)"
  }

  const hidePanel = () => {
    panel.style.opacity = ""
    panel.style.pointerEvents = ""
    panel.style.transform = ""
  }

  menu.addEventListener("mouseenter", showPanel)
  menu.addEventListener("mouseleave", hidePanel)
  panel.addEventListener("mouseenter", showPanel)
  panel.addEventListener("mouseleave", hidePanel)
}

document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector("header.navbar")
  if (!header) {
    console.warn("header.navbar not found; header behaviors skipped.")
    return
  }

  wireLogoNavigation()
  wireUserMenuHover()
  synchronizeNavHeightVar()
})
