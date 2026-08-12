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

function formatDate(dateString) {
    if (!dateString) return "—";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} · ${hours}:${minutes}`;
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
    if (!type) return '<i class="fa-solid fa-file-lines"></i>';
    type = type.toLowerCase();
    switch (type) {
        case "pdf":
            return '<i class="fa-solid fa-file-pdf"></i>';
        case "doc":
        case "docx":
            return '<i class="fa-solid fa-file-word"></i>';
        case "xls":
        case "xlsx":
            return '<i class="fa-solid fa-file-excel"></i>';
        case "ppt":
        case "pptx":
            return '<i class="fa-solid fa-file-powerpoint"></i>';
        case "txt":
            return '<i class="fa-solid fa-file-lines"></i>';
        default:
            return '<i class="fa-solid fa-file"></i>';
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

            offset: {
                y: 75 // Đẩy toast xuống để không đè lên thanh navbar (thường cao ~70px)
            },

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
    // Known tab IDs across both User and Admin dashboards
    const knownTabs = ['tabHome', 'tabDocuments', 'tabChat', 'tabSearch', 'tabProfile', 
                       'tabOverview', 'tabUsers', 'tabDepartments', 'tabPermissions', 
                       'tabUpload', 'tabLogs', 'tabManager', 'tabEmployees', 'tabReports', 'tabSettings'];

    // Hide all known tabs
    knownTabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.classList.remove('active');
        }
    });

    // Support legacy .tab-content logic if any
    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove("active");
    });

    // Show the target tab
    const current = document.getElementById(tabId);
    if (current) {
        current.style.display = 'block';
        current.classList.add("active");
    }

    // Update active class on sidebar/menu
    if (menuItem) {
        document.querySelectorAll("[data-tab]").forEach(item => {
            item.classList.remove("active");
        });
        menuItem.classList.add("active");
    } else {
        // If menuItem is null (e.g. from topbar click), try to find the corresponding sidebar item
        document.querySelectorAll("[data-tab]").forEach(item => {
            item.classList.remove("active");
            if (item.getAttribute("data-tab") === tabId) {
                item.classList.add("active");
            }
        });
    }
}

// ==========================================
// Update User UI
// ==========================================

function updateUserUI(user) {
    if (!user) return;

    const shortName = (user.fullName || "U").charAt(0).toUpperCase();
    const displayName = user.fullName || "Người dùng";

    // Update Topbar
    const topName = document.getElementById("fullName");
    if (topName) topName.textContent = displayName;
    const topUserFullName = document.getElementById("userFullName");
    if (topUserFullName) topUserFullName.textContent = displayName;

    const topAvatar = document.getElementById("userAvatar");
    if (topAvatar) {
        if (user.avatarUrl) {
            topAvatar.innerHTML = `<img src="${user.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            topAvatar.textContent = shortName;
        }
    }

    // Update Dropdown Data
    const dropdownUserName = document.getElementById("dropdownUserName");
    if (dropdownUserName) dropdownUserName.textContent = displayName;
    
    const dropdownUserEmail = document.getElementById("dropdownUserEmail");
    if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || user.username || "Chưa cập nhật email";

    // Update Sidebar
    const sideName = document.getElementById("sidebarName");
    if (sideName) sideName.textContent = displayName;

    const sideAvatar = document.getElementById("sidebarAvatar");
    if (sideAvatar) {
        if (user.avatarUrl) {
            sideAvatar.innerHTML = `<img src="${user.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            sideAvatar.textContent = shortName;
        }
    }
    
    const sideDept = document.getElementById("sidebarDept");
    const topRoleBadge = document.getElementById("topRoleBadge");
    
    if (user.role === 'ADMIN' || user.role === 'Quản trị viên' || user.role === 'ROLE_ADMIN') {
        if (sideDept) sideDept.textContent = 'Quản trị viên';
        if (topRoleBadge) {
            topRoleBadge.textContent = 'Quản trị viên';
            topRoleBadge.className = 'role-badge admin';
        }
    } else if (user.role === 'MANAGER' || user.role === 'Quản lý' || user.role === 'Trưởng phòng' || user.role === 'ROLE_MANAGER') {
        if (sideDept) sideDept.textContent = 'Quản lý';
        if (topRoleBadge) {
            topRoleBadge.textContent = 'QUẢN LÝ';
            topRoleBadge.className = 'role-badge manager';
        }
    } else {
        if (sideDept) sideDept.textContent = 'Nhân viên';
        if (topRoleBadge) {
            topRoleBadge.textContent = 'NHÂN VIÊN';
            topRoleBadge.className = 'role-badge user';
        }
    }

    // Update Welcome Banner (User Dashboard)
    const welcomeName = document.getElementById("welcomeName");
    if (welcomeName) welcomeName.textContent = displayName;

    // Update Avatar Preview in Profile Form
    const previewImg = document.getElementById('avatarPreviewImg');
    const previewInitials = document.getElementById('avatarPreviewInitials');
    if (previewImg && previewInitials) {
        if (user.avatarUrl) {
            previewImg.src = user.avatarUrl;
            previewImg.style.display = 'block';
            previewInitials.style.display = 'none';
        } else {
            previewImg.style.display = 'none';
            previewInitials.textContent = shortName;
            previewInitials.style.display = 'block';
        }
    }
}

window.previewAvatar = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Chỉ hỗ trợ định dạng ảnh JPG, PNG hoặc WEBP');
        event.target.value = '';
        return;
    }
    
    // Validate size (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh tối đa là 5MB');
        event.target.value = '';
        return;
    }

    const previewImg = document.getElementById('avatarPreviewImg');
    const previewInitials = document.getElementById('avatarPreviewInitials');
    
    if (previewImg && previewInitials) {
        previewImg.src = URL.createObjectURL(file);
        previewImg.style.display = 'block';
        previewInitials.style.display = 'none';
    }
};

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
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

// ==========================================
// GLOBAL SEARCH (OMNI-SEARCH)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('globalSearchInput');
    const searchDropdown = document.getElementById('globalSearchDropdown');
    const searchResults = document.getElementById('globalSearchResults');

    if (!searchInput || !searchDropdown || !searchResults) return;

    // Hotkey Cmd+K / Ctrl+K
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.style.display = 'none';
        }
    });

    // Input handler
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            await performGlobalSearch(query);
            searchDropdown.style.display = 'block';
        } else {
            searchDropdown.style.display = 'none';
        }
    }, 300));
    // Focus handler
    searchInput.addEventListener('focus', async () => {
        const query = searchInput.value.trim();
        if (query.length > 0) {
            await performGlobalSearch(query);
            searchDropdown.style.display = 'block';
        }
    });

    async function performGlobalSearch(query) {
        if (!query) return;
        
        let html = '';
        try {
            if (typeof apiRequest === 'undefined') {
                throw new Error("Hàm apiRequest không tồn tại, vui lòng đảm bảo file js đã được nhúng đúng.");
            }

            const response = await apiRequest(`/api/search?q=${encodeURIComponent(query)}`);
            
            // 1. Nhóm Tài liệu
            html += '<div class="search-group-title">TÀI LIỆU</div>';
            if (response && response.documents && response.documents.length > 0) {
                response.documents.forEach(doc => {
                    html += `
                    <a href="#" class="search-result-item" onclick="event.preventDefault(); openDocumentDetail(${doc.id}); document.getElementById('globalSearchDropdown').style.display='none';">
                        <div class="search-result-icon" style="color:${doc.color}; background:${doc.bg};"><i class="fa-solid ${doc.icon}"></i></div>
                        <div class="search-result-info">
                            <span class="search-result-title">${escapeHtml(doc.title)}</span>
                            <span class="search-result-meta">${escapeHtml(doc.meta)}</span>
                        </div>
                    </a>`;
                });
            } else {
                html += `<div style="padding:12px 16px; color:var(--text-muted); font-size:0.85rem;">Không tìm thấy tài liệu phù hợp.</div>`;
            }

            // 2. Nhóm Người dùng
            html += '<div class="search-group-title">NGƯỜI DÙNG</div>';
            if (response && response.users && response.users.length > 0) {
                response.users.forEach(user => {
                    html += `
                    <a href="#" class="search-result-item" onclick="openUserProfile(${user.id}); document.getElementById('globalSearchDropdown').style.display='none';">
                        <div class="search-result-icon" style="color:${user.color}; background:${user.bg};">
                            ${user.avatarUrl 
                                ? `<img src="${user.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
                                : `<i class="fa-solid ${user.icon}"></i>`}
                        </div>
                        <div class="search-result-info">
                            <span class="search-result-title">${escapeHtml(user.title)}</span>
                            <span class="search-result-meta">${escapeHtml(user.meta)}</span>
                        </div>
                    </a>`;
                });
            } else {
                html += `<div style="padding:12px 16px; color:var(--text-muted); font-size:0.85rem;">Không tìm thấy người dùng phù hợp.</div>`;
            }
        } catch (error) {
            console.error("Lỗi khi tìm kiếm:", error);
            html = `<div style="padding:12px 16px; color:#ef4444; font-size:0.85rem;">Lỗi kết nối. Vui lòng thử lại.</div>`;
        }

        searchResults.innerHTML = html;
    }
});

