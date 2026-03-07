let selectedDate = new Date()
let mobileSelectedDate = new Date()
let instrument_id = "c_instrument" // 示例仪器 ID
import { getBookings, submitBookings, cancelBookings } from "./booking_api.js"
import {
  mergeBookings,
  generateTimeIntervalsSimple,
  processSchedule,
  fmt,
} from "./utils/slots.js"

let slots = generateTimeIntervalsSimple().map((time, index) => ({
  id: index,
  time: time,
}))
console.log(slots)

function getSlotHideClass(slotId) {
  if (slotId <= 15) return "hidden-slot-logic-early Early"
  if (slotId >= 45) return "hidden-slot-logic-late Late"
  return ""
}

function buildWeeklySkeletonDOM() {
  const timeColumn = document.getElementById("timeColumn")
  if (timeColumn && timeColumn.children.length === 0) {
    const timeFragment = document.createDocumentFragment()
    slots.forEach(({ id, time }) => {
      const label = document.createElement("label")
      label.className = ["slot-item", getSlotHideClass(id)]
        .filter(Boolean)
        .join(" ")
      const span = document.createElement("span")
      span.className = "slot-time"
      span.textContent = time
      label.appendChild(span)
      timeFragment.appendChild(label)
    })
    timeColumn.appendChild(timeFragment)
  }

  const dayColumns = document.querySelectorAll("#weeklyView .day-column")
  dayColumns.forEach((dayColumn) => {
    if (dayColumn.children.length > 0) return

    const dayFragment = document.createDocumentFragment()
    slots.forEach((slot, idx2) => {
      const label = document.createElement("label")
      label.className = ["slot-item", "available", getSlotHideClass(slot.id)]
        .filter(Boolean)
        .join(" ")
      label.dataset.idx = idx2

      const input = document.createElement("input")
      input.type = "checkbox"
      input.name = "timeslot"
      input.dataset.slotid = slot.id
      input.disabled = false
      label.appendChild(input)

      const span = document.createElement("span")
      span.className = "slot-time"
      label.appendChild(span)
      dayFragment.appendChild(label)
    })
    dayColumn.appendChild(dayFragment)
  })
}

