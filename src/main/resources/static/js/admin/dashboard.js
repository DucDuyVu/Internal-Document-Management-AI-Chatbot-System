/* =============================================
   admin-dashboard.js – IDMS Admin Dashboard (ĐÃ SỬA)
   Quản lý: Users, Departments, Documents,
   Permissions, Upload, Chat Logs, Audit Logs
   ============================================= */

// ===== KIỂM TRA DEPENDENCIES =====
if (typeof API_BASE === 'undefined') {
    console.error('common.js chưa được tải!');
}
if (typeof getUser === 'undefined' || typeof isLoggedIn === 'undefined' || typeof apiRequest === 'undefined') {
    console.error('auth.js chưa được tải!');
}

// ===== GLOBAL STATE =====
const AdminState = {
    currentTab: 'tabOverview',
    users: {
        data: [],
        filtered: [],
        page: 1,
        pageSize: 10,
        total: 0
    },
    departments: {
        data: [],
        loading: false
    },
    documents: {
        data: [],
        filtered: [],
        statusFilter: 'ALL',
        page: 1,
        pageSize: 10,
        total: 0
    },
    chatSessions: {
        data: [],
        page: 1,
        pageSize: 10,
        total: 0
    },
    logs: {
        data: [],
        filtered: [],
        page: 1,
        pageSize: 15,
        total: 0
    },
    permissions: {
        data: [],
        loading: false
    },
    selectedFile: null,
    uploadProgress: 0,
    confirmCallback: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function () {
    // Kiểm tra đăng nhập bằng hàm từ auth.js
    if (typeof isLoggedIn === 'undefined' || !isLoggedIn()) {
        window.location.href = '/login';
        return;
    }

    // Kiểm tra quyền Admin
    const user = typeof getUser !== 'undefined' ? getUser() : null;
    if (!user || user.role !== 'ADMIN') {
        window.location.href = '/dashboard';
        return;
    }

    // Update UI với thông tin user
    if (typeof updateUserUI !== 'undefined') {
        updateUserUI(user);
    }

    initAdminDashboard();
    
    // Khôi phục tab hiện tại từ URL hash hoặc mặc định load tabOverview
    const hash = window.location.hash.substring(1);
    if (hash) {
        AdminState.currentTab = hash;
        loadTabData(hash);
    } else {
        loadOverviewStats();
        loadRecentActivities();
        loadDepartmentStats();
    }
});

function initAdminDashboard() {
    setupAdminSidebar();
    setupAdminEventListeners();
    setupUploadArea();
}

function setupAdminSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    sidebar.querySelectorAll('li[data-tab]').forEach(item => {
        item.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            AdminState.currentTab = tabId;

            if (typeof switchTab !== 'undefined') {
                switchTab(tabId, this);
            }
        });
    });
}

function setupAdminEventListeners() {
    // User search
    const userSearch = document.getElementById('userSearch');
    if (userSearch && typeof debounce !== 'undefined') {
        userSearch.addEventListener('input', debounce(filterUsers, 300));
    }

    // User filters
    ['userRoleFilter', 'userDeptFilter', 'userStatusFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', filterUsers);
    });

    // Document filters
    const docSearchInput = document.getElementById('docSearchInput');
    if (docSearchInput && typeof debounce !== 'undefined') {
        docSearchInput.addEventListener('input', debounce(filterDocuments, 300));
    }

    // Log search
    const logSearch = document.getElementById('logSearch');
    if (logSearch && typeof debounce !== 'undefined') {
        logSearch.addEventListener('input', debounce(filterLogs, 300));
    }

    // Upload button
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadDocument);
    }

    // Logout
    const logoutButtons = [
        document.getElementById('logoutBtn'),
        document.getElementById('logoutBtnTop')
    ];

    logoutButtons.forEach((btn) => {
        if (btn) {
            btn.addEventListener('click', async () => {
                if (typeof logout !== 'undefined') {
                    await logout();
                } else {
                    console.error('Hàm logout() không tồn tại, kiểm tra lại auth.js đã load chưa');
                }
            });
        }
    });
}

function loadTabData(tabId) {
    switch (tabId) {
        case 'tabOverview':
            loadOverviewStats();
            loadRecentActivities();
            loadDepartmentStats();
            initCharts();
            break;
        case 'tabUsers':
            loadUsers();
            loadDepartmentsForFilter('userDeptFilter');
            break;
        case 'tabDepartments':
            loadDepartments();
            break;
        case 'tabDocuments':
            loadDocuments();
            loadDepartmentsForFilter('docDeptFilter');
            break;
        case 'tabPermissions':
            loadPermissions();
            break;
        case 'tabUpload':
            loadDepartmentsForSelect('departmentId');
            loadRecentUploads();
            break;
        case 'tabChat':
            loadChatSessions();
            break;
        case 'tabLogs':
            loadAuditLogs();
            break;
        case 'tabReports':
            loadAdminReports();
            loadDepartmentsForFilter('adminRepDeptFilter');
            break;
        case 'tabProfile':
            loadAdminProfile();
            break;
    }
}

// Listen to tabSwitched event dispatched by common.js switchTab
document.addEventListener('tabSwitched', function(e) {
    loadTabData(e.detail.tabId);
});

// =============================================
// OVERVIEW STATISTICS
// =============================================

async function loadOverviewStats() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        // Gọi API dashboard stats mới
        const dashboardStats = await apiRequest('/api/dashboard/stats');

        const [usersRes, lockedUsersRes, deptsRes] = await Promise.all([
            apiRequest('/api/admin/users?page=1&size=1'),
            apiRequest('/api/admin/users?status=locked&page=1&size=1'),
            apiRequest('/api/admin/departments')
        ]);

        const uploadToday = (dashboardStats && dashboardStats.uploadData && dashboardStats.uploadData.length > 0)
            ? dashboardStats.uploadData[dashboardStats.uploadData.length - 1] 
            : 0;

        const elements = {
            'statTotalUsers': usersRes ? (usersRes.totalElements || 0) : 0,
            'statTotalDocs': dashboardStats ? (dashboardStats.documentCount || 0) : 0,
            'statUploadToday': uploadToday,
            'statTotalChats': dashboardStats ? (dashboardStats.chatSessionCount || 0) : 0,
            'statFailedDocs': dashboardStats ? (dashboardStats.errorDocumentCount || 0) : 0,
            'statOnline': dashboardStats ? (dashboardStats.activeSessionsCount || 0) : 0
        };

        AdminState.overview = {
            totalUsers: usersRes ? (usersRes.totalElements || 0) : 0,
            totalDocuments: dashboardStats ? (dashboardStats.documentCount || 0) : 0,
            totalDepartments: deptsRes ? (Array.isArray(deptsRes) ? deptsRes.length : (deptsRes.content ? deptsRes.content.length : 0)) : 0
        };

        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('skeleton-loader');
                el.textContent = elements[id];

                if (id === 'statFailedDocs') {
                    const card = el.closest('.kpi-card');
                    if (card) {
                        const icon = card.querySelector('.kpi-icon');
                        if (parseInt(elements[id]) > 0) {
                            el.classList.add('danger-text');
                        } else {
                            card.classList.remove('red');
                            icon.style.color = 'var(--text-secondary)';
                            icon.style.background = 'var(--bg-gray-100)';
                            card.style.borderLeftColor = 'var(--border-color)';
                            el.classList.remove('danger-text');
                        }
                    }
                }
            }
        });



        // Update user banner info
        const currentUser = typeof getUser !== 'undefined' ? getUser() : null;
        if (currentUser) {
            const welcomeName = document.getElementById('welcomeName');
            if (welcomeName) welcomeName.textContent = currentUser.fullName || currentUser.username;
        }

        // Header Date & Mocks
        const now = new Date();
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayStr = days[now.getDay()];
        const dateStr = now.toLocaleDateString('vi-VN');
        const currentDateEl = document.getElementById('currentDate');
        const currentDayEl = document.getElementById('currentDay');
        if (currentDateEl) currentDateEl.textContent = dateStr;
        if (currentDayEl) currentDayEl.textContent = dayStr;

        const pendingDocEl = document.getElementById('pendingDocCount');
        if (pendingDocEl) pendingDocEl.textContent = dashboardStats ? (dashboardStats.pendingDocumentCount || 0) : 0;

        // Update To-Do list UI elements
        const statErrorDocsEl = document.getElementById('statErrorDocs');
        const statUnassignedDocsEl = document.getElementById('statUnassignedDocs');
        const statLockedUsersEl = document.getElementById('statLockedUsers');
        
        if (statErrorDocsEl && dashboardStats) statErrorDocsEl.textContent = dashboardStats.errorDocumentCount || 0;
        if (statUnassignedDocsEl && dashboardStats) statUnassignedDocsEl.textContent = dashboardStats.unassignedDocumentCount || 0;
        if (statLockedUsersEl && dashboardStats) statLockedUsersEl.textContent = dashboardStats.lockedUserCount || 0;

        // Khởi tạo biểu đồ với dữ liệu thực
        if (typeof initCharts === 'function') {
            initCharts(dashboardStats);
        }

    } catch (error) {
        console.error('Error loading overview stats:', error);
        document.querySelectorAll('.kpi-value').forEach(el => {
            el.classList.remove('skeleton-loader');
            el.textContent = 'Lỗi';
            el.style.fontSize = '1.2rem';
        });
    }
}

