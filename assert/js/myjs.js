fetch('/api/names')
  .then((response) => response.json())
  .then((data) => {
    console.log(data.names); // ["田浩", "陈莹"]
  })
  .catch((error) => {
    console.error("获取数据失败:", error);
  });

  let today = new Date().toISOString().split('T')[0]
  let day = +today.slice(-2)
  day++
  today = today.slice(0, -2) + day

  document.getElementById('appointment_date').value = today; // 设置 input 的值为当前日期

fetch('/api/time_slots')
.then((response) => response.json())
.then((data) => {
    console.log(data.time_slots); // 输出时间段数据
     timeSlots = document.getElementById('time_slot')
     console.log(timeSlots) // 输出 timeSlots 元素
     var i = 0
    data.time_slots.forEach((slot) => {
        const option = document.createElement('input');
        option.type = 'button';
        option.value = slot.start + '-' + slot.end;
        option.textContent = slot.start + ' - ' + slot.end;
        option.className = 'time-slot-option';
        option.id = 'time_slot_' + i++;
        timeSlots.appendChild(option);
    });
})
