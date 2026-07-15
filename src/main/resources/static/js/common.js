/* ==========================================
   common.js
   IDMS Common Utilities
   ========================================== */

// ==========================================
// API
// ==========================================

const API_BASE = "http://localhost:8080";

// ==========================================
// Debounce
// ==========================================

function debounce(func, delay = 300) {

    let timer;

    return function (...args) {

        clearTimeout(timer);

        timer = setTimeout(() => {

            func.apply(this, args);

        }, delay);

    };

}

// ==========================================
// Date Format
// ==========================================

function formatDate(date) {

    if (!date) return "—";

    return new Date(date).toLocaleString("vi-VN", {

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit"

    });

}

// ==========================================
// Number Format
// ==========================================

function formatNumber(number) {

    if (number == null) return "0";

    return new Intl.NumberFormat("vi-VN").format(number);

}

// ==========================================
// File Size
// ==========================================

function formatFileSize(bytes) {

    if (!bytes) return "0 B";

    const sizes = ["B", "KB", "MB", "GB"];

    let i = 0;

    while (bytes >= 1024 && i < sizes.length - 1) {

        bytes /= 1024;

        i++;

    }

    return bytes.toFixed(2) + " " + sizes[i];

}

// ==========================================
// File Icon
// ==========================================

function getFileIcon(type) {

    if (!type) return "📄";

    type = type.toLowerCase();

    switch (type) {

        case "pdf":
            return "📕";

        case "doc":
        case "docx":
            return "📘";

        case "xls":
        case "xlsx":
            return "📗";

        case "ppt":
        case "pptx":
            return "📙";

        case "txt":
            return "📄";

        default:
            return "📁";
    }

}

// ==========================================
// Status
// ==========================================

function getStatusClass(status) {

    switch (status) {

        case "COMPLETED":
            return "completed";

        case "PROCESSING":
            return "processing";

        case "FAILED":
            return "failed";

        case "PENDING":
            return "pending";

        default:
            return "";
    }

}

function getStatusLabel(status) {

    switch (status) {

        case "COMPLETED":
            return "Hoàn thành";

        case "PROCESSING":
            return "Đang xử lý";

        case "FAILED":
            return "Thất bại";

        case "PENDING":
            return "Đang chờ";

        default:
            return status;
    }

}

// ==========================================
// Toast
// ==========================================

function showToast(message, type = "success") {

    if (window.Toastify) {

        Toastify({

            text: message,

            duration: 3000,

            gravity: "top",

            position: "right",

            style: {

                background: type === "success"
                    ? "#10b981"
                    : type === "error"
                        ? "#ef4444"
                        : type === "warning"
                            ? "#f59e0b"
                            : "#3b82f6"

            }

        }).showToast();

        return;
    }

    alert(message);

}

// ==========================================
// Modal
// ==========================================

function openModal(id) {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.add("show");

}

function closeModal(id) {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.remove("show");

}

// ==========================================
// Switch Tab
// ==========================================

function switchTab(tabId, menuItem = null) {

    document.querySelectorAll(".tab-content").forEach(tab => {

        tab.classList.remove("active");

    });

    const current = document.getElementById(tabId);

    if (current) {

        current.classList.add("active");

    }

    if (menuItem) {

        document.querySelectorAll("[data-tab]").forEach(item => {

            item.classList.remove("active");

        });

        menuItem.classList.add("active");

    }

}

// ==========================================
// Update User UI
// ==========================================

function updateUserUI(user) {

    if (!user) return;

    const name = document.getElementById("userName");

    if (name) {

        name.textContent = user.fullName;

    }

    const avatar = document.getElementById("userAvatar");

    if (avatar) {

        avatar.textContent =
            (user.fullName || "U").charAt(0).toUpperCase();

    }

}

// ==========================================
// Confirm
// ==========================================

function confirmDelete(message = "Bạn có chắc chắn?") {

    return confirm(message);

}

// ==========================================
// Loading
// ==========================================

function showLoading() {

    const loading = document.getElementById("loading");

    if (loading) {

        loading.style.display = "flex";

    }

}

function hideLoading() {

    const loading = document.getElementById("loading");

    if (loading) {

        loading.style.display = "none";

    }

}

// ==========================================
// Escape HTML
// ==========================================

function escapeHtml(text) {

    if (!text) return "";

    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}