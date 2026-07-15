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
    const sidebarNav = document.getElementById('sidebarNav');
    if (!sidebarNav) return;

    sidebarNav.querySelectorAll('li[data-tab]').forEach(item => {
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

        const response = await apiRequest('/api/admin/statistics');

        const elements = {
            'statTotalUsers': response.totalUsers || 0,
            'statTotalDepts': response.totalDepartments || 0,
            'statTotalDocs': response.totalDocuments || 0,
            'statCompletedDocs': response.completedDocuments || 0,
            'statLockedUsers': response.lockedUsers || 0,
            'statFailedDocs': response.failedDocuments || 0,
            'statTotalChats': response.totalChatSessions || 0,
            'statTotalTokens': typeof formatNumber !== 'undefined' ? formatNumber(response.totalTokens || 0) : (response.totalTokens || 0)
        };

        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = elements[id];
        });

    } catch (error) {
        console.error('Error loading overview stats:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải thống kê tổng quan', 'error');
        }
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

        const response = await apiRequest(`/api/admin/users?page=${AdminState.users.page}&size=${AdminState.users.pageSize}`);

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
            <td>
                <span class="status-badge ${user.isActive ? 'active' : 'locked'}">
                    ${user.isActive ? 'Hoạt động' : 'Đã khoá'}
                </span>
            </td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn-icon" onclick="editUser(${user.id})" title="Chỉnh sửa">✏️</button>
                    <button class="btn-icon" onclick="changeUserDepartment(${user.id})" title="Chuyển phòng ban">🔄</button>
                    <button class="btn-icon" onclick="toggleUserStatus(${user.id}, ${user.isActive})"
                            title="${user.isActive ? 'Khoá' : 'Mở khoá'}">
                        ${user.isActive ? '🔒' : '🔓'}
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

    AdminState.users.filtered = AdminState.users.data.filter(user => {
        const matchesSearch = !searchTerm ||
            user.fullName?.toLowerCase().includes(searchTerm) ||
            user.email?.toLowerCase().includes(searchTerm) ||
            user.username?.toLowerCase().includes(searchTerm);

        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesDept = !deptFilter || user.departmentId == deptFilter;
        const matchesStatus = !statusFilter ||
            (statusFilter === 'active' && user.isActive) ||
            (statusFilter === 'locked' && !user.isActive);

        return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });

    renderUserTable();
}

// =============================================
// ADD USER MODAL
// =============================================

function openAddUserModal() {
    const inputs = ['newFullName', 'newEmail', 'newPassword'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const role = document.getElementById('newRole');
    if (role) role.value = 'USER';

    if (typeof openModal !== 'undefined') {
        openModal('addUserModal');
    }
}

async function submitAddUser() {
    const fullName = document.getElementById('newFullName')?.value?.trim() || '';
    const email = document.getElementById('newEmail')?.value?.trim() || '';
    const password = document.getElementById('newPassword')?.value?.trim() || '';
    const role = document.getElementById('newRole')?.value || 'USER';

    // Validation
    if (!fullName || !email || !password) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng điền đầy đủ thông tin', 'warning');
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
                fullName,
                email,
                password,
                role
            })
        });

        if (typeof closeModal !== 'undefined') {
            closeModal('addUserModal');
        }

        if (typeof showToast !== 'undefined') {
            showToast('Tạo tài khoản thành công!', 'success');
        }

        loadUsers();
        logAdminActivity('CREATE_USER', 'USER', null, { email, role });

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

            await apiRequest(`/api/admin/users/${userId}/toggle-status`, {
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
        const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : localStorage.getItem('accessToken');

        const response = await fetch(`${API_BASE}/api/admin/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
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

        const fields = {
            'editFullName': response.fullName || '',
            'editUsername': response.username || '',
            'editEmail': response.email || '',
            'editPhone': response.phone || '',
            'editDept': response.departmentName || '—',
            'editRole': 'Quản trị viên'
        };

        Object.keys(fields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = fields[id];
        });

        const nameEl = document.getElementById('profileName');
        const deptEl = document.getElementById('profileDept');
        const avatarEl = document.getElementById('profileAvatar');

        if (nameEl) nameEl.textContent = response.fullName;
        if (deptEl) deptEl.textContent = response.departmentName || '—';
        if (avatarEl) avatarEl.textContent = (response.fullName || 'A').charAt(0).toUpperCase();

    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile() {
    const fullName = document.getElementById('editFullName')?.value?.trim() || '';
    const phone = document.getElementById('editPhone')?.value?.trim() || '';

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

        await apiRequest('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify({ fullName, phone })
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
                saveUser(user);
            }
        }

        if (typeof updateUserUI !== 'undefined') {
            updateUserUI(typeof getUser !== 'undefined' ? getUser() : null);
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

// ===== STUB FUNCTIONS (to be implemented) =====
function editUser(userId) {
    if (typeof showToast !== 'undefined') {
        showToast('Đang phát triển...', 'info');
    }
}

function changeUserDepartment(userId) {
    if (typeof showToast !== 'undefined') {
        showToast('Đang phát triển...', 'info');
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
});