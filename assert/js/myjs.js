fetch('./data/names.json')
  .then((response) => response.json())
  .then((data) => {
    console.log(data.names); // ["田浩", "陈莹"]
    const namesSelect = document.getElementById('names');
    data.names.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      namesSelect.appendChild(option);
    });
  })
  .catch((error) => {
    console.error("获取数据失败:", error);
  });


// 格式化为 YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function get_tomorrow_date() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  formatDate(tomorrow); // 格式化日期
  return tomorrow;
}
const tomorrow = get_tomorrow_date();
console.log(formatDate(tomorrow)); // 输出明天的日期（YYYY-MM-DD）

document.getElementById('appointment-date').value = formatDate(tomorrow); // 设置 input 的值为当前日期

fetch('https://order.iehtian.top/api/time_slots')
.then((response) => response.json())
.then((data) => {
    console.log(data.time_slots) // 输出时间段数据
     timeSlots = document.getElementById('time-slot')
     console.log(timeSlots) // 输出 timeSlots 元素
     let i = 0
    data.time_slots.forEach((slot) => {
        const div = document.createElement('div')
        div.className = 'time-slot-item'
        const option = document.createElement('input')
        option.type = 'checkbox'
        option.value = slot.display
        option.className = 'time-slot-option'
        option.id = 'time-slot-' + i++
        const label = document.createElement('label')
        label.htmlFor = option.id
        label.textContent = slot.display
        div.appendChild(option)
        div.appendChild(label)
        timeSlots.appendChild(div)
    });
})
