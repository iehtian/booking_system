let selectedDate = new Date()
let mobileSelectedDate = new Date()

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
  id: index + 1,
  time: time,
}))
console.log(slots)

let mobileIsEarlyHidden = true
let mobileIsLateHidden = true
let weekData = slots

let booking = null
let selected = null

function setSelectedText(target, date, time) {
  target.textContent = ""
  const strong = document.createElement("strong")
  strong.textContent = "已选择:"
  target.appendChild(strong)
  target.appendChild(document.createTextNode(`${date} ${time}`))
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
  getWeek(selectedDate).forEach((date) => {
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
    if (id <= 16) hideCls = "hidden-slot-logic-early Early"
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
  getWeek(selectedDate).forEach((date, idx) => {
    const key = fmt(date)
    const dayColumn = document.createElement("div")
    dayColumn.className = "day-column"
    dayColumn.dataset.idx = idx
    dayColumn.dataset.date = key
    const daySlots = weekData
    daySlots.forEach((slot, idx2) => {
      let hideCls = ""
      if (slot.id <= 16) hideCls = "hidden-slot-logic-early Early"
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
      label.dataset.time = slot.time
      label.dataset.slotid = slot.id
      label.dataset.date = key
      // input
      const input = document.createElement("input")
      input.type = "checkbox"
      input.name = "timeslot"
      input.value = `${key}-${slot.id}`
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

// 只更新一周的属性和文字，不重建结构
function weekChangeDay(selectedDate) {
  const week = getWeek(selectedDate)
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
    if (mobileIsEarlyHidden && slot.id <= 16) return
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

function select(date, id) {
  if (booking) return
  const slot = weekData.find((s) => s.id === id)
  selected = { date, id, time: slot.time }
  document.getElementById("selectionInfo").style.display = "block"
  document.getElementById("confirmBtn").style.display = "inline-flex"
  setSelectedText(document.getElementById("selectedInfo"), date, slot.time)
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

function confirm() {
  //   if (!selected) return alert("请选择时间段")
  //   setSlotAvailable(selected.date, selected.id, false)
  //   booking = { ...selected }
  //   selected = null
  //   document.getElementById("selectionInfo").style.display = "none"
  //   document.getElementById("confirmBtn").style.display = "none"
  //   const mobileInfo = document.getElementById("mobileSelectionInfo")
  //   if (mobileInfo) mobileInfo.style.display = "none"
  //   document.getElementById("bookingInfo").style.display = "block"
  //   setBookingDetails(document.getElementById("bookingDetails"), booking)
  //   weekChangeDay(selectedDate)
  //   renderMobileSlots()
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
