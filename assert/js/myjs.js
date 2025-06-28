let selectName;

function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
}

fetch("./data/names.json")
  .then((response) => response.json())
  .then((data) => {
    console.log(data.names);
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
      method: "GET",
      headers: {
        "Content-Type": "application/json",
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
          checkbox.parentElement.classList.add("disabled-slot"); // 添加禁用样式
        }
        const slotLabel = checkbox.nextElementSibling;
        if (slotLabel) {
          slotLabel.innerHTML += `<br> 已被 ${value} 预约`; // 在标签后添加已预约信息
        }
      }
    });
  } catch (error) {
    console.error("获取已预约时间段时出错:", error);
  }
}

function addslot() {
  document.getElementById("appointment-date").value = tomorrow; // 设置 input 的值为当前日期
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
    option.addEventListener("change", function (event) {
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

      console.log("当前选中的时间段:", selectedTimeSlots);
    });

    const label = document.createElement("label");
    label.htmlFor = option.id;
    label.textContent = slot;
    div.appendChild(option);
    div.appendChild(label);
    timeSlots.appendChild(div);
  });
}

addslot(); // 初始化时间段

document
  .getElementById("appointment-date")
  .addEventListener("change", function (event) {
    const newDate = event.target.value;

    // 清除之前禁用的样式和提示
    document.querySelectorAll(".time-slot-item").forEach((item) => {
      item.classList.remove("disabled-slot");
      const label = item.querySelector("label");
      if (label) {
        // 移除“已被 XXX 预约”的文本
        const slotText = label.innerHTML.split("<br>")[0]; // 只保留时间段部分
        label.innerHTML = slotText;
      }
    });

    // 清空之前选中的时间段（如果你希望换日期时重置选择）
    selectedTimeSlots.length = 0;
    document.querySelectorAll(".time-slot-option").forEach((cb) => {
      cb.checked = false;
    });

    // 获取新的日期的预约信息
    orderd_time(newDate);
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
      system: "a_device", // 系统ID，根据需要修改
      date: selectedDate,
      slots: selectedTimeSlots, // 发送所有选中的时间段
      name: selectName,
    };

    console.log("发送的数据:", appointmentData);

    const response = await fetch(`${host}/api/info_save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointmentData),
    });

    console.log("响应状态:", response.status);
    console.log("响应状态文本:", response.statusText);

    // 检查响应的Content-Type
    const contentType = response.headers.get("content-type");
    console.log("响应Content-Type:", contentType);

    if (!contentType || !contentType.includes("application/json")) {
      // 如果不是JSON响应，获取文本内容进行调试
      const text = await response.text();
      console.error("收到非JSON响应:", text);
      alert("服务器响应格式错误，请检查后端服务是否正常运行");
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

document.querySelector('#appointment-date').addEventListener('click', function(event){
  //回调函数，打开日期选择器
  event.target.showPicker(); // 显示日期选择器
});

document.querySelector('#yestoday').addEventListener('click', function(event){
  event.preventDefault(); // 阻止默认链接行为
  const appointmentDate = document.getElementById("appointment-date");
  const currentDate = new Date(appointmentDate.value);
  currentDate.setDate(currentDate.getDate() - 1);
  appointmentDate.value = currentDate.toISOString().split("T")[0];
  // 触发日期变化事件
  appointmentDate.dispatchEvent(new Event("change"));
});

document.querySelector('#tomorrow').addEventListener('click', function(event){
  event.preventDefault(); // 阻止默认链接行为
  const appointmentDate = document.getElementById("appointment-date");
  const currentDate = new Date(appointmentDate.value);
  currentDate.setDate(currentDate.getDate() + 1);
  appointmentDate.value = currentDate.toISOString().split("T")[0];
  // 触发日期变化事件
  appointmentDate.dispatchEvent(new Event("change"));
});

let moring_clicked = false, night_clicked = false

document.querySelector('#morning').addEventListener('click', function(event){
  event.preventDefault(); // 阻止默认链接行为
  //点击该按钮将自动隐藏/显示上午的时间段
  const morningButton = this;
  moring_clicked = !moring_clicked; // 切换状态
  morningButton.value = moring_clicked ? "► 00:00-08:00" : "▼ 00:00-08:00"; // 更新按钮文本
  morningButton.style.backgroundColor = moring_clicked ? "#E0F2FE" : "#f1f5f9"; // 更新按钮背景色
  morningButton.style.border = moring_clicked ? "1px solid #0991B2" : "1px solid#d6dee7"; // 更新按钮边框

  const morningSlots = time_slots.slice(0, 16);
  morningSlots.forEach((slot) => {
    const checkbox = document.getElementById(`time-slot-${slot}`);
    const checkboxParent = checkbox.parentElement;
    if (checkboxParent) {
      checkboxParent.style.display = checkboxParent.style.display === "none" ? "block" : "none"; // 切换上午时间段的显示状态
    }
  });
});

document.querySelector('#night').addEventListener('click', function(event){
  event.preventDefault(); // 阻止默认链接行为
  //点击该按钮将自动隐藏/显示晚上
  const nightButton = this;
  night_clicked = !night_clicked // 切换状态
  nightButton.value = night_clicked ? "► 22:00-24:00" : "▼ 22:00-24:00" // 更新按钮文本
  nightButton.style.backgroundColor = night_clicked ? "#E0F2FE" : "#f1f5f9"; // 更新按钮背景色
  nightButton.style.border = night_clicked ? "1px solid #0991B2" : "1px solid#d6dee7"; // 更新按钮边框

  const morningSlots = time_slots.slice(-4);
  morningSlots.forEach((slot) => {
    const checkbox = document.getElementById(`time-slot-${slot}`)
    const checkboxParent = checkbox.parentElement;
    if (checkboxParent) {
      checkboxParent.style.display = checkboxParent.style.display === "none" ? "block" : "none"; // 切换上午时间段的显示状态
    }
  });
});

document.querySelector('#morning').click()
document.querySelector('#night').click()

document.querySelector('#register').addEventListener('click', function(event){
    event.preventDefault(); // 阻止默认链接行为
    const registerUrl = `pages/register.html`;
    // 跳转到注册页面，新页面打开
    window.open(registerUrl, '_blank');
  });

  
// 使用示例：等待认证检查完成后再执行其他代码
waitForAuthCheck().then((result) => {
    console.log('认证检查完成:', result.logged_in);
    if (result.logged_in) {
      console.log(document.querySelector('#submit-button'));
        document.querySelector('#submit-button').classList.remove('hidden'); // 显示提交按钮
    }
    else {
        console.log('用户未登录');
        document.querySelector('#login').classList.remove('hidden'); // 显示登录按钮
        document.querySelector('#register').classList.remove('hidden'); // 显示注册按钮
    }
});