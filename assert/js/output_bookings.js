import { devices_map } from "./devices.js"
import { getBookings_by_ID } from "./booking_api.js"
import { checkAuthStatus } from "./user_manager.js"

function getSelectedDateRange() {
  return {
    start: window.selectedStartDate || "",
    end: window.selectedEndDate || "",
  }
}

function clearFilters() {
  document.getElementById("userSelect").value = ""
  document.getElementById("deviceSelect").value = ""
  document.getElementById("dateRangeDisplay").value = ""
  document.getElementById("statusSelect").value = ""

  // 清空日期选择
  window.selectedStartDate = null
  window.selectedEndDate = null
  window.isSelectingEnd = false

  document.getElementById("resultsContainer").innerHTML = `
                <div class="no-results">
                    <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;">📅</div>
                    <h3>请选择筛选条件并点击查询</h3>
                    <p>支持按用户、仪器、日期、状态等条件组合查询</p>
                </div>
            `
  document.getElementById("statsCards").style.display = "none"
  document.getElementById("printButtons").style.display = "none"
}

function printResults() {
  // 添加打印日期到页面头部
  const header = document.querySelector(".header p")
  const originalText = header.textContent
  header.textContent = `打印时间：${new Date().toLocaleString("zh-CN")}`

  // 执行打印
  window.print()

  // 恢复原始文本
  setTimeout(() => {
    header.textContent = originalText
  }, 100)
}

// 日期范围选择器相关变量和函数
let currentDate = new Date()
let selectedStartDate = null
let selectedEndDate = null
let isSelectingEnd = false

// 初始化日期选择器
document.addEventListener("DOMContentLoaded", function () {
  initDatePicker()
})

function initDatePicker() {
  const dateRangeDisplay = document.getElementById("dateRangeDisplay")
  const datePickerPopup = document.getElementById("datePickerPopup")
  const prevMonth = document.getElementById("prevMonth")
  const nextMonth = document.getElementById("nextMonth")
  const clearDates = document.getElementById("clearDates")
  const confirmDates = document.getElementById("confirmDates")

  // 点击输入框显示日期选择器
  dateRangeDisplay.addEventListener("click", function () {
    datePickerPopup.classList.toggle("show")
    if (datePickerPopup.classList.contains("show")) {
      renderCalendar()
    }
  })

  // 点击外部关闭日期选择器（但不在选择过程中关闭）
  document.addEventListener("click", function (e) {
    if (
      !document.getElementById("dateRangePicker").contains(e.target) &&
      !isSelectingEnd
    ) {
      datePickerPopup.classList.remove("show")
    }
  })

  // 月份导航
  prevMonth.addEventListener("click", function () {
    currentDate.setMonth(currentDate.getMonth() - 1)
    renderCalendar()
  })

  nextMonth.addEventListener("click", function () {
    currentDate.setMonth(currentDate.getMonth() + 1)
    renderCalendar()
  })

  // 清空日期
  clearDates.addEventListener("click", function () {
    selectedStartDate = null
    selectedEndDate = null
    isSelectingEnd = false
    window.selectedStartDate = null
    window.selectedEndDate = null
    dateRangeDisplay.value = ""
    updateSelectionStatus()
    renderCalendar()
  })

  // 确认选择
  confirmDates.addEventListener("click", function () {
    if (selectedStartDate && selectedEndDate) {
      datePickerPopup.classList.remove("show")
      updateDisplayValue()
      isSelectingEnd = false
    }
  })
}

function renderCalendar() {
  const monthYear = document.getElementById("monthYear")
  const daysGrid = document.getElementById("daysGrid")

  // 更新月份年份显示
  const months = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ]
  monthYear.textContent = `${currentDate.getFullYear()}年${months[currentDate.getMonth()]}`

  // 生成日期网格
  daysGrid.innerHTML = ""

  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  )
  const lastDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  )
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate)
    cellDate.setDate(startDate.getDate() + i)

    const dayCell = document.createElement("div")
    dayCell.className = "day-cell"
    dayCell.textContent = cellDate.getDate()

    // 添加样式类
    if (cellDate.getMonth() !== currentDate.getMonth()) {
      dayCell.classList.add("other-month")
    }

    if (cellDate.getTime() === today.getTime()) {
      dayCell.classList.add("today")
    }

    const cellDateStr = formatDate(cellDate)

    // 选中状态
    if (selectedStartDate && selectedEndDate) {
      if (cellDateStr === selectedStartDate) {
        dayCell.classList.add("range-start")
      } else if (cellDateStr === selectedEndDate) {
        dayCell.classList.add("range-end")
      } else if (
        cellDateStr > selectedStartDate &&
        cellDateStr < selectedEndDate
      ) {
        dayCell.classList.add("in-range")
      }
    } else if (selectedStartDate && cellDateStr === selectedStartDate) {
      dayCell.classList.add("selected")
    }

    // 点击事件
    dayCell.addEventListener("click", function () {
      selectDate(cellDateStr)
    })

    daysGrid.appendChild(dayCell)
  }
}

