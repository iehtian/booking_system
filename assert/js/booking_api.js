import { host } from "./config.js"

function mergeBookings(bookings) {
  // 先对时间段排序（按开始时间）
  const sorted = Object.entries(bookings).sort(([a], [b]) => {
    const [aStart] = a.split("-")
    const [bStart] = b.split("-")
    return aStart.localeCompare(bStart)
  })

  const groups = []
  let currentGroup = []
  let lastEnd = null
  let lastName = null

  sorted.forEach(([timeRange, value]) => {
    const [start, end] = timeRange.split("-")
    const { name, color } = value

    if (lastEnd === start && lastName === name) {
      // 连续且同名 → 合并到当前 group
      currentGroup.push({ timeRange, name, color })
    } else {
      // 不连续 或 name 不同 → 开新组
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
      }
      currentGroup = [{ timeRange, name, color }]
    }
    lastEnd = end
    lastName = name
  })

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

function getGroupTimeRanges(mergedBookings) {
  return mergedBookings.map((group) => {
    const first = group[0].timeRange.split("-")[0] // 组第一个的开始时间
    const last = group[group.length - 1].timeRange.split("-")[1] // 组最后一个的结束时间
    return `${first}-${last}`
  })
}

function desktop_booking_display(bookings, date) {
  const mergedBookings = mergeBookings(bookings)
  const groupRanges = getGroupTimeRanges(mergedBookings)
  console.log("Merged Bookings:", mergedBookings)
  // 遍历mergedBookings，显示合并后的预约信息
  mergedBookings.forEach((group, i) => {
    const name = group[0].name || "未知用户" // 使用组内第一个元素的name
    const color = group[0].color || "#ffffff" // 使用组内第一个元素的color
    console.log(`Group ${i}: Name=${name}, Color=${color}`)
    const totalRange = groupRanges[i]
    group.forEach((item, j) => {
      const checkbox = document.getElementById(
        `time-slot-${date}-${item.timeRange}`
      )
      if (checkbox && checkbox.parentElement) {
        checkbox.disabled = true
        // 将 hex 颜色转换为 rgba 并设置 60% 透明度
        let bgColor = color
        checkbox.parentElement.style.backgroundColor = bgColor // 设置背景色
      }
      if (j === 0) {
        const slotLabel = checkbox ? checkbox.nextElementSibling : null
        if (slotLabel) {
          // slotLabel中使用span来显示已预约信息
          const span = document.createElement("span")
          span.style.whiteSpace = "pre"
          span.classList.add("weekly-text") // 添加类名以应用样式
          span.textContent = `${name}  (${totalRange})`
          slotLabel.appendChild(span)
        }
      }
    })
  })
}

function mobile_booking_display(bookings, date) {
  Object.entries(bookings).forEach(([key, value]) => {
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
        span.textContent = `${name}`
        slotLabel.appendChild(span)
      }
    }
  })
}

async function getBookings(instrument, date) {
  try {
    const response = await fetch(
      `${host}/api/bookings?instrument=${instrument}&date=${date}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    const data = await response.json()
    if (!data.bookings) {
      return
    }
    const width =
      document.documentElement.clientWidth || document.body.clientWidth
    const isMobile = width < 768 // 判断是否为移动端
    if (isMobile) {
      mobile_booking_display(data.bookings, date)
    } else {
      desktop_booking_display(data.bookings, date)
    }
  } catch (error) {
    console.error("获取已预约时间段时出错:", error)
  }
}

async function submitBookings(instrument, realName, color, submitData) {
  const selectedDate = submitData.date
  const slots = submitData.slots
  if (!selectedDate || slots.length === 0) {
    alert("请先选择日期和时间段")
    return
  }

  try {
    // 一次性发送所有时间段
    const appointmentData = {
      instrument: instrument,
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
      return true
    } else {
      // 处理错误情况
      alert("提交预约失败，请重试")
      console.error("提交失败:", result)
      return false
    }
  } catch (error) {
    console.error("提交预约时出错:", error)
  }
}

async function cancelBooking(instrument, date, slots) {
  try {
    const cancelData = {
      instrument: instrument,
      date: date,
      slots: slots,
    }
    console.log("取消预约的数据:", cancelData)
    const response = await fetch(`${host}/api/cancel_booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cancelData),
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

async function getBookings_by_ID(instrument, date) {
  try {
    const token = localStorage.getItem("access_token")
    if (!token) {
      console.warn("未登录，跳过获取用户预约信息")
      return { success: false, message: "未登录" }
    }
    const res = await fetch(
      `${host}/api/bookings_user?instrument=${instrument}&date=${date}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    if (!res.ok) {
      // 返回更清晰的错误信息，便于定位 401/422 等
      const text = await res.text().catch(() => "")
      console.error(
        `获取预约信息请求失败: ${res.status} ${res.statusText} - ${text}`
      )
      return {
        success: false,
        message: `请求失败: ${res.status}`,
        detail: text,
      }
    }
    const data = await res.json()
    return { success: true, times: data }
  } catch (error) {
    console.error("获取预约信息时出错:", error)
    return { success: false, message: "获取预约信息失败" }
  }
}
export { getBookings, submitBookings, cancelBooking, getBookings_by_ID }
