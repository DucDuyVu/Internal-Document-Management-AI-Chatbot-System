/**
 * register.js - IDMS Register Page (ĐÃ SỬA)
 * ============================================
 */

// ============================================
// DOM Elements
// ============================================

const form = document.getElementById("registerForm");
const btn = document.getElementById("submitBtn");

const errorBox = document.getElementById("errorMsg");
const errorText = document.getElementById("errorText");

const fullName = document.getElementById("fullName");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

const togglePassword = document.getElementById("togglePass");
const toggleConfirm = document.getElementById("toggleConfirmPass");

const passHint = document.getElementById("passHint");

// ============================================
// Show Message
// ============================================

function showMessage(message, success = false) {
    if (!errorBox || !errorText) {
        alert(message);
        return;
    }

    errorText.textContent = message;
    errorBox.classList.remove("show");
    errorBox.classList.remove("success");

    if (success) {
        errorBox.classList.add("success");
    }

    errorBox.classList.add("show");
}

function hideMessage() {
    if (!errorBox) return;
    errorBox.classList.remove("show");
    errorBox.classList.remove("success");
}

// ============================================
// Toggle Password Visibility
// ============================================

if (togglePassword && password) {
    togglePassword.onclick = () => {
        password.type = password.type === "password" ? "text" : "password";
        togglePassword.textContent = password.type === "password" ? "Hiện" : "Ẩn";
    };
}

if (toggleConfirm && confirmPassword) {
    toggleConfirm.onclick = () => {
        confirmPassword.type = confirmPassword.type === "password" ? "text" : "password";
        toggleConfirm.textContent = confirmPassword.type === "password" ? "Hiện" : "Ẩn";
    };
}

// ============================================
// Password Strength Check
// ============================================

if (password && passHint) {
    password.addEventListener("input", () => {
        const value = password.value;

        const strong =
            value.length >= 8 &&
            /[A-Za-z]/.test(value) &&
            /\d/.test(value);

        if (value === "") {
            passHint.className = "hint";
            passHint.textContent = "Tối thiểu 8 ký tự bao gồm chữ và số.";
        } else if (strong) {
            passHint.className = "hint ok";
            passHint.textContent = "✅ Mật khẩu đủ mạnh.";
        } else {
            passHint.className = "hint bad";
            passHint.textContent = "⚠️ Cần tối thiểu 8 ký tự gồm chữ và số.";
        }
    });
}

// ============================================
// Validate Form
// ============================================

function validateForm() {
    const name = fullName?.value?.trim() || '';
    const emailValue = email?.value?.trim() || '';
    const pass = password?.value || '';
    const confirm = confirmPassword?.value || '';

    // Validate full name
    if (!name) {
        showMessage("Vui lòng nhập họ và tên.");
        if (fullName) fullName.focus();
        return false;
    }

    if (name.length < 2) {
        showMessage("Họ và tên phải có ít nhất 2 ký tự.");
        if (fullName) fullName.focus();
        return false;
    }

    // Validate email
    if (!emailValue) {
        showMessage("Vui lòng nhập email.");
        if (email) email.focus();
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
        showMessage("Email không đúng định dạng.");
        if (email) email.focus();
        return false;
    }

    // Validate password
    if (!pass) {
        showMessage("Vui lòng nhập mật khẩu.");
        if (password) password.focus();
        return false;
    }

    if (pass.length < 8) {
        showMessage("Mật khẩu phải có ít nhất 8 ký tự.");
        if (password) password.focus();
        return false;
    }

    if (!/[A-Za-z]/.test(pass) || !/\d/.test(pass)) {
        showMessage("Mật khẩu phải bao gồm cả chữ và số.");
        if (password) password.focus();
        return false;
    }

    // Validate confirm password
    if (!confirm) {
        showMessage("Vui lòng xác nhận mật khẩu.");
        if (confirmPassword) confirmPassword.focus();
        return false;
    }

    if (pass !== confirm) {
        showMessage("Mật khẩu xác nhận không khớp.");
        if (confirmPassword) {
            confirmPassword.value = '';
            confirmPassword.focus();
        }
        return false;
    }

    return true;
}

// ============================================
// Submit Register
// ============================================

form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage();

    // Validate form
    if (!validateForm()) {
        return;
    }

    // Disable button
    if (btn) {
        btn.disabled = true;
        btn.classList.add("loading");
    }

    try {
        // Kiểm tra apiRequest có tồn tại không
        if (typeof apiRequest === 'undefined') {
            throw new Error("Hàm apiRequest() không tồn tại. Vui lòng kiểm tra auth.js");
        }

        // Gọi API đăng ký
        const data = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: {
                fullName: fullName.value.trim(),
                email: email.value.trim(),
                password: password.value,
                confirmPassword: confirmPassword.value
            }
        });

        // Đăng ký thành công
        showMessage(data.message || "🎉 Đăng ký thành công! Đang chuyển đến trang đăng nhập...", true);

        // Chuyển hướng sau 1.5s
        setTimeout(() => {
            window.location.href = "/login";
        }, 1500);

    } catch (error) {
        console.error("Register error:", error);
        showMessage(error.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove("loading");
        }
    }
});

// ============================================
// Xử lý phím Enter
// ============================================

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && form) {
        const activeElement = document.activeElement;
        // Chỉ submit nếu đang focus vào input trong form
        if (activeElement && form.contains(activeElement)) {
            e.preventDefault();
            form.dispatchEvent(new Event("submit"));
        }
    }
});

// ============================================
// Kiểm tra đã đăng nhập chưa
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    // Nếu đã đăng nhập, chuyển đến dashboard
    if (typeof isLoggedIn !== 'undefined' && isLoggedIn()) {
        const user = typeof getUser !== 'undefined' ? getUser() : null;
        if (user) {
            window.location.href = user.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard';
        }
    }
});

// ============================================
// EXPOSE GLOBAL FUNCTIONS
// ============================================

window.showMessage = showMessage;
window.hideMessage = hideMessage;