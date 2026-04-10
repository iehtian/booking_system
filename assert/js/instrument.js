let selectedDate = new Date()
let mobileSelectedDate = new Date()
import { getBookings, submitBookings, cancelBookings } from "./booking_api.js"
import {
  mergeBookings,
  generateTimeIntervalsSimple,
  processSchedule,
  fmt,
} from "./utils/slots.js"
import Swal from "sweetalert2"
import flatpickr from "flatpickr"
import "flatpickr/dist/flatpickr.min.css"
import "flatpickr/dist/l10n/zh.js"

/**
 * @typedef {Object} Slot
 * @property {number} id 时间段编号。
 * @property {string} time 时间段文本，例如 08:00-08:30。
 */

/**
 * @typedef {Object} SelectedReservation
 * @property {string} date 预约日期，格式为 YYYY-MM-DD。
 * @property {number} id 时间段编号。
 * @property {string} time 时间段文本。
 */

/**
 * @typedef {Object.<number, { user_name: string, color: string }>} DayBookings
 */

/**
 * @typedef {Object} AppState
 * @property {string | null} user_name 当前登录用户名。
 * @property {SelectedReservation[]} selectedRes 当前选中的时间段。
 * @property {Date[] | null} selectedWeek 当前选中日期所在周。
 * @property {DayBookings[]} bookinged_slots 当前周的预约数据。
 * @property {Slot[]=} weekData 当前页面使用的时间段定义。
 * @property {string=} instrument_id 仪器 ID。
 * @property {number=} slotDurationMinutes 每个 slot 对应的分钟数。
 * @property {boolean=} isNeedhidden 是否默认隐藏深夜和晚间时段。
 */

/**
 * 根据时间段编号返回需要附加的隐藏样式类。
 *
 * @param {number} slotId 时间段编号。
 * @returns {string} 对应的样式类名；如果无需隐藏则返回空字符串。
 */
function getSlotHideClass(slotId) {
  if (slotId <= 15) return "hidden-slot-logic-early Early"
  if (slotId >= 45) return "hidden-slot-logic-late Late"
  return ""
}

/**
 * 按当前状态构建周视图的静态 DOM 骨架。
 * 该方法只在容器为空时创建时间列与每日列，后续周切换只更新内容。
 *
 * @returns {void}
 */
