const mockReservations = [
  {
    id: "R001",
    user: "张三",
    userId: "user1",
    device: "高效液相色谱仪 HPLC-001",
    deviceId: "device1",
    date: "2024-09-25",
    time: "09:00-11:00",
    status: "confirmed",
    purpose: "药物成分分析",
  },
  {
    id: "R002",
    user: "李四",
    userId: "user2",
    device: "气相色谱仪 GC-002",
    deviceId: "device2",
    date: "2024-09-25",
    time: "14:00-16:00",
    status: "pending",
    purpose: "环境污染物检测",
  },
  {
    id: "R003",
    user: "王五",
    userId: "user3",
    device: "原子吸收光谱仪 AAS-003",
    deviceId: "device3",
    date: "2024-09-26",
    time: "10:00-12:00",
    status: "confirmed",
    purpose: "金属元素含量测定",
  },
  {
    id: "R004",
    user: "张三",
    userId: "user1",
    device: "扫描电镜 SEM-004",
    deviceId: "device4",
    date: "2024-09-26",
    time: "15:00-17:00",
    status: "cancelled",
    purpose: "材料微观结构观察",
  },
  {
    id: "R005",
    user: "赵六",
    userId: "user4",
    device: "X射线衍射仪 XRD-005",
    deviceId: "device5",
    date: "2024-09-27",
    time: "09:00-11:00",
    status: "confirmed",
    purpose: "晶体结构分析",
  },
  {
    id: "R006",
    user: "孙七",
    userId: "user5",
    device: "高效液相色谱仪 HPLC-001",
    deviceId: "device1",
    date: "2024-09-27",
    time: "13:00-15:00",
    status: "pending",
    purpose: "蛋白质纯度检测",
  },
]

function searchReservations() {
  const userId = document.getElementById("userSelect").value
  const deviceId = document.getElementById("deviceSelect").value
  const dateRange = getSelectedDateRange()
  const status = document.getElementById("statusSelect").value

  // 筛选数据
  let filteredData = mockReservations.filter((reservation) => {
    let matches = true

    if (userId && reservation.userId !== userId) matches = false
    if (deviceId && reservation.deviceId !== deviceId) matches = false
    if (dateRange.start && reservation.date < dateRange.start) matches = false
    if (dateRange.end && reservation.date > dateRange.end) matches = false
    if (status && reservation.status !== status) matches = false

    return matches
  })

  displayResults(filteredData)
}

function getSelectedDateRange() {
  return {
    start: window.selectedStartDate || "",
    end: window.selectedEndDate || "",
  }
}

function displayResults(data) {
  const resultsContainer = document.getElementById("resultsContainer")
  const statsCards = document.getElementById("statsCards")
  const printButtons = document.getElementById("printButtons")

  if (data.length === 0) {
    resultsContainer.innerHTML = `
                    <div class="no-results">
                        <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;">🔍</div>
                        <h3>未找到符合条件的预约信息</h3>
                        <p>请调整筛选条件重新查询</p>
                    </div>
                `
    statsCards.style.display = "none"
    printButtons.style.display = "none"
    return
  }

  // 更新统计卡片
  const confirmedCount = data.filter((r) => r.status === "confirmed").length
  const pendingCount = data.filter((r) => r.status === "pending").length

  document.getElementById("totalCount").textContent = data.length
  document.getElementById("confirmedCount").textContent = confirmedCount
  document.getElementById("pendingCount").textContent = pendingCount

  statsCards.style.display = "grid"
  printButtons.style.display = "flex"

  // 生成表格
  const tableHTML = `
                <div class="results-table">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>预约编号</th>
                                <th>用户</th>
                                <th>仪器</th>
                                <th>日期</th>
                                <th>时间</th>
                                <th>状态</th>
                                <th>用途</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data
                              .map(
                                (reservation) => `
                                <tr>
                                    <td>${reservation.id}</td>
                                    <td>${reservation.user}</td>
                                    <td>${reservation.device}</td>
                                    <td>${reservation.date}</td>
                                    <td>${reservation.time}</td>
                                    <td>
                                        <span class="status-badge status-${reservation.status}">
                                            ${getStatusText(reservation.status)}
                                        </span>
                                    </td>
                                    <td>${reservation.purpose}</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            `

  resultsContainer.innerHTML = tableHTML
}

function getStatusText(status) {
  const statusMap = {
    confirmed: "已确认",
    pending: "待确认",
    cancelled: "已取消",
  }
  return statusMap[status] || status
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
