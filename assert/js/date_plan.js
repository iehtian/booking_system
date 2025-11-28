import { host } from "./config.js"

// 获取当前用户名称（优先 JWT 接口，回退 Cookie）
function readCookie(key) {
  return (
    document.cookie
      .split(";")
      .map((c) => c.trim())
      .filter((c) => c.startsWith(key + "="))
      .map((c) => decodeURIComponent(c.split("=")[1]))[0] || null
  )
}

// 日期按钮事件与日期输入
document.querySelector("#appointment-date").addEventListener("click", (e) => {
  e.target.showPicker()
})
document.querySelector("#yestoday").addEventListener("click", (e) => {
  date_change(e, -1)
})
document.querySelector("#tomorrow").addEventListener("click", (e) => {
  date_change(e, 1)
})

function date_change(event, delta) {
  event.preventDefault()
  const dateInput = document.querySelector("#appointment-date")
  const currentDate = new Date(dateInput.value)
  currentDate.setDate(currentDate.getDate() + delta)
  dateInput.value = currentDate.toISOString().split("T")[0]
  init()
}

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.querySelector("#appointment-date")
  dateInput.value = new Date().toISOString().split("T")[0]
})
document
  .querySelector("#appointment-date")
  .addEventListener("change", () => init())

async function fetchCurrentUserPlan(user_id, date) {
  const res = await fetch(
    `${host}/api/date_plan/get?date=${date}&&user_id=${user_id}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  )
  const data = await res.json()
  if (data.success) return data.info || []
  return []
}

async function update_info(
  user_id,
  date,
  plan = null,
  status = null,
  remark = null
) {
  // 构造仅包含有效字段的请求体，避免未选择状态时默认写入未完成
  const postData = { user_id, date }
  if (plan !== null) postData.plan = plan
  if (status !== null) postData.status = status
  if (remark !== null) postData.remark = remark
  // 调试：打印提交的载荷
  console.log("[DatePlan] 提交载荷:", postData)
  const res = await fetch(`${host}/api/date_plan/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(postData),
  })
  const data = await res.json()
  if (!data.success) alert("计划修改失败: " + data.message)
}

