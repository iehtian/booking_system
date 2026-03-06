let selectedDate = new Date()
let mobileSelectedDate = new Date()
import axios from "axios"
import { host } from "./config.js"
let instrument_id = "c_instrument" // 示例仪器 ID

function mergeBookings(bookings) {
  // 先对时间段排序（按开始时间）
  console.log("Bookings to merge:", bookings)
  const sorted = Object.entries(bookings).sort(([a], [b]) => {
    return a.localeCompare(b)
  })

  const groups = []
  let currentGroup = []
  let lastEnd = null
  let lastName = null

  sorted.forEach(([time_slot_id, value]) => {
    const { user_name, color } = value

    if (lastEnd + 1 === Number(time_slot_id) && lastName === user_name) {
      // 连续且同名 → 合并到当前 group
      console.log("Merging into current group")
      currentGroup.push({
        time_slot_id: Number(time_slot_id),
        user_name,
        color,
      })
    } else {
      // 不连续 或 name 不同 → 开新组
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
      }
      currentGroup = [{ time_slot_id: Number(time_slot_id), user_name, color }]
    }
    lastEnd = Number(time_slot_id)
    lastName = user_name
  })

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }
  const format_groups = groups.map((group) => ({
    firstSlot: group[0].time_slot_id,
    lastSlot: group[group.length - 1].time_slot_id,
    color: group[0].color,
    user_name: group[0].user_name,
  }))

  return format_groups
}

