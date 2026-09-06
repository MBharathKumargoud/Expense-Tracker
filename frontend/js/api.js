const API_BASE_URL = 'https://expensetracker-production-8cf8.up.railway.app/api';
const API = {
    getToken() {
        return localStorage.getItem('jwt_token');
    },

    setToken(token) {
        localStorage.setItem('jwt_token', token);
    },

    removeToken() {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('currentUser');
    },

    getUser() {
        return localStorage.getItem('currentUser');
    },

    setUser(username) {
        localStorage.setItem('currentUser', username);
    },

    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return headers;
    },

    async request(endpoint, options = {}, includeAuth = true) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = this.getHeaders(includeAuth);

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401 || response.status === 403) {
                if (includeAuth && this.getToken()) {
                    this.removeToken();
                    alert('Session expired. Please login again.');
                    window.location.href = getPagePath('Login.html');
                    return null;
                }
            }

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const errorMessage = (data && data.message) ? data.message : (data || 'Request failed');
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }
};

function getPagePath(pageName) {
    if (window.location.pathname.includes('/pages/')) {
        return pageName;
    }
    return `pages/${pageName}`;
}

function checkAuthGuard() {
    const token = API.getToken();
    if (!token) {
        window.location.href = getPagePath('Login.html');
    }
}
