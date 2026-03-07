// import { instruments_map } from "./instruments.js"
// import { getBookings_by_ID } from "./booking_api.js"
// import { checkAuthStatus } from "./user_manager.js"

// function getSelectedDateRange() {
//   return {
//     start: window.selectedStartDate || "",
//     end: window.selectedEndDate || "",
//   }
// }

// function clearFilters() {
//   const instSel = document.querySelector("#instrumentSelect")
//   if (instSel) {
//     // 清空多选/单选的选择状态
//     Array.from(instSel.options).forEach((opt) => (opt.selected = false))
//     instSel.options[0].selected = true // 默认选中“所有仪器”
//   }
//   document.querySelector("#dateRangeDisplay").value = ""

//   // 清空日期选择
//   window.selectedStartDate = null
//   window.selectedEndDate = null
//   window.isSelectingEnd = false

//   document.querySelector("#resultsContainer").innerHTML = `
//                 <div class="no-results">
//                     <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;">📅</div>
//                     <h3>请选择筛选条件并点击查询</h3>
//                 </div>
//             `
//   document.querySelector("#statsCards").style.display = "none"
//   document.querySelector("#printButtons").style.display = "none"
// }

// // 已移除打印功能

// // 日期范围选择器相关变量和函数
// let currentDate = new Date()
// let selectedStartDate = null
// let selectedEndDate = null
// let isSelectingEnd = false

// // 初始化日期选择器
// document.addEventListener("DOMContentLoaded", function () {
//   initDatePicker()
// })

// function initDatePicker() {
//   const dateRangeDisplay = document.querySelector("#dateRangeDisplay")
//   const datePickerPopup = document.querySelector("#datePickerPopup")
//   const prevMonth = document.querySelector("#prevMonth")
//   const nextMonth = document.querySelector("#nextMonth")
//   const clearDates = document.querySelector("#clearDates")
//   const confirmDates = document.querySelector("#confirmDates")

//   // 点击输入框显示日期选择器
//   dateRangeDisplay.addEventListener("click", function () {
//     datePickerPopup.classList.toggle("show")
//     if (datePickerPopup.classList.contains("show")) {
//       renderCalendar()
//     }
//   })

//   // 点击外部关闭日期选择器（但不在选择过程中关闭）
//   document.addEventListener("click", function (e) {
//     if (
//       !document.querySelector("#dateRangePicker").contains(e.target) &&
//       !isSelectingEnd
//     ) {
//       datePickerPopup.classList.remove("show")
//     }
//   })

//   // 月份导航
//   prevMonth.addEventListener("click", function () {
//     currentDate.setMonth(currentDate.getMonth() - 1)
//     renderCalendar()
//   })

//   nextMonth.addEventListener("click", function () {
//     currentDate.setMonth(currentDate.getMonth() + 1)
//     renderCalendar()
//   })

//   // 清空日期
//   clearDates.addEventListener("click", function () {
//     selectedStartDate = null
//     selectedEndDate = null
//     isSelectingEnd = false
//     window.selectedStartDate = null
//     window.selectedEndDate = null
//     dateRangeDisplay.value = ""
//     updateSelectionStatus()
//     renderCalendar()
//   })

//   // 确认选择
//   confirmDates.addEventListener("click", function () {
//     if (selectedStartDate && selectedEndDate) {
//       datePickerPopup.classList.remove("show")
//       updateDisplayValue()
//       isSelectingEnd = false
//     }
//   })
// }

// function renderCalendar() {
//   const monthYear = document.querySelector("#monthYear")
//   const daysGrid = document.querySelector("#daysGrid")

//   // 更新月份年份显示
//   const months = [
//     "1月",
//     "2月",
//     "3月",
//     "4月",
//     "5月",
//     "6月",
//     "7月",
//     "8月",
//     "9月",
//     "10月",
//     "11月",
//     "12月",
//   ]
//   monthYear.textContent = `${currentDate.getFullYear()}年${months[currentDate.getMonth()]}`

//   // 生成日期网格
//   daysGrid.innerHTML = ""

