import { logout, checkAuthStatus } from "./user_manager.js"
import { host } from "./config.js"
const width = document.documentElement.clientWidth || document.body.clientWidth
console.log("当前屏幕宽度:", width)

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
const time_slots = generateTimeIntervalsSimple()

function getCurrentDateISO() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getCurrentTimeSlotIndex() {
  const now = new Date()
  const hours = now.getHours() // 0 ~ 23
  const minutes = now.getMinutes() // 0 ~ 59

  const totalMinutes = hours * 60 + minutes
  const slotIndex = Math.floor(totalMinutes / 30) // 每30分钟为1个slot

  return slotIndex // 结果是 0 ~ 47
}

function disableSlot(slot, reasonText) {
  const checkbox = document.getElementById(`time-slot-${slot}`)
  if (checkbox) {
    checkbox.disabled = true
    if (checkbox.parentElement) {
      checkbox.parentElement.classList.add("disabled-slot")
    }
    const slotLabel = checkbox.nextElementSibling
    if (reasonText && slotLabel && !slotLabel.innerHTML.includes(reasonText)) {
      slotLabel.innerHTML += `<br> ${reasonText}`
    }
  }
}

async function getBookings(date) {
  try {
    const response = await fetch(`${host}/api/bookings?date=${date}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    console.log("已预约时间段数据:", data)
    if (!data.bookings) {
      return
    }
    Object.entries(data.bookings).forEach(([key, value]) => {
      const name = value.name || "未知用户" // 如果没有name字段，使用默认值
      const color = value.color || "#ffffff" // 如果没有color字段，使用默认值
      console.log(`时间段: ${key}, 预约人: ${name}, 颜色: ${color}`)
      const checkbox = document.getElementById(`time-slot-${key}`)
      if (checkbox) {
        if (checkbox.parentElement) {
          checkbox.parentElement.classList.add("disabled-slot") // 添加禁用样式
          checkbox.parentElement.style.backgroundColor = color // 设置背景色
        }
        const slotLabel = checkbox.nextElementSibling
        if (slotLabel) {
          slotLabel.innerHTML += `<br> 已被 ${name} 预约` // 在标签后添加已预约信息
        }
      }
    })
  } catch (error) {
    console.error("获取已预约时间段时出错:", error)
  }
}

let datas = {}
function getWeekRangeMonday(date = new Date()) {
  const current = new Date(date)
  const day = current.getDay()
  const diff = current.getDate() - day + (day === 0 ? -6 : 1) // 周一为开始

  const this_week = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(current.setDate(diff + i))
    this_week.push(day.toISOString().split("T")[0]) // 将每一天的日期添加到 this_week 数组
  }
  return this_week
}

function add_new_date(data) {
  datas[data] = []
}
function clear_dates() {
  datas = {}
}
function get_dates(data) {
  if (datas[data]) {
    return datas[data]
  } else {
    console.error("日期不存在:", data)
  }
  return []
}

function checked_option(event, data, timeSlot) {
  const selected = get_dates(data)
  console.log("当前选中的时间段:", selected)
  if (event.target.checked) {
    // 复选框被选中
    selected.push(timeSlot)
    console.log(`选中时间段: ${timeSlot}`)
  } else {
    // 复选框被取消选中
    const index = selected.indexOf(timeSlot)
    if (index > -1) {
      selected.splice(index, 1)
    }
    console.log(`取消选中时间段: ${timeSlot}`)
  }

  console.log("当前选中的时间段:", selected)
}

async function submitAppointment(realName, color, submitData) {
  const selectedDate = submitData.date
  const slots = submitData.slots
  if (!selectedDate || slots.length === 0) {
    alert("请先选择日期和时间段")
    return
  }

  try {
    // 一次性发送所有时间段
    const appointmentData = {
      system: "a_device", // 系统ID，根据需要修改
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
      console.log("预约已成功提交:", result)
      location.reload()
    } else {
      // 处理错误情况
      alert("提交预约失败，请重试")
      console.error("提交失败:", result)
      location.reload()
    }
  } catch (error) {
    console.error("提交预约时出错:", error)
  }
}

const buttonhideConfigs = {
  morning: {
    selector: "#morning",
    timeRange: "00:00-08:00",
    getSlots: () => time_slots.slice(0, 16),
  },
  night: {
    selector: "#night",
    timeRange: "22:00-24:00",
    getSlots: () => time_slots.slice(-4),
  },
}

function createTimeSlotElement(slot, date = null, isMobile = false) {
  const option = document.createElement("input")
  option.type = "checkbox"
  option.value = slot
  option.className = isMobile ? "time-slot-option" : "week-time-slot-option"
  option.id = date ? `time-slot-${date}-${slot}` : `time-slot-${slot}`
  option.name = "time-slot"
  option.checked = false

  // 添加选中事件监听器
  option.addEventListener("change", (event) => {
    const targetDate = date || document.getElementById("appointment-date").value
    checked_option(event, targetDate, event.target.value)
  })

  const label = document.createElement("label")
  label.htmlFor = option.id
  label.className = isMobile ? "" : "time-slot-label"
  if (isMobile) {
    label.textContent = slot
  }

  const divtime = document.createElement("div")
  divtime.className = isMobile ? "time-slot-item" : "week-time-slot-item"
  divtime.appendChild(option)
  divtime.appendChild(label)

  return divtime
}

// 创建日期标题行（仅桌面端使用）
function createTimeHeaderRow() {
  const div = document.createElement("div")
  div.className = "week-range"
  const datediv = document.createElement("div")
  datediv.textContent = "时间"
  datediv.className = "week-date"
  div.appendChild(datediv)

  time_slots.forEach((slot) => {
    const divtime = document.createElement("div")
    divtime.className = "week-time-slot-item"
    divtime.textContent = slot
    div.appendChild(divtime)
  })

  return div
}

function date_change(event, changer) {
  event.preventDefault() // 阻止默认链接行为
  const appointmentDate = document.getElementById("appointment-date")
  const currentDate = new Date(appointmentDate.value)
  currentDate.setDate(currentDate.getDate() + changer)
  appointmentDate.value = currentDate.toISOString().split("T")[0]
  // 触发日期变化事件
  appointmentDate.dispatchEvent(new Event("change"))
}

function auto_hidden(event, text) {
  const Button = event.target
  const currentState = Button.dataset.clicked === "true"
  const newState = !currentState

  // 将状态保存到DOM元素
  Button.dataset.clicked = newState.toString()
  Button.value = newState ? `► ${text}` : `▼ ${text}` // 更新按钮文本
  Button.style.backgroundColor = newState ? "#E0F2FE" : "#f1f5f9" // 更新按钮背景色
  Button.style.border = newState ? "1px solid #0991B2" : "1px solid#d6dee7" // 更新按钮边框
}

const deviceConfig = {
  mobile: {
    buttonhide: buttonhideConfigs,
    hidden(hidden_slots) {
      const hidden_slots_arr = hidden_slots()
      hidden_slots_arr.forEach((slot) => {
        const checkbox = document.getElementById(`time-slot-${slot}`)
        const checkboxParent = checkbox.parentElement
        if (checkboxParent) {
          checkboxParent.style.display =
            checkboxParent.style.display === "none" ? "block" : "none" // 切换上午时间段的显示状态
        }
      })
    },
    addslot() {
      document.getElementById("appointment-date").value = getCurrentDateISO()
      let timeSlots = document.getElementById("time-slot")

      time_slots.forEach((slot) => {
        const timeSlotElement = createTimeSlotElement(slot, null, true)
        timeSlots.appendChild(timeSlotElement)
      })
    },
    init_slots() {
      clear_dates()
      add_new_date(getCurrentDateISO())

      this.addslot() // 初始化时间段
      this.buttonhide.weekdates = [getCurrentDateISO()] // 设置当前日期为本周日期
      document
        .getElementById("appointment-date")
        .addEventListener("change", function (event) {
          const newDate = event.target.value

          // 清除之前禁用的样式和提示
          // 遍历所有时间段项，移除禁用样式和提示文本
          for (const slot of time_slots) {
            const checkbox = document.getElementById(`time-slot-${slot}`)
            if (checkbox) {
              checkbox.disabled = false // 启用复选框
              checkbox.parentElement.classList.remove("disabled-slot") // 移除禁用样式
              const slotLabel = checkbox.nextElementSibling
              if (slotLabel) {
                // 移除“已被 XXX 预约”的文本
                const slotText = slotLabel.innerHTML.split("<br>")[0] // 只保留时间段部分
                slotLabel.innerHTML = slotText
              }
            }
          }
          add_new_date(newDate) // 添加新的日期到数据中
          // 清空之前选中的时间段（如果你希望换日期时重置选择）
          const selected = get_dates(newDate)
          selected.length = 0
          document.querySelectorAll(".time-slot-option").forEach((cb) => {
            cb.checked = false
          })
          getBookings(newDate)
          // 获取新的日期的预约信息
          if (newDate < getCurrentDateISO()) {
            // 日期已过
            time_slots.forEach((slot) => disableSlot(slot))
          } else if (newDate === getCurrentDateISO()) {
            // 是今天，禁用当前时间段之前的
            const currentSlotIndex = getCurrentTimeSlotIndex()
            for (let i = 0; i < currentSlotIndex; i++) {
              disableSlot(time_slots[i])
            }
          }
          //找出所有的no-login-slot类的元素,禁止点击
          const noLoginSlots = document.querySelectorAll(".no-login-slot")
          noLoginSlots.forEach((slot) => {
            //找到类中的input元素
            const input = slot.querySelector("input[type='checkbox']")
            if (input) {
              input.disabled = true // 禁用复选框
            }
          })

          // 现在的时间以后的时间段禁止预约，包括对日期的对比和日期修改后的变化
        })

      document
        .getElementById("appointment-date")
        .dispatchEvent(new Event("change")) // 触发日期变化事件
      // 发送预约数据到后端的函数

      document
        .querySelector("#appointment-date")
        .addEventListener("click", function (event) {
          //回调函数，打开日期选择器
          event.target.showPicker() // 显示日期选择器
        })

      document.querySelector("#yestoday").addEventListener("click", (event) => {
        date_change(event, -1) // 点击昨天按钮，日期减1
      })

      document.querySelector("#tomorrow").addEventListener("click", (event) => {
        date_change(event, 1) // 点击明天按钮，日期加1
      })
    },
    setupSubmitHandler: (realName, color) => {
      const submitButton = document.querySelector("#submit-button")
      submitButton.addEventListener("click", () => {
        for (const [date, slots] of Object.entries(datas)) {
          if (slots.length === 0) continue
          let submit = { date: date, slots: slots }
          submitAppointment(realName, color, submit)
        }
      })
    },
  },
  desktop: {
    buttonhide: buttonhideConfigs,
    hidden(hidden_slots, date) {
      console.log("hidden_slots:", hidden_slots)
      const hidden_slots_arr = hidden_slots()
      date.forEach((thisdate) => {
        const week_time_slots =
          document.querySelectorAll(`.week-time-slot-item`)
        const week_time_map = new Map()
        week_time_slots.forEach((item) => {
          const timeText = item.textContent.trim()
          week_time_map.set(timeText, item)
        })
        hidden_slots_arr.forEach((slot) => {
          const this_slot = week_time_map.get(`${slot}`)
          if (this_slot) {
            this_slot.style.display =
              this_slot.style.display === "none" ? "block" : "none" // 切换上午时间段的显示状态
          }
        })
        hidden_slots_arr.forEach((slot) => {
          const checkbox = document.getElementById(
            `time-slot-${thisdate}-${slot}`
          )
          const checkboxParent = checkbox.parentElement
          if (checkboxParent) {
            checkboxParent.style.display =
              checkboxParent.style.display === "none" ? "block" : "none" // 切换上午时间段的显示状态
          }
        })
      })
    },
    addslot(weekRange) {
      document.getElementById("appointment-date").value = getCurrentDateISO()
      let timeSlots = document.getElementById("time-slot")

      // 添加时间标题行
      timeSlots.appendChild(createTimeHeaderRow())

      // 为每个日期创建时间段
      weekRange.forEach((date) => {
        const div = document.createElement("div")
        div.className = "week-range"
        const datediv = document.createElement("div")
        datediv.textContent = date
        datediv.className = "week-date"
        div.appendChild(datediv)

        time_slots.forEach((slot) => {
          const timeSlotElement = createTimeSlotElement(slot, date, false)
          div.appendChild(timeSlotElement)
        })

        timeSlots.appendChild(div)
      })
    },
    init_slots() {
      clear_dates()
      const weekRange = getWeekRangeMonday()
      this.buttonhide.weekdates = weekRange
      console.log("本周日期范围:", weekRange)
      weekRange.forEach((date) => {
        add_new_date(date) // 添加每个日期到数据中
      })
      this.addslot(weekRange) // 初始化时间段
      window.addEventListener("DOMContentLoaded", () => {
        const today = new Date().toISOString().split("T")[0] // 获取今天的日期，格式为 YYYY-MM-DD
        const dateElements = document.querySelectorAll(".week-date") // 获取所有日期元素

        dateElements.forEach((el) => {
          if (el.textContent.trim() === today) {
            el.classList.add("highlight")
            const parent = el.parentElement
            const weekTimeSlotItems = parent.querySelectorAll(
              ".week-time-slot-item"
            )
            // 给每个子元素添加背景色
            weekTimeSlotItems.forEach((item) => {
              item.style.backgroundColor = "#E0F2FE" // 设置背景色
            })
          }
        })
      })
    },

    setupSubmitHandler: (realName, color) => {
      const submitButton = document.querySelector("#submit-button")
      submitButton.addEventListener("click", () => {
        for (const [date, slots] of Object.entries(datas)) {
          if (slots.length === 0) continue
          let submit = { date: date, slots: slots }
          submitAppointment(realName, color, submit)
        }
      })
    },
  },
}

const isMobile = width < 768 // 判断是否为移动端
const config = isMobile ? deviceConfig.mobile : deviceConfig.desktop
config.init_slots() // 初始化

function hidden_block(event, date, text, hidden_slots) {
  event.preventDefault() // 阻止默认链接行为
  //点击该按钮将自动隐藏/显示晚上
  const Button = event.target
  const currentState = Button.dataset.clicked === "true"
  const newState = !currentState

  // 将状态保存到DOM元素
  Button.dataset.clicked = newState.toString()
  Button.value = newState ? `► ${text}` : `▼ ${text}` // 更新按钮文本
  Button.style.backgroundColor = newState ? "#E0F2FE" : "#f1f5f9" // 更新按钮背景色
  Button.style.border = newState ? "1px solid #0991B2" : "1px solid#d6dee7" // 更新按钮边框

  if (width < 768) {
    hidden_slots.forEach((slot) => {
      const checkbox = document.getElementById(`time-slot-${slot}`)
      const checkboxParent = checkbox.parentElement
      if (checkboxParent) {
        checkboxParent.style.display =
          checkboxParent.style.display === "none" ? "block" : "none" // 切换上午时间段的显示状态
      }
    })
  } else {
    date.forEach((thisdate) => {
      const week_time_slots = document.querySelectorAll(`.week-time-slot-item`)
      const week_time_map = new Map()
      week_time_slots.forEach((item) => {
        const timeText = item.textContent.trim()
        week_time_map.set(timeText, item)
      })
      hidden_slots.forEach((slot) => {
        const this_slot = week_time_map.get(`${slot}`)
        if (this_slot) {
          this_slot.style.display =
            this_slot.style.display === "none" ? "block" : "none" // 切换上午时间段的显示状态
        }
      })
      hidden_slots.forEach((slot) => {
        const checkbox = document.getElementById(
          `time-slot-${thisdate}-${slot}`
        )
        const checkboxParent = checkbox.parentElement
        if (checkboxParent) {
          checkboxParent.style.display =
            checkboxParent.style.display === "none" ? "block" : "none" // 切换上午时间段的显示状态
        }
      })
    })
  }
}

function setupTimeSlotButton(config) {
  let buttons = config.buttonhide
  console.log("按钮配置:", buttons)

  const button_morning = document.querySelector(buttons.morning.selector)

  if (button_morning) {
    button_morning
    button_morning.addEventListener("click", (event) => {
      auto_hidden(event, buttons.morning.timeRange)
      console.log("上午", buttons.morning.getSlots)
      config.hidden(buttons.morning.getSlots, buttons.weekdates)
    })
    button_morning.click()
  }
  const button_night = document.querySelector(buttons.night.selector)
  if (button_night) {
    button_night.addEventListener("click", (event) => {
      auto_hidden(event, buttons.night.timeRange)
      console.log("晚上", buttons.night.getSlots)
      config.hidden(buttons.night.getSlots, buttons.weekdates)
    })
    button_night.click()
  }
}
setupTimeSlotButton(config)

function afterAuthCheck(result, config) {
  if (result.logged_in) {
    console.log("用户已登录:", result.user)
    const submitButton = document.querySelector("#submit-button")
    submitButton.classList.remove("hidden")
    const logoutButton = document.querySelector("#logout")
    logoutButton.classList.remove("hidden")

    const realName = result.user.name
    const color = result.user.color

    // 设置特定设备的提交处理器
    config.setupSubmitHandler(realName, color)

    document.querySelector(".show-name").textContent = `你好，${realName}`
    document.querySelector(".show-name").classList.remove("hidden")
  } else {
    console.log("用户未登录")
    document.querySelector("#login").classList.remove("hidden")
    document.querySelector("#register").classList.remove("hidden")

    time_slots.forEach((slot) => {
      const checkbox = document.getElementById(`time-slot-${slot}`)
      if (checkbox) {
        checkbox.disabled = true
        checkbox.parentElement.classList.add("no-login-slot")
      }
    })
  }
}

// 统一的初始化函数
async function initializeApp() {
  const isMobile = width < 768
  const config = isMobile ? deviceConfig.mobile : deviceConfig.desktop

  // 检查认证状态
  const authStatus = await checkAuthStatus()
  afterAuthCheck(authStatus, config)
}

document.querySelector("#login").addEventListener("click", function (event) {
  event.preventDefault() // 阻止默认链接行为
  const loginUrl = `pages/login.html`
  // 跳转到登录页面，新页面打开
  window.open(loginUrl, "_blank")
})

window.addEventListener("DOMContentLoaded", initializeApp)

document.querySelector("#register").addEventListener("click", function (event) {
  event.preventDefault() // 阻止默认链接行为
  const registerUrl = `pages/register.html`
  // 跳转到注册页面，新页面打开
  window.open(registerUrl, "_blank")
})

document.querySelector("#logout").addEventListener("click", function (event) {
  event.preventDefault() // 阻止默认链接行为
  logout()
    .then(() => {
      console.log("用户已退出登录")
      window.location.reload() // 刷新页面
    })
    .catch((error) => {
      console.error("退出登录失败:", error)
    })
})
