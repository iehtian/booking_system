let selectName;

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

const selectedTimeSlots = []; // 用于存储选中的时间段

function getCurrentDateISO() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTimeSlotIndex() {
  const now = new Date();
  const hours = now.getHours();   // 0 ~ 23
  const minutes = now.getMinutes(); // 0 ~ 59

  const totalMinutes = hours * 60 + minutes;
  const slotIndex = Math.floor(totalMinutes / 30); // 每30分钟为1个slot

  return slotIndex; // 结果是 0 ~ 47
}


function disableSlot(slot, reasonText) {
  const checkbox = document.getElementById(`time-slot-${slot}`);
  if (checkbox) {
    checkbox.disabled = true;
    if (checkbox.parentElement) {
      checkbox.parentElement.classList.add("disabled-slot");
    }
    const slotLabel = checkbox.nextElementSibling;
    if (reasonText && slotLabel && !slotLabel.innerHTML.includes(reasonText)) {
      slotLabel.innerHTML += `<br> ${reasonText}`;
    }
  }
}

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
  document.getElementById("appointment-date").value = getCurrentDateISO(); // 设置 input 的值为当前日期
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
    if (newDate < getCurrentDateISO()) {
      // 日期已过
      time_slots.forEach((slot) => disableSlot(slot));
    } else if (newDate === getCurrentDateISO()) {
      // 是今天，禁用当前时间段之前的
      const currentSlotIndex = getCurrentTimeSlotIndex();
      for (let i = 0; i < currentSlotIndex; i++) {
        disableSlot(time_slots[i]);
      }
    }
    orderd_time(newDate);
    // 现在的时间以后的时间段禁止预约，包括对日期的对比和日期修改后的变化
  });

    document.getElementById("appointment-date").dispatchEvent(new Event("change")); // 触发日期变化事件
// 发送预约数据到后端的函数
async function submitAppointment() {
  const selectedDate = document.getElementById("appointment-date").value;

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

document.querySelector('#login').addEventListener('click', function(event){
    event.preventDefault(); // 阻止默认链接行为
    const loginUrl = `pages/login.html`;
    // 跳转到登录页面，新页面打开
    window.open(loginUrl, '_blank');
  });

document.querySelector('#register').addEventListener('click', function(event){
    event.preventDefault(); // 阻止默认链接行为
    const registerUrl = `pages/register.html`;
    // 跳转到注册页面，新页面打开
    window.open(registerUrl, '_blank');
  });

  
// 使用示例：等待认证检查完成后再执行其他代码
waitForAuthCheck().then((result) => {
    console.log('认证检查完成:', result);
    if (result.logged_in) {
            const submitButton = document.querySelector('#submit-button');
        submitButton.classList.remove('hidden'); // 显示提交按钮
        selectName = result.user.name; // 获取用户姓名
        submitButton.addEventListener("click", () => {
          console.log("提交预约");
          console.log("选中的名字:", selectName);
          console.log("选中的日期:", document.getElementById("appointment-date").value);
          console.log("选中的时间段:", selectedTimeSlots);
          submitAppointment();
});
        document.querySelector('.show-name').textContent = `你好，${selectName}`; // 显示用户姓名
        document.querySelector('.show-name').classList.remove('hidden'); // 显示用户姓名
    }
    else {
        console.log('用户未登录');
        document.querySelector('#login').classList.remove('hidden'); // 显示登录按钮
        document.querySelector('#register').classList.remove('hidden'); // 显示注册按钮
    }
});