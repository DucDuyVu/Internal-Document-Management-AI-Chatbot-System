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
                        profile.recentActivities.slice(0, 5).map(act => `
                        <div style="display: flex; gap: 12px; font-size: 0.9rem;">
                            <span style="color: var(--text-muted); min-width: 45px;">${escapeHtml(act.time)}</span>
                            <span style="color: var(--text-muted); min-width: 70px;">${escapeHtml(act.date)}</span>
                            <span style="font-weight: 500; color: var(--text-primary, #111827);">${escapeHtml(act.action)}</span>
                        </div>
                        `).join('')
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
    const style = getDocFileStyle(doc.fileType);
    const statusBadge = getDocStatusBadge(doc.status);
    const canDownload = doc.canDownload !== false; // default true if field absent
    const isCompleted = doc.status === 'COMPLETED';
    const isAdmin = window.location.pathname.includes('/admin/');

    // Add keyframe styles if not already added
    if (!document.getElementById('docModalStyles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'docModalStyles';
        styleEl.textContent = `
            @keyframes fadeInBackdrop { from { opacity:0; } to { opacity:1; } }
            @keyframes slideInModal { from { opacity:0; transform:translateY(-24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
            #docDetailModal .doc-action-btn { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; border:none; transition:all 0.2s; text-decoration:none; }
            #docDetailModal .doc-action-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,0.15); }
            #docDetailModal .doc-info-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f3f4f6; font-size:0.875rem; }
            #docDetailModal .doc-info-row:last-child { border-bottom:none; }
        `;
        document.head.appendChild(styleEl);
    }

    const modalHTML = `
    <div id="docDetailModal" style="position:fixed;inset:0;z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:4vh 16px;overflow-y:auto;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);animation:fadeInBackdrop 0.25s ease;">
        <div style="width:680px;max-width:100%;background:#ffffff;border-radius:16px;box-shadow:0 24px 48px rgba(0,0,0,0.18);overflow:hidden;animation:slideInModal 0.3s cubic-bezier(.16,1,.3,1);">

            <!-- Header -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #f3f4f6;">
                <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;">
                    <div style="width:48px;height:48px;border-radius:12px;background:${style.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid ${style.icon}" style="font-size:1.4rem;color:${style.color};"></i>
                    </div>
                    <div style="min-width:0;">
                        <div style="font-size:1rem;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:500px;" title="${escapeHtml(doc.fileName)}">${escapeHtml(doc.fileName)}</div>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                            <span style="background:${style.bg};color:${style.color};padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;letter-spacing:0.5px;">${(doc.fileType || 'FILE').toUpperCase()}</span>
                            <span style="width:6px;height:6px;border-radius:50%;background:${statusBadge.dot};display:inline-block;"></span>
                            <span style="font-size:0.8rem;font-weight:600;color:${statusBadge.color};">${statusBadge.label}</span>
                        </div>
                    </div>
                </div>
                <button onclick="document.getElementById('docDetailModal').remove()" style="width:36px;height:36px;border-radius:50%;border:none;background:#f3f4f6;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#6b7280;transition:all 0.2s;flex-shrink:0;" onmouseover="this.style.background='#e5e7eb';this.style.color='#111827'" onmouseout="this.style.background='#f3f4f6';this.style.color='#6b7280'">✕</button>
            </div>

            <!-- Preview Area -->
            <div style="background:${style.gradient};padding:48px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border-bottom:1px solid #f3f4f6;">
                <div style="width:80px;height:80px;border-radius:20px;background:white;box-shadow:0 8px 24px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;">
                    <i class="fa-solid ${style.icon}" style="font-size:2.5rem;color:${style.color};"></i>
                </div>
                <div style="font-size:0.8rem;color:#9ca3af;font-weight:500;">
                    ${isCompleted ? '✅ Đã xử lý & sẵn sàng để hỏi AI' : '⏳ Tài liệu chưa hoàn thành xử lý'}
                </div>
                ${doc.errorMessage ? `<div style="background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:10px 16px;font-size:0.8rem;color:#991b1b;max-width:500px;text-align:center;">⚠️ ${escapeHtml(doc.errorMessage)}</div>` : ''}
            </div>

            <!-- Body: 2-column info grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                <!-- Left: Thông tin cơ bản -->
                <div style="padding:20px 24px;border-right:1px solid #f3f4f6;">
                    <div style="font-size:0.75rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;"><i class="fa-regular fa-file-lines"></i> Thông tin</div>
                    <div class="doc-info-row">
                        <span style="color:#6b7280;">Kích thước</span>
                        <span style="font-weight:600;color:#111827;">${formatFileSize(doc.fileSize)}</span>
                    </div>
                    <div class="doc-info-row">
                        <span style="color:#6b7280;">Phòng ban</span>
                        <span style="font-weight:600;color:#111827;">${escapeHtml(doc.departmentName || 'Toàn công ty')}</span>
                    </div>
                    <div class="doc-info-row">
                        <span style="color:#6b7280;">Người upload</span>
                        <span style="font-weight:600;color:#111827;">${escapeHtml(doc.uploaderName || '—')}</span>
                    </div>
                    <div class="doc-info-row">
                        <span style="color:#6b7280;">Ngày tạo</span>
                        <span style="font-weight:600;color:#111827;">${formatDate(doc.createdAt)}</span>
                    </div>
                    <div class="doc-info-row">
                        <span style="color:#6b7280;">Phiên bản</span>
                        <span style="font-weight:600;color:#111827;">v${doc.version || 1}</span>
                    </div>
                    ${isAdmin ? `<div class="doc-info-row">
                        <span style="color:#6b7280;">Chunks AI</span>
                        <span style="font-weight:600;color:#111827;">${doc.chunkCount || 0} đoạn</span>
                    </div>` : ''}
                </div>

                <!-- Right: Quyền truy cập -->
                <div style="padding:20px 24px;">
                    <div style="font-size:0.75rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;"><i class="fa-solid fa-shield-halved"></i> Quyền truy cập</div>
                    ${doc.permissionType ? `
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;margin-bottom:12px;">
                        <div style="font-size:0.75rem;font-weight:700;color:#92400e;margin-bottom:4px;">
                            ${doc.permissionType === 'OWNER' ? '👑 Chủ sở hữu' : doc.permissionType === 'EDIT' ? '✏️ Có thể chỉnh sửa' : '👁️ Chỉ xem · được chia sẻ'}
                        </div>
                        ${doc.sharedBy ? `<div style="font-size:0.8rem;color:#78350f;">Chia sẻ bởi: <strong>${escapeHtml(doc.sharedBy)}</strong></div>` : ''}
                        ${doc.sharedAt ? `<div style="font-size:0.8rem;color:#78350f;">Ngày chia sẻ: ${formatDate(doc.sharedAt)}</div>` : ''}
                    </div>` : `
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;margin-bottom:12px;">
                        <div style="font-size:0.75rem;font-weight:700;color:#065f46;">👑 Tài liệu của bạn</div>
                        <div style="font-size:0.8rem;color:#047857;margin-top:2px;">Bạn là chủ sở hữu</div>
                    </div>`}
                    ${doc.sharedWithDepartments && doc.sharedWithDepartments.length > 0 ? `
                    <div style="font-size:0.75rem;color:#6b7280;margin-bottom:6px;">Đã chia sẻ với:</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        ${doc.sharedWithDepartments.map(d => `<span style="background:#eef2ff;color:#4338ca;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${escapeHtml(d)}</span>`).join('')}
                    </div>` : `<div style="font-size:0.8rem;color:#9ca3af;">Chưa chia sẻ với phòng ban nào</div>`}
                </div>
            </div>

            <!-- Footer Actions -->
            <div style="padding:16px 24px;border-top:1px solid #f3f4f6;display:flex;gap:10px;align-items:center;background:#fafafa;">
                ${isCompleted ? `<button class="doc-action-btn" onclick="askAIAboutDocument(${doc.id}, '${escapeHtml(doc.fileName)}')" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;"><i class="fa-solid fa-robot"></i> Hỏi AI</button>` : ''}
                ${canDownload ? `<button class="doc-action-btn" onclick="downloadDocumentById(${doc.id})" style="background:#111827;color:white;"><i class="fa-solid fa-download"></i> Tải xuống</button>` : ''}
                <button class="doc-action-btn" onclick="copyDocumentLink(${doc.id})" style="background:white;color:#374151;border:1px solid #e5e7eb;"><i class="fa-regular fa-copy"></i> Copy link</button>
                <div style="flex:1;"></div>
                ${isAdmin ? `<button class="doc-action-btn" onclick="viewDocumentInAdmin(${doc.id})" style="background:white;color:#4f46e5;border:1px solid #4f46e5;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Quản lý</button>` : ''}
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Click outside to close
    document.getElementById('docDetailModal').addEventListener('click', function(e) {
        if (e.target === this) this.remove();
    });
}

function downloadDocumentById(docId) {
    const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : '';
    window.open(`${API_BASE}/api/documents/${docId}/download?token=${token}`, '_blank');
}

function copyDocumentLink(docId) {
    const link = `${window.location.origin}/api/documents/${docId}`;
    navigator.clipboard.writeText(link).then(() => {
        if (typeof showToast !== 'undefined') showToast('Đã copy link tài liệu!', 'success');
    }).catch(() => {
        if (typeof showToast !== 'undefined') showToast('Không thể copy link', 'error');
    });
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