// 登录功能
async function login(username, password) {
    try {
        const response = await fetch(`${host}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // 重要：包含 cookies
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('登录成功:', data.user);
            // 可以保存用户信息到内存或 localStorage（非敏感信息）
            localStorage.setItem('userInfo', JSON.stringify(data.user));
            return true;
        } else {
            console.log('登录失败:', data.message);
            return false;
        }
    } catch (error) {
        console.error('登录错误:', error);
        return false;
    }
}

// 注册功能
async function register(username, password, name) {
    try {
        const response = await fetch(`${host}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password, name })
        });
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('注册错误:', error);
        return { success: false, message: '注册失败' };
    }
}

// 登出功能
async function logout() {
    try {
        const response = await fetch('${host}/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.removeItem('userInfo');
            console.log('登出成功');
            // 重定向到登录页面
            window.location.href = '/login.html';
        }
        
    } catch (error) {
        console.error('登出错误:', error);
    }
}

// 发送需要认证的请求
async function fetchWithAuth(url, options = {}) {
    const config = {
        ...options,
        credentials: 'include', // 重要：自动包含 session cookie
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, config);
        
        if (response.status === 401) {
            console.log('登录已过期，请重新登录');
            localStorage.removeItem('userInfo');
            window.location.href = '/login.html';
            return null;
        }
        
        return response;
        
    } catch (error) {
        console.error('请求错误:', error);
        throw error;
    }
}

// 使用示例
async function getUserProfile() {
    try {
        const response = await fetchWithAuth(`${host}/api/user/profile`);
        if (response) {
            const data = await response.json();
            console.log('用户资料:', data);
            return data;
        }
    } catch (error) {
        console.error('获取用户资料失败:', error);
    }
}

async function getOrders() {
    try {
        const response = await fetchWithAuth(`${host}/api/orders`);
        if (response) {
            const data = await response.json();
            console.log('订单列表:', data);
            return data;
        }
    } catch (error) {
        console.error('获取订单失败:', error);
    }
}

document.querySelector('#register').addEventListener('click', function(event) {
    event.preventDefault(); // 阻止默认行为
    const username = document.querySelector('#username').value;
    const password = document.querySelector('#password').value;
    const name = document.querySelector('#name').value;

    if (username === '' || password === '' || name === '') {
        alert('Please fill in all fields.');
        return;
    }

    console.log('Registering user:', username, password, name);
    // 调用注册函数
    register(username,password,name)

    // Simulate a successful registration
    alert('Registration successful!');
    //返回上一页
    // window.location.href = '../index.html';
});