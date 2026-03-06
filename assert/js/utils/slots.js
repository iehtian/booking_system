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

function generateTimeIntervalsSimple(slices = 48) {
  const intervals = []
  for (let i = 0; i <= slices; i++) {
    const totalMinutes = Math.round((i * 24 * 60) / slices)
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

function fmt(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export { mergeBookings,generateTimeIntervalsSimple,processSchedule,fmt }
