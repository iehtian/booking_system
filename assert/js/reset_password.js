import { sendResetCode, resetPassword } from "./user_manager.js"

const form = document.getElementById("reset-form")
const sendEmailBtn = document.getElementById("send-email-code")
const sendPhoneBtn = document.getElementById("send-phone-code")
const identifierInput = document.getElementById("user_identifier")

async function handleSendCode(method) {
  const identifier = identifierInput.value.trim()
  if (!identifier) {
    alert("请先输入账号（用户名/邮箱/手机）")
    return
  }

  // 简单的防抖/禁用按钮逻辑，防止重复点击
  const btn = method === "email" ? sendEmailBtn : sendPhoneBtn
  const originalText = btn.textContent
  btn.disabled = true
  btn.textContent = "发送中..."

  try {
    const res = await sendResetCode(identifier, method)
    if (res.success) {
      alert("验证码已发送，请查收")
    } else {
      alert(res.message || "发送失败，请稍后重试")
    }
  } catch (err) {
    console.error(err)
    alert("发送请求出错")
  } finally {
    btn.disabled = false
    btn.textContent = originalText
  }
}

sendEmailBtn.addEventListener("click", () => handleSendCode("email"))
sendPhoneBtn.addEventListener("click", () => handleSendCode("phone"))

form.addEventListener("submit", async (e) => {
  e.preventDefault()
  const identifier = identifierInput.value.trim()
  const code = document.getElementById("verification_code").value.trim()
  const newPassword = document.getElementById("new_password").value.trim()

  if (!identifier || !code || !newPassword) {
    alert("请填写完整信息")
    return
  }

  const submitBtn = document.getElementById("submit-reset")
  submitBtn.disabled = true
  submitBtn.textContent = "提交中..."

  try {
    const res = await resetPassword(identifier, code, newPassword)
    if (res.success) {
      alert("密码重置成功，请重新登录")
      window.location.href = "login.html"
    } else {
      alert(res.message || "重置失败，请检查验证码是否正确")
    }
  } catch (err) {
    console.error(err)
    alert("提交请求出错")
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = "提交"
  }
})
