let selectedDate = new Date()
let mobileSelectedDate = new Date()
import axios from "axios"
import { host } from "./config.js"

function generateTimeIntervalsSimple() {
  const intervals = []

  for (let i = 0; i <= 48; i++) {
    const totalMinutes = i * 30
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    const timeStr = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`
    intervals.push(timeStr)
  }

  const timeSlots = []
  for (let i = 0; i < intervals.length - 1; i++) {
    timeSlots.push(intervals[i] + "-" + intervals[i + 1])
  }
  return timeSlots
}

let slots = generateTimeIntervalsSimple().map((time, index) => ({
  id: index,
  time: time,
}))
console.log(slots)

let mobileIsEarlyHidden = true
let mobileIsLateHidden = true
let weekData = slots
let selectedWeek = null
let selectedRes = []

let booking = null
let selected = null

const processSchedule = (list) => {
  // 1. 基础排序：先排日期，再排时间
  const sorted = list.sort((a, b) => {
    // 1. 第一优先级：日期
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date)
    }

    // 2. 第二优先级：时间 (取时间段的开始部分)
    const timeA = a.time.split("-")[0]
    const timeB = b.time.split("-")[0]
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB)
    }

    // 3. 第三优先级：ID (当日期和时间都一样时)
    return a.id - b.id
  })

  const result = []

  for (const item of sorted) {
    const last = result[result.length - 1]
    const [startTime, endTime] = item.time.split("-")

    // 2. 合并逻辑：日期相同 且 上一个结束时间 等于 当前开始时间
    if (
      last &&
      last.date === item.date &&
      last.time.split("-")[1] === startTime
    ) {
      const lastStart = last.time.split("-")[0]
      last.time = `${lastStart}-${endTime}`
      last.ids = [...(last.ids || [last.id]), item.id]
    } else {
      result.push({ ...item, ids: [item.id] })
    }
  }

  return result
}

function setSelectedText(target, selectedRes) {
  const processedRes = processSchedule(selectedRes)
  target.textContent = ""
  const strong = document.createElement("strong")
  strong.textContent = "已选择:"
  target.appendChild(strong)
  for (let i = 0; i < processedRes.length; i++) {
    if (i > 0) target.appendChild(document.createTextNode("; "))
    const span = document.createElement("span")
    span.textContent = `${processedRes[i].date} ${processedRes[i].time}`
    target.appendChild(span)
  }
}

function setBookingDetails(target, bookingInfo) {
  target.textContent = ""
  const dateStrong = document.createElement("strong")
  dateStrong.textContent = "日期:"
  target.appendChild(dateStrong)
  target.appendChild(document.createTextNode(bookingInfo.date))

  target.appendChild(document.createElement("br"))

  const timeStrong = document.createElement("strong")
  timeStrong.textContent = "时间:"
  target.appendChild(timeStrong)
  target.appendChild(document.createTextNode(bookingInfo.time))
}

function getWeek(selectedDate) {
  const day = selectedDate.getDay()
  const monday = new Date(selectedDate)
  monday.setDate(selectedDate.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function fmt(date) {
  return date.toISOString().split("T")[0]
}

function display(date) {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return `${date.getMonth() + 1}/${date.getDate()} ${days[date.getDay()]}`
}

// 初始化页面
function init(selectedDate) {
  // 生成主结构
  console.log("weekData:", weekData)
  selectedWeek = getWeek(selectedDate)
  console.log("selectedWeek:", selectedWeek)
  const container = document.getElementById("weeklyView")
  container.innerHTML = ""
  const fragment = document.createDocumentFragment()
  const grid = document.createElement("div")
  grid.className = "weekly-grid"

  // 时间头部
  const timeHeader = document.createElement("div")
  timeHeader.className = "has-text-centered mb-2 pb-2 week-header"
  timeHeader.style.borderBottom = "2px solid #dbdbdb"
  const timeStrong = document.createElement("strong")
  timeStrong.className = "has-text-info"
  timeStrong.textContent = "时间"
  timeHeader.appendChild(timeStrong)
  grid.appendChild(timeHeader)

  // 日期头部
  selectedWeek.forEach((date) => {
    const key = fmt(date)
    const header = document.createElement("div")
    header.className = "has-text-centered mb-2 pb-2 week-header"
    header.style.borderBottom = `2px solid #dbdbdb`
    header.dataset.date = key
    const strong = document.createElement("strong")
    strong.textContent = display(date)
    header.appendChild(strong)
    grid.appendChild(header)
  })

  // 深夜展开按钮
  const earlyBtn = document.createElement("div")
  earlyBtn.className = "grid-embedded-btn"
  earlyBtn.id = "toggleEarlyBtn"
  earlyBtn.textContent = "展开深夜 (00:00-08:00) ↓"
  earlyBtn.addEventListener("click", () => toggleEarly(earlyBtn))
  grid.appendChild(earlyBtn)

  // 时间列
  const timeColumn = document.createElement("div")
  timeColumn.className = "time-column"
  slots.forEach(({ id, time }) => {
    let hideCls = ""
    if (id <= 15) hideCls = "hidden-slot-logic-early Early"
    if (id >= 45) hideCls = "hidden-slot-logic-late Late"
    const label = document.createElement("label")
    label.className = ["slot-item", hideCls].filter(Boolean).join(" ")
    const span = document.createElement("span")
    span.className = "slot-time"
    span.textContent = time
    label.appendChild(span)
    timeColumn.appendChild(label)
  })
  grid.appendChild(timeColumn)

  // 日期列（每列一个div，内部slot-item）
  selectedWeek.forEach((date, idx) => {
    const key = fmt(date)
    const dayColumn = document.createElement("div")
    dayColumn.className = "day-column"
    dayColumn.dataset.idx = idx
    dayColumn.dataset.date = key
    const daySlots = weekData

    daySlots.forEach((slot, idx2) => {
      let hideCls = ""
      if (slot.id <= 15) hideCls = "hidden-slot-logic-early Early"
      if (slot.id >= 45) hideCls = "hidden-slot-logic-late Late"
      const available = true
      const label = document.createElement("label")
      label.className = [
        "slot-item",
        available ? "available" : "booked",
        hideCls,
      ]
        .filter(Boolean)
        .join(" ")
      label.dataset.idx = idx2
      label.dataset.date = key
      // input
      const input = document.createElement("input")
      input.type = "checkbox"
      input.name = "timeslot"
      input.value = `${key}-${slot.id}`
      input.dataset.slotid = slot.id
      input.disabled = !available
      label.appendChild(input)
      // span
      const span = document.createElement("span")
      span.className = "slot-time"
      span.textContent = slot.time
      label.appendChild(span)
      dayColumn.appendChild(label)
    })
    grid.appendChild(dayColumn)
  })

  // 晚间展开按钮
  const lateBtn = document.createElement("div")
  lateBtn.className = "grid-embedded-btn"
  lateBtn.id = "toggleLateBtn"
  lateBtn.textContent = "展开晚间 (22:00-24:00) ↓"
  lateBtn.addEventListener("click", () => toggleLate(lateBtn))
  grid.appendChild(lateBtn)

  fragment.appendChild(grid)
  container.appendChild(fragment)
}