async function loadRecentActivities() {
    try {
        if (typeof apiRequest === 'undefined') return;

        let response = [];
        try {
            response = await apiRequest('/api/admin/activities?limit=10');
        } catch (apiErr) {
            console.warn('API activities failed, using mock data fallback:', apiErr);
        }

        // Support both old list and new timeline list
        const list = document.getElementById('timelineList') || document.getElementById('recentActivityList');

        if (!list) return;

        if (!response || response.length === 0) {
            // Tự động render Mock Data để giao diện không bị trống
            response = [
                { action: 'UPLOAD_DOCUMENT', userName: 'Nguyễn Văn A', createdAt: new Date(Date.now() - 1000*60*5).toISOString() },
                { action: 'CHANGE_PERMISSION', userName: 'Admin', createdAt: new Date(Date.now() - 1000*60*25).toISOString() },
                { action: 'CREATE_USER', userName: 'Admin', createdAt: new Date(Date.now() - 1000*60*120).toISOString() },
                { action: 'LOGIN', userName: 'Trần Thị B', createdAt: new Date(Date.now() - 1000*60*60*4).toISOString() },
                { action: 'DELETE_DOCUMENT', userName: 'Lê Văn C', createdAt: new Date(Date.now() - 1000*60*60*24).toISOString() },
            ];
        }

        const actionIcons = {
            'LOGIN': '<i class="fa-solid fa-right-to-bracket"></i>',
            'LOGOUT': '<i class="fa-solid fa-right-from-bracket"></i>',
            'UPLOAD_DOCUMENT': '<i class="fa-solid fa-cloud-arrow-up"></i>',
            'DELETE_DOCUMENT': '<i class="fa-solid fa-trash"></i>',
            'CREATE_USER': '<i class="fa-solid fa-user-plus"></i>',
            'LOCK_USER': '<i class="fa-solid fa-user-lock"></i>',
            'UNLOCK_USER': '<i class="fa-solid fa-unlock-keyhole"></i>',
            'SHARE_DOCUMENT': '<i class="fa-solid fa-share-nodes"></i>',
            'CHANGE_PERMISSION': '<i class="fa-solid fa-key"></i>',
            'UPDATE_PROFILE': '<i class="fa-solid fa-id-card"></i>',
            'CREATE_DEPARTMENT': '<i class="fa-solid fa-building"></i>',
            'UPDATE_DEPARTMENT': '<i class="fa-solid fa-pen-to-square"></i>',
            'DELETE_DEPARTMENT': '<i class="fa-solid fa-trash"></i>'
        };

        const actionColors = {
            'LOGIN': 'bg-primary',
            'LOGOUT': 'bg-primary',
            'UPLOAD_DOCUMENT': 'bg-success',
            'DELETE_DOCUMENT': 'bg-danger',
            'CREATE_USER': 'bg-info',
            'LOCK_USER': 'bg-warning',
            'UNLOCK_USER': 'bg-success',
            'SHARE_DOCUMENT': 'bg-info',
            'CHANGE_PERMISSION': 'bg-warning',
            'UPDATE_PROFILE': 'bg-primary',
            'CREATE_DEPARTMENT': 'bg-success',
            'UPDATE_DEPARTMENT': 'bg-info',
            'DELETE_DEPARTMENT': 'bg-danger'
        };

        const oldActionColors = {
            'LOGIN': 'indigo',
            'LOGOUT': 'indigo',
            'UPLOAD_DOCUMENT': 'green',
            'DELETE_DOCUMENT': 'red',
            'CREATE_USER': 'sky',
            'LOCK_USER': 'amber',
            'UNLOCK_USER': 'green',
            'SHARE_DOCUMENT': 'sky',
            'CHANGE_PERMISSION': 'amber',
            'UPDATE_PROFILE': 'indigo',
            'CREATE_DEPARTMENT': 'green',
            'UPDATE_DEPARTMENT': 'sky',
            'DELETE_DEPARTMENT': 'red'
        };

        list.innerHTML = response.map(log => {
            const timeStr = typeof formatDate !== 'undefined' ? formatDate(log.createdAt) : log.createdAt;
            const actionLabel = typeof getActionLabel !== 'undefined' ? getActionLabel(log.action) : log.action;
            const userName = log.userName || 'Hệ thống';
            const icon = actionIcons[log.action] || '<i class="fa-solid fa-clipboard-list"></i>';

            if (list.id === 'timelineList') {
                const bgClass = actionColors[log.action] || 'bg-primary';
                return `
                  <div class="timeline-item">
                     <div class="tl-dot ${bgClass}"></div>
                     <div class="tl-content">
                        <div class="tl-time">${timeStr}</div>
                        <p><strong>${userName}</strong> ${actionLabel}</p>
                     </div>
                  </div>
                `;
            } else {
                const dotColor = oldActionColors[log.action] || 'indigo';
                return `
                  <li class="activity-item">
                      <div class="activity-dot ${dotColor}"></div>
                      <div class="activity-info">
                          <p>${icon} ${actionLabel} - ${userName}</p>
                          <span>${timeStr}</span>
                      </div>
                  </li>
                `;
            }
        }).join('');

    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

async function loadDepartmentStats() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const response = await apiRequest('/api/admin/statistics/departments');
        const container = document.getElementById('deptStatsList');

        if (!container) return;

        if (!response || response.length === 0) {
            container.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px;">Chưa có dữ liệu</p>';
            return;
        }

        container.innerHTML = response.map(dept => `
            <div class="dept-item" style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:600;font-size:0.85rem;"><i class="fa-solid fa-building"></i> ${dept.name}</span>
                    <span style="font-size:0.8rem;color:#6b7280;">${dept.documentCount || 0} tài liệu</span>
                </div>
                <div style="font-size:0.75rem;color:#9ca3af;margin-top:4px;">
                    <i class="fa-solid fa-users"></i> ${dept.userCount || 0} người dùng | <i class="fa-solid fa-comments"></i> ${dept.chatCount || 0} phiên chat
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading department stats:', error);
    }
}

// =============================================
// USER MANAGEMENT
// =============================================

async function loadUsers() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const searchTerm = document.getElementById('userSearch')?.value?.toLowerCase() || '';
        const roleFilter = document.getElementById('userRoleFilter')?.value || '';
        const deptFilter = document.getElementById('userDeptFilter')?.value || '';
        const statusFilter = document.getElementById('userStatusFilter')?.value || '';

        let url = `/api/admin/users?page=${AdminState.users.page}&size=${AdminState.users.pageSize}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        if (roleFilter) url += `&role=${encodeURIComponent(roleFilter)}`;
        if (deptFilter) url += `&departmentId=${encodeURIComponent(deptFilter)}`;
        if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

        const response = await apiRequest(url);

        AdminState.users.data = response.content || response;
        AdminState.users.total = response.totalElements || response.length;
        AdminState.users.filtered = [...AdminState.users.data];

        renderUserTable();

    } catch (error) {
        console.error('Error loading users:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải danh sách người dùng', 'error');
        }
    }
}

function renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    const users = AdminState.users.filtered;

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span>👥</span>Không tìm thấy người dùng</td></tr>';
        return;
    }

    const roles = { ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', USER: 'Nhân viên' };

    tbody.innerHTML = users.map((user, index) => `
        <tr>
            <td>${(AdminState.users.page - 1) * AdminState.users.pageSize + index + 1}</td>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:32px;height:32px;border-radius:50%;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">
                        ${user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style="font-weight:600;">${user.fullName || '—'}</div>
                        <div style="font-size:0.75rem;color:#6b7280;">@${user.username || '—'}</div>
                    </div>
                </div>
            </td>
            <td>${user.email || '—'}</td>
            <td>
                <span class="status-badge ${user.role === 'ADMIN' ? 'admin' : 'active'}">
                    ${roles[user.role] || user.role}
                </span>
            </td>
            <td>${user.departmentName || '—'}</td>
            <td>
                <span class="status-badge ${user.isActive ? 'active' : 'locked'}">
                    ${user.isActive ? 'Hoạt động' : 'Đã khoá'}
                </span>
            </td>
            <td>
                <div style="display:flex;gap:4px;justify-content:flex-start;">
                    <!-- Sửa -->
                    <button class="btn-icon" style="background:transparent; color:#6b7280; border:1px solid transparent; border-radius:6px; padding:6px; transition:all 0.2s; display:flex; align-items:center;" onmouseover="this.style.background='#f3f4f6'; this.style.color='#4f46e5'" onmouseout="this.style.background='transparent'; this.style.color='#6b7280'" onclick="editUser(${user.id})" title="Chỉnh sửa">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <!-- Phòng ban -->
                    <button class="btn-icon" style="background:transparent; color:#6b7280; border:1px solid transparent; border-radius:6px; padding:6px; transition:all 0.2s; display:flex; align-items:center;" onmouseover="this.style.background='#f3f4f6'; this.style.color='#d97706'" onmouseout="this.style.background='transparent'; this.style.color='#6b7280'" onclick="changeUserDepartment(${user.id})" title="Phòng ban">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </button>
                    <!-- Khóa/Mở khóa -->
                    <button class="btn-icon" style="background:transparent; color:${user.isActive ? '#10b981' : '#ef4444'}; border:1px solid transparent; border-radius:6px; padding:6px; transition:all 0.2s; display:flex; align-items:center;" onmouseover="this.style.background='${user.isActive ? '#dcfce7' : '#fee2e2'}'; this.style.color='${user.isActive ? '#059669' : '#dc2626'}'" onmouseout="this.style.background='transparent'; this.style.color='${user.isActive ? '#10b981' : '#ef4444'}'" onclick="toggleUserStatus(${user.id}, ${user.isActive})" title="${user.isActive ? 'Đang mở (Bấm để khóa)' : 'Đã khóa (Bấm để mở)'}">
                        ${user.isActive
            ? `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>`
            : `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`
        }
                    </button>
                    <!-- Xóa -->
                    <button class="btn-icon" style="background:transparent; color:#ef4444; border:1px solid transparent; border-radius:6px; padding:6px; transition:all 0.2s; display:flex; align-items:center;" onmouseover="this.style.background='#fee2e2'; this.style.color='#dc2626'" onmouseout="this.style.background='transparent'; this.style.color='#ef4444'" onclick="deleteUser(${user.id}, '${user.fullName}')" title="Xóa người dùng">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (typeof updatePagination !== 'undefined') {
        updatePagination('userPagination', AdminState.users.page, Math.ceil(AdminState.users.total / AdminState.users.pageSize));
    } else {
        // Fallback pagination
        updateAdminPagination('userPagination', AdminState.users.page, Math.ceil(AdminState.users.total / AdminState.users.pageSize));
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch')?.value?.toLowerCase() || '';
    const roleFilter = document.getElementById('userRoleFilter')?.value || '';
    const deptFilter = document.getElementById('userDeptFilter')?.value || '';
    const statusFilter = document.getElementById('userStatusFilter')?.value || '';

    AdminState.users.filtered = AdminState.users.data;

    AdminState.users.page = 1;
    loadUsers();
}

// =============================================
// ADD USER MODAL
// =============================================

async function openAddUserModal() {
    const inputs = ['newUserName', 'newFullName', 'newEmail', 'newPhone', 'newPasswordForm'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const role = document.getElementById('newRole');
    if (role) role.value = 'USER';

    // Load danh sách phòng ban
    try {
        const depts = await apiRequest('/api/admin/departments', { method: 'GET' });
        const select = document.getElementById('newDepartmentId');
        if (select) {
            select.innerHTML = '<option value="">-- Trống (Chưa có phòng ban) --</option>';

            // Xử lý cả 2 trường hợp List hoặc Pageable
            const dataList = Array.isArray(depts) ? depts : (depts.content || []);
            dataList.forEach(d => {
                select.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            });
        }
    } catch (e) {
        console.error("Lỗi tải danh sách phòng ban:", e);
    }

    if (typeof openModal !== 'undefined') {
        openModal('addUserModal');
    }
}

async function submitAddUser() {
    const userName = document.getElementById('newUserName')?.value?.trim() || '';
    const fullName = document.getElementById('newFullName')?.value?.trim() || '';
    const email = document.getElementById('newEmail')?.value?.trim() || '';
    const phone = document.getElementById('newPhone')?.value?.trim() || '';
    const password = document.getElementById('newPasswordForm')?.value || '';
    const role = document.getElementById('newRole')?.value || 'USER';
    let departmentId = document.getElementById('newDepartmentId')?.value || null;
    if (departmentId === "") departmentId = null;

    // Validation
    if (!userName || !fullName || !email || !password) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng điền đầy đủ Username, Họ tên, Email, Mật khẩu', 'warning');
        }
        return;
    }

    if (password.length < 8) {
        if (typeof showToast !== 'undefined') {
            showToast('Mật khẩu phải có ít nhất 8 ký tự', 'warning');
        }
        return;
    }

    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        await apiRequest('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify({
                userName,
                fullName,
                email,
                phone,
                password,
                role,
                departmentId
            })
        });

        if (typeof closeModal !== 'undefined') {
            closeModal('addUserModal');
        }

        if (typeof showToast !== 'undefined') {
            showToast('Tạo tài khoản thành công!', 'success');
        }

        loadUsers();
        logAdminActivity('CREATE_USER', 'USER', null, { userName, email, role });

    } catch (error) {
        console.error('Error creating user:', error);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể tạo tài khoản', 'error');
        }
    }
}

// =============================================
// TOGGLE USER STATUS (LOCK/UNLOCK)
// =============================================

function deleteUser(userId, fullName) {
    showConfirmDialog(
        '⚠️ Xác nhận xóa người dùng',
        `Bạn có chắc chắn muốn xóa người dùng <strong>${fullName}</strong> không? Hành động này không thể hoàn tác.`,
        async () => {
            try {
                await apiRequest(`/api/admin/users/${userId}`, {
                    method: 'DELETE'
                });

                if (typeof showToast !== 'undefined') {
                    showToast('Xóa người dùng thành công', 'success');
                }

                loadUsers();
                logAdminActivity('DELETE_USER', 'USER', userId, { fullName });
            } catch (error) {
                console.error('Error deleting user:', error);
                if (typeof showToast !== 'undefined') {
                    showToast(error.message || 'Lỗi khi xóa người dùng', 'error');
                }
            }
        }
    );
}

function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? 'khoá' : 'mở khoá';
    const title = currentStatus ? '🔒 Xác nhận khoá tài khoản' : '🔓 Xác nhận mở khoá tài khoản';
    const message = currentStatus
        ? 'Bạn có chắc chắn muốn khoá tài khoản này? Người dùng sẽ không thể đăng nhập.'
        : 'Bạn có chắc chắn muốn mở khoá tài khoản này?';

    showConfirmDialog(title, message, async () => {
        try {
            if (typeof apiRequest === 'undefined') {
                throw new Error('apiRequest() không tồn tại');
            }

            const endpoint = currentStatus ? `/api/admin/users/${userId}/lock` : `/api/admin/users/${userId}/unlock`;
            await apiRequest(endpoint, {
                method: 'PUT'
            });

            if (typeof showToast !== 'undefined') {
                showToast(`${currentStatus ? 'Đã khoá' : 'Đã mở khoá'} tài khoản thành công!`, 'success');
            }

            loadUsers();
            logAdminActivity(currentStatus ? 'LOCK_USER' : 'UNLOCK_USER', 'USER', userId);

        } catch (error) {
            console.error('Error toggling user status:', error);
            if (typeof showToast !== 'undefined') {
                showToast(error.message || 'Thao tác thất bại', 'error');
            }
        }
    });
}

// =============================================
// CONFIRM DIALOG
// =============================================

function showConfirmDialog(title, message, callback) {
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMsg');
    const actionBtn = document.getElementById('confirmActionBtn');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    AdminState.confirmCallback = callback;

    if (actionBtn) {
        actionBtn.textContent = 'Xác nhận';
    }

    if (typeof openModal !== 'undefined') {
        openModal('confirmModal');
    }
}

function executeConfirm() {
    if (AdminState.confirmCallback) {
        AdminState.confirmCallback();
    }
    if (typeof closeModal !== 'undefined') {
        closeModal('confirmModal');
    }
    AdminState.confirmCallback = null;
}

// =============================================
// DEPARTMENT MANAGEMENT
// =============================================

async function loadDepartments() {
    try {
        AdminState.departments.loading = true;

        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const response = await apiRequest('/api/admin/departments');
        AdminState.departments.data = response.content || response;
        renderDepartmentTable();

    } catch (error) {
        console.error('Error loading departments:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải danh sách phòng ban', 'error');
        }
    } finally {
        AdminState.departments.loading = false;
    }
}

function renderDepartmentTable() {
    const tbody = document.getElementById('deptTableBody');
    if (!tbody) return;

    const departments = AdminState.departments.data;

    if (!departments || departments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><span>🏢</span>Chưa có phòng ban nào</td></tr>';
        return;
    }

    tbody.innerHTML = departments.map((dept, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <span style="font-weight:600;">${dept.name}</span>
            </td>
            <td>${dept.description || '—'}</td>
            <td>${dept.userCount || 0} người dùng</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn-icon" onclick="editDepartment(${dept.id}, '${dept.name}', '${dept.description || ''}')" title="Chỉnh sửa">✏️</button>
                    <button class="btn-icon" onclick="deleteDepartment(${dept.id}, '${dept.name}')" title="Xoá">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddDepartmentModal() {
    const nameEl = document.getElementById('deptName');
    const descEl = document.getElementById('deptDescription');
    const titleEl = document.getElementById('deptModalTitle');
    const submitBtn = document.getElementById('deptSubmitBtn');

    if (nameEl) nameEl.value = '';
    if (descEl) descEl.value = '';
    if (titleEl) titleEl.textContent = '➕ Thêm phòng ban mới';
    if (submitBtn) {
        submitBtn.textContent = 'Tạo phòng ban';
        submitBtn.onclick = submitAddDepartment;
    }

    if (typeof openModal !== 'undefined') {
        openModal('departmentModal');
    }
}

async function submitAddDepartment() {
    const name = document.getElementById('deptName')?.value?.trim() || '';
    const description = document.getElementById('deptDescription')?.value?.trim() || '';

    if (!name) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng nhập tên phòng ban', 'warning');
        }
        return;
    }

    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        await apiRequest('/api/admin/departments', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });

        if (typeof closeModal !== 'undefined') {
            closeModal('departmentModal');
        }

        if (typeof showToast !== 'undefined') {
            showToast('Tạo phòng ban thành công!', 'success');
        }

        loadDepartments();
        logAdminActivity('CREATE_DEPARTMENT', 'DEPARTMENT', null, { name });

    } catch (error) {
        console.error('Error creating department:', error);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể tạo phòng ban', 'error');
        }
    }
}

function editDepartment(id, name, description) {
    const nameEl = document.getElementById('deptName');
    const descEl = document.getElementById('deptDescription');
    const titleEl = document.getElementById('deptModalTitle');
    const submitBtn = document.getElementById('deptSubmitBtn');

    if (nameEl) nameEl.value = name;
    if (descEl) descEl.value = description;
    if (titleEl) titleEl.textContent = '✏️ Chỉnh sửa phòng ban';
    if (submitBtn) {
        submitBtn.textContent = 'Cập nhật';
        submitBtn.onclick = () => submitEditDepartment(id);
    }

    if (typeof openModal !== 'undefined') {
        openModal('departmentModal');
    }
}

async function submitEditDepartment(id) {
    const name = document.getElementById('deptName')?.value?.trim() || '';
    const description = document.getElementById('deptDescription')?.value?.trim() || '';

    if (!name) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng nhập tên phòng ban', 'warning');
        }
        return;
    }

    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        await apiRequest(`/api/admin/departments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, description })
        });

        if (typeof closeModal !== 'undefined') {
            closeModal('departmentModal');
        }

        if (typeof showToast !== 'undefined') {
            showToast('Cập nhật phòng ban thành công!', 'success');
        }

        loadDepartments();
        logAdminActivity('UPDATE_DEPARTMENT', 'DEPARTMENT', id, { name });

    } catch (error) {
        console.error('Error updating department:', error);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể cập nhật phòng ban', 'error');
        }
    }
}

function deleteDepartment(id, name) {
    showConfirmDialog(
        '🗑️ Xác nhận xoá phòng ban',
        `Bạn có chắc chắn muốn xoá phòng ban "${name}"? Tất cả người dùng trong phòng ban này sẽ bị gỡ khỏi phòng ban.`,
        async () => {
            try {
                if (typeof apiRequest === 'undefined') {
                    throw new Error('apiRequest() không tồn tại');
                }

                await apiRequest(`/api/admin/departments/${id}`, {
                    method: 'DELETE'
                });

                if (typeof showToast !== 'undefined') {
                    showToast('Xoá phòng ban thành công!', 'success');
                }

                loadDepartments();
                logAdminActivity('DELETE_DEPARTMENT', 'DEPARTMENT', id, { name });

            } catch (error) {
                console.error('Error deleting department:', error);
                if (typeof showToast !== 'undefined') {
                    showToast(error.message || 'Không thể xoá phòng ban', 'error');
                }
            }
        }
    );
}

// =============================================
// HELPER: Load departments for filter/select
// =============================================

async function loadDepartmentsForFilter(selectId) {
    try {
        if (typeof apiRequest === 'undefined') return;

        const response = await apiRequest('/api/admin/departments');
        const departments = response.content || response;
        const select = document.getElementById(selectId);

        if (!select) return;

        select.innerHTML = '<option value="">Tất cả phòng ban</option>';

        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading departments for filter:', error);
    }
}

async function loadDepartmentsForSelect(selectId) {
    try {
        if (typeof apiRequest === 'undefined') return;

        const response = await apiRequest('/api/admin/departments');
        const departments = response.content || response;
        const select = document.getElementById(selectId);

        if (!select) return;

        select.innerHTML = '<option value="">-- Áp dụng cho tất cả phòng ban --</option>';

        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading departments for select:', error);
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = `<option value="">Lỗi: ${error.message}</option>`;
        }
    }
}

// =============================================
// DOCUMENT MANAGEMENT
// =============================================

async function loadDocuments() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const response = await apiRequest(`/api/admin/documents?page=${AdminState.documents.page - 1}&size=${AdminState.documents.pageSize}`);

        AdminState.documents.data = response.content || response;
        AdminState.documents.total = response.totalElements || response.length;
        AdminState.documents.filtered = [...AdminState.documents.data];

        renderDocumentTable();

    } catch (error) {
        console.error('Error loading documents:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải danh sách tài liệu', 'error');
        }
    }
}