function selectDate(dateStr) {
  if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
    // 选择开始日期
    selectedStartDate = dateStr
    selectedEndDate = null
    isSelectingEnd = true
    updateDisplayValue() // 实时更新显示
    updateSelectionStatus() // 更新选择状态
  } else if (isSelectingEnd) {
    // 选择结束日期
    if (dateStr >= selectedStartDate) {
      selectedEndDate = dateStr
    } else {
      // 如果选择的日期早于开始日期，则交换
      selectedEndDate = selectedStartDate
      selectedStartDate = dateStr
    }
    isSelectingEnd = false
    updateDisplayValue() // 实时更新显示
    updateSelectionStatus() // 更新选择状态

    // 选择完成后短暂延迟关闭日历
    setTimeout(() => {
      document.getElementById("datePickerPopup").classList.remove("show")
    }, 500)
  }

  // 更新全局变量
  window.selectedStartDate = selectedStartDate
  window.selectedEndDate = selectedEndDate

  renderCalendar()
}

function updateSelectionStatus() {
  const statusElement = document.getElementById("selectionStatus")
  if (!selectedStartDate) {
    statusElement.textContent = "请选择开始日期"
    statusElement.style.color = "#667eea"
  } else if (!selectedEndDate && isSelectingEnd) {
    const startFormatted = formatDateForDisplay(new Date(selectedStartDate))
    statusElement.textContent = `开始: ${startFormatted} | 请选择结束日期`
    statusElement.style.color = "#856404"
  } else if (selectedStartDate && selectedEndDate) {
    const startFormatted = formatDateForDisplay(new Date(selectedStartDate))
    const endFormatted = formatDateForDisplay(new Date(selectedEndDate))
    statusElement.textContent = `${startFormatted} 至 ${endFormatted}`
    statusElement.style.color = "#155724"
  }
}

function formatDate(date) {
  return date.toISOString().split("T")[0]
}

function updateDisplayValue() {
  const dateRangeDisplay = document.getElementById("dateRangeDisplay")
  if (selectedStartDate && selectedEndDate) {
    const startFormatted = formatDateForDisplay(new Date(selectedStartDate))
    const endFormatted = formatDateForDisplay(new Date(selectedEndDate))
    dateRangeDisplay.value = `${startFormatted} 至 ${endFormatted}`
  } else if (selectedStartDate) {
    const startFormatted = formatDateForDisplay(new Date(selectedStartDate))
    dateRangeDisplay.value = `${startFormatted} 至 ...`
  } else {
    dateRangeDisplay.value = ""
  }
}

function formatDateForDisplay(date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
}

function add_device_filter() {
  // 遍历devices_map，添加选项
  const deviceSelect = document.querySelector("#deviceSelect")
  Object.entries(devices_map).forEach(([key, value]) => {
    const option = document.createElement("option")
    option.value = value
    option.textContent = key
    deviceSelect.appendChild(option)
  })
}

add_device_filter()

function getSelectedDevice() {
  const sel = document.getElementById("deviceSelect")
  if (!sel) return null
  console.log(
    "Selected device:",
    sel.value,
    sel.options[sel.selectedIndex].text
  )
  return {
    value: sel.value, // 你在 option.value 里放的 devices_map 映射值
    label: sel.options[sel.selectedIndex].text, // 下拉显示的中文名称（key）
  }
}

function getDateArrayInclusive(startStr, endStr) {
  if (!startStr || !endStr) return []
  // 若顺序颠倒则交换
  let s = startStr
  let e = endStr
  if (s > e) [s, e] = [e, s]

  const toDate = (str) => {
    const [y, m, d] = str.split("-").map(Number)
    return new Date(y, m - 1, d) // 本地时区，避免时区偏移
  }

  const pad = (n) => String(n).padStart(2, "0")
  const toStr = (dt) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

  const startDate = toDate(s)
  const endDate = toDate(e)
  const arr = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    arr.push(toStr(d))
  }
  return arr
}

function combineTimeSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return []
  const toMin = (t) => {
    const [H, M] = t.split(":").map(Number)
    return H * 60 + M
  }
  // 解析
  const intervals = slots
    .map((s) => {
      if (typeof s !== "string" || !s.includes("-")) return null
      const [start, end] = s.split("-").map((v) => v.trim())
      if (!start || !end) return null
      return { start, end, sMin: toMin(start), eMin: toMin(end) }
    })
    .filter(Boolean)

  // 排序
  intervals.sort((a, b) => a.sMin - b.sMin || a.eMin - b.eMin)

  // 合并
  const merged = []
  for (const it of intervals) {
    if (!merged.length) {
      merged.push({ ...it })
      continue
    }
    const last = merged[merged.length - 1]
    // 若重叠或首尾相接 (it.sMin <= last.eMin) 则合并
    if (it.sMin <= last.eMin) {
      if (it.eMin > last.eMin) ((last.eMin = it.eMin), (last.end = it.end))
    } else {
      merged.push({ ...it })
    }
  }

  // 格式化
  const pad = (n) => String(n).padStart(2, "0")
  return merged.map((m) => {
    const sh = Math.floor(m.sMin / 60)
    const sm = m.sMin % 60
    const eh = Math.floor(m.eMin / 60)
    const em = m.eMin % 60
    return `${pad(sh)}:${pad(sm)}-${pad(eh)}:${pad(em)}`
  })
}

function renderResults(deviceText, results) {
  const container = document.getElementById("resultsContainer")
  if (!container) return
  container.innerHTML = ""

  const wrapper = document.createElement("div")
  wrapper.className = "results-list"

  results.forEach((r) => {
    const dayDiv = document.createElement("div")
    dayDiv.className = "result-day"
    const header = document.createElement("div")
    header.className = "result-day-header"

    if (r.error) {
      header.innerHTML = `<strong>${r.date}</strong> - <span class="device">${deviceText}</span> <span style="color:#d9534f">加载失败</span>`
      dayDiv.appendChild(header)
    } else {
      header.innerHTML = `<strong>${r.date}</strong> - <span class="device">${deviceText}</span>`
      dayDiv.appendChild(header)

      const rawTimes =
        r.data && r.data.success && Array.isArray(r.data.times)
          ? r.data.times
          : []
      // 合并处理
      const mergedTimes = combineTimeSlots(rawTimes)

      const ul = document.createElement("ul")
      ul.className = "time-slots"

      if (mergedTimes.length === 0) {
        const li = document.createElement("li")
        li.className = "empty"
        li.textContent = "无预约时间段"
        ul.appendChild(li)
      } else {
        mergedTimes.forEach((t) => {
          const li = document.createElement("li")
          li.textContent = t
          ul.appendChild(li)
        })
      }

      dayDiv.appendChild(ul)
    }

    wrapper.appendChild(dayDiv)
  })

  container.appendChild(wrapper)
}

async function searchReservations() {
  const selectdevice = getSelectedDevice()
  const { start, end } = getSelectedDateRange()
  console.log("Searching reservations from", start, "to", end)
  if (!start || !end) {
    alert("请先选择完整的开始与结束日期")
    return
  }
  const user_info = await checkAuthStatus()
  console.log("User info:", user_info)
  const ID = user_info.user.ID
  console.log(ID)
  const dates = getDateArrayInclusive(start, end)
  // for (const d of dates) {
  //   try {
  //     const res = await getBookings_by_ID(selectdevice.value, d)
  //     // TODO: 在这里处理 res（例如累加、渲染 DOM 等）
  //     console.log("单日结果", d, res)
  //   } catch (err) {
  //     console.error("获取失败", d, err)
  //   }
  // }
  const results = await Promise.all(
    dates.map((d) =>
      getBookings_by_ID(selectdevice.value, d)
        .then((data) => ({ date: d, data }))
        .catch((error) => ({ date: d, error }))
    )
  )
  results.forEach((r) => {
    if (r.error) {
      console.error("失败", r.date, r.error)
    } else {
      console.log("成功", r.date, r.data)
      // TODO: 处理 r.data
    }
  })
  const deviceText = selectdevice.label || selectdevice.value
  renderResults(deviceText, results)
}
document
  .querySelector(".btn-primary")
  .addEventListener("click", searchReservations)
