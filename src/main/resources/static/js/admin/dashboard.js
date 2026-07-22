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
    loadOverviewStats();
    loadRecentActivities();
    loadDepartmentStats();
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

            loadTabData(tabId);
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
        case 'tabProfile':
            loadAdminProfile();
            break;
    }
}

// =============================================
// OVERVIEW STATISTICS
// =============================================

async function loadOverviewStats() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        // Tạm thời gọi các API có sẵn để lấy dữ liệu thống kê (do chưa có API /statistics tổng)
        const [usersRes, lockedUsersRes, deptsRes] = await Promise.all([
            apiRequest('/api/admin/users?page=1&size=1'),
            apiRequest('/api/admin/users?status=locked&page=1&size=1'),
            apiRequest('/api/admin/departments')
        ]);

        const elements = {
            'statTotalUsers': usersRes.totalElements || 0,
            'statTotalDepts': Array.isArray(deptsRes) ? deptsRes.length : (deptsRes.content ? deptsRes.content.length : 0),
            'statTotalDocs': '-',
            'statCompletedDocs': '-',
            'statLockedUsers': lockedUsersRes.totalElements || 0,
            'statFailedDocs': '-',
            'statTotalChats': '-',
            'statTotalTokens': '-'
        };

        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = elements[id];
        });

    } catch (error) {
        console.error('Error loading overview stats:', error);
    }
}