// ==========================================
// USER PROFILE MODAL
// ==========================================
async function openUserProfile(userId) {
    try {
        const profile = await apiRequest(`/api/users/${userId}/profile-details`);
        if (!profile) return;
        renderUserProfileModal(profile);
    } catch (error) {
        console.error("Lỗi lấy thông tin profile:", error);
        alert("Không thể lấy thông tin người dùng.");
    }
}

function renderUserProfileModal(profile) {
    // Remove existing modal if any
    const existing = document.getElementById('userProfileViewModal');
    if (existing) existing.remove();

    // Create container
    const modalHTML = `
    <div class="modal-overlay" id="userProfileViewModal" style="display: flex; z-index: 10000; justify-content: center; align-items: flex-start; padding-top: 5vh; overflow-y: auto; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5);">
        <div class="modal-content" style="width: 800px; max-width: 95vw; background: var(--bg-white, #ffffff); box-shadow: var(--shadow-xl, 0 20px 25px rgba(0,0,0,0.1)); color: var(--text-primary, #111827); border-radius: 12px; padding: 24px; position: relative;">
            <button class="modal-close" onclick="document.getElementById('userProfileViewModal').remove()" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">✕</button>
            
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 70px; height: 70px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 600; overflow: hidden; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${profile.avatarUrl && !profile.avatarUrl.includes('api.dicebear.com') ? `<img src="${profile.avatarUrl}" style="width:100%; height:100%; object-fit:cover;">` : (profile.fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h2 style="margin: 0; font-size: 1.25rem;">${escapeHtml(profile.fullName)}</h2>
                            <span style="background: #4f46e5; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; letter-spacing: 0.5px;">${escapeHtml(profile.role)}</span>
                        </div>
                        <div style="margin-top: 4px; font-size: 0.85rem; color: ${profile.active ? '#10b981' : '#ef4444'}; font-weight: 500;">
                            ${profile.active ? 'Đang hoạt động' : 'Đã khóa'}
                        </div>
                    </div>
                </div>
                ${profile.canEdit ? `
                <div style="display: flex; gap: 10px;">
                    <button class="btn-secondary-sm" onclick="editUserFromProfile(${profile.id})" style="border: 1px solid var(--border-color); background: var(--bg-gray-50, #f9fafb); color: var(--text-primary, #111827); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;"><i class="fa-solid fa-pen-to-square"></i> Chỉnh sửa</button>
                    ${profile.active ? 
                        `<button class="btn-secondary-sm" onclick="confirmLockUser(${profile.id}, '${escapeHtml(profile.fullName)}', true)" style="border: 1px solid #ef4444; background: #fff0f0; color: #ef4444; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;"><i class="fa-solid fa-lock"></i> Khóa tài khoản</button>` 
                        : 
                        `<button class="btn-secondary-sm" onclick="confirmLockUser(${profile.id}, '${escapeHtml(profile.fullName)}', false)" style="border: 1px solid #10b981; background: #ecfdf5; color: #10b981; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;"><i class="fa-solid fa-unlock"></i> Mở khóa</button>`
                    }
                </div>
                ` : ''}
            </div>

            <!-- Body Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <!-- Basic Info -->
                <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; height: 100%;">
                    <h3 style="margin-top: 0; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;"><i class="fa-regular fa-address-card"></i> Thông tin cơ bản</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem;">
                        <span style="color: var(--text-muted);">Email</span>
                        <span style="color: #4f46e5; font-weight: 500;">${escapeHtml(profile.email || '')}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem;">
                        <span style="color: var(--text-muted);">Phòng ban</span>
                        <span style="font-weight: 500;">${escapeHtml(profile.departmentName)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem;">
                        <span style="color: var(--text-muted);">Ngày tham gia</span>
                        <span style="font-weight: 500;">${escapeHtml(profile.joinedDate)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <span style="color: var(--text-muted);">Quản lý</span>
                        <span style="font-weight: 500;">${escapeHtml(profile.managerName)}</span>
                    </div>
                </div>

                <!-- Permissions -->
                <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; height: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="margin: 0; font-size: 0.9rem; color: var(--text-muted);"><i class="fa-solid fa-key"></i> Phân quyền</h3>
                        ${profile.canEdit ? `<button onclick="editUserFromProfile(${profile.id})" style="background: none; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer; color: var(--text-primary); transition: all 0.2s; font-weight: 500;">Chỉnh sửa</button>` : ''}
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: auto;">
                        ${profile.permissions.map(p => `<span style="background: #f3f4f6; border: 1px solid #e5e7eb; padding: 4px 12px; border-radius: 16px; font-size: 0.8rem; font-weight: 500; color: #4b5563;">${escapeHtml(p)}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- Documents -->
            <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;"><i class="fa-regular fa-file"></i> Tài liệu đã upload (${profile.uploadedDocuments ? profile.uploadedDocuments.length : 0})</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${profile.uploadedDocuments && profile.uploadedDocuments.length > 0 ? 
                        profile.uploadedDocuments.map(doc => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-regular fa-file-lines" style="color: var(--text-muted);"></i>
                                <span style="font-size: 0.9rem; font-weight: 500; cursor: pointer; color: #4f46e5; text-decoration:none;" onclick="typeof openDocumentDetail === 'function' ? openDocumentDetail(${doc.id}) : null" title="Click để xem chi tiết">${escapeHtml(doc.fileName)}</span>
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(doc.timeAgo)}</span>
                        </div>
                        `).join('') 
                    : '<div style="font-size: 0.85rem; color: var(--text-muted);">Chưa có tài liệu nào.</div>'}
                </div>
            </div>

            <!-- Activities -->
            <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
                <h3 style="margin-top: 0; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;"><i class="fa-regular fa-clock"></i> Lịch sử hoạt động</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${profile.recentActivities && profile.recentActivities.length > 0 ? 
                        `<div style="position: relative; padding-left: 24px; border-left: 2px solid #e2e8f0; margin-left: 12px; margin-top: 8px;">` +
                        profile.recentActivities.slice(0, 5).map(act => {
                            let actionText = act.action;
                            let icon = 'fa-bolt';
                            let color = '#64748b';
                            let bg = '#f1f5f9';
                            
                            switch(act.action) {
                                case 'LOGIN': 
                                    actionText = 'Đăng nhập hệ thống'; icon = 'fa-right-to-bracket'; color = '#10b981'; bg = '#dcfce7'; break;
                                case 'UPLOAD_DOCUMENT': 
                                    actionText = 'Tải lên tài liệu mới'; icon = 'fa-file-arrow-up'; color = '#4f46e5'; bg = '#e0e7ff'; break;
                                case 'DOWNLOAD_DOCUMENT': 
                                    actionText = 'Tải xuống tài liệu'; icon = 'fa-file-arrow-down'; color = '#0ea5e9'; bg = '#e0f2fe'; break;
                                case 'DELETE_DOCUMENT': 
                                    actionText = 'Xóa tài liệu'; icon = 'fa-trash'; color = '#ef4444'; bg = '#fee2e2'; break;
                                case 'APPROVE_DOCUMENT': 
                                    actionText = 'Phê duyệt tài liệu'; icon = 'fa-check-double'; color = '#10b981'; bg = '#dcfce7'; break;
                                case 'REJECT_DOCUMENT': 
                                    actionText = 'Từ chối tài liệu'; icon = 'fa-xmark'; color = '#ef4444'; bg = '#fee2e2'; break;
                            }
                            
                            return `
                            <div style="position: relative; margin-bottom: 24px;">
                                <!-- Timeline Dot -->
                                <div style="position: absolute; left: -31px; top: 6px; width: 12px; height: 12px; background: ${color}; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 0 2px #e2e8f0; z-index: 2;"></div>
                                
                                <div style="display: flex; flex-direction: column;">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                                        <div style="width: 28px; height: 28px; border-radius: 8px; background: ${bg}; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                            <i class="fa-solid ${icon}"></i>
                                        </div>
                                        <span style="font-weight: 700; font-size: 0.95rem; color: #1e293b;">${actionText}</span>
                                    </div>
                                    <div style="font-size: 0.8rem; color: #64748b; margin-left: 38px; font-weight: 500;">
                                        ${escapeHtml(act.time)} <span style="margin: 0 4px; color: #cbd5e1;">•</span> ${escapeHtml(act.date)}
                                    </div>
                                </div>
                            </div>
                            `;
                        }).join('') + `</div>`
                    : '<div style="font-size: 0.85rem; color: var(--text-muted);">Không có hoạt động gần đây.</div>'}
                    ${profile.recentActivities && profile.recentActivities.length > 5 ? 
                        `<div style="margin-top: 8px; text-align: center;">
                            <a href="#" style="color: #4f46e5; font-size: 0.85rem; font-weight: 500; text-decoration: none;">Xem toàn bộ lịch sử →</a>
                        </div>` 
                    : ''}
                </div>
            </div>

            <!-- Footer Link -->
            <div style="margin-top: 20px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px;">
                <a href="/admin/users" onclick="document.getElementById('userProfileViewModal').remove()" style="color: #6b7280; font-size: 0.9rem; text-decoration: none; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color='#4f46e5'" onmouseout="this.style.color='#6b7280'">Xem đầy đủ hồ sơ →</a>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Click outside to close
    document.getElementById('userProfileViewModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
}

async function confirmLockUser(userId, userName, isActive) {
    const actionName = isActive ? 'khóa' : 'mở khóa';
    const warning = isActive ? ' Hành động này sẽ ngăn người dùng truy cập vào hệ thống.' : ' Người dùng sẽ có thể đăng nhập lại vào hệ thống.';
    
    if (confirm(`Bạn có chắc muốn ${actionName} tài khoản ${userName}?${warning}`)) {
        try {
            const endpoint = isActive ? `/api/admin/users/${userId}/lock` : `/api/admin/users/${userId}/unlock`;
            // Call API
            const response = await apiRequest(endpoint, { method: 'PUT' });
            
            if (typeof showToast !== 'undefined') showToast(`Đã ${actionName} tài khoản thành công!`, 'success');
            
            // Đóng modal
            const modal = document.getElementById('userProfileViewModal');
            if (modal) modal.remove();
            
            // Tải lại bảng user
            if (typeof loadUsers === 'function') loadUsers();
        } catch (error) {
            console.error(error);
            if (typeof showToast !== 'undefined') showToast(`Lỗi khi ${actionName} tài khoản`, 'error');
            else alert(`Lỗi khi ${actionName} tài khoản`);
        }
    }
}

function editUserFromProfile(userId) {
    document.getElementById('userProfileViewModal').remove();
    // Điều hướng thẳng sang trang quản lý users hoặc gọi hàm edit
    if (window.location.pathname.includes('/admin/dashboard')) {
        if (typeof changeAdminPage === 'function') changeAdminPage('users');
        if (typeof editUser === 'function') {
            setTimeout(() => editUser(userId), 300);
        }
    } else {
        window.location.href = `/admin/dashboard?edit=${userId}#users`;
    }
}

