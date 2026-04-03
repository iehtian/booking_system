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

async function checkMaintenance() {
  try {
    const res = await fetch(`/api/maintenance`)
    const data = await res.json()
    if (data.maintenance) {
      document.body.innerHTML = `
        <div style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: #f5f5f5;
        ">
          <div style="
            text-align: center;
            padding: 40px;
          ">
            <h1 style="color: #e74c3c; font-size: 32px; margin-bottom: 20px;">
              正在更新，暂不可用
            </h1>
            <p style="color: #666; font-size: 18px;">
              系统正在维护中，请稍后再试...
            </p>
          </div>
        </div>
      `
    }
  } catch (e) {
    console.error("检查维护状态失败:", e)
  }
}

function wireUserMenu() {
  const menu = document.querySelector(".user-menu")
  const trigger = menu?.querySelector(".user-menu-trigger")
  const panel = document.querySelector(".user-menu-panel")
  if (!menu || !panel) return

  const canHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches

  const syncExpanded = () => {
    const isExpanded =
      menu.classList.contains("is-pinned") ||
      (canHover && menu.matches(":hover"))
    trigger?.setAttribute("aria-expanded", isExpanded ? "true" : "false")
  }

  trigger?.addEventListener("click", () => {
    const isPinned = menu.classList.toggle("is-pinned")
    if (!isPinned) {
      trigger.blur()
    }
    syncExpanded()
  })

  if (canHover) {
    menu.addEventListener("mouseenter", syncExpanded)
    menu.addEventListener("mouseleave", syncExpanded)
  }

  menu.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      menu.classList.remove("is-pinned")
      syncExpanded()
      trigger?.focus()
    }
  })

  document.addEventListener("click", (ev) => {
    if (!menu.contains(ev.target)) {
      menu.classList.remove("is-pinned")
      syncExpanded()
    }
  })

  syncExpanded()
}

document.addEventListener("DOMContentLoaded", async () => {
  const header = document.querySelector("header.navbar")
  if (!header) {
    console.warn("header.navbar not found; header behaviors skipped.")
    return
  }

  await checkMaintenance().catch(console.error)
  wireLogoNavigation()
  wireUserMenu()
  synchronizeNavHeightVar()
})