async function loadRecentActivities() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const response = await apiRequest('/api/admin/activities?limit=10');
        const list = document.getElementById('recentActivityList');

        if (!list) return;

        if (!response || response.length === 0) {
            list.innerHTML = '<li class="activity-item"><div class="activity-dot indigo"></div><div class="activity-info"><p>Chưa có hoạt động nào</p><span>—</span></div></li>';
            return;
        }

        const actionIcons = {
            'LOGIN': '🔑',
            'LOGOUT': '🚪',
            'UPLOAD_DOCUMENT': '📤',
            'DELETE_DOCUMENT': '🗑️',
            'CREATE_USER': '➕',
            'LOCK_USER': '🔒',
            'UNLOCK_USER': '🔓',
            'SHARE_DOCUMENT': '🔗',
            'CHANGE_PERMISSION': '🔐',
            'UPDATE_PROFILE': '👤',
            'CREATE_DEPARTMENT': '🏢',
            'UPDATE_DEPARTMENT': '✏️',
            'DELETE_DEPARTMENT': '🗑️'
        };

        const actionColors = {
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

        list.innerHTML = response.map(log => `
            <li class="activity-item">
                <div class="activity-dot ${actionColors[log.action] || 'indigo'}"></div>
                <div class="activity-info">
                    <p>${actionIcons[log.action] || '📋'} ${getActionLabel(log.action)} - ${log.userName || 'Hệ thống'}</p>
                    <span>${typeof formatDate !== 'undefined' ? formatDate(log.createdAt) : log.createdAt}</span>
                </div>
            </li>
        `).join('');

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
                    <span style="font-weight:600;font-size:0.85rem;">🏢 ${dept.name}</span>
                    <span style="font-size:0.8rem;color:#6b7280;">${dept.documentCount || 0} tài liệu</span>
                </div>
                <div style="font-size:0.75rem;color:#9ca3af;margin-top:4px;">
                    👥 ${dept.userCount || 0} người dùng | 💬 ${dept.chatCount || 0} phiên chat
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
        actionBtn.className = 'btn-danger-sm';
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

        select.innerHTML = '<option value="">-- Chọn phòng ban --</option>';

        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading departments for select:', error);
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

        const response = await apiRequest(`/api/admin/documents?page=${AdminState.documents.page}&size=${AdminState.documents.pageSize}`);

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
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><span>📁</span>Không tìm thấy tài liệu</td></tr>';
        return;
    }

    tbody.innerHTML = docs.map((doc, index) => `
        <tr>
            <td>${(AdminState.documents.page - 1) * AdminState.documents.pageSize + index + 1}</td>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:1.3rem;">${typeof getFileIcon !== 'undefined' ? getFileIcon(doc.fileType) : '📄'}</span>
                    <span style="font-weight:500;">${doc.fileName || '—'}</span>
                </div>
            </td>
            <td>${doc.departmentName || '—'}</td>
            <td>
                <span class="status-badge ${typeof getStatusClass !== 'undefined' ? getStatusClass(doc.status) : ''}">
                    ${typeof getStatusLabel !== 'undefined' ? getStatusLabel(doc.status) : doc.status}
                </span>
            </td>
            <td>${doc.chunkCount || 0}</td>
            <td>${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn-icon" onclick="viewDocument(${doc.id})" title="Xem">👁️</button>
                    <button class="btn-icon" onclick="downloadDocument(${doc.id})" title="Tải xuống">⬇️</button>
                    ${doc.status === 'FAILED' ? `<button class="btn-icon" onclick="retryDocument(${doc.id})" title="Thử lại">🔄</button>` : ''}
                    <button class="btn-icon" onclick="deleteDocument(${doc.id}, '${doc.fileName}')" title="Xoá">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

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
            downloadBtn.onclick = () => downloadDocument(docId);
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

function downloadDocument(docId) {
    const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : localStorage.getItem('accessToken');
    window.open(`${API_BASE}/api/documents/${docId}/download?token=${token}`, '_blank');
}

async function retryDocument(docId) {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        await apiRequest(`/api/admin/documents/${docId}/retry`, {
            method: 'POST'
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
        const response = await apiRequest('/api/admin/documents/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Upload thất bại');
        }

        const result = await response.json();

        // Update progress
        if (statusText) statusText.textContent = 'Đã tải lên thành công! Đang xử lý...';
        if (progressBar) progressBar.style.width = '100%';

        if (typeof showToast !== 'undefined') {
            showToast('Upload tài liệu thành công! Hệ thống đang xử lý...', 'success');
        }

        // Clear form
        clearFile();
        if (uploadStatus) uploadStatus.style.display = 'none';

        // Reload documents
        loadRecentUploads();
        logAdminActivity('UPLOAD_DOCUMENT', 'DOCUMENT', result.id, { fileName: AdminState.selectedFile.name });

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

        const response = await apiRequest('/api/admin/documents?page=1&size=10');
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

        const response = await apiRequest('/api/admin/permissions');
        AdminState.permissions.data = response.content || response;
        renderPermissionsTable();
    } catch (error) {
        console.error('Error loading permissions:', error);
    }
}

function renderPermissionsTable() {
    const tbody = document.getElementById('permTableBody');
    if (!tbody) return;

    const permissions = AdminState.permissions.data;

    if (!permissions || permissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span>🔐</span>Chưa có phân quyền nào</td></tr>';
        return;
    }

    tbody.innerHTML = permissions.map(perm => `
        <tr>
            <td>📄 ${perm.documentName || '—'}</td>
            <td>🏢 ${perm.departmentName || '—'}</td>
            <td>👤 ${perm.grantedByName || '—'}</td>
            <td>${typeof formatDate !== 'undefined' ? formatDate(perm.createdAt) : perm.createdAt}</td>
            <td>
                <span class="status-badge active">Đang chia sẻ</span>
            </td>
            <td>
                <button class="btn-icon" onclick="revokePermission(${perm.id})" title="Thu hồi quyền">❌</button>
            </td>
        </tr>
    `).join('');
}

async function revokePermission(permId) {
    showConfirmDialog(
        '❌ Xác nhận thu hồi quyền',
        'Bạn có chắc chắn muốn thu hồi quyền truy cập này?',
        async () => {
            try {
                if (typeof apiRequest === 'undefined') {
                    throw new Error('apiRequest() không tồn tại');
                }

                await apiRequest(`/api/admin/permissions/${permId}`, {
                    method: 'DELETE'
                });

                if (typeof showToast !== 'undefined') {
                    showToast('Thu hồi quyền thành công!', 'success');
                }

                loadPermissions();

            } catch (error) {
                console.error('Error revoking permission:', error);
                if (typeof showToast !== 'undefined') {
                    showToast(error.message || 'Không thể thu hồi quyền', 'error');
                }
            }
        }
    );
}

// =============================================
// CHAT SESSION MANAGEMENT
// =============================================

async function loadChatSessions() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const response = await apiRequest(`/api/admin/chat-sessions?page=${AdminState.chatSessions.page}&size=${AdminState.chatSessions.pageSize}`);

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

        const response = await apiRequest(`/api/admin/audit-logs?page=${AdminState.logs.page}&size=${AdminState.logs.pageSize}`);

        AdminState.logs.data = response.content || response;
        AdminState.logs.total = response.totalElements || response.length;
        AdminState.logs.filtered = [...AdminState.logs.data];

        renderAuditLogs();

    } catch (error) {
        console.error('Error loading audit logs:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải nhật ký hoạt động', 'error');
        }
    }
}

function renderAuditLogs() {
    const container = document.getElementById('logList');
    if (!container) return;

    const logs = AdminState.logs.filtered;

    if (!logs || logs.length === 0) {
        container.innerHTML = '<li class="activity-item"><div class="activity-dot indigo"></div><div class="activity-info"><p>Không có nhật ký nào</p><span>—</span></div></li>';
        return;
    }

    const actionColors = {
        'LOGIN': 'indigo',
        'LOGOUT': 'indigo',
        'UPLOAD_DOCUMENT': 'green',
        'DELETE_DOCUMENT': 'red',
        'CREATE_USER': 'sky',
        'LOCK_USER': 'amber',
        'UNLOCK_USER': 'green',
        'SHARE_DOCUMENT': 'sky',
        'CHANGE_PERMISSION': 'amber',
        'CREATE_DEPARTMENT': 'green',
        'UPDATE_DEPARTMENT': 'sky',
        'DELETE_DEPARTMENT': 'red'
    };

    container.innerHTML = logs.map(log => `
        <li class="activity-item">
            <div class="activity-dot ${actionColors[log.action] || 'indigo'}"></div>
            <div class="activity-info">
                <p><strong>${log.userName || 'Hệ thống'}</strong> - ${getActionLabel(log.action)}</p>
                <span>${typeof formatDate !== 'undefined' ? formatDate(log.createdAt) : log.createdAt} | ${log.targetType || ''} #${log.targetId || ''}</span>
                ${log.metadata ? `<span style="display:block;font-size:0.72rem;color:#9ca3af;">${typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)}</span>` : ''}
            </div>
        </li>
    `).join('');

    if (typeof updatePagination !== 'undefined') {
        updatePagination('logPagination', AdminState.logs.page, Math.ceil(AdminState.logs.total / AdminState.logs.pageSize));
    } else {
        updateAdminPagination('logPagination', AdminState.logs.page, Math.ceil(AdminState.logs.total / AdminState.logs.pageSize));
    }
}

function filterLogs() {
    const searchTerm = document.getElementById('logSearch')?.value?.toLowerCase() || '';

    AdminState.logs.filtered = AdminState.logs.data.filter(log => {
        return !searchTerm ||
            log.userName?.toLowerCase().includes(searchTerm) ||
            log.action?.toLowerCase().includes(searchTerm) ||
            log.targetType?.toLowerCase().includes(searchTerm);
    });

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

        if (viewFullName) viewFullName.textContent = response.fullName || '—';
        if (viewUsername) viewUsername.textContent = response.username || '—';
        if (viewEmail) viewEmail.textContent = response.email || '—';
        if (viewPhone) viewPhone.textContent = response.phone || '—';
        if (viewDept) viewDept.textContent = response.departmentName || '—';
        if (viewRole) viewRole.textContent = 'Quản trị viên';

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
        const avatarEl = document.getElementById('profileAvatar');

        if (nameEl) nameEl.textContent = response.fullName;
        if (deptEl) deptEl.textContent = response.departmentName || '—';
        if (avatarEl) {
            if (response.avatarUrl) {
                avatarEl.innerHTML = `<img src="${response.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                avatarEl.textContent = (response.fullName || 'A').charAt(0).toUpperCase();
            }
        }

        // Update sidebar user card
        const sidebarName = document.getElementById('sidebarName');
        const sidebarDept = document.getElementById('sidebarDept');
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        if (sidebarName) sidebarName.textContent = response.fullName || 'Admin';
        if (sidebarDept) sidebarDept.textContent = 'Quản trị viên';

        if (sidebarAvatar) {
            if (response.avatarUrl) {
                sidebarAvatar.innerHTML = `<img src="${response.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
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

        const activities = await apiRequest('/api/admin/audit-logs?page=1&size=20');
        const logs = activities.content || activities;
        const list = document.getElementById('profileActivityList');

        if (!list) return;

        if (!logs || logs.length === 0) {
            list.innerHTML = '<li class="activity-empty">Chưa có hoạt động nào</li>';
            return;
        }

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
            method: 'PUT',
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
            loadFunction = loadAuditLogs;
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
    const user = AdminState.users.data.find(u => u.id === userId);
    if (!user) {
        if (typeof showToast !== 'undefined') showToast('Không tìm thấy dữ liệu người dùng', 'error');
        return;
    }
    
    document.getElementById('editUserId').value = user.id;
    document.getElementById('modalEditFullName').value = user.fullName || '';
    document.getElementById('modalEditPhone').value = ''; // API chưa trả về phone nên để trống
    
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
        submitBtn.onclick = async function() {
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