//   const firstDay = new Date(
//     currentDate.getFullYear(),
//     currentDate.getMonth(),
//     1
//   )
//   const lastDay = new Date(
//     currentDate.getFullYear(),
//     currentDate.getMonth() + 1,
//     0
//   )
//   const startDate = new Date(firstDay)
//   startDate.setDate(startDate.getDate() - firstDay.getDay())

//   const today = new Date()
//   today.setHours(0, 0, 0, 0)

//   for (let i = 0; i < 42; i++) {
//     const cellDate = new Date(startDate)
//     cellDate.setDate(startDate.getDate() + i)

//     const dayCell = document.createElement("div")
//     dayCell.className = "day-cell"
//     dayCell.textContent = cellDate.getDate()

//     // 添加样式类
//     if (cellDate.getMonth() !== currentDate.getMonth()) {
//       dayCell.classList.add("other-month")
//     }

//     if (cellDate.getTime() === today.getTime()) {
//       dayCell.classList.add("today")
//     }

//     const cellDateStr = formatDate(cellDate)

//     // 选中状态
//     if (selectedStartDate && selectedEndDate) {
//       if (cellDateStr === selectedStartDate) {
//         dayCell.classList.add("range-start")
//       } else if (cellDateStr === selectedEndDate) {
//         dayCell.classList.add("range-end")
//       } else if (
//         cellDateStr > selectedStartDate &&
//         cellDateStr < selectedEndDate
//       ) {
//         dayCell.classList.add("in-range")
//       }
//     } else if (selectedStartDate && cellDateStr === selectedStartDate) {
//       dayCell.classList.add("selected")
//     }

//     // 点击事件
//     dayCell.addEventListener("click", function () {
//       selectDate(cellDateStr)
//     })

//     daysGrid.appendChild(dayCell)
//   }
// }

// function selectDate(dateStr) {
//   if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
//     // 选择开始日期
//     selectedStartDate = dateStr
//     selectedEndDate = null
//     isSelectingEnd = true
//     updateDisplayValue() // 实时更新显示
//     updateSelectionStatus() // 更新选择状态
//   } else if (isSelectingEnd) {
//     // 选择结束日期
//     if (dateStr >= selectedStartDate) {
//       selectedEndDate = dateStr
//     } else {
//       // 如果选择的日期早于开始日期，则交换
//       selectedEndDate = selectedStartDate
//       selectedStartDate = dateStr
//     }
//     isSelectingEnd = false
//     updateDisplayValue() // 实时更新显示
//     updateSelectionStatus() // 更新选择状态

//     // 选择完成后短暂延迟关闭日历
//     setTimeout(() => {
//       document.querySelector("#datePickerPopup").classList.remove("show")
//     }, 500)
//   }

//   // 更新全局变量
//   window.selectedStartDate = selectedStartDate
//   window.selectedEndDate = selectedEndDate

//   renderCalendar()
// }

// function updateSelectionStatus() {
//   const statusElement = document.querySelector("#selectionStatus")
//   if (!selectedStartDate) {
//     statusElement.textContent = "请选择开始日期"
//     statusElement.style.color = "#667eea"
//   } else if (!selectedEndDate && isSelectingEnd) {
//     const startFormatted = formatDateForDisplay(
//       parseDateLocal(selectedStartDate)
//     )
//     statusElement.textContent = `开始: ${startFormatted} | 请选择结束日期`
//     statusElement.style.color = "#856404"
//   } else if (selectedStartDate && selectedEndDate) {
//     const startFormatted = formatDateForDisplay(
//       parseDateLocal(selectedStartDate)
//     )
//     const endFormatted = formatDateForDisplay(parseDateLocal(selectedEndDate))
//     statusElement.textContent = `${startFormatted} 至 ${endFormatted}`
//     statusElement.style.color = "#155724"
//   }
// }

// function formatDate(date) {
//   // 使用本地时区拼接，避免 toISOString 造成 UTC 偏移（选 27 显示 26）
//   const y = date.getFullYear()
//   const m = String(date.getMonth() + 1).padStart(2, "0")
//   const d = String(date.getDate()).padStart(2, "0")
//   return `${y}-${m}-${d}`
// }