function buildWeeklySkeletonDOM() {
  const timeColumn = document.getElementById("timeColumn")
  const slots = State.get().weekData
  console.log("构建时间列，使用 slots:", slots)
  const isNeedhidden = State.get().isNeedhidden
  if (timeColumn && timeColumn.children.length === 0) {
    const timeFragment = document.createDocumentFragment()
    slots.forEach(({ id, time }) => {
      const label = document.createElement("label")
      label.className = ["slot-item", isNeedhidden ? getSlotHideClass(id) : ""]
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
      label.className = [
        "slot-item",
        "available",
        isNeedhidden ? getSlotHideClass(slot.id) : "",
      ]
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

/**
 * 创建一个简单的可订阅状态容器。
 *
 * @template T
 * @param {T} initialState 初始状态。
 * @returns {{
 *   get: () => T,
 *   set: (patch: Partial<T>) => void,
 *   update: (updater: (state: T) => T) => void,
 *   subscribe: (listener: (state: T) => void) => () => boolean
 * }} 状态读写与订阅接口。
 */
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

/** @type {{ get: () => AppState, set: (patch: Partial<AppState>) => void, update: (updater: (state: AppState) => AppState) => void, subscribe: (listener: (state: AppState) => void) => () => boolean }} */
const State = createState({
  user_name: null,
  selectedRes: [],
  selectedWeek: null,
  bookinged_slots: [],
})

let booking = null
let selected = null

/**
 * 将已选时间段渲染为汇总文本。
 *
 * @param {HTMLElement | null} target 目标容器。
 * @param {SelectedReservation[]} selectedRes 已选时间段列表。
 * @returns {void}
 */
function setSelectedText(target, selectedRes) {
  if (!target) return
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

/**
 * 计算给定日期所在周的 7 天，按周一到周日返回。
 *
 * @param {Date} selectedDate 基准日期。
 * @returns {Date[]} 当前周的日期数组。
 */
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

/**
 * 将日期对象格式化为周视图标题文本。
 *
 * @param {Date} date 日期对象。
 * @returns {string} 形如 3/12 周四 的文本。
 */
function display(date) {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return `${date.getMonth() + 1}/${date.getDate()} ${days[date.getDay()]}`
}

/**
 * 从会话存储中读取当前用户名。
 *
 * @returns {string | null} 用户名，不存在时返回 null。
 */
function getCurrentUserName() {
  const result = JSON.parse(sessionStorage.getItem("userAuth") || "null")
  return result?.user?.user_name || null
}

/**
 * 根据日期键找到该日期在当前周中的索引。
 *
 * @param {string} dateKey 日期键，格式为 YYYY-MM-DD。
 * @returns {number} 匹配到的索引，未找到时返回 -1。
 */
function getWeekIndexByDateKey(dateKey) {
  const week = State.get().selectedWeek || []
  return week.findIndex((d) => fmt(d) === dateKey)
}

/**
 * 获取某一天的预约映射。
 *
 * @param {string} dateKey 日期键，格式为 YYYY-MM-DD。
 * @returns {DayBookings | null} 当天预约数据；不在当前周时返回 null。
 */
function getBookingsByDateKey(dateKey) {
  const idx = getWeekIndexByDateKey(dateKey)
  if (idx < 0) return null
  return State.get().bookinged_slots[idx] || {}
}

/**
 * 获取当前仪器每个 slot 的分钟数。
 *
 * @returns {number} slot 分钟数。
 */
function getSlotDurationMinutes() {
  return State.get().slotDurationMinutes || 30
}

/**
 * 判断某个时间段是否已经过去。
 *
 * @param {string} dateKey 日期键，格式为 YYYY-MM-DD。
 * @param {number} slotId 时间段编号。
 * @returns {boolean} 已经过期返回 true。
 */
function isPastSlot(dateKey, slotId) {
  const now = new Date()
  const todayKey = fmt(now)
  if (dateKey < todayKey) return true
  if (dateKey > todayKey) return false
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return slotId * getSlotDurationMinutes() < currentMinutes
}

/**
 * 统一应用已预约 slot 的视觉样式。
 *
 * @param {HTMLElement | null} element 目标元素。
 * @param {{ color?: string, dimmed?: boolean }} options 样式参数。
 * @returns {void}
 */
function applyBookedSlotStyle(element, { color, dimmed = false } = {}) {
  if (!element || !color) return
  element.style.background = color
  element.style.backgroundColor = color
  element.style.opacity = dimmed ? "0.75" : ""
}

/**
 * 刷新桌面端已选信息栏。
 *
 * @returns {void}
 */
function updateDesktopSelectionUI() {
  const selectedRes = State.get().selectedRes
  const hasSelection = selectedRes.length > 0
  const desktopSelectionBar = document.getElementById("desktopSelectionBar")
  if (desktopSelectionBar) {
    desktopSelectionBar.style.display = hasSelection ? "flex" : "none"
  }
  setSelectedText(document.getElementById("selectedInfo"), selectedRes)
}

/**
 * 刷新移动端已选信息面板。
 *
 * @returns {void}
 */
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

/**
 * 更新周视图顶部表头及选中列样式。
 *
 * @param {Date[]} week 当前周日期数组。
 * @param {string} selectedKey 当前选中日期键。
 * @returns {void}
 */
function updateWeekHeaders(week, selectedKey) {
  const headers = document.querySelectorAll("#weeklyView .week-header")
  const dayColumns = document.querySelectorAll("#weeklyView .day-column")
  headers.forEach((header, idx) => {
    if (idx === 0) return
    const date = week[idx - 1]
    const key = fmt(date)
    const strong = header.querySelector("strong")

    header.dataset.date = key
    strong.textContent = display(date)
    header.style.borderBottom = `2px solid ${key === selectedKey ? "#3273dc" : "#dbdbdb"}`
    strong.classList.toggle("has-text-info", key === selectedKey)

    const dayColumn = dayColumns[idx - 1]
    if (dayColumn) {
      dayColumn.classList.toggle("selected-date-column", key === selectedKey)
    }
  })
}

/**
 * 重置周视图中所有时间格的显示与状态。
 *
 * @param {Date[]} week 当前周日期数组。
 * @returns {void}
 */
function resetWeekColumns(week) {
  const columns = document.querySelectorAll("#weeklyView .day-column")
  const slots = State.get().weekData
  columns.forEach((col, idx) => {
    const date = week[idx]
    const key = fmt(date)
    col.dataset.date = key

    const labels = col.querySelectorAll("label.slot-item")
    labels.forEach((label, i) => {
      const slot = slots[i]
      label.style.background = ""
      label.style.backgroundColor = ""
      label.style.opacity = ""
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

/**
 * 清空当前所有选中状态，并恢复对应的 UI。
 *
 * @returns {void}
 */
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
/**
 * 初始化当前选中日期所在周的数据与界面。
 *
 * @param {Date} selectedDate 当前选中日期。
 * @returns {Promise<void>}
 */
async function init(selectedDate) {
  State.set({ selectedWeek: getWeek(selectedDate) })
  const instrument_id = State.get().instrument_id
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

/**
 * 将某一天的预约记录渲染到周视图列中。
 *
 * @param {DayBookings} dayBookings 单日预约数据。
 * @param {number} dayIdx 当前日期在周中的索引。
 * @param {HTMLElement} container 周视图容器。
 * @param {string | null} my_name 当前用户名。
 * @returns {void}
 */
const renderBookedGroups = (dayBookings, dayIdx, container, my_name) => {
  const booked_groups = mergeBookings(dayBookings)
  console.log("dayIdx:", dayIdx, "booked_groups:", booked_groups)
  const slots = State.get().weekData
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
          applyBookedSlotStyle(parent, { color })
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

/**
 * 为周视图中的复选框绑定选择事件。
 *
 * @returns {void}
 */
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
/**
 * 根据新日期切换当前周数据；若仍在同一周内，则仅刷新表头与选择态。
 *
 * @param {Date} selectedDate 当前选中日期。
 * @returns {Promise<void>}
 */
async function weekChangeDay(selectedDate) {
  let week = State.get().selectedWeek
  const selectedKey = fmt(selectedDate)
  const inWeek = week.some((d) => fmt(d) === selectedKey)
  const instrument_id = State.get().instrument_id
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

/**
 * 切换深夜时段显示状态。
 *
 * @param {HTMLButtonElement | null} btn 触发按钮。
 * @returns {void}
 */
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

/**
 * 切换晚间时段显示状态。
 *
 * @param {HTMLButtonElement | null} btn 触发按钮。
 * @returns {void}
 */
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

/**
 * 渲染移动端当前选中日期的时间格。
 *
 * @returns {void}
 */
function renderMobileSlots() {
  const container = document.getElementById("mobileSlots")
  const key = fmt(mobileSelectedDate)
  const { weekData } = State.get()
  console.log(
    "Rendering mobile slots for date:",
    key,
    "with weekData:",
    weekData
  )
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
    // 只有没有被预约的才根据时间显示状态，被预约的一律显示对应颜色
    if (!bookingInfo && isPast) {
      cls = "disabled"
    }
    if (isSelected) cls = "selected"

    const item = document.createElement("button")
    item.type = "button"
    item.className = ["mobile-slot-item", cls, isBookedByMe ? "mine" : ""]
      .filter(Boolean)
      .join(" ")

    if (bookingInfo) {
      // 已预约时，统一使用共享样式入口。
      applyBookedSlotStyle(item, {
        color: bookingInfo.color,
        dimmed: !isBookedByMe,
      })
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

/**
 * 切换移动端某个时间段的选中状态。
 *
 * @param {string} date 日期键，格式为 YYYY-MM-DD。
 * @param {number} id 时间段编号。
 * @returns {void}
 */
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

/**
 * 处理桌面端时间段勾选逻辑。
 *
 * @param {string} date 日期键，格式为 YYYY-MM-DD。
 * @param {Event} event 复选框 change 事件。
 * @returns {void}
 */
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

/**
 * 提交当前选中的预约。
 *
 * @returns {void}
 */
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
  const instrument_id = State.get().instrument_id
  submitBookings(instrument_id, submitData)
    .then((success) => {
      if (success) {
        Swal.fire({
          icon: "success",
          title: "预约成功",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        }).then(() => {
          clearAllSelectedState()
          init(selectedDate)
        })
      }
    })
    .catch((error) => {
      console.error("预约失败:", error)
      Swal.fire({
        icon: "error",
        title: "预约失败",
        text: "请重试",
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        clearAllSelectedState()
        init(selectedDate)
      })
    })
}

/**
 * 取消当前选中的预约。
 *
 * @returns {void}
 */
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
  const instrument_id = State.get().instrument_id
  cancelBookings(instrument_id, cancelData)
    .then((success) => {
      if (success) {
        Swal.fire({
          icon: "success",
          title: "取消成功",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        }).then(() => {
          clearAllSelectedState()
          init(selectedDate)
        })
      }
    })
    .catch((error) => {
      console.error("取消预约失败:", error)
      Swal.fire({
        icon: "error",
        title: "取消预约失败",
        text: "请重试",
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        clearAllSelectedState()
        init(selectedDate)
      })
    })
}

// 日期切换
/**
 * 按天偏移切换当前日期，并刷新对应视图。
 *
 * @param {number} delta 日期偏移量，单位为天。
 * @returns {void}
 */
function changeDay(delta) {
  selectedDate.setDate(selectedDate.getDate() + delta)
  mobileSelectedDate = new Date(selectedDate)
  if (window.matchMedia("(max-width: 768px)").matches) {
    clearAllSelectedState()
  }
  const fpInstance = document.getElementById("dateInput")?._flatpickr
  if (fpInstance) {
    fpInstance.setDate(selectedDate, false)
  }
  weekChangeDay(selectedDate)
  renderMobileSlots()
}

/**
 * 按当前时间禁用不可预约的历史日期和过期时间段。
 *
 * @returns {void}
 */
function disabledSlotwithDate() {
  const now = new Date()
  const todayKey = fmt(now)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const slotDurationMinutes = getSlotDurationMinutes()

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
        // slot 的开始时间（分钟）：slot 0 = 00:00
        const slotStartMinutes = slotId * slotDurationMinutes

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

document.getElementById("prevWeek")?.addEventListener("click", () => {
  try {
    changeDay(-7)
  } catch (err) {
    console.error("切换上一周失败:", err)
    alert("操作失败，请重试")
  }
})

document.getElementById("nextWeek")?.addEventListener("click", () => {
  try {
    changeDay(7)
  } catch (err) {
    console.error("切换下一周失败:", err)
    alert("操作失败，请重试")
  }
})

document.getElementById("prevDay")?.addEventListener("click", () => {
  try {
    changeDay(-1)
  } catch (err) {
    console.error("切换上一天失败:", err)
    alert("操作失败，请重试")
  }
})

document.getElementById("nextDay")?.addEventListener("click", () => {
  try {
    changeDay(1)
  } catch (err) {
    console.error("切换下一天失败:", err)
    alert("操作失败，请重试")
  }
})

document.getElementById("confirmBtn")?.addEventListener("click", () => {
  try {
    confirm()
  } catch (err) {
    console.error("确认预约失败:", err)
    alert("操作失败，请重试")
  }
})

document.getElementById("cancelBtn")?.addEventListener("click", () => {
  try {
    cancel()
  } catch (err) {
    console.error("取消预约失败:", err)
    alert("操作失败，请重试")
  }
})

document.getElementById("mobileConfirmBtn")?.addEventListener("click", () => {
  try {
    confirm()
  } catch (err) {
    console.error("移动端确认预约失败:", err)
    alert("操作失败，请重试")
  }
})

document.getElementById("mobileCancelBtn")?.addEventListener("click", () => {
  try {
    cancel()
  } catch (err) {
    console.error("移动端取消预约失败:", err)
    alert("操作失败，请重试")
  }
})

document.getElementById("toggleEarlyBtn")?.addEventListener("click", (e) => {
  try {
    toggleEarly(e.currentTarget)
  } catch (err) {
    console.error("展开/收起深夜时段失败:", err)
  }
})

document.getElementById("toggleLateBtn")?.addEventListener("click", (e) => {
  try {
    toggleLate(e.currentTarget)
  } catch (err) {
    console.error("展开/收起晚间时段失败:", err)
  }
})

document.addEventListener("DOMContentLoaded", () => {
  try {
    const instruments_map = {
      细胞房: { id: "a_instrument", slotType: 0 },
      液相: { id: "b_instrument", slotType: 1 },
    }

    const title = document.title
    const { id, slotType } = instruments_map[title]
    const sliceNum = slotType === 0 ? 48 : 24
    const slotDurationMinutes = slotType === 0 ? 30 : 60
    const isNeedhidden = slotType === 0 ? true : false
    State.set({ weekData: generateTimeIntervalsSimple(sliceNum) })
    State.set({
      instrument_id: id,
      slotDurationMinutes,
      isNeedhidden,
      user_name: getCurrentUserName(),
    })

    flatpickr("#dateInput", {
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

    buildWeeklySkeletonDOM()
    addslotselectorHandlers()
    init(new Date()).then(() => {
      updateDesktopSelectionUI()
      updateMobileSelectionUI()
    })
  } catch (err) {
    console.error("初始化用户信息失败:", err)
  }
})