async function fetchAllPlans(date) {
  const res = await fetch(`${host}/api/date_plan/all?date=${date}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })
  const data = await res.json()
  if (data.success) return data.data || []
  return []
}

function createRadio(name, value, checked, disabled) {
  const wrapper = document.createElement("div")
  wrapper.className = "radio-option"
  const input = document.createElement("input")
  input.type = "radio"
  input.name = name
  input.value = value
  input.id = `${name}-${value}-${Math.random().toString(36).slice(2, 7)}`
  input.checked = checked
  input.disabled = disabled
  const label = document.createElement("label")
  label.htmlFor = input.id
  label.textContent = value === "complete" ? "已完成" : "未完成"
  wrapper.appendChild(input)
  wrapper.appendChild(label)
  return { wrapper, input }
}

function renderCurrentUserRow(username, info) {
  const tbody = document.getElementById("plans-tbody")
  // 当前用户行
  const tr = document.createElement("tr")
  tr.className = "current-user-row"
  const planData = info.length ? info[0][0] : ""
  const statusData = info.length ? info[0][1] : null
  const remarkData = info.length ? info[0][2] : ""

  // 姓名
  const tdName = document.createElement("td")
  tdName.textContent = username || "当前用户"
  tdName.className = "name-cell"
  tr.appendChild(tdName)

  // 计划
  const tdPlan = document.createElement("td")
  const taPlan = document.createElement("textarea")
  taPlan.id = "plan"
  taPlan.value = planData || ""
  tdPlan.appendChild(taPlan)
  tr.appendChild(tdPlan)

  // 状态
  const tdStatus = document.createElement("td")
  tdStatus.className = "status-cell"
  const group = document.createElement("div")
  group.className = "radio-group"
  const complete = createRadio(
    "status-current",
    "complete",
    statusData === 1 || statusData === "1",
    false
  )
  complete.input.id = "complete"
  const incomplete = createRadio(
    "status-current",
    "incomplete",
    statusData === 0 || statusData === "0",
    false
  )
  incomplete.input.id = "incomplete"
  // 当返回值为空或状态缺失时，不选中任何一个
  if (
    !info.length ||
    statusData === null ||
    typeof statusData === "undefined" ||
    statusData === 2 ||
    statusData === "2"
  ) {
    complete.input.checked = false
    incomplete.input.checked = false
  }
  group.appendChild(complete.wrapper)
  group.appendChild(incomplete.wrapper)
  tdStatus.appendChild(group)
  tr.appendChild(tdStatus)

  // 备注
  const tdRemark = document.createElement("td")
  const taRemark = document.createElement("textarea")
  taRemark.id = "remark"
  taRemark.value = remarkData || ""
  tdRemark.appendChild(taRemark)
  tr.appendChild(tdRemark)

  // 操作
  const tdAction = document.createElement("td")
  tdAction.className = "action-cell"
  const btnSubmit = document.createElement("button")
  btnSubmit.id = "updatePlanBtn"
  btnSubmit.textContent = "提交"
  tdAction.appendChild(btnSubmit)
  tr.appendChild(tdAction)

  tbody.appendChild(tr)

  // 加载数据后保持可编辑，除非日期为过去日期

  // 若所选日期已过去，则不允许修改/提交
  const isPastSelectedDate = () => {
    const dateStr = document.getElementById("appointment-date").value
    if (!dateStr) return false
    const selected = new Date(dateStr)
    const today = new Date()
    // 只比较日期部分（本地时区）
    selected.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return selected < today
  }

  if (isPastSelectedDate()) {
    disableCurrentInputs()
    btnSubmit.disabled = true
  }

  btnSubmit.addEventListener("click", () => {
    // 过去日期不可提交
    const past = (() => {
      const dateStr = document.getElementById("appointment-date").value
      if (!dateStr) return false
      const selected = new Date(dateStr)
      const today = new Date()
      selected.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0)
      return selected < today
    })()
    if (past) {
      alert("已过去的日期不允许修改或提交")
      return
    }
    const date = document.getElementById("appointment-date").value
    const plan = taPlan.value
    // 若未选择完成情况，则不提交该字段，避免默认未完成
    const completeEl = document.getElementById("complete")
    const incompleteEl = document.getElementById("incomplete")
    // 状态编码：已完成=1，未完成=0，未选择=2
    let status = 2
    if (completeEl?.checked) status = 1
    else if (incompleteEl?.checked) status = 0
    const remark = taRemark.value
    // 获取当前用户 ID 并传递给接口
    const userAuth = JSON.parse(sessionStorage.getItem("userAuth") || "null")
    const user_id = userAuth && userAuth.user ? userAuth.user.ID : null
    update_info(user_id, date, plan, status, remark).then(() => {
      // 提交后保持可编辑状态，便于随时继续修改
      enableCurrentInputs()
    })
  })
}

function disableCurrentInputs() {
  const ids = ["plan", "complete", "incomplete", "updatePlanBtn", "remark"]
  ids.forEach((id) => {
    const el = document.getElementById(id)
    if (el) el.disabled = true
  })
}
function enableCurrentInputs() {
  const ids = ["plan", "complete", "incomplete", "updatePlanBtn", "remark"]
  // 若所选日期已过去，则不启用
  const dateStr = document.getElementById("appointment-date")?.value
  if (dateStr) {
    const selected = new Date(dateStr)
    const today = new Date()
    selected.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    if (selected < today) {
      // 保持禁用并直接返回
      ids.forEach((id) => {
        const el = document.getElementById(id)
        if (el) el.disabled = true
      })
      return
    }
  }
  ids.forEach((id) => {
    const el = document.getElementById(id)
    if (el) el.disabled = false
  })
}

function renderOtherUserRow(userObj, currentUserName) {
  const { user, info } = userObj
  if (user === currentUserName) return // 已用当前用户行替代
  const tbody = document.getElementById("plans-tbody")
  const tr = document.createElement("tr")
  const planData = info.length ? info[0][0] : ""
  const statusData = info.length ? info[0][1] : null
  const remarkData = info.length ? info[0][2] : ""

  // 姓名
  const tdName = document.createElement("td")
  tdName.textContent = user
  tdName.className = "name-cell"
  tr.appendChild(tdName)

  // 计划
  const tdPlan = document.createElement("td")
  const taPlan = document.createElement("textarea")
  taPlan.value = planData
  // 他人内容两行显示且可滚动，但不可编辑
  taPlan.rows = 2
  taPlan.readOnly = true
  tdPlan.appendChild(taPlan)
  tr.appendChild(tdPlan)

  // 状态
  const tdStatus = document.createElement("td")
  tdStatus.className = "status-cell"
  const group = document.createElement("div")
  group.className = "radio-group"
  const complete = createRadio(
    `status-${user}`,
    "complete",
    statusData === 1 || statusData === "1",
    true
  )
  const incomplete = createRadio(
    `status-${user}`,
    "incomplete",
    statusData === 0 || statusData === "0",
    true
  )
  // 他人行在返回为空或状态缺失时也保持未选择（且禁用）
  if (
    !info.length ||
    statusData === null ||
    typeof statusData === "undefined" ||
    statusData === 2 ||
    statusData === "2"
  ) {
    complete.input.checked = false
    incomplete.input.checked = false
  }
  group.appendChild(complete.wrapper)
  group.appendChild(incomplete.wrapper)
  tdStatus.appendChild(group)
  tr.appendChild(tdStatus)

  // 备注
  const tdRemark = document.createElement("td")
  const taRemark = document.createElement("textarea")
  taRemark.value = remarkData
  // 他人内容两行显示且可滚动，但不可编辑
  taRemark.rows = 2
  taRemark.readOnly = true
  tdRemark.appendChild(taRemark)
  tr.appendChild(tdRemark)

  // 操作（空）
  const tdAction = document.createElement("td")
  tdAction.className = "action-cell"
  tdAction.textContent = "--"
  tr.appendChild(tdAction)

  tbody.appendChild(tr)
}

async function init() {
  // 直接从 sessionStorage 获取用户认证信息；null 表示未登录
  const userAuth = JSON.parse(sessionStorage.getItem("userAuth") || "null")

  const date = document.getElementById("appointment-date").value
  const tbody = document.getElementById("plans-tbody")
  tbody.innerHTML = "" // 清空旧内容

  if (userAuth && userAuth.logged_in) {
    const currentUserName = userAuth.user.name
    const user_id = userAuth.user.ID
    const currentPlanInfo = await fetchCurrentUserPlan(user_id, date)
    // 调试输出当前用户信息与计划数据
    console.log("[DatePlan] 当前用户认证信息:", userAuth)
    console.log("[DatePlan] 当前用户ID:", user_id, "日期:", date)
    console.log("[DatePlan] 当前用户计划信息:", currentPlanInfo)
    renderCurrentUserRow(currentUserName, currentPlanInfo)

    const all = await fetchAllPlans(date)
    all.forEach((u) => renderOtherUserRow(u, currentUserName))
  } else {
    // 未登录则仅展示所有用户的计划，隐藏当前用户行
    const currentUserName = null
    const all = await fetchAllPlans(date)
    all.forEach((u) => renderOtherUserRow(u, currentUserName))
  }
}

window.onload = init
