import { host } from "./config.js"

async function addPlan(user_id, todayplan) {
  const postData = {
    user_id: user_id,
    todayplan: todayplan,
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
  const todayplan = document.getElementById("todayplan").value
  console.log(todayplan)
  const res = addPlan(1, todayplan)
  console.log(res)
})
