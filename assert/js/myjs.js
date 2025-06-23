let selectName;

function setCookie(name, value, days) {
  // 初始化 expires 变量，用于存储 cookie 的过期时间
  let expires = "";
  // 如果传入了 days 参数（即 cookie 的有效天数）
  if (days) {
    // 创建一个新的 Date 对象
    const date = new Date();
    // 设置 cookie 的过期时间，通过当前时间加上指定天数的毫秒数
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    // 将过期时间转换为 UTC 格式的字符串
    expires = "; expires=" + date.toUTCString();
  }
  // 设置 cookie，格式为 "key=value; expires=date; path=/"
  // (value || "") 确保即使 value 为空，也会设置一个空字符串
  // "path=/" 表示该 cookie 在整个网站下都可用
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  // 构造要查找的 cookie 名称字符串，例如 "selectedName="
  const nameEQ = name + "=";
  // 获取当前文档的所有 cookie，并用分号分割成数组
  const ca = document.cookie.split(";");
  // 遍历 cookie 数组
  for (let i = 0; i < ca.length; i++) {
    // 获取单个 cookie 字符串
    let c = ca[i];
    // 去除 cookie 字符串前面的空格
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    // 检查该 cookie 字符串是否以我们想查找的 nameEQ 开头
    if (c.indexOf(nameEQ) == 0) {
      // 如果是，则返回从 nameEQ 长度之后到字符串末尾的子字符串，即 cookie 的值
      return c.substring(nameEQ.length, c.length);
    }
  }
  // 如果遍历完所有 cookie 都没有找到，则返回 null
  return null;
}

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

    const savedName = getCookie("selectedName");
    if (savedName && data.names.includes(savedName)) {
      namesSelect.value = savedName;
      selectName = savedName;
      console.log("从cookie中加载的姓名:", selectName);
    }

    namesSelect.addEventListener("change", (event) => {
      selectName = event.target.value;
      setCookie("selectedName", selectName, 365);
      console.log("选中的名字:", selectName);
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
  return formatDate(tomorrow); // 格式化日期
}
const tomorrow = get_tomorrow_date();
console.log(tomorrow);
const selectedTimeSlots = []; // 用于存储选中的时间段

async function orderd_time(date) {
  try {
    const response = await fetch(`${host}/api/orderd?date=${date}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    Object.entries(data.bookings).forEach(([key, value]) => {
      console.log(`时间段: ${key}, 预约人: ${value}`);
      const checkbox = document.getElementById(`time-slot-${key}`);
      if (checkbox) {
        if (checkbox.parentElement) {
          checkbox.parentElement.classList.add('disabled-slot'); // 添加禁用样式
        }
        const slotLabel = checkbox.nextElementSibling;
        if (slotLabel) {
          slotLabel.innerHTML += `<br> 已被 ${value} 预约`; // 在标签后添加已预约信息
        }
      }
    });
  } catch (error) {
    console.error('获取已预约时间段时出错:', error);
  }
}

document.getElementById("appointment-date").value = tomorrow // 设置 input 的值为当前日期
let i = 0;
let timeSlots = document.getElementById("time-slot");
time_slots.forEach((slot) => {
  const div = document.createElement("div");
  div.className = "time-slot-item";

  const option = document.createElement("input");
  option.type = "checkbox";
  option.value = slot;
  option.className = "time-slot-option";
  option.id = "time-slot-" + slot; // 设置唯一的 ID
  option.name = "time-slot"; // 设置 name 属性，便于表单提交时获取选中的时间段
  option.checked = false; // 默认不选中

  // 添加选中事件监听器
  option.addEventListener('change', function(event) {
    const timeSlot = event.target.value;
    
    if (event.target.checked) {
      // 复选框被选中
      selectedTimeSlots.push(timeSlot);
      console.log(`选中时间段: ${timeSlot}`);
    } else {
      // 复选框被取消选中
      const index = selectedTimeSlots.indexOf(timeSlot);
      if (index > -1) {
        selectedTimeSlots.splice(index, 1);
      }
      console.log(`取消选中时间段: ${timeSlot}`);
    }
    
    console.log('当前选中的时间段:', selectedTimeSlots);
  });

  const label = document.createElement("label");
  label.htmlFor = option.id;
  label.textContent = slot;
  div.appendChild(option);
  div.appendChild(label);
  timeSlots.appendChild(div);

});

orderd_time(tomorrow); // 获取明天已预约的时间段

// 发送预约数据到后端的函数
async function submitAppointment() {
  const selectedDate = document.getElementById("appointment-date").value;
  
  // 数据验证
  if (!selectName) {
    alert("请选择预约人姓名！");
    return;
  }
  
  if (!selectedDate) {
    alert("请选择预约日期！");
    return;
  }
  
  if (selectedTimeSlots.length === 0) {
    alert("请至少选择一个时间段！");
    return;
  }
  
  try {
    // 一次性发送所有时间段
    const appointmentData = {
      system: 'a_device',  // 系统ID，根据需要修改
      date: selectedDate,
      slots: selectedTimeSlots,  // 发送所有选中的时间段
      name: selectName
    };
    
    console.log('发送的数据:', appointmentData);

    const response = await fetch(`${host}/api/info_save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData)
    });
    
    console.log('响应状态:', response.status);
    console.log('响应状态文本:', response.statusText);
    
    // 检查响应的Content-Type
    const contentType = response.headers.get('content-type');
    console.log('响应Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      // 如果不是JSON响应，获取文本内容进行调试
      const text = await response.text();
      console.error('收到非JSON响应:', text);
      alert('服务器响应格式错误，请检查后端服务是否正常运行');
      return;
    }
    
    const result = await response.json();
    
    if (response.ok) {
      console.log("预约已成功提交:", result);
      location.reload();
      
    } else {
      console.error("提交失败:", result);
    }
    
  } catch (error) {
    console.error("提交预约时出错:", error);
  }
}

const submitButton = document.getElementById("submit-button");
submitButton.addEventListener("click", () => {
  console.log("提交预约");
  console.log("选中的名字:", selectName);
  console.log("选中的日期:", document.getElementById("appointment-date").value);
  console.log("选中的时间段:", selectedTimeSlots);
  submitAppointment();
});


