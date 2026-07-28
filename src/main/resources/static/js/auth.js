/* ==========================================
   auth.js
   Đăng nhập, JWT, refresh token
   Quản lý Authentication + JWT
   ========================================== */

// =========================
// Storage Keys
// =========================

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

// =========================
// Access Token
// =========================

function saveAccessToken(token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// =========================
// Refresh Token
// =========================

function saveRefreshToken(token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// =========================
// User
// =========================

function saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

// =========================
// Authentication
// =========================

function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return false;
        return Date.now() >= payload.exp * 1000;
    } catch (e) {
        return true;
    }
}

function isLoggedIn() {
    const token = getAccessToken();
    if (!token) return false;
    if (isTokenExpired(token)) {
        clearAuth();
        return false;
    }
    return true;
}

function clearAuth() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// =========================
// Kiểm tra đăng nhập + Role
// =========================

function checkAuthentication(requiredRole = null) {

    const token = getAccessToken();

    if (!token) {
        window.location.href = "/login";
        return false;
    }

    const user = getUser();

    if (!user) {
        clearAuth();
        window.location.href = "/login";
        return false;
    }

    if (requiredRole && user.role !== requiredRole) {
        window.location.href = "/dashboard";
        return false;
    }

    return true;
}

// =========================
// Logout
// =========================

async function logout() {

    const refreshToken = getRefreshToken();

    try {

        if (refreshToken) {

            await fetch(`${API_BASE}/api/auth/logout`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    refreshToken: refreshToken
                })

            });

        }

    } catch (error) {

        console.error("Logout error:", error);

    } finally {

        clearAuth();

        window.location.href = "/login";

    }

}

// =========================
// Refresh Token
// =========================

async function refreshAccessToken() {

    const refreshToken = getRefreshToken();

    if (!refreshToken) {

        clearAuth();

        window.location.href = "/login";

        return false;
    }

    try {

        const response = await fetch(`${API_BASE}/api/auth/refresh-token`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                refreshToken: refreshToken
            })

        });

        if (!response.ok) {

            clearAuth();

            window.location.href = "/login";

            return false;
        }

        const data = await response.json();

        saveAccessToken(data.accessToken);

        if (data.refreshToken) {
            saveRefreshToken(data.refreshToken);
        }

        return true;

    } catch (error) {

        console.error("Refresh token error:", error);

        clearAuth();

        window.location.href = "/login";

        return false;
    }

}

// =========================
// API Request Wrapper
// =========================

async function apiRequest(url, options = {}) {

    const token = getAccessToken();

    let body = options.body;

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    // Không thêm Content-Type nếu upload file
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
         if (body && typeof body === "object") {
                    body = JSON.stringify(body);
                }
    }

    let response = await fetch(`${API_BASE}${url}`, {
        ...options,
        body,
        headers
    });

    // Access Token hết hạn
    if (response.status === 401) {

        const refreshed = await refreshAccessToken();

        if (!refreshed) {
            throw new Error("Phiên đăng nhập đã hết hạn");
        }

        headers.Authorization = `Bearer ${getAccessToken()}`;

        response = await fetch(`${API_BASE}${url}`, {
            ...options,
            body,
            headers
        });
    }

    if (!response.ok) {

        let errorMessage = "Có lỗi xảy ra";

        try {
            const rawText = await response.text();
            console.error(`[API Error] Status: ${response.status} | URL: ${url} | Body: ${rawText}`);
            // Thử parse JSON từ raw text
            const parsed = JSON.parse(rawText);
            errorMessage = parsed.message || errorMessage;
        } catch (e) {
            // Không có body JSON hoặc không parse được
        }

        throw new Error(errorMessage);
    }

    // Response không có body (204 No Content)
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("Content-Type");

    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }

    return response.text();
}


async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Đăng nhập thất bại.");
        }

        // Kiểm tra dữ liệu trả về
        if (!data.accessToken) {
            throw new Error("Không nhận được access token");
        }

        // Lưu tokens
        saveAccessToken(data.accessToken);
        if (data.refreshToken) {
            saveRefreshToken(data.refreshToken);
        }

        const user = {
            id: data.userId || data.id,
            username: data.username || data.email,
            fullName: data.fullName || data.fullname || data.name || "User",
            email: data.email,
            role: data.role || "USER",
            departmentId: data.departmentId,
            departmentName: data.departmentName
        };

        saveUser(user);
        return user;

    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
}