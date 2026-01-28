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
let weekData = {}
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
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function fmt(date) {
  console.log("格式化日期:", date)
  return date.toISOString().split("T")[0]
}

function display(date) {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return `${date.getMonth() + 1}/${date.getDate()} ${days[date.getDay()]}`
}

function init(selectedDate) {
  getWeek(selectedDate).forEach((date) => {
    const key = fmt(date)
    if (!weekData[key]) {
      weekData[key] = slots.map((s) => ({
        ...s,
        available: true,
        date: key,
      }))
    }
  })
  console.log("初始化 weekData:", weekData)

  // 初始化当前日期的数据
  const todayKey = fmt(new Date())
  if (!weekData[todayKey]) {
    weekData[todayKey] = slots.map((s) => ({
      ...s,
      available: true,
      date: todayKey,
    }))
  }
}

function renderWeek(selectedDate) {
  const container = document.getElementById("weeklyView")
  const week = getWeek(selectedDate)

  container.innerHTML = ""

  const fragment = document.createDocumentFragment()
  const grid = document.createElement("div")
  grid.className = "weekly-grid"

  const timeHeader = document.createElement("div")
  timeHeader.className = "has-text-centered mb-2 pb-2 week-header"
  timeHeader.style.borderBottom = "2px solid #dbdbdb"
  const timeStrong = document.createElement("strong")
  timeStrong.className = "has-text-info"
  timeStrong.textContent = "时间"
  timeHeader.appendChild(timeStrong)
  grid.appendChild(timeHeader)

  console.log("渲染 week:", week)
  week.forEach((date) => {
    const key = fmt(date)
    console.log("渲染日期:selectedDate", selectedDate)
    const isSelectedDay = key === fmt(selectedDate)
    const header = document.createElement("div")
    header.className = "has-text-centered mb-2 pb-2 week-header"
    header.style.borderBottom = `2px solid ${isSelectedDay ? "#3273dc" : "#dbdbdb"}`

    const strong = document.createElement("strong")
    if (isSelectedDay) strong.className = "has-text-info"
    strong.textContent = display(date)

    header.appendChild(strong)
    grid.appendChild(header)
  })

  const earlyBtn = document.createElement("div")
  earlyBtn.className = "grid-embedded-btn"
  earlyBtn.id = "toggleEarlyBtn"
  earlyBtn.textContent = "展开深夜 (00:00-08:00) ↓"
  earlyBtn.addEventListener("click", () => toggleEarly(earlyBtn))
  grid.appendChild(earlyBtn)

  // 左侧时间列，与日期列对齐
  const timeColumn = document.createElement("div")
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

  week.forEach((date, idx) => {
    const key = fmt(date)
    const dayColumn = document.createElement("div")
    dayColumn.dataset.idx = idx
    const daySlots = weekData[key]

    daySlots.forEach((slot, idx) => {
      let hideCls = ""
      if (slot.id <= 16) hideCls = "hidden-slot-logic-early Early"
      if (slot.id >= 45) hideCls = "hidden-slot-logic-late Late"

      const isSelected =
        selected && selected.date === key && selected.id === slot.id
      let cls = !slot.available
        ? "booked"
        : isSelected
          ? "selected"
          : "available"

      if (!slot.available) {
        const prevBooked = idx > 0 && !daySlots[idx - 1].available
        const nextBooked =
          idx < daySlots.length - 1 && !daySlots[idx + 1].available
        if (!prevBooked && !nextBooked) cls += " single"
        else if (!prevBooked) cls += " first"
        else if (!nextBooked) cls += " last"
      }

      const label = document.createElement("label")
      label.className = ["slot-item", cls, hideCls].filter(Boolean).join(" ")

      const input = document.createElement("input")
      input.type = "checkbox"
      input.name = "timeslot"
      input.value = `${key}-${slot.id}`
      input.disabled = !slot.available

      const span = document.createElement("span")
      span.className = "slot-time"
      span.textContent = slot.time
      label.dataset.idx = idx
      label.dataset.time = slot.time

      label.appendChild(input)
      label.appendChild(span)
      dayColumn.appendChild(label)
    })

    grid.appendChild(dayColumn)
  })

  const lateBtn = document.createElement("div")
  lateBtn.className = "grid-embedded-btn"
  lateBtn.id = "toggleLateBtn"
  lateBtn.textContent = "展开晚间 (22:00-24:00) ↓"
  lateBtn.addEventListener("click", () => toggleLate(lateBtn))
  grid.appendChild(lateBtn)

  fragment.appendChild(grid)
  container.appendChild(fragment)
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

  if (!weekData[key]) {
    weekData[key] = slots.map((s) => ({
      ...s,
      available: true,
      date: key,
    }))
  }

  const daySlots = weekData[key]

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

    const isSelected =
      selected && selected.date === key && selected.id === slot.id
    const cls = !slot.available
      ? "booked"
      : isSelected
        ? "selected"
        : "available"

    const item = document.createElement("div")
    item.className = ["mobile-slot-item", cls].join(" ")
    item.textContent = slot.time

    if (slot.available && !booking) {
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
  const slot = weekData[date].find((s) => s.id === id)
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
  const slot = weekData[date].find((s) => s.id === id)
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
  if (!selected) return alert("请选择时间段")

  const slot = weekData[selected.date].find((s) => s.id === selected.id)
  slot.available = false
  booking = { ...selected }
  selected = null

  document.getElementById("selectionInfo").style.display = "none"
  document.getElementById("confirmBtn").style.display = "none"

  const mobileInfo = document.getElementById("mobileSelectionInfo")
  if (mobileInfo) mobileInfo.style.display = "none"

  document.getElementById("bookingInfo").style.display = "block"
  setBookingDetails(document.getElementById("bookingDetails"), booking)

  renderWeek()
  renderMobileSlots()
}

// Allow inline mobile confirmation button to call confirm()
window.confirm = confirm

function cancel() {
  if (booking) {
    const slot = weekData[booking.date].find((s) => s.id === booking.id)
    slot.available = true
    booking = null
    document.getElementById("bookingInfo").style.display = "none"
    renderWeek()
    renderMobileSlots()
  }
}

// 桌面端日期切换
function changeDay(delta) {
  selectedDate.setDate(selectedDate.getDate() + delta)
  fp.setDate(selectedDate, false)
  renderWeek(selectedDate)
}

const fp = flatpickr("#dateInput", {
  locale: "zh",
  dateFormat: "Y-m-d",
  defaultDate: selectedDate,
  onChange: (d) => {
    selectedDate = d[0]
    renderWeek(selectedDate)
  },
})

init(new Date())
renderWeek(selectedDate)
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
