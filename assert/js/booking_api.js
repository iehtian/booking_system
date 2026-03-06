import { host } from "./config.js"
import axios from "axios"
async function getBookings(instrument, date) {
  try {
    const response = await axios.get(
      `${host}/api/bookings?instrument=${instrument}&date=${date}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    const data = response.data
    console.log("获取的预约数据:", data)

    return data.bookings || {}
  } catch (error) {
    console.error("获取已预约时间段时出错:", error)
  }
}

async function submitBookings(instrument, submitData) {
  const thisDate = submitData.date
  const slots = submitData.slots

  if (!thisDate || slots.length === 0) {
    alert("请先选择日期和时间段")
    return
  }

  try {
    const token = localStorage.getItem("access_token")
    if (!token) {
      alert("未登录，无法提交预约")
      return false
    }
    const targetData = {
      instrument: instrument,
      date: thisDate,
      slots: slots,
    }

    console.log("发送的数据:", targetData)

    // 使用 axios.post，第二个参数直接传对象
    const response = await axios.post(`${host}/api/info_save`, targetData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    // Axios 默认认为 2xx 状态码都是 ok 的
    // 结果就在 response.data 中
    if (response.status === 200 || response.status === 201) {
      return true
    }
  } catch (error) {
    // Axios 的错误处理更丰富
    // 如果服务器返回了 4xx/5xx 错误，会进入这里
    alert("提交预约失败，请重试")

    if (error.response) {
      // 请求已发出，服务器响应了状态码
      console.error(
        "提交失败 (状态码):",
        error.response.status,
        error.response.data
      )
    } else if (error.request) {
      // 请求已发出，但没收到响应（网络问题）
      console.error("网络异常，未收到响应:", error.request)
    } else {
      console.error("请求配置出错:", error.message)
    }

    return false
  }
}

async function cancelBookings(instrument, cancelData) {
  const thisDate = cancelData.date
  const slots = cancelData.slots

  if (!thisDate || slots.length === 0) {
    alert("请先选择日期和时间段")
    return
  }

  try {
    const token = localStorage.getItem("access_token")
    if (!token) {
      alert("未登录，无法提交预约")
      return false
    }
    const targetData = {
      instrument: instrument,
      date: thisDate,
      slots: slots,
    }

    console.log("发送的数据:", targetData)

    // 使用 axios.post，第二个参数直接传对象
    const response = await axios.post(
      `${host}/api/cancel_booking`,
      targetData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    // Axios 默认认为 2xx 状态码都是 ok 的
    // 结果就在 response.data 中
    if (response.status === 200 || response.status === 201) {
      return true
    }
  } catch (error) {
    // Axios 的错误处理更丰富
    // 如果服务器返回了 4xx/5xx 错误，会进入这里
    alert("取消预约失败，请重试")

    if (error.response) {
      // 请求已发出，服务器响应了状态码
      console.error(
        "取消失败 (状态码):",
        error.response.status,
        error.response.data
      )
    } else if (error.request) {
      // 请求已发出，但没收到响应（网络问题）
      console.error("网络异常，未收到响应:", error.request)
    } else {
      console.error("请求配置出错:", error.message)
    }

    return false
  }
}

export { getBookings, submitBookings, cancelBookings }
