// =========================
// Token Storage
// =========================

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

// =========================
// Lưu token
// =========================

function saveAccessToken(token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function saveRefreshToken(token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

// =========================
// Lấy token
// =========================

function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
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
// Xóa dữ liệu
// =========================

function clearAuth() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// =========================
// Logout
// =========================

async function logout() {

    const refreshToken = getRefreshToken();

    if (refreshToken) {

        try {

            await fetch("/api/auth/logout", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    refreshToken: refreshToken
                })

            });

        } catch (e) {

            console.error(e);

        }

    }

    clearAuth();

    window.location.href = "/login";
}

// =========================
// Refresh Access Token
// =========================

async function refreshAccessToken() {

    const refreshToken = getRefreshToken();

    if (!refreshToken) {

        logout();

        return false;
    }

    try {

        const response = await fetch("/api/auth/refresh-token", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                refreshToken: refreshToken
            })

        });

        if (!response.ok) {

            logout();

            return false;
        }

        const data = await response.json();

        saveAccessToken(data.accessToken);

        return true;

    } catch (error) {

        logout();

        return false;
    }
}