// // 将 "YYYY-MM-DD" 按本地时区解析为 Date，避免直接 new Date(string) 的 UTC 语义
// function parseDateLocal(dateStr) {
//   if (!dateStr) return null
//   const [y, m, d] = dateStr.split("-").map(Number)
//   return new Date(y, m - 1, d)
// }

// function updateDisplayValue() {
//   const dateRangeDisplay = document.querySelector("#dateRangeDisplay")
//   if (selectedStartDate && selectedEndDate) {
//     const startFormatted = formatDateForDisplay(
//       parseDateLocal(selectedStartDate)
//     )
//     const endFormatted = formatDateForDisplay(parseDateLocal(selectedEndDate))
//     dateRangeDisplay.value = `${startFormatted} 至 ${endFormatted}`
//   } else if (selectedStartDate) {
//     const startFormatted = formatDateForDisplay(
//       parseDateLocal(selectedStartDate)
//     )
//     dateRangeDisplay.value = `${startFormatted} 至 ...`
//   } else {
//     dateRangeDisplay.value = ""
//   }
// }

// function formatDateForDisplay(date) {
//   return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
// }

// function add_instrument_filter() {
//   // 遍历instruments_map，添加选项
//   const instrumentSelect = document.querySelector("#instrumentSelect")
//   Object.entries(instruments_map).forEach(([key, value]) => {
//     const option = document.createElement("option")
//     option.value = value
//     option.textContent = key
//     instrumentSelect.appendChild(option)
//   })
// }

// add_instrument_filter()

// function getSelectedInstrument() {
//   const sel = document.querySelector("#instrumentSelect")
//   if (sel.value === "allinstrument") {
//     let arr = []
//     for (const [key, value] of Object.entries(instruments_map)) {
//       arr.push({ value, label: key })
//     }
//     return arr
//   }
//   console.log(
//     "Selected instrument:",
//     sel.value,
//     sel.options[sel.selectedIndex].text
//   )
//   return [
//     {
//       value: sel.value, // 你在 option.value 里放的 instruments_map 映射值
//       label: sel.options[sel.selectedIndex].text, // 下拉显示的中文名称（key）
//     },
//   ]
// }

// function getDateArrayInclusive(startStr, endStr) {
//   if (!startStr || !endStr) return []
//   // 若顺序颠倒则交换
//   let s = startStr
//   let e = endStr
//   if (s > e) [s, e] = [e, s]

//   const toDate = (str) => {
//     const [y, m, d] = str.split("-").map(Number)
//     return new Date(y, m - 1, d) // 本地时区，避免时区偏移
//   }

//   const pad = (n) => String(n).padStart(2, "0")
//   const toStr = (dt) =>
//     `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

//   const startDate = toDate(s)
//   const endDate = toDate(e)
//   const arr = []
//   for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
//     arr.push(toStr(d))
//   }
//   return arr
// }

// function combineTimeSlots(slots) {
//   if (!Array.isArray(slots) || slots.length === 0) return []
//   const toMin = (t) => {
//     const [H, M] = t.split(":").map(Number)
//     return H * 60 + M
//   }
//   // 解析
//   const intervals = slots
//     .map((s) => {
//       if (typeof s !== "string" || !s.includes("-")) return null
//       const [start, end] = s.split("-").map((v) => v.trim())
//       if (!start || !end) return null
//       return { start, end, sMin: toMin(start), eMin: toMin(end) }
//     })
//     .filter(Boolean)

//   // 排序
//   intervals.sort((a, b) => a.sMin - b.sMin || a.eMin - b.eMin)

//   // 合并
//   const merged = []
//   for (const it of intervals) {
//     if (!merged.length) {
//       merged.push({ ...it })
//       continue
//     }
//     const last = merged[merged.length - 1]
//     // 若重叠或首尾相接 (it.sMin <= last.eMin) 则合并
//     if (it.sMin <= last.eMin) {
//       if (it.eMin > last.eMin) ((last.eMin = it.eMin), (last.end = it.end))
//     } else {
//       merged.push({ ...it })
//     }
//   }