function createState(initialState) {
  let state = { ...initialState }
  const listeners = new Set()
  const notify = () => listeners.forEach((listener) => listener(state))

  return {
    get() {
      return state
    },
    set(patch) {
      state = { ...state, ...patch }
      notify()
    },
    update(updater) {
      state = updater(state)
      notify()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const State = createState({
  user_name: null,
  weekData: slots,
  selectedRes: [],
  selectedWeek: null,
  bookinged_slots: [],
})

let booking = null
let selected = null

function setSelectedText(target, selectedRes) {
  const processedRes = processSchedule(selectedRes)
  target.textContent = ""
  const strong = document.createElement("strong")
  strong.textContent = "已选择:"
  target.appendChild(strong)
  if (processedRes.length === 0) return

  const formatDateWithoutYear = (dateStr) => {
    const parts = dateStr.split("-")
    if (parts.length !== 3) return dateStr
    return `${parts[1]}-${parts[2]}`
  }

  const weekdayText = (dateStr) => {
    const d = new Date(dateStr)
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    if (Number.isNaN(d.getTime())) return ""
    return weekdays[d.getDay()]
  }

  const groupedByDate = processedRes.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item.time)
    return acc
  }, {})

  const list = document.createElement("div")
  list.className = "selected-summary-list"

  Object.entries(groupedByDate).forEach(([date, times]) => {
    const wrapper = document.createElement("div")
    wrapper.className = "selected-day-group"

    const dateLine = document.createElement("div")
    dateLine.className = "selected-day-date"
    const dayText = weekdayText(date)
    dateLine.textContent = dayText
      ? `${formatDateWithoutYear(date)} ${dayText}`
      : formatDateWithoutYear(date)

    const timeLine = document.createElement("div")
    timeLine.className = "selected-day-times"

    times.forEach((time) => {
      const chip = document.createElement("span")
      chip.className = "selected-time-chip"
      chip.textContent = time
      timeLine.appendChild(chip)
    })

    wrapper.appendChild(dateLine)
    wrapper.appendChild(timeLine)
    list.appendChild(wrapper)
  })

  target.appendChild(list)
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

function display(date) {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return `${date.getMonth() + 1}/${date.getDate()} ${days[date.getDay()]}`
}

function getCurrentUserName() {
  const result = JSON.parse(sessionStorage.getItem("userAuth") || "null")
  return result?.user?.user_name || null
}

function getWeekIndexByDateKey(dateKey) {
  const week = State.get().selectedWeek || []
  return week.findIndex((d) => fmt(d) === dateKey)
}

function getBookingsByDateKey(dateKey) {
  const idx = getWeekIndexByDateKey(dateKey)
  if (idx < 0) return null
  return State.get().bookinged_slots[idx] || {}
}

function isPastSlot(dateKey, slotId) {
  const now = new Date()
  const todayKey = fmt(now)
  if (dateKey < todayKey) return true
  if (dateKey > todayKey) return false
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return slotId * 30 < currentMinutes
}

function updateDesktopSelectionUI() {
  const selectedRes = State.get().selectedRes
  const hasSelection = selectedRes.length > 0
  const desktopSelectionBar = document.getElementById("desktopSelectionBar")
  if (desktopSelectionBar) {
    desktopSelectionBar.style.display = hasSelection ? "flex" : "none"
  }
  setSelectedText(document.getElementById("selectedInfo"), selectedRes)
}

function updateMobileSelectionUI() {
  const selectedRes = State.get().selectedRes
  const panel = document.getElementById("mobileSelectionInfo")
  if (!panel) return
  if (selectedRes.length === 0) {
    panel.style.display = "none"
    return
  }

  panel.style.display = "block"
  setSelectedText(document.getElementById("mobileSelectedInfo"), selectedRes)
}

function updateWeekHeaders(week, selectedKey) {
  const headers = document.querySelectorAll("#weeklyView .week-header")
  headers.forEach((header, idx) => {
    if (idx === 0) return
    const date = week[idx - 1]
    const key = fmt(date)
    const strong = header.querySelector("strong")

    header.dataset.date = key
    strong.textContent = display(date)
    header.style.borderBottom = `2px solid ${key === selectedKey ? "#3273dc" : "#dbdbdb"}`
    strong.classList.toggle("has-text-info", key === selectedKey)
  })
}

function resetWeekColumns(week) {
  const columns = document.querySelectorAll("#weeklyView .day-column")
  columns.forEach((col, idx) => {
    const date = week[idx]
    const key = fmt(date)
    col.dataset.date = key

    const labels = col.querySelectorAll("label.slot-item")
    labels.forEach((label, i) => {
      const slot = slots[i]
      label.style.backgroundColor = ""
      label.dataset.time = slot.time
      label.dataset.slotid = slot.id
      label.dataset.date = key

      label.classList.remove("disabled", "selected", "available")
      label.classList.add("available")

      const input = label.querySelector("input[type=checkbox]")
      if (input) {
        input.disabled = false
        input.checked = false
        input.value = `${key}-${slot.id}`
      }

      const span = label.querySelector("span.slot-time")
      if (span) {
        span.classList.remove("weekly-text")
        span.style.whiteSpace = ""
        span.textContent = ""
        delete span.dataset.first
      }
    })
  })
}

function clearAllSelectedState() {
  State.set({ selectedRes: [] })
  selected = null

  const checkedInputs = document.querySelectorAll(
    "#weeklyView .day-column input[type=checkbox]:checked"
  )
  checkedInputs.forEach((input) => {
    input.checked = false
    const span = input.parentElement?.querySelector("span.slot-time")
    if (span) {
      span.textContent = span.dataset.first || ""
    }
  })

  updateDesktopSelectionUI()
  updateMobileSelectionUI()
}

// 初始化页面
async function init(selectedDate) {
  State.set({ selectedWeek: getWeek(selectedDate) })
  const pormise_week = []
  for (const date of State.get().selectedWeek) {
    pormise_week.push(getBookings(instrument_id, fmt(date)))
  }
  
  const week_bookings = Promise.all(pormise_week)
  const container = document.getElementById("weeklyView")
  const selectedKey = fmt(selectedDate)
  updateWeekHeaders(State.get().selectedWeek, selectedKey)
  resetWeekColumns(State.get().selectedWeek)

  const data = await week_bookings
  State.set({ bookinged_slots: data })
  console.log("State bookinged_slots:", State.get().bookinged_slots)

  disabledSlotwithDate()
  renderMobileSlots()
  State.get().bookinged_slots.forEach((dayBookings, dayIdx) => {
    renderBookedGroups(dayBookings, dayIdx, container, State.get().user_name)
  })
}

const renderBookedGroups = (dayBookings, dayIdx, container, my_name) => {
  const booked_groups = mergeBookings(dayBookings)
  console.log("dayIdx:", dayIdx, "booked_groups:", booked_groups)
  booked_groups.forEach((group) => {
    const { firstSlot, lastSlot, user_name, color } = group
    console.log(
      `Processing group: ${user_name} from slot ${firstSlot} to ${lastSlot}`
    )
    const first_time_str = slots[firstSlot].time.split("-")[0]
    const last_time_str = slots[lastSlot].time.split("-")[1]
    for (let slotId = firstSlot; slotId <= lastSlot; slotId++) {
      const dayColumn = container.querySelectorAll(".day-column")[dayIdx]
      if (!dayColumn) continue

      const input = dayColumn.querySelector(
        `input[type=checkbox][data-slotid='${slotId}']`
      )
      if (input) {
        // 标记为已预约
        const parent = input.parentElement
        if (parent) {
          if (user_name === my_name) {
            input.disabled = false
            parent.classList.remove("disabled")
            parent.classList.add("available")
          } else {
            input.disabled = true
            parent.classList.replace("available", "disabled")
          }

          parent.style.backgroundColor = color // 设置背景色
          // 如果是第一个slot，添加用户信息
          if (slotId === firstSlot) {
            const span = parent.querySelector("span.slot-time")
            span.style.whiteSpace = "pre"
            span.textContent = `${user_name}  (${first_time_str}-${last_time_str})`
            span.dataset.first = span.textContent
            parent.appendChild(span)
          }
        }
      }
    }
  })
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
async function weekChangeDay(selectedDate) {
  let week = State.get().selectedWeek
  const selectedKey = fmt(selectedDate)
  const inWeek = week.some((d) => fmt(d) === selectedKey)

  if (inWeek) {
    updateWeekHeaders(week, selectedKey)
    updateDesktopSelectionUI()
    updateMobileSelectionUI()
    return
  }

  State.set({ selectedWeek: getWeek(selectedDate) })
  State.set({ selectedRes: [] })
  updateDesktopSelectionUI()
  updateMobileSelectionUI()
  console.log("weekChangeDay new selectedWeek:", State.get().selectedWeek)

  week = State.get().selectedWeek
  console.log("weekChangeDay selectedWeek:", week)
  const pormise_week = []

  for (const date of week) {
    pormise_week.push(getBookings(instrument_id, fmt(date)))
  }

  // 更新日期头部
  updateWeekHeaders(week, selectedKey)
  console.log("Headers updated for new week")
  // 更新每一列的slot
  resetWeekColumns(week)
  const week_bookings = await Promise.all(pormise_week)
  State.set({ bookinged_slots: week_bookings })
  const container = document.getElementById("weeklyView")

  disabledSlotwithDate()
  State.get().bookinged_slots.forEach((dayBookings, dayIdx) => {
    renderBookedGroups(dayBookings, dayIdx, container, State.get().user_name)
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
  const { weekData } = State.get()
    console.log("Rendering mobile slots for date:", key, "with weekData:", weekData)
  const daySlots = weekData
  const myName = State.get().user_name
  const dayBookings = getBookingsByDateKey(key)

  container.innerHTML = ""
  const grid = document.createElement("div")
  grid.className = "mobile-slots-grid"

  daySlots.forEach((slot) => {
    const bookingInfo = dayBookings ? dayBookings[slot.id] : null
    const isBookedByMe = bookingInfo && bookingInfo.user_name === myName
    const isBookedByOthers = bookingInfo && bookingInfo.user_name !== myName
    const isPast = isPastSlot(key, slot.id)
    const unavailable = isPast || isBookedByOthers

    const isSelected = State.get().selectedRes.some(
      (s) => s.date === key && s.id === slot.id
    )

    let cls = "available"
    if (isBookedByOthers) cls = "booked"
    if (isPast) cls = "disabled"
    if (isSelected) cls = "selected"

    const item = document.createElement("button")
    item.type = "button"
    item.className = ["mobile-slot-item", cls, isBookedByMe ? "mine" : ""]
      .filter(Boolean)
      .join(" ")

    if (bookingInfo && !isSelected) {
      item.style.backgroundColor = bookingInfo.color
      item.style.opacity = isBookedByMe ? "1" : "0.75"
    }

    if (bookingInfo) {
      item.textContent = bookingInfo.user_name
      item.title = bookingInfo.user_name
    } else {
      item.textContent = slot.time
    }

    if (!unavailable) {
      item.addEventListener("click", () => mobileSelect(key, slot.id))
    } else {
      item.disabled = true
    }

    grid.appendChild(item)
  })

  container.appendChild(grid)
  updateMobileSelectionUI()
}

window.mobileSelect = function (date, id) {
  if (booking) return
  const { weekData, selectedRes } = State.get()
  const slot = weekData.find((s) => s.id === id)
  if (!slot) return

  const hasTarget = selectedRes.some((s) => s.date === date && s.id === id)
  let nextSelectedRes

  if (hasTarget) {
    nextSelectedRes = selectedRes.filter(
      (s) => !(s.date === date && s.id === id)
    )
  } else {
    // 移动端只处理当前日期，避免跨天提交数据。
    const sameDaySelections = selectedRes.filter((s) => s.date === date)
    nextSelectedRes = [...sameDaySelections, { date, id, time: slot.time }]
  }

  State.set({ selectedRes: nextSelectedRes })
  selected = nextSelectedRes[nextSelectedRes.length - 1] || null
  updateMobileSelectionUI()
  renderMobileSlots()
}

function select(date, event) {
  const { weekData, selectedRes } = State.get()
  let id = parseInt(event.target.dataset.slotid, 10)
  if (event.target.checked) {
    const slot = weekData.find((s) => id === s.id)
    let span = event.target.parentElement.querySelector("span.slot-time")
    span.textContent = slot.time
    selected = { date, id, time: slot.time }
    console.log("Selected:", selected)
    console.log("Before:", State.get().bookinged_slots)
    // 该注释用于设计，当天的预约数据已经加载时，选中一个时间段会在控制台输出该时间段是否已被预约（true/false），
    // 这样可以用来判断点击后显示给用户“提交”还是“取消”
    // let this_idx = -1
    // State.get().selectedWeek.forEach((d, index) => {
    //   const key = fmt(d)
    //   if (key === date) {
    //     this_idx = index
    //   }
    // })
    // console.log("Selected date index in week:", this_idx)
    // console.log(
    //   "Bookings for the day:",
    //   State.get().bookinged_slots[this_idx].hasOwnProperty(id)
    // )
    State.set({ selectedRes: [...selectedRes, selected] })
  } else {
    State.set({
      selectedRes: selectedRes.filter((s) => !(s.date === date && s.id === id)),
    })
    let span = event.target.parentElement.querySelector("span.slot-time")
    span.textContent = span.dataset.first || "" // 恢复初始文本，或者清空
  }
  updateDesktopSelectionUI()
  updateMobileSelectionUI()
  // renderWeek()
}

// Expose to inline handlers in module scope
window.select = select

function confirm() {
  const { selectedRes } = State.get()
  if (!selectedRes || selectedRes.length === 0) {
    alert("请先选择时间段")
    return
  }

  const selectionSnapshot = [...selectedRes]
  console.log("提交预约:", selectionSnapshot)
  // 提交预约
  const submitData = {
    date: selectionSnapshot[0].date,
    slots: selectionSnapshot.map((s) => s.id),
  }
  submitBookings(instrument_id, submitData).then((success) => {
    if (success) {
      alert("预约成功")
      // 重置选择
      State.set({ selectedRes: [] })
      selected = null
      updateDesktopSelectionUI()
      updateMobileSelectionUI()
      weekChangeDay(selectedDate)
      renderMobileSlots()
    }
  })
}

function cancel() {
  const { selectedRes } = State.get()
  if (!selectedRes || selectedRes.length === 0) {
    alert("请先选择时间段")
    return
  }

  const selectionSnapshot = [...selectedRes]
  console.log("取消预约:", selectionSnapshot)
  // 提交预约
  const cancelData = {
    date: selectionSnapshot[0].date,
    slots: selectionSnapshot.map((s) => s.id),
  }
  cancelBookings(instrument_id, cancelData).then((success) => {
    if (success) {
      alert("取消预约成功")
      // 重置选择
      State.set({ selectedRes: [] })
      selected = null
      updateDesktopSelectionUI()
      updateMobileSelectionUI()
      weekChangeDay(selectedDate)
      renderMobileSlots()
    }
  })
}

// Allow inline mobile confirmation button to call confirm()
window.confirm = confirm
window.cancel = cancel

// 桌面端日期切换
function changeDay(delta) {
  selectedDate.setDate(selectedDate.getDate() + delta)
  mobileSelectedDate = new Date(selectedDate)
  if (window.matchMedia("(max-width: 768px)").matches) {
    clearAllSelectedState()
  }
  fp.setDate(selectedDate, false)
  weekChangeDay(selectedDate)
  renderMobileSlots()
}

const fp = flatpickr("#dateInput", {
  locale: {
    ...flatpickr.l10ns.zh,
    firstDayOfWeek: 1, // 0=周日, 1=周一
  },
  dateFormat: "Y-m-d",
  defaultDate: selectedDate,
  onChange: (d) => {
    selectedDate = d[0]
    mobileSelectedDate = new Date(selectedDate)
    if (window.matchMedia("(max-width: 768px)").matches) {
      clearAllSelectedState()
    }
    weekChangeDay(selectedDate)
    renderMobileSlots()
  },
})

function disabledSlotwithDate() {
  const now = new Date()
  const todayKey = fmt(now)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const container = document.getElementById("weeklyView")
  const columns = container.querySelectorAll(".day-column")

  columns.forEach((col) => {
    const dateKey = col.dataset.date

    // 过去的日期，整列全部禁用
    if (dateKey < todayKey) {
      col.querySelectorAll("label.slot-item").forEach((label) => {
        label.classList.remove("available")
        label.classList.add("disabled")
        const input = label.querySelector("input[type=checkbox]")
        if (input) {
          input.disabled = true
        }
      })
      return
    }

    // 今天：只禁用已过去的 slot
    if (dateKey === todayKey) {
      col.querySelectorAll("label.slot-item").forEach((label) => {
        const input = label.querySelector("input[type=checkbox]")
        if (!input) return

        const slotId = parseInt(input.dataset.slotid, 10)
        // slot 的开始时间（分钟）：每个 slot 30 分钟，slot 0 = 00:00
        const slotStartMinutes = slotId * 30

        // 当前所在 slot 不禁用，只禁用开始时间严格早于现在的
        if (slotStartMinutes < currentMinutes) {
          // 仅在未被 disabled 标记时才改 available → disabled
          if (label.classList.contains("available")) {
            label.classList.remove("available")
            label.classList.add("disabled")
          }
          input.disabled = true
        }
      })
    }
  })
}

buildWeeklySkeletonDOM()
addslotselectorHandlers()
init(new Date()).then(() => {
  updateDesktopSelectionUI()
  updateMobileSelectionUI()
})

document.getElementById("prevDay").addEventListener("click", () => {
  changeDay(-1)
})

document.getElementById("nextDay").addEventListener("click", () => {
  changeDay(1)
})

document.getElementById("confirmBtn").addEventListener("click", confirm)
document.getElementById("cancelBtn").addEventListener("click", cancel)
document.getElementById("mobileConfirmBtn").addEventListener("click", confirm)
document.getElementById("mobileCancelBtn").addEventListener("click", cancel)
document
  .getElementById("toggleEarlyBtn")
  .addEventListener("click", (e) => toggleEarly(e.currentTarget))
document
  .getElementById("toggleLateBtn")
  .addEventListener("click", (e) => toggleLate(e.currentTarget))

document.addEventListener("DOMContentLoaded", () => {
  State.set({ user_name: getCurrentUserName() })
})