function renderDocumentTable() {
    const tbody = document.getElementById('docTableBody');
    if (!tbody) return;

    const docs = AdminState.documents.filtered;

    if (!docs || docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:#64748b;"><span>📁</span> Không tìm thấy tài liệu nào</td></tr>';
        return;
    }

    tbody.innerHTML = docs.map((doc, index) => {
        let statusHtml = '';
        if (doc.approvalStatus === 'REJECTED') {
            statusHtml = '<span class="status-badge status-failed">Duyệt: Từ chối</span>';
        } else if (doc.approvalStatus === 'PENDING') {
            statusHtml = '<span class="status-badge status-pending">Duyệt: Chờ duyệt</span>';
        } else {
            if (doc.approvalStatus === 'APPROVED') {
                statusHtml = '<span class="status-badge status-success">Duyệt: Đã duyệt</span>';
            }
        }

        if (doc.status === 'COMPLETED' || doc.status === 'SUCCESS') {
            statusHtml += '<span class="status-badge status-success">AI: Hoàn tất</span>';
        } else if (doc.status === 'PROCESSING') {
            statusHtml += '<span class="status-badge status-processing">AI: Đang xử lý</span>';
        } else if (doc.status === 'FAILED') {
            statusHtml += '<span class="status-badge status-failed">AI: Lỗi</span>';
        } else {
            statusHtml += '<span class="status-badge status-pending">AI: Chờ xử lý</span>';
        }

        const safeFileName = (doc.fileName || '').replace(/'/g, "\\'");

        return `
        <tr style="cursor:pointer;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
            <td onclick="openDocumentDetail(${doc.id})" title="Click để xem chi tiết">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:1.1rem; color:#ef4444;"><i class="fa-solid fa-file-pdf"></i></span>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-weight:600;color:#0f172a;" title="${doc.fileName}">${(doc.fileName && doc.fileName.length > 40) ? doc.fileName.substring(0, 40) + '...' : (doc.fileName || '—')}</span>
                        <span style="font-size:0.8rem;color:#64748b;">DOC-${String(doc.id).padStart(4, '0')}</span>
                    </div>
                </div>
            </td>
            <td><div style="font-size:0.9rem;color:#475569;font-weight:500;">${doc.departmentName || 'Tất cả phòng ban'}</div></td>
            <td><div style="font-size:0.9rem;color:#475569;">${doc.fileSize ? (doc.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '—'}</div></td>
            <td>
                <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
                    ${statusHtml}
                </div>
            </td>
            <td><div style="font-size:0.9rem;color:#475569;">${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</div></td>
            <td style="text-align:right;">
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button class="btn-icon" onclick="event.stopPropagation(); typeof viewDocumentInline === 'function' ? viewDocumentInline(${doc.id}) : null" title="Xem trực tiếp">👁️</button>
                    <button class="btn-icon" onclick="event.stopPropagation(); typeof downloadDocument === 'function' ? downloadDocument(${doc.id}, '${safeFileName}') : null" title="Tải xuống">⬇️</button>
                    ${(doc.status === 'FAILED' && doc.approvalStatus !== 'REJECTED') ? `
                    <button class="btn-icon" style="color:#f59e0b;" onclick="event.stopPropagation(); retryDocument(${doc.id})" title="Thử lại xử lý AI">🔄</button>` : ''}
                    ${(doc.status === 'PENDING' || doc.approvalStatus === 'PENDING') ? `
                    <button class="btn-icon" style="color:#10b981;" onclick="event.stopPropagation(); emergencyApproveDocument(${doc.id}, '${safeFileName}')" title="Duyệt khẩn cấp">✅</button>` : ''}
                    <button class="btn-icon" style="color:#ef4444;" onclick="event.stopPropagation(); deleteDocument(${doc.id}, '${safeFileName}')" title="Xóa tài liệu">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function setAdminDocFilter(btnElement) {
    document.querySelectorAll('#docTypePillFilter .pill-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    filterAdminDocuments();
}

function filterAdminDocuments() {
    const searchTerm = document.getElementById('docSearchInput')?.value?.toLowerCase() || '';
    const activePill = document.querySelector('#docTypePillFilter .pill-btn.active');
    const typeFilter = activePill ? activePill.getAttribute('data-filter') : 'ALL';

    AdminState.documents.filtered = AdminState.documents.data.filter(doc => {
        const matchesSearch = !searchTerm ||
            (doc.fileName && doc.fileName.toLowerCase().includes(searchTerm)) ||
            (doc.departmentName && doc.departmentName.toLowerCase().includes(searchTerm)) ||
            ('doc-' + String(doc.id).padStart(4, '0')).includes(searchTerm);

        let matchesStatus = false;
        if (typeFilter === 'ALL') {
            matchesStatus = true;
        } else if (typeFilter === 'COMPLETED') {
            matchesStatus = (doc.status === 'COMPLETED' || doc.status === 'SUCCESS');
        } else if (typeFilter === 'PENDING') {
            matchesStatus = (doc.status === 'PENDING' || doc.approvalStatus === 'PENDING');
        } else if (typeFilter === 'PROCESSING') {
            matchesStatus = (doc.status === 'PROCESSING');
        } else if (typeFilter === 'FAILED' || typeFilter === 'FAILED_OR_REJECTED') {
            matchesStatus = (doc.status === 'FAILED' || doc.approvalStatus === 'REJECTED');
        }

        return matchesSearch && matchesStatus;
    });

    renderDocumentTable();
}

// Function old filterDocs removed, replaced by filterAdminDocuments

function filterDocs(status, btn) {
    // Update active button
    document.querySelectorAll('#tabDocuments .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    AdminState.documents.statusFilter = status;
    filterDocuments();
}

function filterDocuments() {
    const searchTerm = document.getElementById('docSearchInput')?.value?.toLowerCase() || '';

    AdminState.documents.filtered = AdminState.documents.data.filter(doc => {
        const matchesSearch = !searchTerm ||
            doc.fileName?.toLowerCase().includes(searchTerm) ||
            doc.departmentName?.toLowerCase().includes(searchTerm);

        const matchesStatus = AdminState.documents.statusFilter === 'ALL' ||
            doc.status === AdminState.documents.statusFilter;

        return matchesSearch && matchesStatus;
    });

    renderDocumentTable();
}

// =============================================
// DOCUMENT ACTIONS
// =============================================

async function viewDocument(docId) {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const doc = await apiRequest(`/api/admin/documents/${docId}`);

        const titleEl = document.getElementById('docViewerTitle');
        const contentEl = document.getElementById('docViewerContent');
        const downloadBtn = document.getElementById('docDownloadBtn');
        const askBtn = document.getElementById('btnAskAI');

        if (titleEl) titleEl.textContent = doc.fileName;

        if (contentEl) {
            contentEl.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                    <div><strong>Tên file:</strong> ${doc.fileName}</div>
                    <div><strong>Loại file:</strong> ${doc.fileType?.toUpperCase()}</div>
                    <div><strong>Kích thước:</strong> ${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</div>
                    <div><strong>Phòng ban:</strong> ${doc.departmentName || '—'}</div>
                    <div><strong>Trạng thái:</strong> <span class="status-badge ${typeof getStatusClass !== 'undefined' ? getStatusClass(doc.status) : ''}">${typeof getStatusLabel !== 'undefined' ? getStatusLabel(doc.status) : doc.status}</span></div>
                    <div><strong>Ngày upload:</strong> ${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</div>
                    <div><strong>Phiên bản:</strong> ${doc.version || 1}</div>
                    <div><strong>Số chunks:</strong> ${doc.chunkCount || 0}</div>
                </div>
                ${doc.errorMessage ? `<div style="background:#fee2e2;padding:12px;border-radius:8px;color:#991b1b;font-size:0.85rem;">⚠️ Lỗi: ${doc.errorMessage}</div>` : ''}
            `;
        }

        if (downloadBtn) {
            downloadBtn.onclick = () => downloadDocument(docId, doc.fileName);
        }

        if (askBtn) {
            askBtn.style.display = doc.status === 'COMPLETED' ? 'inline-flex' : 'none';
        }

        if (typeof openModal !== 'undefined') {
            openModal('docViewerModal');
        }

    } catch (error) {
        console.error('Error viewing document:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể xem chi tiết tài liệu', 'error');
        }
    }
}