//   // 格式化
//   const pad = (n) => String(n).padStart(2, "0")
//   return merged.map((m) => {
//     const sh = Math.floor(m.sMin / 60)
//     const sm = m.sMin % 60
//     const eh = Math.floor(m.eMin / 60)
//     const em = m.eMin % 60
//     return `${pad(sh)}:${pad(sm)}-${pad(eh)}:${pad(em)}`
//   })
// }

// function prebuildAllResultsCSVAsync() {
//   const build = () => {
//     try {
//       buildAllResultsCSV()
//     } catch (e) {
//       // 静默失败，避免影响主流程
//       console.error("预生成 CSV 失败：", e)
//     }
//   }
//   if (typeof window.requestIdleCallback === "function") {
//     if (window.__csvIdleId && typeof window.cancelIdleCallback === "function") {
//       window.cancelIdleCallback(window.__csvIdleId)
//     }
//     window.__csvIdleId = window.requestIdleCallback(build, { timeout: 1500 })
//   }
// }

// function renderResults(groupedResults) {
//   // 保存最近渲染的数据供复制使用
//   window.__lastRenderedResults = { groupedResults }
//   prebuildAllResultsCSVAsync() // 预生成 CSV，提升后续下载速度
//   const container = document.querySelector("#resultsContainer")
//   if (!container) return
//   container.innerHTML = ""

//   const wrapper = document.createElement("div")
//   wrapper.className = "results-list"

//   groupedResults.forEach((day) => {
//     // 若该日所有仪器均无预约时间段（忽略错误项），则不渲染此日期框
//     const hasAnyTimes = day.items.some((item) => {
//       if (!item || item.error) return false
//       const rawTimes =
//         item.data && item.data.success && Array.isArray(item.data.times)
//           ? item.data.times
//           : []
//       const mergedTimes = combineTimeSlots(rawTimes)
//       return mergedTimes.length > 0
//     })
//     if (!hasAnyTimes) return

//     const dayDiv = document.createElement("div")
//     dayDiv.className = "result-day"
//     const header = document.createElement("div")
//     header.className = "result-day-header"
//     header.innerHTML = `<strong>${day.date}</strong>`
//     dayDiv.appendChild(header)

//     // 为当天的每台仪器分别渲染
//     day.items.forEach((item) => {
//       const instrumentName =
//         item.instrument?.label || item.instrument?.value || "未命名仪器"

//       // 错误直接渲染错误块
//       if (item.error) {
//         const instrumentBlock = document.createElement("div")
//         instrumentBlock.className = "instrument-result"
//         const instrumentHeader = document.createElement("div")
//         instrumentHeader.className = "instrument-name"
//         instrumentHeader.innerHTML = `<span class="instrument">${instrumentName}</span> <span style="color:#d9534f">加载失败</span>`
//         instrumentBlock.appendChild(instrumentHeader)
//         dayDiv.appendChild(instrumentBlock)
//         return
//       }

//       const rawTimes =
//         item.data && item.data.success && Array.isArray(item.data.times)
//           ? item.data.times
//           : []
//       const mergedTimes = combineTimeSlots(rawTimes)

//       // 无预约时间段则不渲染任何内容（包括外层时间框）
//       if (mergedTimes.length === 0) {
//         return
//       }

//       // 有时间段才渲染该仪器的卡片
//       const instrumentBlock = document.createElement("div")
//       instrumentBlock.className = "instrument-result"
//       const instrumentHeader = document.createElement("div")
//       instrumentHeader.className = "instrument-name"
//       instrumentHeader.innerHTML = `<span class="instrument">${instrumentName}</span>`
//       instrumentBlock.appendChild(instrumentHeader)

//       const ul = document.createElement("ul")
//       ul.className = "time-slots"
//       mergedTimes.forEach((t) => {
//         const li = document.createElement("li")
//         li.textContent = t
//         ul.appendChild(li)
//       })
//       instrumentBlock.appendChild(ul)
//       dayDiv.appendChild(instrumentBlock)
//     })

