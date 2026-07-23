/* ==========================================
   login.js - IDMS Login
   ========================================== */

// =========================
// DOM Elements
// =========================

const form = document.getElementById("loginForm");
const btn = document.getElementById("submitBtn");
const errorBox = document.getElementById("errorMsg");
const errorText = document.getElementById("errorText");
const email = document.getElementById("email");
const password = document.getElementById("password");
const toggle = document.getElementById("togglePass");

// =========================
// Hiển thị lỗi
// =========================

function showMessage(message) {
    if (!errorBox || !errorText) {
        alert(message);
        return;
    }
    errorText.textContent = message;
    errorBox.classList.add("show");
}

function hideMessage() {
    if (!errorBox) return;
    errorBox.classList.remove("show");
}

// =========================
// Hiện / Ẩn mật khẩu
// =========================

if (toggle && password) {
    toggle.onclick = () => {
        password.type = password.type === "password" ? "text" : "password";
        toggle.textContent = password.type === "password" ? "Hiện" : "Ẩn";
    };
}

// =========================
// Kiểm tra đã đăng nhập chưa
// =========================

document.addEventListener("DOMContentLoaded", () => {
    // Sử dụng hàm từ auth.js
    if (typeof isLoggedIn !== 'undefined' && isLoggedIn()) {
        const user = typeof getUser !== 'undefined' ? getUser() : null;
        if (user) {
            redirectByRole(user.role);
        }
    }
});

// =========================
// Chuyển hướng theo role
// =========================

function redirectByRole(role) {
    if (role === 'ADMIN') {
        window.location.href = "/admin/dashboard";
    } else {
        window.location.href = "/user/dashboard";
    }
}

// =========================
// Submit Login
// =========================

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideMessage();

        // Validate
        const emailValue = email?.value?.trim() || "";
        const passwordValue = password?.value || "";

        if (!emailValue) {
            showMessage("Vui lòng nhập email.");
            if (email) email.focus();
            return;
        }

        if (!passwordValue) {
            showMessage("Vui lòng nhập mật khẩu.");
            if (password) password.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue)) {
            showMessage("Email không đúng định dạng.");
            if (email) email.focus();
            return;
        }

        // Disable button
        if (btn) {
            btn.disabled = true;
            btn.classList.add("loading");
        }

        try {
            // Sử dụng hàm login từ auth.js
            if (typeof login === 'undefined') {
                throw new Error("Hàm login() không tồn tại. Vui lòng kiểm tra auth.js");
            }

            const user = await login(emailValue, passwordValue);

            // Cập nhật UI
            if (typeof updateUserUI !== 'undefined') {
                updateUserUI(user);
            }

            // Chuyển hướng
            redirectByRole(user.role);

        } catch (err) {
            console.error("Login error:", err);
            showMessage(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        } finally {
            if (btn) {
                btn.classList.remove("loading");
                btn.disabled = false;
            }
        }
    });
}

// =========================
// Xử lý phím Enter
// =========================

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && form) {
        form.dispatchEvent(new Event("submit"));
    }
});