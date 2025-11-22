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

async function addPlan(user_id, todayplan, date) {
  const postData = {
    user_id: user_id,
    todayplan: todayplan,
    date: date,
  }
  const res = await fetch(`${host}/api/date_plan/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  })
  const data = await res.json()
  if (data.success) {
    alert("计划添加成功")
  } else {
    alert("计划添加失败: " + data.message)
  }
}

// 增加计划
document.getElementById("addPlanBtn").addEventListener("click", function () {
  const date = getDateUTC8()
  const todayplan = document.getElementById("todayplan").value
  console.log(todayplan)
  const res = addPlan(1, todayplan, date)
  console.log(res)
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
    document.getElementById("todayplan").value = plan
    document.getElementById("addPlanBtn").disabled = true
    document.getElementById("todayplan").disabled = true
  }
}

window.onload = init