async function getBookings(instrument, date) {
  try {
    const response = await axios.get(
      `${host}/api/bookings?instrument=${instrument}&date=${date}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    const data = response.data
    console.log("获取的预约数据:", data)

    return data.bookings || {}
  } catch (error) {
    console.error("获取已预约时间段时出错:", error)
  }
}

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
  weekData: slots,
  selectedRes: [],
  selectedWeek: null,
  bookinged_slots: [],
})

let booking = null
let selected = null

const processSchedule = (list) => {
  // 1. 基础排序：先排日期，再排时间
  console.log("原始列表:", list)
  const sorted = list.sort((a, b) => {
    // 1. 第一优先级：日期
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date)
    }

    // 2. 第二优先级：ID  代表了时间
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

function fmt(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
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
  document.getElementById("selectionInfo").style.display = hasSelection
    ? "block"
    : "none"
  document.getElementById("confirmBtn").style.display = hasSelection
    ? "inline-flex"
    : "none"
  document.getElementById("cancelBtn").style.display = hasSelection
    ? "inline-flex"
    : "none"
  setSelectedText(document.getElementById("selectedInfo"), selectedRes)
}

function ensureMobileSelectionPanel() {
  let panel = document.getElementById("mobileSelectionInfo")
  if (panel) return panel

  panel = document.createElement("div")
  panel.className = "notification is-light mt-4"
  panel.id = "mobileSelectionInfo"

  const info = document.createElement("p")
  info.id = "mobileSelectedInfo"

  const confirmBtn = document.createElement("button")
  confirmBtn.className = "button is-success is-fullwidth mt-3"
  confirmBtn.id = "mobileConfirmBtn"
  confirmBtn.textContent = "提交预约"
  confirmBtn.addEventListener("click", confirm)

  const cancelBtn = document.createElement("button")
  cancelBtn.className = "button is-danger is-fullwidth mt-2"
  cancelBtn.id = "mobileCancelBtn"
  cancelBtn.textContent = "取消预约"
  cancelBtn.addEventListener("click", cancel)

  panel.appendChild(info)
  panel.appendChild(confirmBtn)
  panel.appendChild(cancelBtn)
  document
    .getElementById("mobileSlots")
    .insertAdjacentElement("afterend", panel)
  return panel
}

function updateMobileSelectionUI() {
  const selectedRes = State.get().selectedRes
  const panel = ensureMobileSelectionPanel()
  if (selectedRes.length === 0) {
    panel.style.display = "none"
    return
  }

  panel.style.display = "block"
  setSelectedText(document.getElementById("mobileSelectedInfo"), selectedRes)
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
  // 生成主结构
  State.set({ selectedWeek: getWeek(selectedDate) })
  console.log("selectedWeek:", State.get().selectedWeek)

  const pormise_week = []

  for (const date of State.get().selectedWeek) {
    pormise_week.push(getBookings(instrument_id, fmt(date)))
  }
  const week_bookings = Promise.all(pormise_week)

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
  State.get().selectedWeek.forEach((date) => {
    const key = fmt(date)
    const header = document.createElement("div")
    header.className = "has-text-centered mb-2 pb-2 week-header"
    header.style.borderBottom = `2px solid ${key === fmt(selectedDate) ? "#3273dc" : "#dbdbdb"}`
    header.dataset.date = key
    const strong = document.createElement("strong")
    strong.textContent = display(date)
    header.appendChild(strong)
    grid.appendChild(header)
    header
      .querySelector("strong")
      .classList.toggle("has-text-info", key === fmt(selectedDate))
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
  State.get().selectedWeek.forEach((date, idx) => {
    const key = fmt(date)
    const dayColumn = document.createElement("div")
    dayColumn.className = "day-column"
    dayColumn.dataset.idx = idx
    dayColumn.dataset.date = key
    const { weekData } = State.get()
    const daySlots = weekData

    daySlots.forEach((slot, idx2) => {
      let hideCls = ""
      if (slot.id <= 15) hideCls = "hidden-slot-logic-early Early"
      if (slot.id >= 45) hideCls = "hidden-slot-logic-late Late"
      const available = true
      const label = document.createElement("label")
      label.className = [
        "slot-item",
        available ? "available" : "disabled",
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
      // span.textContent = slot.time
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

  const data = await week_bookings
  State.set({ bookinged_slots: data })
  console.log("State bookinged_slots:", State.get().bookinged_slots)

  const result = JSON.parse(sessionStorage.getItem("userAuth") || "null")
  let my_name = null
  if (result && result.user) {
    my_name = result.user.user_name
  }
  disabledSlotwithDate()
  State.get().bookinged_slots.forEach((dayBookings, dayIdx) => {
    renderBookedGroups(dayBookings, dayIdx, container, my_name)
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
  const updateHeaders = () => {
    const headers = document.querySelectorAll("#weeklyView .week-header")
    headers.forEach((header, idx) => {
      if (idx === 0) return // 跳过时间头部
      const date = week[idx - 1]
      const key = fmt(date)
      header.dataset.date = key
      header.querySelector("strong").textContent = display(date)
      header.style.borderBottom = `2px solid ${key === selectedKey ? "#3273dc" : "#dbdbdb"}`
      header
        .querySelector("strong")
        .classList.toggle("has-text-info", key === selectedKey)
    })
  }

  if (inWeek) {
    updateHeaders()
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
  updateHeaders()
  console.log("Headers updated for new week")
  // 更新每一列的slot
  const columns = document.querySelectorAll("#weeklyView .day-column")
  columns.forEach((col, idx) => {
    const date = week[idx]
    const key = fmt(date)
    col.dataset.date = key
    const { weekData } = State.get()
    const daySlots = weekData
    const labels = col.querySelectorAll("label.slot-item")
    labels.forEach((label, i) => {
      label.style.backgroundColor = ""
      const slot = daySlots[i]
      label.dataset.time = slot.time
      label.dataset.slotid = slot.id
      label.dataset.date = key
      // 更新可用状态
      label.classList.remove("disabled", "selected", "available")
      label.classList.add("available")
      // input
      const input = label.querySelector("input[type=checkbox]")
      if (input) input.disabled = false
      input.checked = false
      const spans = label.querySelectorAll("span")
      spans.forEach((span) => {
        span.classList.remove("weekly-text")
        span.textContent = ""
      })
    })
  })
  const week_bookings = await Promise.all(pormise_week)
  State.set({ bookinged_slots: week_bookings })
  const container = document.getElementById("weeklyView")
  const my_name = JSON.parse(sessionStorage.getItem("userAuth") || "null")?.user
  disabledSlotwithDate()
  State.get().bookinged_slots.forEach((dayBookings, dayIdx) => {
    renderBookedGroups(dayBookings, dayIdx, container, my_name?.user_name)
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
  const daySlots = weekData
  const myName = getCurrentUserName()
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
    const targetData = {
      instrument: instrument,
      date: thisDate,
      slots: slots,
    }

    console.log("发送的数据:", targetData)

    // 使用 axios.post，第二个参数直接传对象
    const response = await axios.post(`${host}/api/info_save`, targetData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

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

async function cancelBookings(instrument, cancelData) {
  const thisDate = cancelData.date
  const slots = cancelData.slots

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
    const targetData = {
      instrument: instrument,
      date: thisDate,
      slots: slots,
    }

    console.log("发送的数据:", targetData)

    // 使用 axios.post，第二个参数直接传对象
    const response = await axios.post(
      `${host}/api/cancel_booking`,
      targetData,
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
    alert("取消预约失败，请重试")

    if (error.response) {
      // 请求已发出，服务器响应了状态码
      console.error(
        "取消失败 (状态码):",
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

init(new Date()).then(() => {
  renderMobileSlots()
  updateDesktopSelectionUI()
  updateMobileSelectionUI()
})
addslotselectorHandlers()

document.getElementById("prevDay").addEventListener("click", () => {
  changeDay(-1)
})

document.getElementById("nextDay").addEventListener("click", () => {
  changeDay(1)
})

document.getElementById("confirmBtn").addEventListener("click", confirm)
document.getElementById("cancelBtn").addEventListener("click", cancel)
