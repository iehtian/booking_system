import { host } from "./config.js"

async function getBookings(date) {
  try {
    const response = await fetch(`${host}/api/bookings?date=${date}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    if (!data.bookings) {
      return
    }
    Object.entries(data.bookings).forEach(([key, value]) => {
      const name = value.name || "未知用户" // 如果没有name字段，使用默认值
      const color = value.color || "#ffffff" // 如果没有color字段，使用默认值
      const checkbox = document.getElementById(`time-slot-${date}-${key}`)
      if (checkbox) {
        if (checkbox.parentElement) {
          checkbox.disabled = true
          checkbox.parentElement.style.backgroundColor = color // 设置背景色
        }
        const slotLabel = checkbox.nextElementSibling
        if (slotLabel) {
          // slotLabel中使用span来显示已预约信息
          const span = document.createElement("span")
          span.textContent = `已预约: ${name}`
          slotLabel.appendChild(span)
        }
      }
    })
  } catch (error) {
    console.error("获取已预约时间段时出错:", error)
  }
}

async function submitBookings(realName, color, submitData) {
  const selectedDate = submitData.date
  const slots = submitData.slots
  if (!selectedDate || slots.length === 0) {
    alert("请先选择日期和时间段")
    return
  }

  try {
    // 一次性发送所有时间段
    const appointmentData = {
      system: "a_device",
      date: selectedDate,
      slots: slots, // 发送所有选中的时间段
      name: realName,
      color: color, // 发送用户颜色
    }

    console.log("发送的数据:", appointmentData)

    const response = await fetch(`${host}/api/info_save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointmentData),
    })

    const result = await response.json()

    if (response.ok) {
      console.log("预约已成功提交:", result)
      location.reload()
    } else {
      // 处理错误情况
      alert("提交预约失败，请重试")
      console.error("提交失败:", result)
      location.reload()
    }
  } catch (error) {
    console.error("提交预约时出错:", error)
  }
}

async function cancelBooking(date, slots) {
  try {
    const cancelDate = {
      date: date,
      slots: slots,
    }
    console.log("取消预约的数据:", cancelDate)
    const response = await fetch(`${host}/api/cancel_booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cancelDate),
    })
    const result = await response.json()
    if (response.ok) {
      console.log("预约已成功取消:", result)
      location.reload()
    } else {
      // 处理错误情况
      alert("取消预约失败，请重试")
      console.error("取消失败:", result)
      location.reload()
    }
  } catch (error) {
    console.error("取消预约时出错:", error)
  }
}

async function getBookings_by_ID(date) {
  try {
    const token = localStorage.getItem("access_token")
    const res = await fetch(`${host}/api/bookings_user?date=${date}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json()
    console.log("预约信息", data) // 例如 []
    return { success: true, times: data }
  } catch (error) {
    console.error("获取预约信息时出错:", error)
    return { success: false, message: "获取预约信息失败" }
  }
}
export { getBookings, submitBookings, cancelBooking, getBookings_by_ID }