function addslotselectorHandlers() {
  const checkboxes = document.querySelectorAll(
    "#weeklyView .day-column input[type=checkbox]"
  )
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const parent = checkbox.parentElement
      const date = parent.dataset.date
      select(date, e)
    })
  })
}

// 只更新一周的属性和文字，不重建结构
function weekChangeDay(selectedDate) {
  const week = selectedWeek
  // 更新日期头部
  const headers = document.querySelectorAll("#weeklyView .week-header")
  headers.forEach((header, idx) => {
    if (idx === 0) return // 跳过时间头部
    const date = week[idx - 1]
    const key = fmt(date)
    header.dataset.date = key
    header.querySelector("strong").textContent = display(date)
    header.style.borderBottom = `2px solid ${key === fmt(selectedDate) ? "#3273dc" : "#dbdbdb"}`
    if (key === fmt(selectedDate)) {
      header.querySelector("strong").className = "has-text-info"
    } else {
      header.querySelector("strong").className = ""
    }
  })
  // 更新每一列的slot
  const columns = document.querySelectorAll("#weeklyView .day-column")
  columns.forEach((col, idx) => {
    const date = week[idx]
    const key = fmt(date)
    col.dataset.date = key
    const daySlots = weekData
    const labels = col.querySelectorAll("label.slot-item")
    labels.forEach((label, i) => {
      const slot = daySlots[i]
      const available = true
      label.dataset.time = slot.time
      label.dataset.slotid = slot.id
      label.dataset.date = key
      // 更新可用状态
      label.classList.remove("booked", "selected", "available")
      if (!available) label.classList.add("booked")
      else label.classList.add("available")
      // 选中状态
      if (selected && selected.date === key && selected.id === slot.id) {
        label.classList.add("selected")
      }
      // input
      const input = label.querySelector("input[type=checkbox]")
      if (input) input.disabled = !available
      // span
      const span = label.querySelector("span.slot-time")
      if (span) span.textContent = slot.time
    })
  })
}

