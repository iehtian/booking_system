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
  const postData = { user_id, plan, status, remark, date }
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
    statusData === 1,
    false
  )
  complete.input.id = "complete"
  const incomplete = createRadio(
    "status-current",
    "incomplete",
    statusData === 0,
    false
  )
  incomplete.input.id = "incomplete"
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
  const btnEdit = document.createElement("button")
  btnEdit.id = "editPlanBtn"
  btnEdit.textContent = "修改"
  tdAction.appendChild(btnSubmit)
  tdAction.appendChild(btnEdit)
  tr.appendChild(tdAction)

  tbody.appendChild(tr)

  // 初始禁用逻辑: 若已有内容则禁用编辑，点“修改”再启用
  if (planData || remarkData || statusData !== null) {
    disableCurrentInputs()
    btnEdit.disabled = false
  } else {
    btnEdit.disabled = true
  }

  btnEdit.addEventListener("click", () => enableCurrentInputs())
  btnSubmit.addEventListener("click", () => {
    const date = document.getElementById("appointment-date").value
    const plan = taPlan.value
    const status = document.getElementById("complete").checked ? 1 : 0
    const remark = taRemark.value
    // 获取当前用户 ID 并传递给接口
    const userAuth = JSON.parse(sessionStorage.getItem("userAuth") || "null")
    const user_id = userAuth && userAuth.user ? userAuth.user.ID : null
    update_info(user_id, date, plan, status, remark).then(() => {
      disableCurrentInputs()
      btnEdit.disabled = false
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
  taPlan.disabled = true
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
    statusData === 1,
    true
  )
  const incomplete = createRadio(
    `status-${user}`,
    "incomplete",
    statusData === 0,
    true
  )
  group.appendChild(complete.wrapper)
  group.appendChild(incomplete.wrapper)
  tdStatus.appendChild(group)
  tr.appendChild(tdStatus)

  // 备注
  const tdRemark = document.createElement("td")
  const taRemark = document.createElement("textarea")
  taRemark.value = remarkData
  taRemark.disabled = true
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
    renderCurrentUserRow(currentUserName, currentPlanInfo)

    const all = await fetchAllPlans(date)
    all.forEach((u) => renderOtherUserRow(u, currentUserName))
  } else {
    // 未登录则不展示计划列表
    const tr = document.createElement("tr")
    const td = document.createElement("td")
    td.colSpan = 5
    td.textContent = "请先登录后查看与更新每日计划"
    tr.appendChild(td)
    tbody.appendChild(tr)
  }
}

window.onload = init