//     // 单日复制按钮（包含当天所有选择的仪器）
//     const copyDayBtn = document.createElement("button")
//     copyDayBtn.className = "btn btn-mini copy-day-btn"
//     copyDayBtn.type = "button"
//     copyDayBtn.textContent = "复制本日"
//     copyDayBtn.addEventListener("click", () => {
//       const blocks = day.items
//         .map((item) => {
//           const instrumentName =
//             item.instrument?.label || item.instrument?.value || "未命名仪器"
//           if (item.error) {
//             return `${day.date} - ${instrumentName}\n(加载失败)`
//           }
//           const rawTimes =
//             item.data && item.data.success && Array.isArray(item.data.times)
//               ? item.data.times
//               : []
//           const mergedTimes = combineTimeSlots(rawTimes)
//           if (mergedTimes.length === 0) return null
//           return `${day.date} - ${instrumentName}\n${mergedTimes.join("\n")}`
//         })
//         .filter(Boolean)

//       if (blocks.length === 0) {
//         showCopyTip("本日无可复制内容")
//         return
//       }
//       copyText(blocks.join("\n\n"))
//     })
//     dayDiv.appendChild(copyDayBtn)

//     wrapper.appendChild(dayDiv)
//   })

//   container.appendChild(wrapper)
// }

// function buildAllResultsCSV() {
//   const data = window.__lastRenderedResults
//   if (!data || !data.groupedResults) return ""
//   const { groupedResults } = data
//   const rows = []
//   // Header
//   rows.push(["日期", "仪器", "开始时间", "结束时间"])

//   const pushRow = (date, instrumentName, start, end) => {
//     const esc = (v) => {
//       if (v == null) return ""
//       const s = String(v)
//       // 若包含逗号、引号或换行，用双引号包裹，并转义内部引号
//       if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
//       return s
//     }
//     rows.push([esc(date), esc(instrumentName), esc(start), esc(end)])
//   }

//   groupedResults.forEach((day) => {
//     day.items.forEach((item) => {
//       const instrumentName =
//         item.instrument?.label || item.instrument?.value || "未命名仪器"
//       if (item?.data?.success && Array.isArray(item.data.times)) {
//         // 合并后的时间段更干净
//         const mergedTimes = combineTimeSlots(item.data.times)
//         mergedTimes.forEach((slot) => {
//           const [start, end] = slot.split("-").map((v) => v.trim())
//           pushRow(day.date, instrumentName, start, end)
//         })
//       }
//     })
//   })

//   // 若只有表头则表示无数据
//   if (rows.length === 1) return ""
//   return rows.map((arr) => arr.join(",")).join("\n")
// }

// async function copyText(text) {
//   try {
//     await navigator.clipboard.writeText(text)
//     showCopyTip("已复制")
//   } catch (e) {
//     // 回退方式
//     const ta = document.createElement("textarea")
//     ta.value = text
//     document.body.appendChild(ta)
//     ta.select()
//     try {
//       document.execCommand("copy")
//       showCopyTip("已复制")
//     } catch (err) {
//       alert("复制失败")
//     } finally {
//       document.body.removeChild(ta)
//     }
//   }
// }

// function copyAllResults() {
//   const text = buildAllResultsPlainText()
//   if (!text) {
//     showCopyTip("无可复制内容")
//     return
//   }
//   copyText(text)
// }

// function downloadAllResultsAsFile() {
//   const csv = window.__lastCSV ?? buildAllResultsCSV()
//   if (!csv) {
//     showCopyTip("无可打印内容")
//     return
//   }
//   // 生成文件名：包含已选日期范围；若无则使用当前日期时间
//   const { start, end } = getSelectedDateRange()
//   const stamp = (() => {
//     if (start && end) return `${start}_to_${end}`
//     const now = new Date()
//     const pad = (n) => String(n).padStart(2, "0")
//     return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
//   })()
//   const filename = `预约信息_${stamp}.csv`

//   // 为避免中文在部分编辑器/平台乱码，添加 UTF-8 BOM
//   const BOM = "\uFEFF"
//   const blob = new Blob([BOM + csv + "\n"], {
//     type: "text/csv;charset=utf-8",
//   })
//   const url = URL.createObjectURL(blob)
//   const a = document.createElement("a")
//   a.href = url
//   a.download = filename
//   document.body.appendChild(a)
//   a.click()
//   document.body.removeChild(a)
//   URL.revokeObjectURL(url)
//   showCopyTip("已生成 CSV 文件")
// }