const toggleEarly = function (btn) {
  const earlys = document.querySelectorAll(".Early")

  earlys.forEach((el) => {
    el.classList.toggle("hidden-slot-logic-early")
  })

  if (btn) {
    const firstEarly = earlys[0]
    const isHidden = firstEarly
      ? firstEarly.classList.contains("hidden-slot-logic-early")
      : false
    btn.textContent = isHidden ? "展开深夜 (00:00-08:00) ↓" : "收起深夜 ↑"
  }
}

const toggleLate = function (btn) {
  const lates = document.querySelectorAll(".Late")

  lates.forEach((el) => {
    el.classList.toggle("hidden-slot-logic-late")
  })
  if (btn) {
    const firstLate = lates[0]
    const isHidden = firstLate
      ? firstLate.classList.contains("hidden-slot-logic-late")
      : false
    btn.textContent = isHidden ? "展开晚间 (22:00-24:00) ↓" : "收起晚间 ↑"
  }
}

function renderMobileSlots() {
  const container = document.getElementById("mobileSlots")
  const key = fmt(mobileSelectedDate)
  const daySlots = weekData

  container.innerHTML = ""
  const fragment = document.createDocumentFragment()

  const earlyBtn = document.createElement("div")
  earlyBtn.className = "mobile-toggle-btn"
  earlyBtn.textContent = mobileIsEarlyHidden
    ? "展开深夜 (00:00-08:00) ↓"
    : "收起深夜 ↑"
  earlyBtn.addEventListener("click", toggleMobileEarly)
  fragment.appendChild(earlyBtn)

  const grid = document.createElement("div")
  grid.className = "mobile-slots-grid"

  daySlots.forEach((slot) => {
    if (mobileIsEarlyHidden && slot.id <= 15) return
    if (mobileIsLateHidden && slot.id >= 45) return
    const available = true

    const isSelected =
      selected && selected.date === key && selected.id === slot.id
    const cls = !available ? "booked" : isSelected ? "selected" : "available"

    const item = document.createElement("div")
    item.className = ["mobile-slot-item", cls].join(" ")
    item.textContent = slot.time

    if (available && !booking) {
      item.addEventListener("click", () => mobileSelect(key, slot.id))
    }

    grid.appendChild(item)
  })

  fragment.appendChild(grid)

  const lateBtn = document.createElement("div")
  lateBtn.className = "mobile-toggle-btn"
  lateBtn.textContent = mobileIsLateHidden
    ? "展开晚间 (22:00-24:00) ↓"
    : "收起晚间 ↑"
  lateBtn.addEventListener("click", toggleMobileLate)
  fragment.appendChild(lateBtn)

  container.appendChild(fragment)
}

window.toggleMobileEarly = function () {
  mobileIsEarlyHidden = !mobileIsEarlyHidden
  renderMobileSlots()
}

window.toggleMobileLate = function () {
  mobileIsLateHidden = !mobileIsLateHidden
  renderMobileSlots()
}

function select(date, event) {
  let id = parseInt(event.target.dataset.slotid, 10)
  if (event.target.checked) {
    const slot = weekData.find((s) => id === s.id)
    console.log("slot:", slot)
    selected = { date, id, time: slot.time }
    selectedRes.push(selected)
  } else {
    selectedRes = selectedRes.filter((s) => !(s.date === date && s.id === id))
  }
  document.getElementById("selectionInfo").style.display = "block"
  document.getElementById("confirmBtn").style.display = "inline-flex"
  setSelectedText(document.getElementById("selectedInfo"), selectedRes)
  // renderWeek()
}

// Expose to inline handlers in module scope
window.select = select

window.mobileSelect = function (date, id) {
  if (booking) return
  const slot = weekData.find((s) => s.id === id)
  selected = { date, id, time: slot.time }

  // 显示确认按钮
  if (!document.getElementById("mobileConfirmBtn")) {
    const notification = document.createElement("div")
    notification.className = "notification is-light mt-4"
    notification.id = "mobileSelectionInfo"

    const info = document.createElement("p")
    info.id = "mobileSelectedInfo"
    setSelectedText(info, date, slot.time)

    const button = document.createElement("button")
    button.className = "button is-success is-fullwidth mt-3"
    button.id = "mobileConfirmBtn"
    button.textContent = "确认预约"
    button.addEventListener("click", confirm)

    notification.appendChild(info)
    notification.appendChild(button)

    document
      .getElementById("mobileSlots")
      .insertAdjacentElement("afterend", notification)
  } else {
    document.getElementById("mobileSelectionInfo").style.display = "block"
    setSelectedText(
      document.getElementById("mobileSelectedInfo"),
      date,
      slot.time
    )
  }

  renderMobileSlots()
}