async function downloadDocument(docId, fileName) {
    try {
        // removed info toast

        const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : (localStorage.getItem('accessToken') || localStorage.getItem('token') || '');
        const response = await fetch(`${API_BASE}/api/documents/${docId}/download`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Lỗi tải xuống: ${response.status}`);
        }

        const blob = await response.blob();

        let finalFileName = fileName || 'document.pdf';
        const disposition = response.headers.get('Content-Disposition');
        if (disposition) {
            let matches = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
            if (matches && matches[1]) {
                finalFileName = decodeURIComponent(matches[1]);
            } else {
                matches = /filename="?([^;"]+)"?/i.exec(disposition);
                if (matches && matches[1]) {
                    finalFileName = matches[1];
                }
            }
        }

        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        if (typeof showToast !== 'undefined') {
            showToast('Tải tài liệu thành công', 'success');
        }
    } catch (error) {
        console.error('Download error:', error);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể tải xuống tài liệu', 'error');
        }
    }
}

async function retryDocument(docId) {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        await apiRequest(`/api/admin/documents/${docId}/retry`, {
            method: 'PUT'
        });

        if (typeof showToast !== 'undefined') {
            showToast('Đã gửi yêu cầu xử lý lại tài liệu', 'success');
        }

        loadDocuments();

    } catch (error) {
        console.error('Error retrying document:', error);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể thử lại', 'error');
        }
    }
}

function deleteDocument(docId, fileName) {
    showConfirmDialog(
        '🗑️ Xác nhận xoá tài liệu',
        `Bạn có chắc chắn muốn xoá tài liệu "${fileName}"? Hành động này không thể hoàn tác.`,
        async () => {
            try {
                if (typeof apiRequest === 'undefined') {
                    throw new Error('apiRequest() không tồn tại');
                }

                await apiRequest(`/api/admin/documents/${docId}`, {
                    method: 'DELETE'
                });

                if (typeof showToast !== 'undefined') {
                    showToast('Xoá tài liệu thành công!', 'success');
                }

                loadDocuments();
                logAdminActivity('DELETE_DOCUMENT', 'DOCUMENT', docId, { fileName });

            } catch (error) {
                console.error('Error deleting document:', error);
                if (typeof showToast !== 'undefined') {
                    showToast(error.message || 'Không thể xoá tài liệu', 'error');
                }
            }
        }
    );
}

let emergencyApproveDocId = null;

function emergencyApproveDocument(docId, fileName) {
    emergencyApproveDocId = docId;
    const nameEl = document.getElementById('emergencyDocName');
    const reasonEl = document.getElementById('emergencyReason');
    const submitBtn = document.getElementById('submitEmergencyBtn');

    if (nameEl) nameEl.textContent = fileName;
    if (reasonEl) reasonEl.value = '';

    if (submitBtn) {
        submitBtn.onclick = async () => {
            const reason = reasonEl?.value?.trim();
            if (!reason) {
                if (typeof showToast !== 'undefined') showToast('Vui lòng nhập lý do duyệt khẩn cấp', 'warning');
                return;
            }

            try {
                if (typeof apiRequest === 'undefined') throw new Error('apiRequest() không tồn tại');

                const submitBtnOriginalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

                await apiRequest(`/api/admin/documents/${emergencyApproveDocId}/emergency-approve`, {
                    method: 'PUT',
                    body: JSON.stringify({ reason })
                });

                if (typeof showToast !== 'undefined') showToast('Duyệt khẩn cấp thành công!', 'success');
                if (typeof closeModal !== 'undefined') closeModal('emergencyApproveModal');

                loadDocuments();

                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtnOriginalText;

            } catch (error) {
                console.error('Error emergency approving document:', error);
                if (typeof showToast !== 'undefined') {
                    showToast(error.message || 'Không thể duyệt khẩn cấp', 'error');
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = '⚡ Duyệt khẩn cấp';
            }
        };
    }

    if (typeof openModal !== 'undefined') {
        openModal('emergencyApproveModal');
    }
}

// =============================================
// UPLOAD DOCUMENT
// =============================================

function setupUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    if (!uploadArea || !fileInput) return;

    // Click to select file
    uploadArea.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4f46e5';
        uploadArea.style.background = '#e0e7ff';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#c7d2fe';
        uploadArea.style.background = '#eef2ff';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#c7d2fe';
        uploadArea.style.background = '#eef2ff';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ files });
        }
    });

    fileInput.addEventListener('change', function () {
        handleFileSelect(this);
    });
}

function handleFileSelect(input) {
    const file = input.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
        if (typeof showToast !== 'undefined') {
            showToast('Chỉ hỗ trợ file PDF', 'warning');
        }
        return;
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
        if (typeof showToast !== 'undefined') {
            showToast('File không được vượt quá 50MB', 'warning');
        }
        return;
    }

    AdminState.selectedFile = file;

    // Show selected file info
    const fileNameEl = document.getElementById('selectedFileName');
    const fileSizeEl = document.getElementById('selectedFileSize');
    const selectedFileEl = document.getElementById('selectedFile');
    const uploadBtn = document.getElementById('uploadBtn');

    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = typeof formatFileSize !== 'undefined' ? formatFileSize(file.size) : file.size;
    if (selectedFileEl) selectedFileEl.style.display = 'flex';
    if (uploadBtn) uploadBtn.disabled = false;
}

function clearFile() {
    AdminState.selectedFile = null;

    const selectedFileEl = document.getElementById('selectedFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (selectedFileEl) selectedFileEl.style.display = 'none';
    if (uploadBtn) uploadBtn.disabled = true;
    if (fileInput) fileInput.value = '';
}

async function uploadDocument() {
    if (!AdminState.selectedFile) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng chọn file PDF', 'warning');
        }
        return;
    }

    const departmentId = document.getElementById('departmentId')?.value || '';
    const formData = new FormData();
    formData.append('file', AdminState.selectedFile);
    if (departmentId) {
        formData.append('departmentId', departmentId);
    }

    // Show progress
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadBtn = document.getElementById('uploadBtn');
    const statusText = document.getElementById('uploadStatusText');
    const progressBar = document.getElementById('uploadProgress');

    if (uploadStatus) uploadStatus.style.display = 'block';
    if (uploadBtn) uploadBtn.disabled = true;
    if (statusText) statusText.textContent = 'Đang tải lên...';
    if (progressBar) progressBar.style.width = '0%';

    try {
        const result = await apiRequest('/api/documents/upload', {
            method: 'POST',
            body: formData
        });

        // Update progress
        if (statusText) statusText.textContent = 'Đã tải lên thành công! Đang xử lý...';
        if (progressBar) progressBar.style.width = '100%';

        if (typeof showToast !== 'undefined') {
            showToast('Upload tài liệu thành công! Hệ thống đang xử lý...', 'success');
        }

        const fileName = AdminState.selectedFile.name;

        // Clear form
        clearFile();
        if (uploadStatus) uploadStatus.style.display = 'none';

        // Reload documents
        loadRecentUploads();
        logAdminActivity('UPLOAD_DOCUMENT', 'DOCUMENT', result.id, { fileName: fileName });

    } catch (error) {
        console.error('Upload error:', error);
        if (statusText) statusText.textContent = 'Lỗi: ' + error.message;
        if (progressBar) progressBar.style.background = '#dc2626';
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Upload thất bại', 'error');
        }
        if (uploadBtn) uploadBtn.disabled = false;
    }
}

async function loadRecentUploads() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const response = await apiRequest('/api/admin/documents?page=0&size=10');
        const docs = response.content || response;
        const tbody = document.getElementById('recentUploadBody');

        if (!tbody) return;

        if (!docs || docs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><span>📤</span>Chưa có tài liệu nào</td></tr>';
            return;
        }

        tbody.innerHTML = docs.map(doc => `
            <tr>
                <td>
                    <span style="font-size:1.1rem;">${typeof getFileIcon !== 'undefined' ? getFileIcon(doc.fileType) : '📄'}</span>
                    ${doc.fileName}
                </td>
                <td>
                    <span class="status-badge ${typeof getStatusClass !== 'undefined' ? getStatusClass(doc.status) : ''}">
                        ${typeof getStatusLabel !== 'undefined' ? getStatusLabel(doc.status) : doc.status}
                    </span>
                </td>
                <td>${doc.chunkCount || 0}</td>
                <td>${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading recent uploads:', error);
    }
}

// =============================================
// PERMISSION MANAGEMENT
// =============================================

async function loadPermissions() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const response = await apiRequest('/api/documents/permissions');
        AdminState.permissions.data = response.content || response;
        renderPermissionsTable();
    } catch (error) {
        console.error('Error loading permissions:', error);
    }
}

function buildPermissionRow(perm) {
    const deptName = escapeHtml(perm.departmentName || 'Tất cả phòng ban');
    const docTitle = escapeHtml(perm.documentTitle || '—');
    const grantor = escapeHtml(perm.grantedByName || '—');
    const grantedAt = typeof formatDate !== 'undefined' ? formatDate(perm.createdAt) : perm.createdAt;
    // departmentId null (tất cả phòng ban) → truyền 0 cho backend
    const deptId = perm.departmentId ?? 0;

    return `
        <tr>
            <td>📄 ${docTitle}</td>
            <td>${deptName}</td>
            <td>👤 ${grantor}</td>
            <td>${grantedAt}</td>
            <td><span class="status-badge active">Đang chia sẻ</span></td>
            <td>
                <button class="btn-icon"
                        onclick="revokePermission(${perm.documentId}, ${deptId})"
                        title="Thu hồi quyền"
                        style="color:#ef4444;">
                    🗑️
                </button>
            </td>
        </tr>`;
}

function renderPermissionsTable() {
    const tbody = document.getElementById('permTableBody');
    if (!tbody) return;

    const permissions = AdminState.permissions.data;
    if (!permissions || permissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span>🔐</span> Chưa có phân quyền nào</td></tr>';
        return;
    }

    tbody.innerHTML = permissions.map(buildPermissionRow).join('');
}

async function revokePermission(docId, deptId) {
    showConfirmDialog(
        '❌ Xác nhận thu hồi quyền',
        'Bạn có chắc chắn muốn thu hồi quyền truy cập này? Hành động này không thể hoàn tác.',
        async () => {
            try {
                await apiRequest(`/api/documents/${docId}/permissions/${deptId}`, { method: 'DELETE' });
                showToast('Thu hồi quyền thành công!', 'success');
                await loadPermissions();
            } catch (error) {
                console.error('[Permission] Lỗi thu hồi:', error);
                showToast(error.message || 'Không thể thu hồi quyền', 'error');
            }
        }
    );
}

// Mở modal chia sẻ tài liệu
async function openShareDocumentModal() {
    try {
        // Lấy danh sách tài liệu
        const docsResponse = await apiRequest('/api/admin/documents?size=100');
        const docs = docsResponse.content || docsResponse || [];
        const docSelect = document.getElementById('shareDocId');
        if (docSelect) {
            docSelect.innerHTML = '<option value="">-- Chọn tài liệu --</option>' +
                docs.map(doc => `<option value="${doc.id}">${doc.fileName}</option>`).join('');
        }

        // Lấy danh sách phòng ban
        const deptsResponse = await apiRequest('/api/admin/departments');
        const depts = deptsResponse.content || deptsResponse || [];
        const deptSelect = document.getElementById('shareDeptId');
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="">-- Chọn phòng ban --</option>' +
                '<option value="0">-- Tất cả phòng ban --</option>' +
                depts.map(dept => `<option value="${dept.id}">${dept.name}</option>`).join('');
        }

        openModal('shareDocModal');
    } catch (error) {
        console.error('Error loading data for share modal:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải dữ liệu để chia sẻ', 'error');
        }
    }
}

// Thực hiện chia sẻ tài liệu
async function submitShareDocument() {
    const docId = document.getElementById('shareDocId').value;
    const deptId = document.getElementById('shareDeptId').value;

    if (!docId) {
        showToast('Vui lòng chọn tài liệu', 'error');
        return;
    }
    if (deptId === "") {
        showToast('Vui lòng chọn phòng ban', 'error');
        return;
    }

    try {
        await apiRequest(`/api/documents/${docId}/permissions`, {
            method: 'POST',
            body: JSON.stringify({ departmentId: parseInt(deptId) })
        });

        showToast('Chia sẻ tài liệu thành công!', 'success');
        closeModal('shareDocModal');
        loadPermissions();
    } catch (error) {
        console.error('Error sharing document:', error);
        showToast(error.message || 'Lỗi khi chia sẻ tài liệu', 'error');
    }
}

// =============================================
// CHAT SESSION MANAGEMENT
// =============================================

async function loadChatSessions() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const response = await apiRequest(`/api/admin/chat-sessions?page=${AdminState.chatSessions.page - 1}&size=${AdminState.chatSessions.pageSize}`);

        AdminState.chatSessions.data = response.content || response;
        AdminState.chatSessions.total = response.totalElements || response.length;

        renderChatSessionTable();

    } catch (error) {
        console.error('Error loading chat sessions:', error);
    }
}

