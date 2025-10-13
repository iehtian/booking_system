// Reusable header initializer: ensures a standard header exists and
// makes the logo navigate back to the homepage.

function ensureHeader() {
  // If a header with class .navbar already exists, don't duplicate.
  let header = document.querySelector("header.navbar")
  if (!header) {
    header = document.createElement("header")
    header.className = "navbar"

    const logo = document.createElement("div")
    logo.className = "logo"
    logo.textContent = "实验平台"
    header.appendChild(logo)

    // Insert as the very first element inside body
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
  // If under /pages/, strip /pages/<file> -> /index.html next to /pages
  if (pathname.includes("/pages/")) {
    const base = pathname.split("/pages/")[0]
    return base.endsWith("/") ? base + "index.html" : base + "/index.html"
  }
  // Else, resolve index.html in the same directory as current path
  // e.g., /order/foo.html -> /order/index.html, /order/ -> /order/index.html
  const lastSlash = pathname.lastIndexOf("/")
  const dir = lastSlash >= 0 ? pathname.slice(0, lastSlash + 1) : "/"
  return dir + "index.html"
}

function wireLogoNavigation() {
  const logo = document.querySelector("header.navbar .logo")
  if (!logo) return

  // Accessibility hints and pointer UX
  logo.setAttribute("role", "link")
  logo.setAttribute("tabindex", "0")
  logo.setAttribute("title", "返回首页")

  const goHome = (ev) => {
    // Allow default behavior of links if ever changed to <a>, but our logo is a div
    ev.preventDefault?.()
    const url = computeHomeUrl()
    window.location.href = url
  }

  logo.addEventListener("click", goHome)
  logo.addEventListener("keydown", (ev) => {
    // Support Enter and Space keys
    if (ev.key === "Enter" || ev.key === " ") {
      goHome(ev)
    }
  })
}

document.addEventListener("DOMContentLoaded", () => {
  ensureHeader()
  wireLogoNavigation()
  synchronizeNavHeightVar()
})

// 同步导航条的实际高度到 CSS 变量 --nav-h，确保所有页面能正确预留空间
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
