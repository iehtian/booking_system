import { host } from "./config.js"

document
  .querySelector("#appointment-date")
  .addEventListener("click", function (event) {
    //回调函数，打开日期选择器
    event.target.showPicker() // 显示日期选择器
  })

document.querySelector("#yestoday").addEventListener("click", (event) => {
  date_change(event, -1) // 点击昨天按钮，日期减1
})
document.querySelector("#tomorrow").addEventListener("click", (event) => {
  date_change(event, 1) // 点击明天按钮，日期加1
})

function date_change(event, delta) {
  event.preventDefault() // 阻止默认行为
  const dateInput = document.querySelector("#appointment-date")
  const currentDate = new Date(dateInput.value)
  currentDate.setDate(currentDate.getDate() + delta) // 修改日期
  dateInput.value = currentDate.toISOString().split("T")[0] // 更新输入框的值
  init() // 初始化页面内容
}

//设置日期默认为今天
document.addEventListener("DOMContentLoaded", function () {
  const dateInput = document.querySelector("#appointment-date")
  const today = new Date()
  dateInput.value = today.toISOString().split("T")[0]
})

//设置日期变化
document
  .querySelector("#appointment-date")
  .addEventListener("change", function (event) {
    init()
  })

async function fetchPlansByDate(user_id, date) {
  const res = await fetch(
    `${host}/api/date_plan/get?user_id=${user_id}&date=${date}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )
  const data = await res.json()
  if (data.success) {
    return data.info
  } else {
    return []
  }
}

async function update_info(
  user_id,
  date,
  plan = null,
  status = null,
  remark = null
) {
  const postData = {
    user_id: user_id,
    plan: plan,
    status: status,
    remark: remark,
    date: date,
  }
  const res = await fetch(`${host}/api/date_plan/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  })
  const data = await res.json()
  if (data.success) {
    // window.location.reload()
  } else {
    alert("计划修改失败: " + data.message)
  }
}

// 增加计划
document.getElementById("updatePlanBtn").addEventListener("click", function () {
  const date = document.getElementById("appointment-date").value
  const plan = document.getElementById("plan").value
  const status = document.getElementById("complete").checked ? 1 : 0
  const remark = document.getElementById("remark").value
  console.log("plan", plan)
  console.log("status", status)
  console.log("plan", remark)

  const res = update_info(1, date, plan, status, remark)
  console.log(res)
})

document.getElementById("editPlanBtn").addEventListener("click", function () {
  document.getElementById("plan").disabled = false
  document.getElementById("complete").disabled = false
  document.getElementById("incomplete").disabled = false
  document.getElementById("updatePlanBtn").disabled = false
  document.getElementById("remark").disabled = false
})

// 清空计划
function clear_plan() {
  document.getElementById("plan").value = ""
  document.getElementById("remark").value = ""
  document.getElementById("plan").disabled = false
  document.getElementById("complete").disabled = false
  document.getElementById("incomplete").disabled = false
  document.getElementById("updatePlanBtn").disabled = false
  document.getElementById("remark").disabled = false
}

async function init() {
  clear_plan()
  const date = document.getElementById("appointment-date").value
  const info = await fetchPlansByDate(1, date)
  if (info && info.length === 0) {
    console.log("无计划")
  } else {
    console.log(info)
  }
  const plan = info[0][0]
  console.log(plan)
  if (plan) {
    document.getElementById("plan").value = plan
    document.getElementById("updatePlanBtn").disabled = true
    document.getElementById("plan").disabled = true
    document.getElementById("complete").disabled = true
    document.getElementById("incomplete").disabled = true
  }
  const status = info[0][1]
  if (status) {
    if (status === 1) {
      document.getElementById("complete").checked = true
      document.getElementById("incomplete").checked = false
    } else {
      document.getElementById("incomplete").checked = true
      document.getElementById("complete").checked = false
    }
  }
  const remark = info[0][2]
  if (remark) {
    document.getElementById("remark").value = remark
    document.getElementById("remark").disabled = true
  }
}

window.onload = init