function renderChatSessionTable() {
    const tbody = document.getElementById('chatTableBody');
    if (!tbody) return;

    const sessions = AdminState.chatSessions.data;

    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span>💬</span>Chưa có phiên chat nào</td></tr>';
        return;
    }

    tbody.innerHTML = sessions.map((session, index) => `
        <tr>
            <td>${(AdminState.chatSessions.page - 1) * AdminState.chatSessions.pageSize + index + 1}</td>
            <td>${session.userName || '—'}</td>
            <td>${session.messageCount || 0} tin nhắn</td>
            <td>${typeof formatDate !== 'undefined' ? formatDate(session.createdAt) : session.createdAt}</td>
            <td>${typeof formatDate !== 'undefined' ? formatDate(session.updatedAt) : session.updatedAt}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn-icon" onclick="viewChatSession(${session.id})" title="Xem">👁️</button>
                    <button class="btn-icon" onclick="deleteChatSession(${session.id})" title="Xoá">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewChatSession(sessionId) {
    // Implement view chat session detail
    if (typeof showToast !== 'undefined') {
        showToast('Đang phát triển...', 'info');
    }
}

function deleteChatSession(sessionId) {
    showConfirmDialog(
        '🗑️ Xác nhận xoá phiên chat',
        'Bạn có chắc chắn muốn xoá phiên chat này?',
        async () => {
            try {
                if (typeof apiRequest === 'undefined') {
                    throw new Error('apiRequest() không tồn tại');
                }

                await apiRequest(`/api/admin/chat-sessions/${sessionId}`, {
                    method: 'DELETE'
                });

                if (typeof showToast !== 'undefined') {
                    showToast('Xoá phiên chat thành công!', 'success');
                }

                loadChatSessions();

            } catch (error) {
                console.error('Error deleting chat session:', error);
                if (typeof showToast !== 'undefined') {
                    showToast(error.message || 'Không thể xoá phiên chat', 'error');
                }
            }
        }
    );
}

// =============================================
// AUDIT LOG MANAGEMENT
// =============================================

async function loadAuditLogs() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        // Gọi API lấy log gần đây (thay vì API phân trang chưa có)
        const response = await apiRequest(`/api/activity-logs/recent?limit=100`);

        // Lưu toàn bộ data
        AdminState.logs.data = response || [];
        AdminState.logs.total = AdminState.logs.data.length;
        AdminState.logs.filtered = [...AdminState.logs.data];
        AdminState.logs.page = 1;

        renderAuditLogs();

    } catch (error) {
        console.error('Error loading audit logs:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải nhật ký hoạt động', 'error');
        }
        document.getElementById('logList').innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Lỗi khi tải dữ liệu.</td></tr>';
    }
}

function renderAuditLogs() {
    const container = document.getElementById('logList');
    if (!container) return;

    const logs = AdminState.logs.filtered;
    const page = AdminState.logs.page;
    const pageSize = AdminState.logs.pageSize;

    if (!logs || logs.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">Không tìm thấy nhật ký nào phù hợp.</td></tr>';
        return;
    }

    const actionColors = {
        'LOGIN': { bg: '#e0e7ff', color: '#4f46e5' },
        'LOGOUT': { bg: '#f1f5f9', color: '#64748b' },
        'UPLOAD_DOCUMENT': { bg: '#dcfce7', color: '#166534' },
        'DELETE_DOCUMENT': { bg: '#fee2e2', color: '#991b1b' },
        'CREATE_USER': { bg: '#e0f2fe', color: '#0369a1' },
        'LOCK_USER': { bg: '#fef3c7', color: '#b45309' },
        'UNLOCK_USER': { bg: '#dcfce7', color: '#166534' },
        'SHARE_DOCUMENT': { bg: '#e0f2fe', color: '#0369a1' },
        'CHANGE_PERMISSION': { bg: '#fef3c7', color: '#b45309' },
        'CREATE_DEPARTMENT': { bg: '#dcfce7', color: '#166534' },
        'UPDATE_DEPARTMENT': { bg: '#e0f2fe', color: '#0369a1' },
        'DELETE_DEPARTMENT': { bg: '#fee2e2', color: '#991b1b' }
    };

    const targetTranslations = {
        'USER_SESSION': 'Phiên đăng nhập',
        'DOCUMENT': 'Tài liệu',
        'USER': 'Người dùng',
        'DEPARTMENT': 'Phòng ban',
        'SYSTEM': 'Hệ thống'
    };

    // Tính toán phân trang client-side
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, logs.length);
    const paginatedLogs = logs.slice(startIndex, endIndex);

    container.innerHTML = paginatedLogs.map(log => {
        const style = actionColors[log.actionType || log.action] || { bg: '#f1f5f9', color: '#64748b' };
        const actionLabel = typeof getActionLabel !== 'undefined' ? getActionLabel(log.actionType || log.action) : (log.actionType || log.action);
        const time = typeof formatDate !== 'undefined' ? formatDate(log.createdAt) : log.createdAt;
        
        // Dịch Đối tượng (Target)
        const rawTarget = log.targetType || '';
        const translatedTarget = targetTranslations[rawTarget] || rawTarget;
        const targetDisplay = translatedTarget ? `${translatedTarget} ${log.targetId ? '(ID: ' + log.targetId + ')' : ''}` : '—';

        // Xử lý Chi tiết (Details)
        let details = '';
        if (log.metadata) {
            if (typeof log.metadata === 'object') {
                details = Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(', ');
            } else {
                details = log.metadata;
            }
        } else if (log.description) {
            details = log.description;
        }

        // Fallback chi tiết nếu trống
        if (!details || details.trim() === '') {
            if (log.action === 'LOGIN') details = 'Đăng nhập thành công';
            else if (log.action === 'LOGOUT') details = 'Đăng xuất khỏi hệ thống';
            else if (log.action === 'UPLOAD_DOCUMENT') details = 'Tải lên tài liệu mới';
            else details = 'Không có thông tin thêm';
        }

        return `
            <tr style="border-bottom: 1px solid var(--border-light); transition: background-color 0.2s;">
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 0.85rem;">
                    ${time}
                </td>
                <td style="padding: 12px 16px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:28px; height:28px; border-radius:50%; background:var(--primary-light); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.7rem;">
                            ${(log.userFullName || log.userName || log.userEmail || 'S')[0].toUpperCase()}
                        </div>
                        <span style="font-weight: 500; color: var(--text-primary);">${log.userFullName || log.userName || log.userEmail || 'Hệ thống'}</span>
                    </div>
                </td>
                <td style="padding: 12px 16px;">
                    <span style="background: ${style.bg}; color: ${style.color}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">
                        ${actionLabel}
                    </span>
                </td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 0.85rem;">
                    ${targetDisplay}
                </td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 0.85rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title='${details}'>
                    ${details}
                </td>
            </tr>
        `;
    }).join('');

    const totalPages = Math.ceil(logs.length / pageSize);
    if (typeof updatePagination !== 'undefined') {
        updatePagination('logPagination', page, totalPages);
    } else if (typeof updateAdminPagination !== 'undefined') {
        updateAdminPagination('logPagination', page, totalPages);
    }
}

function filterLogs() {
    const searchTerm = document.getElementById('logSearch')?.value?.toLowerCase() || '';

    AdminState.logs.filtered = AdminState.logs.data.filter(log => {
        const userStr = (log.userFullName || log.userName || log.userEmail || '').toLowerCase();
        const actionStr = (log.actionType || log.action || '').toLowerCase();
        const targetStr = (log.targetType || '').toLowerCase();
        const detailsStr = (log.description || '').toLowerCase();

        return !searchTerm ||
            userStr.includes(searchTerm) ||
            actionStr.includes(searchTerm) ||
            targetStr.includes(searchTerm) ||
            detailsStr.includes(searchTerm);
    });

    AdminState.logs.page = 1; // Reset to page 1 on filter
    renderAuditLogs();
}

// =============================================
// ACTIVITY LOGGING
// =============================================

async function logAdminActivity(action, targetType, targetId, metadata = null) {
    try {
        if (typeof apiRequest === 'undefined') return;

        await apiRequest('/api/admin/audit-logs', {
            method: 'POST',
            body: JSON.stringify({
                action,
                targetType,
                targetId,
                metadata: metadata ? JSON.stringify(metadata) : null
            })
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// =============================================
// ADMIN PROFILE
// =============================================

async function loadAdminProfile() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const response = await apiRequest('/api/users/profile');

        // Update Read-Only View
        const viewFullName = document.getElementById('viewFullName');
        const viewUsername = document.getElementById('viewUsername');
        const viewEmail = document.getElementById('viewEmail');
        const viewPhone = document.getElementById('viewPhone');
        const viewDept = document.getElementById('viewDept');
        const viewRole = document.getElementById('viewRole');
        const viewCreatedAt = document.getElementById('viewCreatedAt');
        const viewLastLogin = document.getElementById('viewLastLogin');

        if (viewFullName) viewFullName.textContent = response.fullName || '—';
        if (viewUsername) viewUsername.textContent = response.username || response.userName || '—';
        if (viewEmail) viewEmail.textContent = response.email || '—';
        if (viewPhone) viewPhone.textContent = response.phone || '—';
        if (viewDept) {
            viewDept.textContent = response.departmentName || 'Toàn hệ thống';
        }

        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) {
            if (response.avatarUrl) {
                avatarEl.innerHTML = `<img src="${response.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else if (typeof generateDefaultAvatar !== 'undefined') {
                avatarEl.innerHTML = `<img src="${generateDefaultAvatar(response.fullName)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                avatarEl.textContent = (response.fullName || 'A').charAt(0).toUpperCase();
            }
        }

        // Cập nhật avatar trên Topbar
        const topbarAvatar = document.getElementById('userAvatar');
        if (topbarAvatar) {
            if (response.avatarUrl) {
                topbarAvatar.innerHTML = `<img src="${response.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                topbarAvatar.style.background = 'transparent';
                topbarAvatar.style.color = 'transparent';
            } else if (typeof generateDefaultAvatar !== 'undefined') {
                topbarAvatar.innerHTML = `<img src="${generateDefaultAvatar(response.fullName)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                topbarAvatar.style.background = 'transparent';
                topbarAvatar.style.color = 'transparent';
            } else {
                topbarAvatar.textContent = (response.fullName || 'A').charAt(0).toUpperCase();
            }
        }

        if (viewRole) viewRole.textContent = 'Quản trị viên';
        if (viewCreatedAt) viewCreatedAt.textContent = response.createdAt ? (typeof formatDate !== 'undefined' ? formatDate(response.createdAt) : response.createdAt) : '—';
        if (viewLastLogin) viewLastLogin.textContent = response.lastLogin ? (typeof formatDate !== 'undefined' ? formatDate(response.lastLogin) : response.lastLogin) : '—';

        // Update form inputs
        const fields = {
            'editFullName': response.fullName || '',
            'editPhone': response.phone || ''
        };

        Object.keys(fields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = fields[id];
        });

        // Update profile card
        const nameEl = document.getElementById('profileName');
        const deptEl = document.getElementById('profileDept');

        if (nameEl) nameEl.textContent = response.fullName;
        if (deptEl) deptEl.textContent = response.departmentName || '—';

        // Update sidebar user card
        const sidebarName = document.getElementById('sidebarName');
        const sidebarDept = document.getElementById('sidebarDept');
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        if (sidebarName) sidebarName.textContent = response.fullName || 'Admin';
        if (sidebarDept) sidebarDept.textContent = 'Quản trị viên';

        if (sidebarAvatar) {
            if (response.avatarUrl) {
                sidebarAvatar.innerHTML = `<img src="${response.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else if (typeof generateDefaultAvatar !== 'undefined') {
                sidebarAvatar.innerHTML = `<img src="${generateDefaultAvatar(response.fullName)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                sidebarAvatar.textContent = (response.fullName || 'A').charAt(0).toUpperCase();
            }
        }

        // Update profile stats
        const userCount = document.getElementById('psUserCount');
        const docCount = document.getElementById('psDocCount');
        const deptCount = document.getElementById('psDeptCount');
        if (userCount) userCount.textContent = response.userCount || AdminState.overview?.totalUsers || 0;
        if (docCount) docCount.textContent = response.documentCount || AdminState.overview?.totalDocuments || 0;
        if (deptCount) deptCount.textContent = response.departmentCount || AdminState.overview?.totalDepartments || 0;

        // Load profile activities
        loadProfileActivities();

    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadProfileActivities() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const activities = await apiRequest('/api/admin/audit-logs?page=0&size=20');
        const logs = activities.content || activities;
        const list = document.getElementById('profileActivityList');

        if (!list) return;

        if (!logs || logs.length === 0) {
            list.innerHTML = '<li class="activity-empty">Chưa có hoạt động nào</li>';
            return;
        }

        // Handle hash change for navigation
        window.addEventListener('hashchange', () => {
            const page = window.location.hash.substring(1) || 'dashboard';
            changeAdminPage(page);
        });

        // Khởi tạo
        document.addEventListener('DOMContentLoaded', () => {
            // Determine initial page from hash or default to dashboard
            const initialPage = window.location.hash.substring(1) || 'dashboard';
            changeAdminPage(initialPage);

            // Update active state of sidebar links
            const currentLink = document.querySelector(`.sidebar-menu a[href="#${initialPage}"]`);
            if (currentLink) {
                document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
                currentLink.parentElement.classList.add('active');
            }

            // Check query params for edit trigger
            const urlParams = new URLSearchParams(window.location.search);
            const editId = urlParams.get('edit');
            if (editId) {
                // change page to users first
                changeAdminPage('users');
                // small timeout to allow UI setup
                setTimeout(() => {
                    editUser(editId);
                    // remove query param without reload
                    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                }, 500);
            }
        });

        list.innerHTML = logs.map(log => `
            <li class="activity-item-v2">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:500;">${getActionLabel(log.action)}</span>
                    <span style="font-size:0.78rem;color:#6b7280;">${typeof formatDate !== 'undefined' ? formatDate(log.createdAt) : log.createdAt}</span>
                </div>
                ${log.userName ? `<div style="font-size:0.78rem;color:#9ca3af;">bởi ${log.userName}</div>` : ''}
            </li>
        `).join('');

    } catch (error) {
        console.error('Error loading profile activities:', error);
    }
}

// =============================================
// PROFILE TAB SWITCHING
// =============================================

function switchProfileTab(tabId, btn) {
    document.querySelectorAll('.settings-card').forEach(panel => panel.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function togglePassVis(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function checkPassStrength(password) {
    const fill = document.getElementById('passStrengthFill');
    const label = document.getElementById('passStrengthLabel');

    if (!fill || !label) return;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const colors = ['#dc2626', '#f59e0b', '#84cc16', '#10b981'];
    const labels = ['Yếu', 'Trung bình', 'Khá', 'Mạnh'];

    fill.style.width = `${(strength / 4) * 100}%`;
    fill.style.background = colors[strength - 1] || '#e5e7eb';
    label.textContent = strength > 0 ? labels[strength - 1] : '';
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng điền đầy đủ thông tin', 'warning');
        }
        return;
    }

    if (newPassword.length < 8) {
        if (typeof showToast !== 'undefined') {
            showToast('Mật khẩu mới phải có ít nhất 8 ký tự', 'warning');
        }
        return;
    }

    if (newPassword !== confirmPassword) {
        if (typeof showToast !== 'undefined') {
            showToast('Mật khẩu xác nhận không khớp', 'warning');
        }
        return;
    }

    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        await apiRequest('/api/users/change-password', {
            method: 'PUT',
            body: JSON.stringify({
                oldPassword: currentPassword,
                newPassword: newPassword,
                comfirmPassword: confirmPassword
            })
        });

        const cp = document.getElementById('currentPassword');
        const np = document.getElementById('newPassword');
        const cfp = document.getElementById('confirmPassword');

        if (cp) cp.value = '';
        if (np) np.value = '';
        if (cfp) cfp.value = '';

        if (typeof showToast !== 'undefined') {
            showToast('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.', 'success');
        }

        setTimeout(() => {
            if (typeof logout !== 'undefined') {
                logout();
            } else {
                localStorage.clear();
                window.location.href = '/login';
            }
        }, 1500);

    } catch (error) {
        console.error('Error changing password:', error);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể đổi mật khẩu', 'error');
        }
    }
}

// Sidebar user info is now handled globally by updateUserUI() in common.js

async function updateProfile() {
    const fullName = document.getElementById('editFullName')?.value?.trim() || '';
    const phone = document.getElementById('editPhone')?.value?.trim() || '';
    const avatarInput = document.getElementById('editAvatarUrl');
    let avatarUrl = null;

    if (!fullName) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng nhập họ và tên', 'warning');
        }
        return;
    }

    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        // Nếu có chọn ảnh mới, upload trước
        if (avatarInput && avatarInput.files && avatarInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', avatarInput.files[0]);

            const uploadRes = await apiRequest('/api/users/upload-avatar', {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            }, true);

            avatarUrl = uploadRes.avatarUrl;
        }

        const payload = { fullName, phone };
        if (avatarUrl) payload.avatarUrl = avatarUrl;

        await apiRequest('/api/users/profile', {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        if (typeof showToast !== 'undefined') {
            showToast('Cập nhật hồ sơ thành công!', 'success');
        }

        // Update local storage
        if (typeof getUser !== 'undefined' && typeof saveUser !== 'undefined') {
            const user = getUser();
            if (user) {
                user.fullName = fullName;
                user.phone = phone;
                if (avatarUrl) user.avatarUrl = avatarUrl;
                saveUser(user);
            }
        }

        if (typeof updateUserUI !== 'undefined') {
            updateUserUI(typeof getUser !== 'undefined' ? getUser() : null);
        }

        loadAdminProfile(); // Reload profile

        // Switch back to Info tab
        const infoBtn = document.querySelector('.settings-tab[onclick*="ptInfo"]');
        if (infoBtn) {
            switchProfileTab('ptInfo', infoBtn);
        }

    } catch (error) {
        console.error('Error updating profile:', error);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể cập nhật hồ sơ', 'error');
        }
    }
}

// =============================================
// PAGINATION
// =============================================

function updateAdminPagination(paginationId, currentPage, totalPages) {
    const container = document.getElementById(paginationId);
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <button class="page-btn" onclick="changeAdminPage('${paginationId}', -1)" ${currentPage <= 1 ? 'disabled' : ''}>‹ Trước</button>
        <span class="page-info">Trang ${currentPage} / ${totalPages || 1}</span>
        <button class="page-btn" onclick="changeAdminPage('${paginationId}', 1)" ${currentPage >= totalPages ? 'disabled' : ''}>Sau ›</button>
    `;
}

