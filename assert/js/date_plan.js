import { host } from "./config.js"

function getDateUTC8() {
  return new Date()
    .toLocaleDateString("zh-CN", {
      timeZone: "Asia/Shanghai",
    })
    .replace(/\//g, "-")
}

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
    todayplan: plan,
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
    window.location.reload()
  } else {
    alert("计划修改失败: " + data.message)
  }
}

// 增加计划
document.getElementById("updatePlanBtn").addEventListener("click", function () {
  const date = getDateUTC8()
  const todayplan = document.getElementById("plan").value
  const status = document.getElementById("complete").checked ? 1 : 0
  const remark = document.getElementById("remark").value
  console.log(status)
  console.log(remark)
  console.log(todayplan)
  const res = update_info(1, date, todayplan, status, remark)
  console.log(res)
})

document.getElementById("editPlanBtn").addEventListener("click", function () {
  document.getElementById("plan").disabled = false
  document.getElementById("updatePlanBtn").disabled = false
})

async function init() {
  const date = getDateUTC8()
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
  }
}

window.onload = init