// ==========================================
// DOCUMENT DETAIL MODAL
// ==========================================

async function openDocumentDetail(docId) {
    // Remove existing if any
    const existing = document.getElementById('docDetailModal');
    if (existing) existing.remove();

    // Show loading skeleton
    const skeletonHTML = `
    <div id="docDetailModal" style="position:fixed;inset:0;z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding-top:4vh;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);animation:fadeInBackdrop 0.25s ease;">
        <div style="width:680px;max-width:95vw;background:#ffffff;border-radius:16px;box-shadow:0 24px 48px rgba(0,0,0,0.18);overflow:hidden;animation:slideInModal 0.3s cubic-bezier(.16,1,.3,1);">
            <div style="padding:28px;">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
                    <div style="width:52px;height:52px;border-radius:12px;background:#f3f4f6;animation:pulse 1.5s infinite;"></div>
                    <div style="flex:1;">
                        <div style="height:20px;width:60%;background:#f3f4f6;border-radius:6px;margin-bottom:8px;animation:pulse 1.5s infinite;"></div>
                        <div style="height:14px;width:40%;background:#f3f4f6;border-radius:6px;animation:pulse 1.5s infinite;"></div>
                    </div>
                </div>
                <div style="height:180px;background:#f3f4f6;border-radius:12px;animation:pulse 1.5s infinite;"></div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', skeletonHTML);

    try {
        // Try admin endpoint first, fallback to user endpoint
        let doc;
        const isAdminPage = window.location.pathname.includes('/admin/');
        if (isAdminPage) {
            try { doc = await apiRequest(`/api/admin/documents/${docId}`); }
            catch (e) { doc = await apiRequest(`/api/documents/${docId}`); }
        } else {
            doc = await apiRequest(`/api/documents/${docId}`);
        }

        // Remove skeleton
        const skeleton = document.getElementById('docDetailModal');
        if (skeleton) skeleton.remove();

        // Render full modal
        renderDocumentDetailModal(doc);
    } catch (error) {
        console.error('Error loading document:', error);
        const skeleton = document.getElementById('docDetailModal');
        if (skeleton) skeleton.remove();
        if (typeof showToast !== 'undefined') showToast('Không thể tải thông tin tài liệu', 'error');
    }
}

function getDocFileStyle(type) {
    if (!type) return { color: '#6b7280', bg: '#f9fafb', icon: 'fa-file', gradient: 'linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%)' };
    const t = type.toLowerCase();
    if (t === 'pdf') return { color: '#dc2626', bg: '#fef2f2', icon: 'fa-file-pdf', gradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)' };
    if (t === 'doc' || t === 'docx') return { color: '#2563eb', bg: '#eff6ff', icon: 'fa-file-word', gradient: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)' };
    if (t === 'xls' || t === 'xlsx') return { color: '#16a34a', bg: '#f0fdf4', icon: 'fa-file-excel', gradient: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)' };
    if (t === 'ppt' || t === 'pptx') return { color: '#ea580c', bg: '#fff7ed', icon: 'fa-file-powerpoint', gradient: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)' };
    if (['png','jpg','jpeg','gif','webp','svg'].includes(t)) return { color: '#7c3aed', bg: '#f5f3ff', icon: 'fa-file-image', gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)' };
    if (t === 'txt') return { color: '#374151', bg: '#f9fafb', icon: 'fa-file-lines', gradient: 'linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%)' };
    if (t === 'zip' || t === 'rar') return { color: '#b45309', bg: '#fffbeb', icon: 'fa-file-zipper', gradient: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)' };
    return { color: '#4f46e5', bg: '#eef2ff', icon: 'fa-file', gradient: 'linear-gradient(135deg, #eef2ff 0%, #c7d2fe 100%)' };
}

function getDocStatusBadge(status) {
    switch(status) {
        case 'COMPLETED': return { label: 'Hoàn thành', color: '#065f46', bg: '#d1fae5', dot: '#10b981' };
        case 'PROCESSING': return { label: 'Đang xử lý', color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' };
        case 'FAILED':    return { label: 'Thất bại',   color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' };
        case 'PENDING':   return { label: 'Đang chờ',   color: '#374151', bg: '#f3f4f6', dot: '#9ca3af' };
        default:          return { label: status || '—', color: '#374151', bg: '#f3f4f6', dot: '#9ca3af' };
    }
}

function renderDocumentDetailModal(doc) {
    const canDownload = doc.canDownload !== false;
    const isCompleted = doc.status === 'COMPLETED';
    const isAdmin = window.location.pathname.includes('/admin/');
    const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : (localStorage.getItem('accessToken') || localStorage.getItem('token') || '');

    // Add keyframe styles and global modal styles if not already added
    if (!document.getElementById('docModalStylesV2')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'docModalStylesV2';
        styleEl.textContent = `
            @keyframes fadeInBackdrop { from { opacity:0; } to { opacity:1; } }
            @keyframes slideInModal { from { opacity:0; transform:translateY(-24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
            .modal-tab-btn { background:none; border:none; padding:12px 16px; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; border-bottom:3px solid transparent; transition:all 0.2s; display:flex; align-items:center; gap:8px; white-space:nowrap; font-family:inherit; }
            .modal-tab-btn:hover { color:#4f46e5; }
            .modal-tab-btn.active { color:#4f46e5; border-bottom-color:#4f46e5; }
            .modal-tab-content { display:none; padding:24px; animation:fadeInBackdrop 0.3s ease; }
            .modal-tab-content.active { display:block; }
            .modal-tab-content.active.flex-layout { display:flex; flex-direction:column; }
            .timeline-step { display:flex; gap:16px; position:relative; padding-bottom:32px; }
            .timeline-step::before { content:''; position:absolute; left:15px; top:32px; bottom:0; width:2px; background:#e2e8f0; }
            .timeline-step:last-child::before { display:none; }
            .timeline-step:last-child { padding-bottom:0; }
            .timeline-icon { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; z-index:1; font-size:0.9rem; }
            .timeline-icon.done { background:#10b981; }
            .timeline-icon.wait { background:#f59e0b; }
            .timeline-icon.failed { background:#ef4444; }
            .timeline-icon.pending { background:#cbd5e1; }
            .timeline-content { flex:1; padding-top:4px; }
            .doc-action-btn-v2 { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:8px; font-size:0.9rem; font-weight:600; cursor:pointer; border:none; transition:all 0.2s; text-decoration:none; font-family:inherit; }
            .doc-action-btn-v2:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,0.15); }
        `;
        document.head.appendChild(styleEl);
    }

    const docIdCode = 'DOC-' + String(doc.id).padStart(4, '0');
    const uploader = doc.uploadedByName || doc.author || '—';
    const dept = doc.departmentName || 'Chung';
    
    let typeLabel = 'Tài liệu';
    const fName = (doc.fileName || '').toLowerCase();
    if (fName.includes('hợp đồng')) typeLabel = 'Hợp đồng';
    else if (fName.includes('tờ trình')) typeLabel = 'Tờ trình';
    else if (fName.includes('quyết định')) typeLabel = 'Quyết định';

    let aiStatusBadge = '';
    let aiPlaceholder = '';
    if (doc.status === 'COMPLETED') {
        aiStatusBadge = '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;">Đã xử lý 100%</span>';
        aiPlaceholder = 'Không có dữ liệu trích xuất.';
    } else if (doc.status === 'PROCESSING') {
        aiStatusBadge = '<span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;"><i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...</span>';
        aiPlaceholder = 'Hệ thống AI đang tiến hành trích xuất dữ liệu...';
    } else if (doc.status === 'FAILED' || doc.approvalStatus === 'REJECTED') {
        if (doc.approvalStatus === 'REJECTED') {
            aiStatusBadge = '<span style="background:#fee2e2;color:#ef4444;padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;">Bị từ chối</span>';
            aiPlaceholder = 'Không trích xuất do tài liệu bị từ chối.';
        } else {
            aiStatusBadge = '<span style="background:#fee2e2;color:#ef4444;padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;">Lỗi xử lý AI</span>';
            aiPlaceholder = 'Quá trình trích xuất gặp lỗi.';
        }
    } else {
        aiStatusBadge = '<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;">Chưa kích hoạt</span>';
        aiPlaceholder = 'AI sẽ tự động kích hoạt sau khi tài liệu được phê duyệt.';
    }

    // Dynamic Workflow Variables
    let wfProgress = '33%';
    let wfStep2Status = 'Chờ duyệt';
    let wfStep2Color = '#d97706';
    let wfStep2IconClass = 'wait';
    let wfStep2Icon = 'fa-hourglass-half';
    let wfStep2Desc = 'Yêu cầu quản lý phòng ban xác nhận tính hợp lệ.';
    
    let wfStep3Status = 'Chưa bắt đầu';
    let wfStep3Color = '#64748b';
    let wfStep3IconClass = 'pending';
    let wfStep3Icon = 'fa-minus';
    let wfStep3Desc = 'Hệ thống AI chờ tài liệu được duyệt để trích xuất dữ liệu.';

    if (doc.approvalStatus === 'APPROVED') {
        wfProgress = '66%';
        wfStep2Status = 'Đã duyệt';
        wfStep2Color = '#10b981';
        wfStep2IconClass = 'done';
        wfStep2Icon = 'fa-check';
        wfStep2Desc = 'Quản lý phòng ban đã phê duyệt tài liệu.';
        
        wfStep3Status = 'Chờ xử lý';
        wfStep3Icon = 'fa-hourglass-half';
        wfStep3IconClass = 'wait';
        wfStep3Color = '#d97706';
        wfStep3Desc = 'Đang chờ hệ thống AI tiếp nhận và xử lý.';
        
        if (doc.status === 'PROCESSING') {
            wfProgress = '80%';
            wfStep3Status = 'Đang xử lý AI...';
            wfStep3Icon = 'fa-spinner fa-spin';
        } else if (doc.status === 'COMPLETED') {
            wfProgress = '100%';
            wfStep3Status = 'Hoàn tất';
            wfStep3Color = '#10b981';
            wfStep3IconClass = 'done';
            wfStep3Icon = 'fa-check';
            wfStep3Desc = 'AI đã phân tích và trích xuất dữ liệu thành công.';
        } else if (doc.status === 'FAILED') {
            wfProgress = '66%';
            wfStep3Status = 'Lỗi xử lý';
            wfStep3Color = '#ef4444';
            wfStep3IconClass = 'failed';
            wfStep3Icon = 'fa-xmark';
            wfStep3Desc = 'Có lỗi xảy ra trong quá trình AI phân tích.';
        }
    } else if (doc.approvalStatus === 'REJECTED') {
        wfProgress = '33%';
        wfStep2Status = 'Đã từ chối';
        wfStep2Color = '#ef4444';
        wfStep2IconClass = 'failed';
        wfStep2Icon = 'fa-xmark';
        wfStep2Desc = 'Quản lý đã từ chối tài liệu này.';
        wfStep3Desc = 'Quy trình đã bị hủy do tài liệu bị từ chối.';
    }

    const modalHTML = `
    <div id="docDetailModal" style="position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;padding:2vh 16px;background:rgba(15, 23, 42, 0.6);backdrop-filter:blur(4px);animation:fadeInBackdrop 0.25s ease;">
        <div style="width:1000px;max-width:100%;height:90vh;max-height:850px;background:#ffffff;border-radius:16px;box-shadow:0 24px 48px rgba(0,0,0,0.18);overflow:hidden;animation:slideInModal 0.3s cubic-bezier(.16,1,.3,1);display:flex;flex-direction:column;">
            
            <!-- Header -->
            <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #e2e8f0;">
                <div style="display:flex;align-items:flex-start;gap:16px;flex:1;min-width:0;">
                    <div style="width:56px;height:56px;border-radius:16px;background:#4f46e5;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(79, 70, 229, 0.3);">
                        <i class="fa-solid fa-file-lines" style="font-size:1.8rem;color:#ffffff;"></i>
                    </div>
                    <div style="min-width:0;">
                        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
                            <span style="background:#f1f5f9;color:#475569;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;">${docIdCode}</span>
                            <span style="background:${doc.approvalStatus === 'APPROVED' ? '#dcfce7' : (doc.approvalStatus === 'REJECTED' ? '#fee2e2' : '#fef3c7')};color:${doc.approvalStatus === 'APPROVED' ? '#166534' : (doc.approvalStatus === 'REJECTED' ? '#ef4444' : '#d97706')};padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;">${doc.approvalStatus === 'APPROVED' ? 'Đã duyệt' : (doc.approvalStatus === 'REJECTED' ? 'Cần sửa đổi' : 'Chờ duyệt')}</span>
                            <span style="background:#e0e7ff;color:#4338ca;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;">${typeLabel}</span>
                            <span style="color:#94a3b8;font-size:0.75rem;font-weight:600;text-transform:uppercase;">${doc.fileType || 'APPLICATION/PDF'} • ${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</span>
                        </div>
                        <h2 style="font-size:1.4rem;font-weight:800;color:#0f172a;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(doc.fileName)}">${escapeHtml(doc.fileName)}</h2>
                    </div>
                </div>
                <button onclick="document.getElementById('docDetailModal').remove()" style="width:36px;height:36px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:#94a3b8;transition:all 0.2s;flex-shrink:0;" onmouseover="this.style.background='#f1f5f9';this.style.color='#0f172a'">✕</button>
            </div>

            <!-- Tabs Navigation -->
            <div style="display:flex;padding:0 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc;overflow-x:auto;">
                <button class="modal-tab-btn active" onclick="switchDocDetailTab('tab-ai-ocr', this)"><i class="fa-solid fa-wand-magic-sparkles"></i> Trích Xuất AI OCR & Tóm Tắt</button>
                <button class="modal-tab-btn" onclick="switchDocDetailTab('tab-preview', this)"><i class="fa-regular fa-eye"></i> Xem Trước Tài Liệu</button>
                <button class="modal-tab-btn" onclick="switchDocDetailTab('tab-workflow', this)"><i class="fa-solid fa-code-branch"></i> Nhật Ký Phê Duyệt</button>
                ${(() => {
                    try {
                        const userStr = localStorage.getItem('user');
                        if (userStr) {
                            const u = JSON.parse(userStr);
                            const isSystemAdmin = u.role === 'ADMIN' || (u.roles && u.roles.includes('ROLE_ADMIN'));
                            const isOwnerManager = (u.role === 'MANAGER' || (u.roles && u.roles.includes('ROLE_MANAGER'))) && doc.departmentId && u.departmentId === doc.departmentId;
                            if (isSystemAdmin || isOwnerManager || isAdmin) {
                                return `<button class="modal-tab-btn" onclick="switchDocDetailTab('tab-security', this)"><i class="fa-solid fa-lock"></i> Phân Quyền & Bảo Mật</button>`;
                            }
                        }
                    } catch(e){}
                    return '';
                })()}
            </div>

            <!-- Tabs Content Area -->
            <div style="flex:1;overflow-y:auto;background:#ffffff;">
                
                <!-- TAB 1: AI OCR -->
                <div id="tab-ai-ocr" class="modal-tab-content active">
                    <div style="background:linear-gradient(to right, #f3e8ff, #faf5ff);border-radius:12px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                        <div style="display:flex;align-items:center;gap:16px;">
                            <div style="width:40px;height:40px;background:#a855f7;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;">
                                <i class="fa-solid fa-bolt"></i>
                            </div>
                            <div>
                                <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
                                    <span style="font-weight:800;color:#6b21a8;font-size:1rem;">IDMS AI</span>
                                    ${aiStatusBadge}
                                </div>
                                <div style="font-size:0.85rem;color:#7e22ce;font-weight:500;">Tự động trích xuất cấu trúc văn bản, nhận diện từ khóa chính và rà soát độ chính xác 99.8%.</div>
                            </div>
                        </div>
                        ${(doc.status === 'FAILED' && doc.approvalStatus !== 'REJECTED') ? `<button onclick="retryOCR(${doc.id})" style="background:#9333ea;color:white;border:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:0.9rem;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Tải lại kết quả OCR</button>` : ''}
                    </div>

                    <div style="display:flex;gap:24px;flex-wrap:wrap;">
                        <!-- Left: AI Summary Mockup -->
                        <div style="flex:2;min-width:300px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
                            <div style="font-size:1rem;font-weight:800;color:#4f46e5;text-transform:uppercase;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> BẢN TÓM TẮT TRỌNG TÂM TỪ AI
                            </div>
                            
                            ${doc.status === 'FAILED' && doc.errorMessage ? `
                            <div style="background:#fee2e2; border-left:4px solid #ef4444; padding:16px; border-radius:8px; margin-bottom:20px; color:#991b1b; font-size:0.95rem;">
                                <strong><i class="fa-solid fa-triangle-exclamation"></i> ${doc.approvalStatus === 'REJECTED' ? 'Lý do từ chối từ Quản lý:' : 'Lỗi xử lý AI:'}</strong><br/>
                                <span style="font-family:monospace; margin-top:8px; display:inline-block; font-size:0.85rem;">
                                    ${doc.approvalStatus === 'REJECTED' ? escapeHtml(doc.errorMessage) : 'Hệ thống AI hiện đang quá tải hoặc gặp sự cố kết nối. Vui lòng bấm "Tải lại kết quả OCR" ở trên để thử lại sau.'}
                                </span>
                            </div>
                            ` : ''}

                            <ul style="padding-left:16px;margin:0;color:#334155;font-size:0.95rem;line-height:1.7;font-weight:500;">
                                <li style="margin-bottom:12px;"><b>Mục đích:</b> ${doc.aiPurpose ? escapeHtml(doc.aiPurpose) : aiPlaceholder}</li>
                                <li style="margin-bottom:12px;"><b>Nội dung chính:</b> ${doc.aiSummary ? escapeHtml(doc.aiSummary) : aiPlaceholder}</li>
                            </ul>
                            <div style="margin-top:24px;display:flex;gap:8px;flex-wrap:wrap;">
                                ${doc.aiTags ? doc.aiTags.split(' ').filter(t=>t.trim()!=='').map(t => `<span style="background:#e0e7ff;color:#4f46e5;padding:6px 12px;border-radius:20px;font-size:0.8rem;font-weight:600;"><i class="fa-solid fa-tag"></i> ${escapeHtml(t)}</span>`).join('') : `<span style="color:#94a3b8;font-size:0.85rem;font-style:italic;">${aiPlaceholder}</span>`}
                            </div>
                        </div>

                        <!-- Right: File Info -->
                        <div style="flex:1;min-width:250px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
                            <div style="font-size:0.95rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:20px;">THÔNG TIN TỆP TIN</div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:0.9rem;">
                                <span style="color:#64748b;font-weight:500;">Kích thước:</span>
                                <span style="color:#0f172a;font-weight:700;">${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:0.9rem;">
                                <span style="color:#64748b;font-weight:500;">Phòng ban:</span>
                                <span style="color:#0f172a;font-weight:700;">${escapeHtml(dept)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:0.9rem;">
                                <span style="color:#64748b;font-weight:500;">Người upload:</span>
                                <span style="color:#0f172a;font-weight:700;">${escapeHtml(uploader)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:0.9rem;">
                                <span style="color:#64748b;font-weight:500;">Ngày tạo:</span>
                                <span style="color:#0f172a;font-weight:700;">${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:0.9rem;">
                                <span style="color:#64748b;font-weight:500;">Phiên bản:</span>
                                <span style="color:#0f172a;font-weight:700;">v${doc.version || 1}.0 (Bản gốc)</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
                                <span style="color:#64748b;font-weight:500;">Cấp bảo mật:</span>
                                <span style="color:#d97706;font-weight:800;">Nội bộ</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: Xem Trước Tài Liệu -->
                <div id="tab-preview" class="modal-tab-content flex-layout" style="padding:0;height:100%;">

                    <div style="flex:1;background:#e2e8f0;padding:24px;overflow-y:auto;display:flex;justify-content:center;">
                        <!-- Using API Endpoint to view PDF directly in Modal -->
                        <iframe src="/api/documents/${doc.id}/view?token=${token}" style="width:100%;max-width:850px;height:100%;min-height:500px;border:none;background:white;box-shadow:0 10px 25px rgba(0,0,0,0.1);border-radius:8px;"></iframe>
                    </div>
                </div>

                <!-- TAB 3: Nhật Ký Phê Duyệt -->
                <div id="tab-workflow" class="modal-tab-content">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e2e8f0;">
                        <h3 style="margin:0;font-size:1.1rem;font-weight:800;color:#4f46e5;text-transform:uppercase;"><i class="fa-regular fa-file-lines"></i> TIẾN ĐỘ QUY TRÌNH & NHẬT KÝ</h3>
                        <span style="font-weight:800;color:#6b21a8;">Tiến độ: ${wfProgress}</span>
                    </div>
                    <div style="padding:0 16px;">
                        <!-- Step 1 -->
                        <div class="timeline-step">
                            <div class="timeline-icon done"><i class="fa-solid fa-check"></i></div>
                            <div class="timeline-content">
                                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                                    <div style="font-weight:800;color:#0f172a;">1. Tải lên hệ thống</div>
                                    <div style="font-weight:700;color:#10b981;">Hoàn tất</div>
                                </div>
                                <div style="color:#64748b;font-size:0.9rem;font-weight:500;">Tác giả ${uploader} đã tải file vào kho lưu trữ bảo mật.</div>
                            </div>
                        </div>
                        <!-- Step 2 -->
                        <div class="timeline-step">
                            <div class="timeline-icon ${wfStep2IconClass}"><i class="fa-solid ${wfStep2Icon}"></i></div>
                            <div class="timeline-content">
                                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                                    <div style="font-weight:800;color:#0f172a;">2. Quản lý phê duyệt</div>
                                    <div style="font-weight:700;color:${wfStep2Color};">${wfStep2Status}</div>
                                </div>
                                <div style="color:#64748b;font-size:0.9rem;font-weight:500;">${wfStep2Desc}</div>
                            </div>
                        </div>
                        <!-- Step 3 -->
                        <div class="timeline-step">
                            <div class="timeline-icon ${wfStep3IconClass}"><i class="fa-solid ${wfStep3Icon}"></i></div>
                            <div class="timeline-content">
                                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                                    <div style="font-weight:800;color:#0f172a;">3. AI phân tích & trích xuất</div>
                                    <div style="font-weight:700;color:${wfStep3Color};">${wfStep3Status}</div>
                                </div>
                                <div style="color:#64748b;font-size:0.9rem;font-weight:500;">${wfStep3Desc}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 4: Phân Quyền & Bảo Mật -->
                ${(() => {
                    try {
                        const userStr = localStorage.getItem('user');
                        if (userStr) {
                            const u = JSON.parse(userStr);
                            const isSystemAdmin = u.role === 'ADMIN' || (u.roles && u.roles.includes('ROLE_ADMIN'));
                            const isOwnerManager = (u.role === 'MANAGER' || (u.roles && u.roles.includes('ROLE_MANAGER'))) && doc.departmentId && u.departmentId === doc.departmentId;
                            if (isSystemAdmin || isOwnerManager || isAdmin) {
                                return `
                                <div id="tab-security" class="modal-tab-content">
                                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;display:flex;align-items:flex-start;gap:16px;margin-bottom:24px;">
                                        <div style="width:36px;height:36px;border-radius:50%;border:2px solid #10b981;display:flex;align-items:center;justify-content:center;color:#10b981;font-size:1.1rem;flex-shrink:0;">
                                            <i class="fa-solid fa-shield-halved"></i>
                                        </div>
                                        <div>
                                            <div style="font-weight:800;color:#065f46;margin-bottom:4px;font-size:1rem;">👑 Tài liệu thuộc quyền quản lý của bạn</div>
                                            <div style="color:#047857;font-size:0.9rem;font-weight:500;">Bạn đang có quyền truy cập toàn diện. Bạn có đầy đủ quyền Xem, Tải xuống, Chỉnh sửa phân quyền và Phê duyệt.</div>
                                        </div>
                                    </div>

                                    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
                                        <div style="font-weight:700;color:#0f172a;margin-bottom:16px;">Danh sách phòng ban được chia sẻ:</div>
                                        ${doc.sharedWithDepartments && doc.sharedWithDepartments.length > 0 ? doc.sharedWithDepartments.map(d => `
                                            <div style="border:1px solid #cbd5e1;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                                                <span style="font-weight:600;color:#334155;">${escapeHtml(d)}</span>
                                                <span style="background:#eef2ff;color:#4f46e5;padding:4px 12px;border-radius:6px;font-weight:700;font-size:0.85rem;">Quyền xem & Đóng góp</span>
                                            </div>
                                        `).join('') : `
                                            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center;color:#64748b;font-weight:500;">
                                                Chưa có phòng ban nào được chia sẻ quyền truy cập.
                                            </div>
                                        `}
                                    </div>
                                </div>
                                `;
                            }
                        }
                    } catch(e){}
                    return '';
                })()}

            </div>

            <!-- Footer Actions -->
            <div style="padding:16px 24px;border-top:1px solid #e2e8f0;background:#ffffff;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;gap:12px;">
                    <button class="doc-action-btn-v2" onclick="viewDocumentInline(${doc.id})" style="background:white;color:#475569;border:1px solid #cbd5e1;"><i class="fa-regular fa-eye"></i> Xem</button>
                    ${canDownload ? `<button class="doc-action-btn-v2" onclick="downloadDocumentById(${doc.id}, '${(doc.fileName || '').replace(/'/g, "\\'")}')" style="background:white;color:#475569;border:1px solid #cbd5e1;"><i class="fa-solid fa-download"></i> Tải xuống</button>` : ''}
                    <button class="doc-action-btn-v2" onclick="copyDocumentLink(${doc.id})" style="background:white;color:#475569;border:1px solid #cbd5e1;"><i class="fa-regular fa-copy"></i> Copy link</button>
                </div>
                <div style="display:flex;gap:12px;">
                    <!-- Added Approve button for Manager if document is pending -->
                    ${(() => {
                        try {
                            const currentUser = JSON.parse(localStorage.getItem('user'));
                            const isManagerRole = currentUser && currentUser.roles && currentUser.roles.includes('ROLE_MANAGER');
                            if (isManagerRole && doc.approvalStatus === 'PENDING') {
                                return `
                                    <button class="doc-action-btn-v2" onclick="document.getElementById('docDetailModal').remove(); typeof approveDocument === 'function' ? approveDocument(${doc.id}) : null" style="background:#10b981;color:white;border:none;"><i class="fa-regular fa-circle-check"></i> Phê Duyệt Ngay</button>
                                `;
                            }
                        } catch(e){}
                        return '';
                    })()}
                    <button class="doc-action-btn-v2" onclick="document.getElementById('docDetailModal').remove()" style="background:white;color:#475569;border:1px solid #cbd5e1;">Đóng</button>
                </div>
            </div>

        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.switchDocDetailTab = function(tabId, btn) {
    const modal = document.getElementById('docDetailModal');
    if (!modal) return;
    
    // Hide all contents
    const contents = modal.querySelectorAll('.modal-tab-content');
    contents.forEach(c => c.classList.remove('active'));
    
    // Remove active from buttons
    const btns = modal.querySelectorAll('.modal-tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    
    // Activate target
    const target = modal.querySelector('#' + tabId);
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');
};

function downloadDocumentById(docId, fileName) {
    const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : (localStorage.getItem('accessToken') || '');
    const downloadUrl = `${API_BASE}/api/documents/${docId}/download?token=${token}`;

    const a = document.createElement('a');
    a.href = downloadUrl;
    if (fileName) {
        a.download = fileName;
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function viewDocumentInline(docId) {
    const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : (localStorage.getItem('accessToken') || '');
    window.open(`${API_BASE}/api/documents/${docId}/view?token=${token}`, '_blank');
}

function copyDocumentLink(docId) {
    const link = `${window.location.origin}/api/documents/${docId}`;
    navigator.clipboard.writeText(link).then(() => {
        if (typeof showToast !== 'undefined') showToast('Đã copy link tài liệu!', 'success');
    }).catch(() => {
        if (typeof showToast !== 'undefined') showToast('Không thể copy link', 'error');
    });
}

window.retryOCR = async function(docId) {
    if(!confirm("Bạn có chắc chắn muốn chạy lại quá trình phân tích AI (OCR) cho tài liệu này?")) return;
    
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) throw new Error("Chưa đăng nhập.");
        const user = JSON.parse(userStr);
        const roles = user.roles || (user.role ? [user.role] : []);
        
        let endpoint = '';
        if (roles.includes('ROLE_ADMIN') || roles.includes('ADMIN')) {
            endpoint = `/api/admin/documents/${docId}/retry`;
        } else if (roles.includes('ROLE_MANAGER') || roles.includes('MANAGER')) {
            endpoint = `/api/manager/documents/${docId}/retry`;
        } else {
            throw new Error("Bạn không có quyền thực hiện chức năng này.");
        }
        
        const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : (localStorage.getItem('accessToken') || localStorage.getItem('token') || '');
        const res = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const msg = await res.text();
        if (res.ok) {
            if (typeof showToast !== 'undefined') showToast("Đã gửi yêu cầu xử lý lại thành công!", "success");
            else alert("Đã gửi yêu cầu xử lý lại thành công!");
            
            const modal = document.getElementById('docDetailModal');
            if(modal) modal.remove();
            
            if (typeof fetchDocuments === 'function') fetchDocuments();
            else if (typeof fetchUserDocuments === 'function') fetchUserDocuments();
            else window.location.reload();
        } else {
            if (typeof showToast !== 'undefined') showToast(msg || "Lỗi khi gửi yêu cầu", "error");
            else alert("Lỗi: " + msg);
        }
    } catch(e) {
        console.error(e);
        if (typeof showToast !== 'undefined') showToast(e.message, "error");
        else alert(e.message);
    }
}

function askAIAboutDocument(docId, fileName) {
    document.getElementById('docDetailModal').remove();
    // Điều hướng sang tab Chat và đặt context tài liệu
    if (typeof switchTab === 'function') switchTab('tabChat');
    if (typeof changeAdminPage === 'function') changeAdminPage('chat');
    // Set gợi ý câu hỏi
    setTimeout(() => {
        const chatInput = document.getElementById('chatInput') || document.getElementById('messageInput');
        if (chatInput) {
            chatInput.value = `Tóm tắt nội dung của tài liệu "${fileName}"?`;
            chatInput.focus();
        }
    }, 300);
}

function viewDocumentInAdmin(docId) {
    document.getElementById('docDetailModal').remove();
    if (typeof changeAdminPage === 'function') {
        changeAdminPage('documents');
        setTimeout(() => {
            if (typeof viewDocument === 'function') viewDocument(docId);
        }, 400);
    }
}

// Make globally available
window.openDocumentDetail = openDocumentDetail;
window.downloadDocumentById = downloadDocumentById;
window.viewDocumentInline = viewDocumentInline;
window.copyDocumentLink = copyDocumentLink;
window.askAIAboutDocument = askAIAboutDocument;
window.viewDocumentInAdmin = viewDocumentInAdmin;

// ==========================================
// Default Avatar Generator
// ==========================================

function generateDefaultAvatar(name) {
    if (!name) name = "U";
    const initial = name.charAt(0).toUpperCase();
    
    // Pick a color based on character code
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9'];
    const charCode = initial.charCodeAt(0);
    const colorIndex = (isNaN(charCode) ? 0 : charCode) % colors.length;
    const bgColor = colors[colorIndex];

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 100px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial, canvas.width / 2, canvas.height / 2 + 8);

    return canvas.toDataURL("image/png");
}

// ==========================================
// Notifications
// ==========================================

async function initNotifications() {
    const bellEl = document.getElementById('notificationBell');
    const badgeEl = document.getElementById('notificationBadge');
    const dropdownEl = document.getElementById('notificationDropdown');
    const listEl = document.getElementById('notificationList');

    if (!bellEl || !badgeEl || !dropdownEl || !listEl) return;

    // Toggle dropdown
    bellEl.addEventListener('click', (e) => {
        dropdownEl.style.display = dropdownEl.style.display === 'none' ? 'block' : 'none';
        e.stopPropagation();
    });

    // Close when click outside
    document.addEventListener('click', (e) => {
        if (!bellEl.contains(e.target)) {
            dropdownEl.style.display = 'none';
        }
    });
    
    // Prevent closing when clicking inside dropdown
    dropdownEl.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    await fetchUnreadNotifications();
}

async function fetchUnreadNotifications() {
    const badgeEl = document.getElementById('notificationBadge');
    const listEl = document.getElementById('notificationList');
    
    if (typeof apiRequest === 'undefined') return;
    
    try {
        const notis = await apiRequest('/api/notifications/all');
        
        // Calculate unread count
        const unreadNotis = notis ? notis.filter(n => n.read === false || n.isRead === false) : [];
        const unreadCount = unreadNotis.length;
        
        // Update badge
        if (unreadCount > 0) {
            badgeEl.style.display = 'block';
            badgeEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
            
            // Sync with dashboard overview if it exists
            const overviewBadge = document.getElementById('newNotiCount');
            if (overviewBadge) {
                overviewBadge.textContent = unreadCount;
            }
        } else {
            badgeEl.style.display = 'none';
            const overviewBadge = document.getElementById('newNotiCount');
            if (overviewBadge) {
                overviewBadge.textContent = 0;
            }
        }

        // Render list
        if (!notis || notis.length === 0) {
            listEl.innerHTML = `<div style="padding: 16px; text-align:center; color:#64748b; font-size:0.875rem;">Không có thông báo nào</div>`;
            return;
        }

        let html = '';
        notis.forEach(n => {
            const isRead = n.read === true || n.isRead === true;
            const safeTitle = escapeHtml(n.title);
            const safeMessage = escapeHtml(n.message);
            
            const bgColor = isRead ? 'transparent' : '#f0f9ff';
            const titleColor = isRead ? '#475569' : '#0f172a';
            const msgColor = isRead ? '#64748b' : '#334155';
            const fontWeight = isRead ? '500' : '600';
            const dotHtml = !isRead ? `<div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;flex-shrink:0;margin-top:6px;"></div>` : '<div style="width:8px;flex-shrink:0;"></div>';

            html += `
            <div class="notification-item" onclick="markNotificationAsRead(${n.id})" style="display:flex; gap:12px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: background 0.2s; background: ${bgColor};" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='${bgColor}'">
                ${dotHtml}
                <div style="flex-grow:1;">
                    <div style="font-weight: ${fontWeight}; font-size: 0.9rem; color: ${titleColor}; margin-bottom: 4px;">${safeTitle}</div>
                    <div style="font-size: 0.85rem; color: ${msgColor}; margin-bottom: 6px;">${safeMessage}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">${formatDate(n.createdAt)}</div>
                </div>
            </div>`;
        });
        
        listEl.innerHTML = html;
        
    } catch (error) {
        console.error('Lỗi khi tải thông báo:', error);
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

async function markNotificationAsRead(id) {
    if (typeof apiRequest === 'undefined') return;
    try {
        await apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' });
        // Tải lại thông báo sau khi click
        fetchUnreadNotifications();
        // Ẩn dropdown
        const dropdownEl = document.getElementById('notificationDropdown');
        if (dropdownEl) dropdownEl.style.display = 'none';
    } catch (error) {
        console.error('Lỗi đánh dấu đã đọc:', error);
    }
}

// Khởi tạo Notifications
document.addEventListener('DOMContentLoaded', initNotifications);

// ==========================================
// Theme (Dark Mode) & Dropdown UI Logic
// ==========================================

function toggleDropdown(event, dropdownId) {
    if (event) {
        event.stopPropagation();
    }
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(el => {
        if (el.id !== dropdownId) {
            el.style.display = 'none';
        }
    });

    // Toggle current
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
    }
}

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', function(event) {
    document.querySelectorAll('.dropdown-menu').forEach(el => {
        el.style.display = 'none';
    });
});

function setTheme(mode) {
    localStorage.setItem('idms_theme', mode);
    applyTheme(mode);
}

function applyTheme(mode) {
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Update Toggle Switches
    const adminToggle = document.getElementById('checkboxThemeToggleAdmin');
    if (adminToggle) adminToggle.checked = isDark;
    
    const managerToggle = document.getElementById('checkboxThemeToggleManager');
    if (managerToggle) managerToggle.checked = isDark;
    
    const userToggle = document.getElementById('checkboxThemeToggleUser');
    if (userToggle) userToggle.checked = isDark;

    // Update settings theme select if it exists
    const themeSelect = document.getElementById('settingsThemeSelect');
    if (themeSelect) {
        themeSelect.value = mode;
    }
}

// Lắng nghe thay đổi hệ thống
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    const theme = localStorage.getItem('idms_theme') || 'system';
    if (theme === 'system') {
        applyTheme('system');
    }
});

// Khởi tạo theme khi load DOM
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('idms_theme') || 'system';
    applyTheme(savedTheme);
});

// Chuyển đổi tab trong màn hình Cài đặt
function switchSettingsTab(tabId, btn) {
    if (!btn) return;
    const settingsContainer = btn.closest('.settings-layout');
    if (!settingsContainer) return;

    // Reset buttons
    settingsContainer.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Reset contents
    settingsContainer.querySelectorAll('.settings-card').forEach(c => c.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
    }
}