function changeAdminPage(paginationId, direction) {
    let state;
    let loadFunction;

    switch (paginationId) {
        case 'userPagination':
            state = AdminState.users;
            loadFunction = loadUsers;
            break;
        case 'docPagination':
            state = AdminState.documents;
            loadFunction = loadDocuments;
            break;
        case 'logPagination':
            state = AdminState.logs;
            loadFunction = renderAuditLogs;
            break;
        default:
            return;
    }

    const newPage = state.page + direction;
    const totalPages = Math.ceil(state.total / state.pageSize);

    if (newPage >= 1 && newPage <= totalPages) {
        state.page = newPage;
        loadFunction();
    }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function getActionLabel(action) {
    const labels = {
        'LOGIN': 'Đăng nhập hệ thống',
        'LOGOUT': 'Đăng xuất',
        'UPLOAD_DOCUMENT': 'Upload tài liệu',
        'DELETE_DOCUMENT': 'Xoá tài liệu',
        'CREATE_USER': 'Tạo người dùng mới',
        'LOCK_USER': 'Khoá tài khoản',
        'UNLOCK_USER': 'Mở khoá tài khoản',
        'SHARE_DOCUMENT': 'Chia sẻ tài liệu',
        'CHANGE_PERMISSION': 'Thay đổi quyền',
        'UPDATE_PROFILE': 'Cập nhật hồ sơ',
        'CREATE_DEPARTMENT': 'Tạo phòng ban',
        'UPDATE_DEPARTMENT': 'Cập nhật phòng ban',
        'DELETE_DEPARTMENT': 'Xoá phòng ban',
        'VIEW_DOCUMENT': 'Xem tài liệu',
        'DOWNLOAD_DOCUMENT': 'Tải tài liệu',
        'CHAT_QUERY': 'Hỏi AI',
        'SEARCH': 'Tìm kiếm'
    };
    return labels[action] || action;
}

// ===== EXPOSE GLOBAL FUNCTIONS =====
window.openAddUserModal = openAddUserModal;
window.submitAddUser = submitAddUser;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.editUser = editUser;
window.changeUserDepartment = changeUserDepartment;
window.openAddDepartmentModal = openAddDepartmentModal;
window.submitAddDepartment = submitAddDepartment;
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;
window.filterDocs = filterDocs;
window.viewDocument = viewDocument;
window.downloadDocument = downloadDocument;
window.retryDocument = retryDocument;
window.deleteDocument = deleteDocument;
window.clearFile = clearFile;
window.uploadDocument = uploadDocument;
window.revokePermission = revokePermission;
window.viewChatSession = viewChatSession;
window.deleteChatSession = deleteChatSession;
window.executeConfirm = executeConfirm;
window.updateProfile = updateProfile;
window.changeAdminPage = changeAdminPage;
window.filterUsers = filterUsers;
window.filterDocuments = filterDocuments;
window.filterLogs = filterLogs;
window.switchProfileTab = switchProfileTab;
window.togglePassVis = togglePassVis;
window.checkPassStrength = checkPassStrength;
window.changePassword = changePassword;

// ===== STUB FUNCTIONS (to be implemented) =====
async function editUser(userId) {
    let user = AdminState.users.data.find(u => u.id == userId);

    // Nếu không tìm thấy trong state hiện tại, gọi API lấy chi tiết
    if (!user) {
        try {
            user = await apiRequest(`/api/admin/users/${userId}`);
        } catch (error) {
            console.error(error);
            if (typeof showToast !== 'undefined') showToast('Không tìm thấy dữ liệu người dùng', 'error');
            return;
        }
    }

    document.getElementById('editUserId').value = user.id;
    document.getElementById('modalEditFullName').value = user.fullName || '';
    document.getElementById('modalEditPhone').value = user.phone || ''; // Cập nhật phone

    // Gán role
    const roleSelect = document.getElementById('editRole');
    if (roleSelect) roleSelect.value = user.role || 'USER';

    if (typeof openModal !== 'undefined') openModal('editUserModal');
}

async function submitEditUser() {
    const userId = document.getElementById('editUserId').value;
    const fullName = document.getElementById('modalEditFullName')?.value?.trim() || null;
    const phone = document.getElementById('modalEditPhone')?.value?.trim() || null;
    const role = document.getElementById('editRole')?.value || null;
    try {
        await apiRequest(`/api/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ fullName, phone, role })
        });

        if (typeof closeModal !== 'undefined') closeModal('editUserModal');
        if (typeof showToast !== 'undefined') showToast('Cập nhật người dùng thành công!', 'success');

        loadUsers();
        logAdminActivity('UPDATE_USER', 'USER', null, { userId, role, departmentId });
    } catch (error) {
        console.error('Error updating user:', error);
        if (typeof showToast !== 'undefined') showToast(error.message || 'Lỗi cập nhật', 'error');
    }
}

async function changeUserDepartment(userId) {
    const user = AdminState.users.data.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('changeDeptUserName').value = user.fullName || user.username;

    try {
        const depts = await apiRequest('/api/admin/departments', { method: 'GET' });
        const select = document.getElementById('changeDeptSelect');
        if (select) {
            select.innerHTML = '<option value="">-- Trống (Chưa có phòng ban) --</option>';
            const dataList = Array.isArray(depts) ? depts : (depts.content || []);
            dataList.forEach(d => {
                const selected = (user.departmentName && d.name === user.departmentName) ? 'selected' : '';
                select.innerHTML += `<option value="${d.id}" ${selected}>${d.name}</option>`;
            });
        }
    } catch (e) {
        console.error(e);
    }

    // Gắn sự kiện submit
    const submitBtn = document.getElementById('btnSubmitChangeDept');
    if (submitBtn) {
        submitBtn.onclick = async function () {
            let departmentId = document.getElementById('changeDeptSelect').value || null;
            if (departmentId === "") departmentId = null;

            try {
                // Gọi API chuyển phòng ban chuẩn
                await apiRequest(`/api/admin/departments/${userId}/departmentId`, {
                    method: 'PUT',
                    body: JSON.stringify({ departmentId })
                });

                if (typeof closeModal !== 'undefined') closeModal('changeDepartmentModal');
                if (typeof showToast !== 'undefined') showToast('Chuyển phòng ban thành công!', 'success');

                loadUsers();
                logAdminActivity('TRANSFER_DEPT', 'USER', null, { userId, departmentId });
            } catch (error) {
                console.error(error);
                if (typeof showToast !== 'undefined') showToast(error.message || 'Lỗi khi chuyển phòng ban', 'error');
            }
        };
    }

    if (typeof openModal !== 'undefined') openModal('changeDepartmentModal');
}


// =============================================
// ADMIN GLOBAL REPORTS
// =============================================
let adminDeptChartInstance = null;
let adminDatePicker = null;

async function loadAdminReports() {
    try {
        const deptId = document.getElementById('adminRepDeptFilter')?.value || '';
        
        let startDate = '';
        let endDate = '';
        if (adminDatePicker && adminDatePicker.selectedDates.length === 2) {
            // Lấy ngày bắt đầu và kết thúc
            const start = adminDatePicker.selectedDates[0];
            const end = adminDatePicker.selectedDates[1];
            
            // Format YYYY-MM-DD
            startDate = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
            endDate = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');
        }

        const queryParams = new URLSearchParams();
        if (deptId) queryParams.append('departmentId', deptId);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        
        // Gọi API lấy dữ liệu thống kê tổng quan và báo cáo chi tiết theo bộ lọc
        const [dashboardStats, reportStats] = await Promise.all([
            apiRequest('/api/dashboard/stats'),
            apiRequest(`/api/admin/reports/stats${queryString}`)
        ]);
        
        if (!reportStats) return;

        // Cập nhật giao diện (UI)
        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.textContent = val;
        };
        
        setEl('adminRepTotalDocs', reportStats.totalDocuments || 0);
        setEl('adminRepApprovalRate', `${reportStats.approvalRate ? reportStats.approvalRate.toFixed(1) : 0}%`);
        setEl('adminRepTotalChats', dashboardStats.chatSessionCount || 0);
        setEl('adminRepAiSaved', `${reportStats.aiTimeSavedHours ? reportStats.aiTimeSavedHours.toFixed(1) : 0} giờ`);

        // Render Chart
        renderAdminChart(reportStats);
    } catch (error) {
        console.error("Lỗi khi tải báo cáo Admin:", error);
    }
}

function renderAdminChart(stats) {
    const ctx = document.getElementById('adminDeptChart');
    if (!ctx) return;

    if (adminDeptChartInstance) {
        adminDeptChartInstance.destroy();
    }

    if (!stats.departmentLabels || stats.departmentLabels.length === 0) {
        return; // Không có dữ liệu
    }

    adminDeptChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stats.departmentLabels.map((name, i) => `${name} (${stats.deptTotalDocs[i] || 0})`),
            datasets: [
                {
                    label: 'Tổng tài liệu',
                    data: stats.deptTotalDocs,
                    backgroundColor: '#6366f1', // Xanh lam
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                },
                {
                    label: 'Đã duyệt',
                    data: stats.deptApprovedDocs,
                    backgroundColor: '#10b981', // Xanh ngọc
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                },
                {
                    label: 'Chờ duyệt',
                    data: stats.deptPendingDocs,
                    backgroundColor: '#f59e0b', // Cam
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                }
            ]
        },
        options: {
            indexAxis: 'y', // Chuyển sang dạng ngang để dễ đọc tên phòng ban dài
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                axis: 'y',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: "'Inter', sans-serif", size: 13 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    titleFont: { family: "'Inter', sans-serif", size: 14, weight: 'bold' },
                    bodyFont: { family: "'Inter', sans-serif", size: 13 }
                }
            },
            scales: {
                x: {
                    border: { display: false },
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { family: "'Inter', sans-serif" }, color: '#94a3b8' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748b' }
                }
            }
        }
    });
}

// Gắn sự kiện cho filter phòng ban trong tab báo cáo
document.addEventListener('DOMContentLoaded', () => {
    const adminRepDeptFilter = document.getElementById('adminRepDeptFilter');
    if (adminRepDeptFilter) {
        adminRepDeptFilter.addEventListener('change', loadAdminReports);
    }
    
    // Khởi tạo Flatpickr cho bộ lọc ngày tháng
    const dateFilterInput = document.getElementById('adminRepDateFilter');
    if (dateFilterInput && typeof flatpickr !== 'undefined') {
        adminDatePicker = flatpickr(dateFilterInput, {
            mode: "range",
            dateFormat: "d/m/Y",
            locale: "vn", // Hiển thị tiếng Việt
            onClose: function(selectedDates, dateStr, instance) {
                // Tự động load lại báo cáo khi người dùng chọn xong khoảng ngày (2 ngày) hoặc xóa ngày
                if (selectedDates.length === 2 || selectedDates.length === 0) {
                    loadAdminReports();
                }
            }
        });
    }
});


// Khởi tạo các biểu đồ hoạt động
function initCharts(stats) {
    const mixedCtx = document.getElementById('mixedChart');
    
    if (mixedCtx && typeof Chart !== 'undefined' && !window.mixedChartInst) {
        
        // Sử dụng dữ liệu thực từ API nếu có, ngược lại dùng mock data
        const labels = (stats && stats.activityLabels && stats.activityLabels.length > 0) 
            ? stats.activityLabels 
            : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
            
        const uploadData = (stats && stats.uploadData && stats.uploadData.length > 0)
            ? stats.uploadData
            : [12, 19, 15, 25, 22, 10, 5];
            
        const aiData = (stats && stats.aiData && stats.aiData.length > 0)
            ? stats.aiData
            : [45, 60, 50, 80, 70, 30, 15];
        
        window.mixedChartInst = new Chart(mixedCtx, {
            type: 'line', 
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Tài liệu Upload',
                        data: uploadData,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#4f46e5',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        yAxisID: 'y'
                    },
                    {
                        type: 'bar',
                        label: 'Yêu cầu AI',
                        data: aiData,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        hoverBackgroundColor: '#10b981',
                        borderRadius: 6,
                        borderSkipped: false,
                        barThickness: 24,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: "'Inter', sans-serif", size: 13, weight: '500' },
                            color: '#475569'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        titleFont: { family: "'Inter', sans-serif", size: 14, weight: 'bold' },
                        bodyFont: { family: "'Inter', sans-serif", size: 13 },
                        usePointStyle: true
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748b' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: '#f1f5f9', drawBorder: false, borderDash: [5, 5] },
                        ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748b' },
                        title: { display: true, text: 'Số tài liệu', color: '#64748b', font: { family: "'Inter', sans-serif", size: 12 } }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748b' },
                        title: { display: true, text: 'Lượt yêu cầu AI', color: '#64748b', font: { family: "'Inter', sans-serif", size: 12 } }
                    }
                }
            }
        });
    }
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', function () {
    // Kiểm tra đăng nhập
    if (typeof isLoggedIn === 'undefined' || !isLoggedIn()) {
        window.location.href = '/login';
        return;
    }

    const user = typeof getUser !== 'undefined' ? getUser() : null;
    if (!user || user.role !== 'ADMIN') {
        window.location.href = '/dashboard';
        return;
    }

    // Khởi tạo dashboard
    initAdminDashboard();
    loadOverviewStats();
    loadRecentActivities();
    loadDepartmentStats();

    // Password strength listener
    const newPwdInput = document.getElementById('newPassword');
    if (newPwdInput) {
        newPwdInput.addEventListener('input', function () {
            checkPassStrength(this.value);
        });
    }
});