async function submitBookings(instrument, submitData) {
  const thisDate = submitData.date
  const slots = submitData.slots

  if (!thisDate || slots.length === 0) {
    alert("请先选择日期和时间段")
    return
  }

  try {
    const token = localStorage.getItem("access_token")
    if (!token) {
      alert("未登录，无法提交预约")
      return false
    }
    const appointmentData = {
      instrument: instrument,
      date: thisDate,
      slots: slots,
    }

    console.log("发送的数据:", appointmentData)

    // 使用 axios.post，第二个参数直接传对象
    const response = await axios.post(
      `${host}/api/info_save`,
      appointmentData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    // Axios 默认认为 2xx 状态码都是 ok 的
    // 结果就在 response.data 中
    if (response.status === 200 || response.status === 201) {
      return true
    }
  } catch (error) {
    // Axios 的错误处理更丰富
    // 如果服务器返回了 4xx/5xx 错误，会进入这里
    alert("提交预约失败，请重试")

    if (error.response) {
      // 请求已发出，服务器响应了状态码
      console.error(
        "提交失败 (状态码):",
        error.response.status,
        error.response.data
      )
    } else if (error.request) {
      // 请求已发出，但没收到响应（网络问题）
      console.error("网络异常，未收到响应:", error.request)
    } else {
      console.error("请求配置出错:", error.message)
    }

    return false
  }
}

function confirm() {
  if (!selectedRes || selectedRes.length === 0) {
    alert("请先选择时间段")
    return
  }

  console.log("确认预约:", selectedRes)
  // 提交预约
  const submitData = {
    date: selectedRes[0].date,
    slots: selectedRes.map((s) => s.time),
  }
  submitBookings("instrument_name", submitData).then((success) => {
    if (success) {
      alert("预约成功")
      // 重置选择
      selectedRes = []
      selected = null
      document.getElementById("selectionInfo").style.display = "none"
      document.getElementById("confirmBtn").style.display = "none"
      setSelectedText(document.getElementById("selectedInfo"), selectedRes)
      weekChangeDay(selectedDate)
      renderMobileSlots()
    }
  })
}

// Allow inline mobile confirmation button to call confirm()
window.confirm = confirm

function cancel() {
  //   if (booking) {
  //     setSlotAvailable(booking.date, booking.id, true)
  //     booking = null
  //     document.getElementById("bookingInfo").style.display = "none"
  //     weekChangeDay(selectedDate)
  //     renderMobileSlots()
  //   }
}

// 桌面端日期切换
function changeDay(delta) {
  selectedDate.setDate(selectedDate.getDate() + delta)
  fp.setDate(selectedDate, false)
  weekChangeDay(selectedDate)
}

const fp = flatpickr("#dateInput", {
  locale: "zh",
  dateFormat: "Y-m-d",
  defaultDate: selectedDate,
  onChange: (d) => {
    selectedDate = d[0]
    weekChangeDay(selectedDate)
  },
})

init(new Date())
renderMobileSlots()
addslotselectorHandlers()

document.getElementById("prevDay").addEventListener("click", () => {
  changeDay(-1)
})

document.getElementById("nextDay").addEventListener("click", () => {
  changeDay(1)
})

document.getElementById("confirmBtn").addEventListener("click", confirm)
document.getElementById("cancelBtn").addEventListener("click", cancel)

// 移动端日期切换
function changeMobileDay(delta) {
  mobileSelectedDate.setDate(mobileSelectedDate.getDate() + delta)
  document.getElementById("mobileDateInput").value = fmt(mobileSelectedDate)
  renderMobileSlots()
}

document.getElementById("mobileDateInput").value = fmt(mobileSelectedDate)
document.getElementById("mobileDateInput").addEventListener("change", (e) => {
  mobileSelectedDate = new Date(e.target.value + "T00:00:00")
  renderMobileSlots()
})

document.getElementById("mobilePrevDay").addEventListener("click", () => {
  changeMobileDay(-1)
})

document.getElementById("mobileNextDay").addEventListener("click", () => {
  changeMobileDay(1)
})

function handleSlotChange() {}
