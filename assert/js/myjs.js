fetch("./data/names.json")
  .then((response) => response.json())
  .then((data) => {
    console.log(data.names); // ["田浩", "陈莹"]
    const namesSelect = document.getElementById("names");
    data.names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      namesSelect.appendChild(option);
    });
  })
  .catch((error) => {
    console.error("获取数据失败:", error);
  });

function generateTimeIntervalsSimple() {
  const intervals = [];

  for (let i = 0; i <= 48; i++) {
    const totalMinutes = i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const timeStr = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
    intervals.push(timeStr);
  }

  const timeSlots = [];
  // 循环到倒数第二个元素，以防止访问越界
  for (let i = 0; i < intervals.length - 1; i++) {
    timeSlots.push(intervals[i] + "-" + intervals[i + 1]);
  }
  return timeSlots;
}
const time_slots = generateTimeIntervalsSimple();
console.log(generateTimeIntervalsSimple()); // 输出时间间隔数组

// 格式化为 YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
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

document.getElementById("appointment-date").value = formatDate(tomorrow); // 设置 input 的值为当前日期
let i = 0;
let timeSlots = document.getElementById("time-slot");
console.log(timeSlots); // 输出 timeSlots 元素
time_slots.forEach((slot) => {
  const div = document.createElement("div");
  div.className = "time-slot-item";
  const option = document.createElement("input");
  option.type = "checkbox";
  option.value = slot;
  option.className = "time-slot-option";
  option.id = "time-slot-" + i++;
  const label = document.createElement("label");
  label.htmlFor = option.id;
  label.textContent = slot;
  div.appendChild(option);
  div.appendChild(label);
  timeSlots.appendChild(div);
});
