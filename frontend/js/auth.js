// auth.js - Auth form handlers for login, register, forgot/reset password

async function registerUser(email, username, password) {
    const data = await API.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password })
    }, false);
    return data;
}

async function loginUser(email, password) {
    const data = await API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    }, false);
    
    if (data && data.token) {
        API.setToken(data.token);
        API.setUser(data.username || email);
    }
    return data;
}

async function requestPasswordReset(email) {
    return await API.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
    }, false);
}

async function confirmPasswordReset(token, newPassword) {
    return await API.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
    }, false);
}

function handleLogout() {
    API.removeToken();
    window.location.href = getPagePath('Login.html');
}
