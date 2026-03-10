// 每个仪器可以定义用于 API 的 id 和时间段类型 slotType
// slotType 可选值：'half'（每 30 分钟）或 'hourly'（每小时）
const instruments_map = {
  细胞房: { id: "a_instrument", slotType: 0 },
  液相: { id: "b_instrument", slotType: 1 },
}

export { instruments_map }