// function showCopyTip(msg) {
//   let tip = document.querySelector("#copyToast")
//   if (!tip) {
//     tip = document.createElement("div")
//     tip.id = "copyToast"
//     // 提升可见性：居中，较大字号，半透明背景，轻微放大动画
//     tip.style.cssText = [
//       "position:fixed",
//       "top:50%",
//       "left:50%",
//       "transform:translate(-50%,-50%) scale(0.96)",
//       "background:rgba(0,0,0,0.85)",
//       "color:#fff",
//       "padding:14px 22px",
//       "border-radius:8px",
//       "font-size:16px",
//       "letter-spacing:.5px",
//       "z-index:9999",
//       "box-shadow:0 6px 24px rgba(0,0,0,.3)",
//       "opacity:0",
//       "transition:opacity .25s, transform .25s",
//     ].join(";")
//     document.body.appendChild(tip)
//   }
//   tip.textContent = msg
//   requestAnimationFrame(() => {
//     tip.style.opacity = "1"
//     tip.style.transform = "translate(-50%,-50%) scale(1)"
//   })
//   clearTimeout(window.__copyToastTimer)
//   window.__copyToastTimer = setTimeout(() => {
//     tip.style.opacity = "0"
//     tip.style.transform = "translate(-50%,-50%) scale(0.98)"
//   }, 2200)
// }

// async function searchReservations() {
//   const selectinstrument = getSelectedInstrument() // 现在是数组，可能包含多台仪器
//   const { start, end } = getSelectedDateRange()
//   console.log("Searching reservations from", start, "to", end)
//   if (!start || !end) {
//     alert("请先选择完整的开始与结束日期")
//     return
//   }
//   if (!selectinstrument || selectinstrument.length === 0) {
//     alert("请先选择至少一台仪器")
//     return
//   }
//   const user_info = await checkAuthStatus()
//   console.log("User info:", user_info)
//   const ID = user_info.user.ID
//   console.log(ID)
//   const dates = getDateArrayInclusive(start, end)
//   // 针对多仪器 x 多日期并发获取
//   const tasks = []
//   for (const inst of selectinstrument) {
//     for (const d of dates) {
//       tasks.push(
//         getBookings_by_ID(inst.value, d)
//           .then((data) => ({ date: d, instrument: inst, data }))
//           .catch((error) => ({ date: d, instrument: inst, error }))
//       )
//     }
//   }
//   const flatResults = await Promise.all(tasks)

//   // 日志输出
//   flatResults.forEach((r) => {
//     if (r.error) {
//       console.error(
//         "失败",
//         r.date,
//         r.instrument?.label || r.instrument?.value,
//         r.error
//       )
//     } else {
//       console.log(
//         "成功",
//         r.date,
//         r.instrument?.label || r.instrument?.value,
//         r.data
//       )
//     }
//   })

//   // 按日期分组，并确保日期与仪器的显示顺序稳定
//   const groupedResults = dates.map((d) => ({
//     date: d,
//     items: selectinstrument.map(
//       (inst) =>
//         flatResults.find(
//           (r) => r.date === d && r.instrument?.value === inst.value
//         ) || { date: d, instrument: inst, error: new Error("无数据") }
//     ),
//   }))

//   renderResults(groupedResults)
//   // 展示复制按钮容器
//   const btnBox = document.querySelector("#printButtons")
//   if (btnBox) btnBox.style.display = "flex"
// }
// document
//   .querySelector(".btn-primary")
//   ?.addEventListener("click", searchReservations)

// document
//   .querySelector("#clearFiltersBtn")
//   ?.addEventListener("click", clearFilters)

// // 绑定“复制全部”按钮（不使用全局 onclick，避免 ESM 下 window 作用域问题）
// document.addEventListener("DOMContentLoaded", () => {
//   const copyAllBtn = document.querySelector("#copyAllBtn")
//   if (copyAllBtn) {
//     copyAllBtn.addEventListener("click", copyAllResults)
//   }
//   const printAllBtn = document.querySelector("#printAllBtn")
//   if (printAllBtn) {
//     printAllBtn.addEventListener("click", downloadAllResultsAsFile)
//   }
// })
