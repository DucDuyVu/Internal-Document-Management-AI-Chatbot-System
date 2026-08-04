/* =============================================
   user-dashboard.js – IDMS User Dashboard (ĐÃ SỬA)
   Chức năng: Documents, AI Chatbot, Search, Profile
   ============================================= */

// ===== FILE TYPE STYLE HELPER (đồng bộ màu với Admin) =====
function getDocStyle(type) {
    if (typeof getDocFileStyle !== 'undefined') return getDocFileStyle(type);
    // Fallback inline nếu common.js chưa load
    if (!type) return { color: '#6b7280', bg: '#f9fafb', icon: 'fa-file' };
    const t = type.toLowerCase();
    if (t === 'pdf') return { color: '#dc2626', bg: '#fef2f2', icon: 'fa-file-pdf' };
    if (t === 'doc' || t === 'docx') return { color: '#2563eb', bg: '#eff6ff', icon: 'fa-file-word' };
    if (t === 'xls' || t === 'xlsx') return { color: '#16a34a', bg: '#f0fdf4', icon: 'fa-file-excel' };
    if (t === 'ppt' || t === 'pptx') return { color: '#ea580c', bg: '#fff7ed', icon: 'fa-file-powerpoint' };
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(t)) return { color: '#7c3aed', bg: '#f5f3ff', icon: 'fa-file-image' };
    if (t === 'txt') return { color: '#374151', bg: '#f9fafb', icon: 'fa-file-lines' };
    if (t === 'zip' || t === 'rar') return { color: '#b45309', bg: '#fffbeb', icon: 'fa-file-zipper' };
    return { color: '#4f46e5', bg: '#eef2ff', icon: 'fa-file' };
}

// ===== KIỂM TRA DEPENDENCIES =====
if (typeof API_BASE === 'undefined') {
    console.error('common.js chưa được tải!');
}
if (typeof getUser === 'undefined' || typeof isLoggedIn === 'undefined') {
    console.error('auth.js chưa được tải!');
}

// ===== GLOBAL STATE =====
const UserState = {
    currentTab: 'tabManager',
    documents: {
        data: [],
        filtered: [],
        page: 1,
        pageSize: 12,
        total: 0,
        view: 'grid' // 'grid' or 'list'
    },
    chat: {
        sessions: [],
        currentSessionId: null,
        messages: [],
        isLoading: false
    },
    search: {
        results: [],
        loading: false,
        debounceTimer: null
    },
    profile: {
        data: null,
        activities: []
    }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function () {
    // Kiểm tra đăng nhập bằng hàm từ auth.js
    if (typeof isLoggedIn === 'undefined' || !isLoggedIn()) {
        window.location.href = '/login';
        return;
    }

    const user = typeof getUser !== 'undefined' ? getUser() : null;
    if (!user) {
        window.location.href = '/login';
        return;
    }

    // Kiểm tra role (Chỉ cho MANAGER)
    const allowedRoles = ['MANAGER', 'Quản lý', 'Trưởng phòng', 'ROLE_MANAGER'];
    if (!allowedRoles.includes(user.role)) {
        if (user.role === 'ADMIN' || user.role === 'Quản trị viên' || user.role === 'ROLE_ADMIN') {
            window.location.href = '/admin/dashboard';
        } else {
            window.location.href = '/user/dashboard';
        }
        return;
    }

    initUserDashboard();
    if (typeof loadManagerData === 'function') loadManagerData();
});

function initUserDashboard() {
    setupUserSidebar();
    setupUserEventListeners();

    const user = typeof getUser !== 'undefined' ? getUser() : null;
    if (typeof updateUserUI !== 'undefined') {
        updateUserUI(user);
    }
    
    if (typeof loadPendingApprovals === 'function') {
        loadPendingApprovals();
    }
}

function setupUserSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    sidebar.querySelectorAll('li[data-tab]').forEach(item => {
        item.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            UserState.currentTab = tabId;

            // Sử dụng hàm switchTab từ common.js
            if (typeof switchTab !== 'undefined') {
                switchTab(tabId, this);
            }

            loadUserTabData(tabId);
        });
    });
}

function setupUserEventListeners() {
    // Document search
    const docSearch = document.getElementById('docSearchInput');
    if (docSearch && typeof debounce !== 'undefined') {
        docSearch.addEventListener('input', debounce(filterUserDocuments, 300));
    }

    // Document filters
    ['docTypeFilter', 'docSortFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', filterUserDocuments);
    });

    // Chat input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', handleChatKeydown);
        chatInput.addEventListener('input', function () {
            autoResizeTextarea(this);
        });
    }

    // Global search
    const globalSearch = document.getElementById('globalSearchInput');
    if (globalSearch && typeof debounce !== 'undefined') {
        globalSearch.addEventListener('input', debounce(performSearch, 500));
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
                    await logout(); // hàm lấy từ auth.js
                } else {
                    console.error('Hàm logout() không tồn tại, kiểm tra lại auth.js đã load chưa');
                }
            });
        }
    });
}

function loadUserTabData(tabId) {
    switch (tabId) {
        case 'tabHome':
            loadHomeData();
            break;
        case 'tabManager':
            loadManagerData();
            break;
        case 'tabDocuments':
            loadUserDocuments();
            break;
        case 'tabChat':
            loadChatSessions();
            break;
        case 'tabSearch':
            loadSearchFilters();
            break;
        case 'tabProfile':
            loadUserProfile();
            break;
        case 'tabEmployees':
            if (typeof loadEmployees === 'function') loadEmployees();
            break;
        case 'tabReports':
            if (typeof loadReports === 'function') loadReports();
            break;
    }
}

// =============================================
// HOME PAGE
// =============================================

async function loadHomeData() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const data = await apiRequest('/api/dashboard/stats');

        // Bỏ skeleton loaders
        document.querySelectorAll('.stat-value').forEach(el => el.classList.remove('skeleton-loader'));

        document.getElementById('statDocCount').textContent = data.documentCount || 0;
        document.getElementById('statChatCount').textContent = data.chatSessionCount || 0;
        document.getElementById('statViewCount').textContent = data.viewCount || 0;
        document.getElementById('statSearchCount').textContent = data.searchCount || 0;

        // Render activities
        const list = document.getElementById('activityList');
        if (list) {
            if (!data.recentActivities || data.recentActivities.length === 0) {
                list.innerHTML = '<li class="activity-item"><div class="activity-dot indigo"></div><div class="activity-info"><p>Chưa có hoạt động nào</p><span>—</span></div></li>';
            } else {
                const actionIcons = {
                    'LOGIN': '<i class="fa-solid fa-right-to-bracket"></i>',
                    'VIEW_DOCUMENT': '<i class="fa-solid fa-eye"></i>',
                    'DOWNLOAD_DOCUMENT': '<i class="fa-solid fa-download"></i>',
                    'CHAT_QUERY': '<i class="fa-solid fa-comment-dots"></i>',
                    'SEARCH': '<i class="fa-solid fa-magnifying-glass"></i>'
                };
                const actionColors = {
                    'LOGIN': 'indigo',
                    'VIEW_DOCUMENT': 'green',
                    'DOWNLOAD_DOCUMENT': 'sky',
                    'CHAT_QUERY': 'indigo',
                    'SEARCH': 'amber'
                };
                list.innerHTML = data.recentActivities.map(activity => `
                    <li class="activity-item">
                        <div class="activity-dot ${actionColors[activity.action] || 'indigo'}"></div>
                        <div class="activity-info">
                            <p>${actionIcons[activity.action] || '<i class="fa-solid fa-clipboard-list"></i>'} ${typeof getActionLabel !== 'undefined' ? getActionLabel(activity.action) : activity.action}</p>
                            <span>${typeof formatDate !== 'undefined' ? formatDate(activity.createdAt) : activity.createdAt}</span>
                        </div>
                    </li>
                `).join('');
            }
        }

        // Render documents
        const grid = document.getElementById('recentDocGrid');
        if (grid) {
            if (!data.recentDocuments || data.recentDocuments.length === 0) {
                grid.innerHTML = '<div class="empty-state"><i class="fa-regular fa-folder-open empty-icon"></i><p>Chưa có tài liệu nào</p></div>';
            } else {
                grid.innerHTML = data.recentDocuments.map(doc => {
                    const style = getDocStyle(doc.fileType);
                    return `
                    <div class="doc-card" onclick="openDocumentDetail(${doc.id})" style="cursor:pointer;">
                        <div class="doc-card-icon" style="background:${style.bg};border-radius:12px;display:flex;align-items:center;justify-content:center;width:48px;height:48px;margin-bottom:12px;">
                            <i class="fa-solid ${style.icon}" style="font-size:1.4rem;color:${style.color};"></i>
                        </div>
                        <h4 style="font-size:0.875rem;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px;" title="${doc.fileName}">${doc.fileName}</h4>
                        <div class="doc-card-meta">
                            <div>${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</div>
                            <div><i class="fa-regular fa-calendar" style="color:#9ca3af;margin-right:4px;"></i>Ngày tải lên: ${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</div>
                        </div>
                        ${doc.departmentName ? `<div class="doc-card-meta" style="margin-top:4px;"><i class="fa-solid fa-building" style="color:#9ca3af;"></i> ${doc.departmentName}</div>` : ''}
                        <div style="margin-top:8px;">
                            <span class="status-badge ${typeof getStatusClass !== 'undefined' ? getStatusClass(doc.status) : ''}">${typeof getStatusLabel !== 'undefined' ? getStatusLabel(doc.status) : doc.status}</span>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        // Update user banner info
        const currentUser = typeof getUser !== 'undefined' ? getUser() : null;
        if (currentUser) {
            document.getElementById('welcomeName').textContent = currentUser.fullName || currentUser.username;
            if (currentUser.departmentName) {
                document.getElementById('wDept').textContent = currentUser.departmentName;
                document.getElementById('wDeptWrap').style.display = 'inline';
            }
            if (currentUser.role) {
                const roleLabels = { 'USER': 'Nhân viên', 'MANAGER': 'Trưởng phòng', 'ADMIN': 'Quản trị viên' };
                document.getElementById('wRole').textContent = roleLabels[currentUser.role] || currentUser.role;
                document.getElementById('wRoleWrap').style.display = 'inline';
            }
        }

        if (data.lastLoginTime) {
            const lastLoginEl = document.getElementById('wLastLogin');
            if (lastLoginEl) lastLoginEl.textContent = typeof formatDate !== 'undefined' ? formatDate(data.lastLoginTime) : data.lastLoginTime;
            const wLastLoginWrap = document.getElementById('wLastLoginWrap');
            if (wLastLoginWrap) wLastLoginWrap.style.display = 'inline';
        }

    } catch (error) {
        console.error('Error loading home data:', error);

        document.querySelectorAll('.stat-value').forEach(el => {
            el.classList.remove('skeleton-loader');
            el.textContent = 'Lỗi';
            el.style.fontSize = '1.2rem';
        });

        const list = document.getElementById('activityList');
        if (list) list.innerHTML = '<li class="activity-item"><div class="activity-dot red"></div><div class="activity-info"><p>Không tải được</p><span>—</span></div></li>';

        const grid = document.getElementById('recentDocGrid');
        if (grid) grid.innerHTML = '<div class="empty-state"><span>⚠️</span><p>Không tải được dữ liệu</p></div>';

        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải dữ liệu trang chủ', 'error');
        }
    }
}

// =============================================
// DOCUMENT MANAGEMENT
// =============================================

async function loadUserDocuments() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const response = await apiRequest(`/api/documents?page=${UserState.documents.page - 1}&size=${UserState.documents.pageSize}`);

        UserState.documents.data = response.content || response;
        UserState.documents.total = response.totalElements || response.length;
        UserState.documents.filtered = [...UserState.documents.data];

        renderUserDocuments();

    } catch (error) {
        console.error('Error loading documents:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải danh sách tài liệu', 'error');
        }
    }
}

function renderUserDocuments() {
    const docs = UserState.documents.filtered;
    const currentUser = JSON.parse(localStorage.getItem('user'));

    const canManagePerms = (doc) => {
        if (!currentUser) return false;
        // ADMIN can manage all. MANAGER can manage if doc belongs to their department
        return currentUser.role === 'ADMIN' || (currentUser.role === 'MANAGER' && doc.departmentId && currentUser.departmentId && Number(doc.departmentId) === Number(currentUser.departmentId));
    };

    // Update Summary Bar
    const totalCountEl = document.getElementById('docTotalCount');
    const failedCountEl = document.getElementById('docFailedCount');
    if (totalCountEl) totalCountEl.textContent = UserState.documents.total || docs.length;
    if (failedCountEl) {
        const failedDocs = docs.filter(d => d.status === 'FAILED');
        failedCountEl.textContent = failedDocs.length;
    }

    // Grid view
    const gridView = document.getElementById('docGridView');
    if (gridView && UserState.documents.view === 'grid') {
        if (!docs || docs.length === 0) {
            gridView.innerHTML = '<div class="empty-state"><span>📄</span><p>Không tìm thấy tài liệu</p></div>';
        } else {
            gridView.innerHTML = docs.map(doc => {
                const style = getDocStyle(doc.fileType);
                const isFailed = doc.status === 'FAILED';
                const isPending = doc.status === 'PENDING';
                const cannotShare = isFailed || isPending;

                let statusClass = 'status-completed';
                let badgeText = 'Hoàn thành';
                if (isPending) {
                    statusClass = 'status-pending';
                    badgeText = 'Đang chờ';
                } else if (isFailed) {
                    statusClass = 'status-failed';
                    badgeText = 'Thất bại';
                }

                let actionButtons = '';
                if (isPending) {
                    actionButtons = `
                        <button class="btn-card btn-card-primary" onclick="event.stopPropagation(); approveDocument(${doc.id})">
                            Duyệt
                        </button>
                        <button class="btn-card btn-card-secondary" onclick="event.stopPropagation(); rejectDocument(${doc.id})">
                            Từ chối
                        </button>
                    `;
                } else if (isFailed) {
                    actionButtons = `
                        <button class="btn-card btn-card-primary" onclick="event.stopPropagation(); showToast('Tính năng Thử lại đang phát triển', 'info')">
                            <i class="fa-solid fa-rotate-right"></i> Thử lại
                        </button>
                        <button class="btn-card btn-card-danger" onclick="event.stopPropagation(); showToast('Tính năng Xoá đang phát triển', 'info')">
                            <i class="fa-solid fa-trash-can"></i> Xoá
                        </button>
                    `;
                } else {
                    actionButtons = `
                        <button class="btn-card btn-card-secondary" ${cannotShare ? 'disabled' : `onclick="event.stopPropagation();openPermissionModal(${doc.id}, '${doc.fileName.replace(/'/g, "\\'")}')"`}>
                            <i class="fa-solid fa-share-nodes"></i> Chia sẻ
                        </button>
                        <button class="btn-card btn-card-danger" onclick="event.stopPropagation(); showToast('Tính năng Thu hồi nhanh đang phát triển. Vui lòng dùng nút Chia sẻ để quản lý.', 'info')">
                            <i class="fa-solid fa-ban"></i> Thu hồi
                        </button>
                    `;
                }

                return `
                <div class="doc-card-v2 ${statusClass}">
                    <div class="badge">${badgeText}</div>
                    
                    <button class="doc-menu-btn" onclick="event.stopPropagation(); openDocumentDetail(${doc.id})" title="Xem chi tiết">
                        <i class="fa-solid fa-ellipsis"></i>
                    </button>

                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                        <div style="width:40px;height:40px;border-radius:8px;background:${style.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fa-solid ${style.icon}" style="font-size:1.2rem;color:${style.color};"></i>
                        </div>
                        <div style="font-size:0.75rem;font-weight:700;color:${style.color};letter-spacing:0.5px;">
                            ${(doc.fileType || 'FILE').toUpperCase()}
                        </div>
                    </div>
                    
                    <h4 class="doc-title" title="${doc.fileName}">${doc.fileName}</h4>
                    
                    <div style="font-size:0.75rem;color:#6b7280;margin-bottom:12px;">
                        Tải lên ${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}
                    </div>
                    
                    <div class="doc-action-grid">
                        ${actionButtons}
                    </div>
                </div>`;
            }).join('');
        }
    }

    // List view
    const listBody = document.getElementById('docListBody');
    if (listBody && UserState.documents.view === 'list') {
        if (!docs || docs.length === 0) {
            listBody.innerHTML = '<tr><td colspan="6" class="empty-state"><span>📄</span>Không tìm thấy tài liệu</td></tr>';
        } else {
            listBody.innerHTML = docs.map(doc => {
                const isFailed = doc.status === 'FAILED';
                const cannotShare = doc.status === 'FAILED' || doc.status === 'PENDING';
                return `
                <tr style="cursor:pointer; ${isFailed ? 'background-color: #fef2f2;' : ''}" onmouseover="this.style.background='${isFailed ? '#fee2e2' : '#f9fafb'}'" onmouseout="this.style.background='${isFailed ? '#fef2f2' : ''}'">
                    <td onclick="openDocumentDetail(${doc.id})" title="Click để xem chi tiết">
                        <span style="font-size:1.1rem;">${typeof getFileIcon !== 'undefined' ? getFileIcon(doc.fileType) : '📄'}</span>
                        <span style="font-weight:500;color:#4f46e5;">${doc.fileName}</span>
                    </td>
                    <td>${doc.fileType?.toUpperCase()}</td>
                    <td>${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</td>
                    <td>${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</td>
                    <td>
                        <span class="status-badge ${typeof getStatusClass !== 'undefined' ? getStatusClass(doc.status) : ''}">${typeof getStatusLabel !== 'undefined' ? getStatusLabel(doc.status) : doc.status}</span>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="event.stopPropagation(); openDocumentDetail(${doc.id})" title="Xem chi tiết">👁️</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); downloadDocument(${doc.id})" title="Tải xuống">⬇️</button>
                        ${cannotShare ?
                        `<button class="btn-icon" disabled title="Chưa thể phân quyền" style="color: #cbd5e1; cursor: not-allowed;">🛡️</button>` :
                        `<button class="btn-icon" onclick="event.stopPropagation(); openPermissionModal(${doc.id}, '${doc.fileName.replace(/'/g, "\\'")}')" title="Quản lý Quyền" style="color: #64748b;">🛡️</button>`
                    }
                    </td>
                </tr>
            `}).join('');
        }
    }

    if (typeof updatePagination !== 'undefined') {
        updatePagination('docPagination', UserState.documents.page, Math.ceil(UserState.documents.total / UserState.documents.pageSize));
    }
}

function filterUserDocuments() {
    const searchTerm = document.getElementById('docSearchInput')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('docTypeFilter')?.value || '';
    const sortFilter = document.getElementById('docSortFilter')?.value || 'newest';

    UserState.documents.filtered = UserState.documents.data.filter(doc => {
        const matchesSearch = !searchTerm || doc.fileName?.toLowerCase().includes(searchTerm);
        const matchesType = !typeFilter || doc.fileType === typeFilter;
        return matchesSearch && matchesType;
    });

    // Sort
    switch (sortFilter) {
        case 'newest':
            UserState.documents.filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            UserState.documents.filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'name':
            UserState.documents.filtered.sort((a, b) => a.fileName?.localeCompare(b.fileName));
            break;
        case 'size':
            UserState.documents.filtered.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
            break;
    }

    renderUserDocuments();
}

function setDocView(view) {
    UserState.documents.view = view;

    document.getElementById('btnGridView')?.classList.toggle('active', view === 'grid');
    document.getElementById('btnListView')?.classList.toggle('active', view === 'list');
    document.getElementById('docGridView').style.display = view === 'grid' ? 'grid' : 'none';
    document.getElementById('docListView').style.display = view === 'list' ? 'block' : 'none';

    renderUserDocuments();
}

async function viewUserDocument(docId) {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const doc = await apiRequest(`/api/documents/${docId}`);

        const titleEl = document.getElementById('docViewerTitle');
        const contentEl = document.getElementById('docViewerContent');

        if (titleEl) titleEl.textContent = doc.fileName;
        if (contentEl) {
            contentEl.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div><strong>Tên file:</strong> ${doc.fileName}</div>
                    <div><strong>Loại:</strong> ${doc.fileType?.toUpperCase()}</div>
                    <div><strong>Kích thước:</strong> ${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</div>
                    <div><strong>Phòng ban:</strong> ${doc.departmentName || '—'}</div>
                    <div><strong>Ngày upload:</strong> ${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</div>
                    <div><strong>Phiên bản:</strong> ${doc.version || 1}</div>
                </div>
            `;
        }

        const downloadBtn = document.getElementById('docDownloadBtn');
        if (downloadBtn) {
            downloadBtn.onclick = () => downloadDocument(docId);
        }

        const askBtn = document.getElementById('btnAskAI');
        if (askBtn) {
            askBtn.onclick = () => {
                if (typeof closeModal !== 'undefined') {
                    closeModal('docViewerModal');
                }
                if (typeof switchTab !== 'undefined') {
                    switchTab('tabChat', document.querySelector('[data-tab="tabChat"]'));
                }
                askAIAboutDocument(doc.fileName);
            };
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

// =============================================
// MANAGER APPROVAL
// =============================================

async function loadPendingApprovals() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const response = await apiRequest('/api/manager/documents/pending');
        const docs = response.content || response || [];
        const container = document.getElementById('drawerPendingDocsList');
        const badge = document.getElementById('navPendingBadge');
        
        if (badge) {
            if (docs.length > 0) {
                badge.textContent = docs.length;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        if (!container) return;

        if (docs.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 0; color:#6b7280;">
                    <i class="fa-regular fa-folder-open" style="font-size:2rem; margin-bottom:12px; color:#d1d5db;"></i>
                    <p>Không có tài liệu nào chờ duyệt</p>
                </div>`;
            return;
        }

        container.innerHTML = docs.map(doc => `
            <div style="background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin-bottom:12px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.5rem;">${typeof getFileIcon !== 'undefined' ? getFileIcon(doc.fileType) : '📄'}</span>
                        <div>
                            <h4 style="margin:0; font-size:0.9rem; font-weight:600; color:#111827; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${doc.fileName}">${doc.fileName}</h4>
                            <div style="font-size:0.75rem; color:#6b7280; margin-top:2px;">
                                ${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize} • ${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}
                            </div>
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="approveDocument(${doc.id})" style="flex:1; background:#4f46e5; color:white; border:none; padding:8px; border-radius:6px; font-size:0.85rem; font-weight:500; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#4338ca'" onmouseout="this.style.background='#4f46e5'">
                        Duyệt ngay
                    </button>
                    <button onclick="rejectDocument(${doc.id})" style="flex:1; background:#fff; color:#ef4444; border:1px solid #fca5a5; padding:8px; border-radius:6px; font-size:0.85rem; font-weight:500; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='#fff'">
                        Từ chối
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading pending approvals:', error);
    }
}

async function approveDocument(docId) {
    if (typeof showConfirmDialog !== 'undefined') {
        showConfirmDialog('Xác nhận duyệt', 'Bạn có chắc chắn muốn duyệt tài liệu này? Hệ thống sẽ bắt đầu gửi tài liệu cho AI xử lý.', async () => {
            await executeApprove(docId);
        });
    } else if (confirm('Bạn có chắc chắn muốn duyệt tài liệu này?')) {
        await executeApprove(docId);
    }
}

async function executeApprove(docId) {
    try {
        if (typeof apiRequest === 'undefined') throw new Error('apiRequest not found');
        
        await apiRequest(`/api/manager/documents/${docId}/approve`, {
            method: 'PUT'
        });
        
        if (typeof showToast !== 'undefined') showToast('Duyệt tài liệu thành công!', 'success');
        
        // Refresh lists
        loadPendingApprovals();
        if (UserState?.currentTab === 'tabDocuments' || document.getElementById('tabDocuments')?.style?.display === 'block') {
             loadUserDocuments();
        }
        
    } catch (error) {
        console.error('Lỗi khi duyệt:', error);
        if (typeof showToast !== 'undefined') showToast(error.message || 'Lỗi khi duyệt', 'error');
    }
}

async function rejectDocument(docId) {
    if (typeof showConfirmDialog !== 'undefined') {
        showConfirmDialog('Xác nhận từ chối', 'Bạn có chắc chắn muốn từ chối tài liệu này?', async () => {
            await executeReject(docId);
        });
    } else if (confirm('Bạn có chắc chắn muốn từ chối tài liệu này?')) {
        await executeReject(docId);
    }
}

async function executeReject(docId) {
    try {
        if (typeof apiRequest === 'undefined') throw new Error('apiRequest not found');
        
        await apiRequest(`/api/manager/documents/${docId}/reject`, {
            method: 'PUT'
        });
        
        if (typeof showToast !== 'undefined') showToast('Đã từ chối tài liệu!', 'success');
        
        // Refresh lists
        loadPendingApprovals();
        if (UserState?.currentTab === 'tabDocuments' || document.getElementById('tabDocuments')?.style?.display === 'block') {
             loadUserDocuments();
        }
        
    } catch (error) {
        console.error('Lỗi khi từ chối:', error);
        if (typeof showToast !== 'undefined') showToast(error.message || 'Lỗi khi từ chối', 'error');
    }
}


// =============================================
// AI CHATBOT
// =============================================

async function loadChatSessions() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const sessions = await apiRequest('/api/user/chat-sessions');
        UserState.chat.sessions = sessions || [];
        renderChatSessionList();

    } catch (error) {
        console.error('Error loading chat sessions:', error);
    }
}

function renderChatSessionList() {
    const container = document.getElementById('chatSessionList');
    if (!container) return;

    const sessions = UserState.chat.sessions;

    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<div class="chat-session-empty"><span>💬</span><br>Chưa có hội thoại nào</div>';
        return;
    }

    container.innerHTML = sessions.map(session => `
        <div class="chat-session-item ${session.id === UserState.chat.currentSessionId ? 'active' : ''}"
             onclick="openChatSession(${session.id})">
            <div class="chat-session-title">${session.title || 'Cuộc hội thoại mới'}</div>
            <div class="chat-session-meta">${session.messageCount || 0} tin nhắn · ${typeof formatDate !== 'undefined' ? formatDate(session.updatedAt) : session.updatedAt}</div>
        </div>
    `).join('');
}

function createNewChat() {
    UserState.chat.currentSessionId = null;
    UserState.chat.messages = [];

    const emptyState = document.getElementById('chatEmptyState');
    const active = document.getElementById('chatActive');
    const title = document.getElementById('chatSessionTitle');
    const meta = document.getElementById('chatSessionMeta');
    const messages = document.getElementById('chatMessages');
    const input = document.getElementById('chatInput');

    if (emptyState) emptyState.style.display = 'none';
    if (active) active.style.display = 'flex';
    if (title) title.textContent = 'Cuộc hội thoại mới';
    if (meta) meta.textContent = '—';
    if (messages) messages.innerHTML = '';
    if (input) {
        input.value = '';
        input.focus();
    }
}

async function openChatSession(sessionId) {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const session = await apiRequest(`/api/user/chat-sessions/${sessionId}`);

        UserState.chat.currentSessionId = sessionId;
        UserState.chat.messages = session.messages || [];

        const emptyState = document.getElementById('chatEmptyState');
        const active = document.getElementById('chatActive');
        const title = document.getElementById('chatSessionTitle');
        const meta = document.getElementById('chatSessionMeta');

        if (emptyState) emptyState.style.display = 'none';
        if (active) active.style.display = 'flex';
        if (title) title.textContent = session.title || 'Cuộc hội thoại';
        if (meta) meta.textContent = `${session.messageCount || 0} tin nhắn`;

        renderChatMessages();
        renderChatSessionList();

    } catch (error) {
        console.error('Error opening chat session:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể mở hội thoại', 'error');
        }
    }
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const messages = UserState.chat.messages;

    if (!messages || messages.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">Bắt đầu cuộc trò chuyện với AI</div>';
        return;
    }

    container.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.role === 'USER' ? 'user' : 'assistant'}">
            <div class="chat-message-avatar">
                ${msg.role === 'USER' ? '👤' : '🤖'}
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text">${formatMessageContent(msg.content)}</div>
                ${msg.fileRefs ? renderFileRefs(msg.fileRefs) : ''}
                <div class="chat-message-time">${typeof formatDate !== 'undefined' ? formatDate(msg.createdAt) : msg.createdAt}</div>
            </div>
        </div>
    `).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function formatMessageContent(content) {
    if (!content) return '';
    // Convert markdown-like syntax
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

function renderFileRefs(refs) {
    if (!refs || refs.length === 0) return '';

    return `
        <div class="chat-file-refs">
            <div style="font-size:0.78rem;font-weight:600;color:#4f46e5;margin-bottom:4px;">📚 Nguồn tham khảo:</div>
            ${refs.map(ref => `
                <div class="chat-file-ref" onclick="viewUserDocument(${ref.documentId})" style="cursor:pointer;">
                    📄 ${ref.documentName || 'Tài liệu'} - Trang ${ref.pageNumber || '—'}
                    ${ref.excerpt ? `<div style="font-size:0.72rem;color:#6b7280;margin-top:2px;">"${ref.excerpt.substring(0, 100)}..."</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;

    const message = input.value.trim();

    if (!message || UserState.chat.isLoading) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message to UI
    const userMessage = {
        role: 'USER',
        content: message,
        createdAt: new Date().toISOString()
    };

    UserState.chat.messages.push(userMessage);
    renderChatMessages();

    // Show loading
    UserState.chat.isLoading = true;
    const loadingMsg = addLoadingMessage();

    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        // Create session if needed
        if (!UserState.chat.currentSessionId) {
            const session = await apiRequest('/api/user/chat-sessions', {
                method: 'POST',
                body: JSON.stringify({ title: message.substring(0, 50) })
            });
            UserState.chat.currentSessionId = session.id;
            await loadChatSessions();
        }

        // Send message - SỬA LẠI
        const response = await apiRequest(`/api/chat/ask`, {
            method: 'POST',
            body: {
                sessionId: UserState.chat.currentSessionId,
                question: message
            }
        });

        // Remove loading
        removeLoadingMessage(loadingMsg);

        // Add AI response - SỬA LẠI
        const aiMessage = {
            role: 'ASSISTANT',
            content: response.answer,
            fileRefs: response.sources,
            createdAt: new Date().toISOString()
        };

        UserState.chat.messages.push(aiMessage);
        renderChatMessages();
        renderChatSessionList();

    } catch (error) {
        removeLoadingMessage(loadingMsg);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể gửi tin nhắn', 'error');
        }
    } finally {
        UserState.chat.isLoading = false;
    }
}

function handleChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
    }
}

function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

function addLoadingMessage() {
    const container = document.getElementById('chatMessages');
    if (!container) return null;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message assistant';
    loadingDiv.id = 'loadingMessage';
    loadingDiv.innerHTML = `
        <div class="chat-message-avatar">🤖</div>
        <div class="chat-message-content">
            <div class="chat-message-text">
                <span class="typing-indicator">
                    <span></span><span></span><span></span>
                </span>
            </div>
        </div>
    `;
    container.appendChild(loadingDiv);
    container.scrollTop = container.scrollHeight;
    return loadingDiv;
}

function removeLoadingMessage(element) {
    if (element) element.remove();
}

async function renameChatSession() {
    if (!UserState.chat.currentSessionId) {
        if (typeof showToast !== 'undefined') {
            showToast('Chưa có hội thoại nào để đổi tên', 'warning');
        }
        return;
    }

    const input = document.getElementById('newChatTitle');
    if (input) input.value = '';

    if (typeof openModal !== 'undefined') {
        openModal('renameChatModal');
        if (input) input.focus();
    }
}

async function submitRenameChat() {
    const newTitle = document.getElementById('newChatTitle')?.value?.trim();
    if (!newTitle) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng nhập tên mới', 'warning');
        }
        return;
    }

    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        await apiRequest(`/api/user/chat-sessions/${UserState.chat.currentSessionId}`, {
            method: 'PUT',
            body: JSON.stringify({ title: newTitle })
        });

        if (typeof closeModal !== 'undefined') {
            closeModal('renameChatModal');
        }

        const titleEl = document.getElementById('chatSessionTitle');
        if (titleEl) titleEl.textContent = newTitle;

        // Update session list
        const session = UserState.chat.sessions.find(s => s.id === UserState.chat.currentSessionId);
        if (session) session.title = newTitle;
        renderChatSessionList();

        if (typeof showToast !== 'undefined') {
            showToast('Đổi tên thành công!', 'success');
        }

    } catch (error) {
        console.error('Error renaming chat:', error);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể đổi tên', 'error');
        }
    }
}

function deleteChatSession() {
    if (!UserState.chat.currentSessionId) {
        if (typeof showToast !== 'undefined') {
            showToast('Chưa có hội thoại nào để xoá', 'warning');
        }
        return;
    }

    if (typeof confirmDelete !== 'undefined' && !confirmDelete('Bạn có chắc chắn muốn xoá hội thoại này?')) {
        return;
    }

    // Sử dụng confirmDelete từ common.js hoặc confirm thông thường
    if (typeof confirmDelete === 'undefined' && !confirm('Bạn có chắc chắn muốn xoá hội thoại này?')) {
        return;
    }

    executeDeleteChatSession();
}

async function executeDeleteChatSession() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        await apiRequest(`/api/user/chat-sessions/${UserState.chat.currentSessionId}`, {
            method: 'DELETE'
        });

        UserState.chat.currentSessionId = null;
        UserState.chat.messages = [];

        const active = document.getElementById('chatActive');
        const emptyState = document.getElementById('chatEmptyState');

        if (active) active.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';

        await loadChatSessions();

        if (typeof showToast !== 'undefined') {
            showToast('Xoá hội thoại thành công!', 'success');
        }

    } catch (error) {
        console.error('Error deleting chat:', error);
        if (typeof showToast !== 'undefined') {
            showToast(error.message || 'Không thể xoá hội thoại', 'error');
        }
    }
}

function askAIAboutDocument(docName) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = `Cho tôi biết nội dung chính của tài liệu "${docName}"`;
        input.focus();
    }
}

// =============================================
// SEARCH
// =============================================

async function loadSearchFilters() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const departments = await apiRequest('/api/user/departments');
        const select = document.getElementById('searchDeptFilter');

        if (!select) return;

        select.innerHTML = '<option value="">Tất cả phòng ban</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading search filters:', error);
    }
}

async function performSearch() {
    const query = document.getElementById('globalSearchInput')?.value?.trim()
        || document.getElementById('searchHeroInput')?.value?.trim()
        || document.getElementById('searchInput')?.value?.trim();
    if (!query || query.length < 2) {
        const container = document.getElementById('searchResults');
        if (container) {
            container.innerHTML = `
                <div class="search-hint">
                    <div style="font-size:3rem;">🔍</div>
                    <p>Nhập ít nhất 2 ký tự để tìm kiếm</p>
                </div>
            `;
        }
        return;
    }

    UserState.search.loading = true;

    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const response = await apiRequest(`/api/search?q=${encodeURIComponent(query)}`);

        // Kết hợp documents và users vào mảng results để render
        const results = [];
        if (response.documents) {
            response.documents.forEach(doc => results.push({ ...doc, type: 'document' }));
        }

        UserState.search.results = results;
        renderSearchResults();

    } catch (error) {
        console.error('Error searching:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể thực hiện tìm kiếm', 'error');
        }
    } finally {
        UserState.search.loading = false;
    }
}

function renderSearchResults() {
    const container = document.getElementById('searchResults');
    if (!container) return;

    const results = UserState.search.results;

    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="search-hint">
                <div style="font-size:3rem;">🔍</div>
                <p>Không tìm thấy kết quả phù hợp</p>
                <p style="font-size:0.82rem;color:#9ca3af;">Thử từ khoá khác hoặc kiểm tra lại bộ lọc</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="margin-bottom:12px;font-size:0.85rem;color:#6b7280;">
            Tìm thấy <strong>${results.length}</strong> kết quả
        </div>
        ${results.map(result => `
            <div class="search-result-item" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;cursor:pointer;"
                 onclick="openDocumentDetail(${result.id})">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <div style="width:40px;height:40px;border-radius:8px;background:${result.bg || '#f1f5f9'};display:flex;align-items:center;justify-content:center;">
                        <i class="fa-solid ${result.icon || 'fa-file'}" style="color:${result.color || '#64748b'};font-size:1.2rem;"></i>
                    </div>
                    <div>
                        <div style="font-weight:700;color:#111827;">${result.title || '—'}</div>
                        <div style="font-size:0.78rem;color:#6b7280;">${result.meta || '—'}</div>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}


// =============================================
// MANAGER DASHBOARD
// =============================================

async function loadManagerData() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        // Populate welcome banner date
        const now = new Date();
        const dateOpts = { year: 'numeric', month: 'long', day: 'numeric' };
        const dayOpts = { weekday: 'long' };
        const elDate = document.getElementById('currentDate');
        const elDay = document.getElementById('currentDay');
        if (elDate) elDate.textContent = now.toLocaleDateString('vi-VN', dateOpts);
        if (elDay) elDay.textContent = now.toLocaleDateString('vi-VN', dayOpts);

        const profile = await apiRequest('/api/users/profile');

        if (profile.manager) {
            // Welcome name
            const welcomeName = document.getElementById('welcomeName');
            if (welcomeName) welcomeName.textContent = profile.fullName || 'Quản lý';

            // KPI Cards
            const msDeptName = document.getElementById('msDeptName');
            const msDeptNameHeader = document.getElementById('msDeptNameHeader');
            const msEmployeeCount = document.getElementById('msEmployeeCount');
            const msPendingDocs = document.getElementById('msPendingDocs');
            const pendingDocCount = document.getElementById('pendingDocCount');
            const msActiveSessions = document.getElementById('msActiveSessions');
            const msOnlineUsers = document.getElementById('msOnlineUsers');
            const msTotalDocs = document.getElementById('msTotalDocs');

            const deptName = profile.departmentName || '—';
            const empCount = profile.managedEmployeeCount || 0;
            const pendingCount = profile.pendingDocumentCount || 0;
            const totalDocs = profile.departmentDocumentsCount || 0;
            const sessions = profile.activeSessionsCount || 0;

            if (msDeptName) msDeptName.textContent = deptName;
            if (msDeptNameHeader) msDeptNameHeader.textContent = deptName;
            if (msEmployeeCount) msEmployeeCount.textContent = empCount;
            if (msPendingDocs) msPendingDocs.textContent = pendingCount;
            if (pendingDocCount) pendingDocCount.textContent = pendingCount;
            if (msActiveSessions) msActiveSessions.textContent = sessions;
            if (msTotalDocs) {
                msTotalDocs.textContent = totalDocs;
                const trendEl = document.getElementById('msTotalDocsTrend');
                if (totalDocs === 0) {
                    msTotalDocs.style.color = '#9ca3af';
                    if (trendEl) {
                        trendEl.className = 'kpi-trend neutral';
                        trendEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Chưa có tài liệu nào';
                    }
                } else {
                    msTotalDocs.style.color = '';
                    if (trendEl) {
                        trendEl.className = 'kpi-trend up';
                        trendEl.innerHTML = '<i class="fa-solid fa-folder-open"></i> Đang lưu trữ';
                    }
                }
            }

            // Remove skeleton loader if present
            document.querySelectorAll('.skeleton-loader').forEach(el => el.classList.remove('skeleton-loader'));

            // Online users KPI
            if (msOnlineUsers) {
                msOnlineUsers.textContent = empCount > 0 ? Math.min(empCount, Math.max(1, Math.ceil(empCount * 0.6))) : 0;
            }

            // Status section (right column)
            const msOnlineUsersStatus = document.getElementById('msOnlineUsersStatus');
            const msTotalDocsStatus = document.getElementById('msTotalDocsStatus');
            if (msOnlineUsersStatus) {
                const onlineCount = empCount > 0 ? Math.min(empCount, Math.max(1, Math.ceil(empCount * 0.6))) : 0;
                msOnlineUsersStatus.textContent = `${onlineCount}/${empCount}`;
            }
            if (msTotalDocsStatus) msTotalDocsStatus.textContent = totalDocs;

            // Update nav pending badge
            const navBadge = document.getElementById('navPendingBadge');
            if (navBadge) {
                if (pendingCount > 0) {
                    navBadge.textContent = pendingCount;
                    navBadge.style.display = 'inline-block';
                } else {
                    navBadge.style.display = 'none';
                }
            }

            // Populate timeline with recent activity (real-time from backend)
            loadRecentActivities();
        }

    } catch (error) {
        console.error('Error loading manager data:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải dữ liệu quản lý', 'error');
        }
    }
}

async function loadRecentActivities() {
    const timeline = document.getElementById('managerTimeline');
    if (!timeline) return;

    try {
        const activities = await apiRequest('/api/activity-logs/recent?limit=10');

        if (!activities || activities.length === 0) {
            timeline.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem; padding:10px 0;">Không có hoạt động gần đây.</div>`;
            return;
        }

        timeline.innerHTML = activities.map(act => {
            let dot = 'bg-primary';
            let icon = 'fa-solid fa-bolt';
            let actionText = act.action;

            // Map action to color and text
            if (act.action === 'LOGIN') {
                dot = 'bg-success';
                actionText = 'Đã đăng nhập vào hệ thống';
            } else if (act.action === 'UPLOAD_DOCUMENT') {
                dot = 'bg-primary';
                actionText = 'Tải lên tài liệu ID: ' + act.targetId;
            } else if (act.action === 'DELETE_DOCUMENT') {
                dot = 'bg-danger';
                actionText = 'Xóa tài liệu ID: ' + act.targetId;
            } else if (act.action === 'SHARE_DOCUMENT') {
                dot = 'bg-warning';
                actionText = 'Chia sẻ tài liệu ID: ' + act.targetId;
            } else if (act.action === 'REVOKE_DOCUMENT') {
                dot = 'bg-warning';
                actionText = 'Thu hồi quyền tài liệu ID: ' + act.targetId;
            } else if (act.action === 'GRANT_PERMISSION') {
                dot = 'bg-success';
                actionText = 'Cấp quyền tài liệu ID: ' + act.targetId;
            }

            const timeStr = formatDate(act.createdAt);

            return `
            <div class="timeline-item">
                <div class="tl-dot ${dot}"></div>
                <div class="tl-content">
                    <div class="tl-time">${timeStr}</div>
                    <p style="margin:0; color:var(--text-primary); font-size:0.87rem;">${actionText}</p>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error("Lỗi khi tải nhật ký hoạt động:", e);
    }
}

// Start polling every 5 seconds
setInterval(loadRecentActivities, 5000);

// =============================================
// USER PROFILE
// =============================================

async function loadUserProfile() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const profile = await apiRequest('/api/users/profile');
        UserState.profile.data = profile;

        // Update profile card
        const nameEl = document.getElementById('profileName');
        const deptEl = document.getElementById('profileDept');
        const avatarEl = document.getElementById('profileAvatar');

        if (nameEl) nameEl.textContent = profile.fullName;
        if (deptEl) deptEl.textContent = profile.departmentName || '—';
        if (avatarEl) {
            if (profile.avatarUrl) {
                avatarEl.innerHTML = `<img src="${profile.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                avatarEl.style.background = 'transparent';
                avatarEl.style.color = 'transparent';
            } else {
                avatarEl.innerHTML = '';
                avatarEl.textContent = (profile.fullName || 'U').charAt(0).toUpperCase();
                avatarEl.style.background = '#6366f1';
                avatarEl.style.color = '#ffffff';
                avatarEl.style.display = 'flex';
                avatarEl.style.alignItems = 'center';
                avatarEl.style.justifyContent = 'center';
                avatarEl.style.fontWeight = 'bold';
                avatarEl.style.fontSize = '1.5rem';
            }
        }

        // Cập nhật avatar trên Topbar
        const topbarAvatar = document.getElementById('userAvatar');
        if (topbarAvatar) {
            if (profile.avatarUrl) {
                topbarAvatar.innerHTML = `<img src="${profile.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                topbarAvatar.style.background = 'transparent';
                topbarAvatar.style.color = 'transparent';
            } else {
                topbarAvatar.innerHTML = '';
                topbarAvatar.textContent = (profile.fullName || 'U').charAt(0).toUpperCase();
                topbarAvatar.style.background = '#6366f1';
                topbarAvatar.style.color = '#ffffff';
                topbarAvatar.style.display = 'flex';
                topbarAvatar.style.alignItems = 'center';
                topbarAvatar.style.justifyContent = 'center';
                topbarAvatar.style.fontWeight = 'bold';
            }
        }

        const roleBadge = document.getElementById('profileRoleBadge');
        if (roleBadge) {
            const roles = { ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', USER: 'Nhân viên' };
            roleBadge.textContent = roles[profile.role] || 'Nhân viên';
        }

        // Update Read-Only View
        const viewFullName = document.getElementById('viewFullName');
        const viewUsername = document.getElementById('viewUsername');
        const viewEmail = document.getElementById('viewEmail');
        const viewPhone = document.getElementById('viewPhone');
        const viewDept = document.getElementById('viewDept');
        const viewRole = document.getElementById('viewRole');
        const viewCreatedAt = document.getElementById('viewCreatedAt');
        const viewLastLogin = document.getElementById('viewLastLogin');

        if (viewFullName) viewFullName.textContent = profile.fullName || '—';
        if (viewUsername) viewUsername.textContent = profile.username || profile.userName || '—';
        if (viewEmail) viewEmail.textContent = profile.email || '—';
        if (viewPhone) viewPhone.textContent = profile.phone || '—';
        if (viewDept) viewDept.textContent = profile.departmentName || 'Toàn hệ thống';
        if (viewRole) {
            const roles = { ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', USER: 'Nhân viên' };
            viewRole.textContent = roles[profile.role] || profile.role || '—';
        }
        if (viewCreatedAt) viewCreatedAt.textContent = profile.createdAt ? (typeof formatDate !== 'undefined' ? formatDate(profile.createdAt) : profile.createdAt) : '—';
        if (viewLastLogin) viewLastLogin.textContent = profile.lastLogin ? (typeof formatDate !== 'undefined' ? formatDate(profile.lastLogin) : profile.lastLogin) : '—';

        // Update form
        const fullNameInput = document.getElementById('editFullName');
        const phoneInput = document.getElementById('editPhone');
        const avatarInput = document.getElementById('editAvatarUrl');

        if (fullNameInput) fullNameInput.value = profile.fullName || '';
        if (phoneInput) phoneInput.value = profile.phone || '';

        // Load profile stats
        const docCount = document.getElementById('psDocCount');
        const chatCount = document.getElementById('psChatCount');
        const activityCount = document.getElementById('psActivityCount');

        if (docCount) docCount.textContent = profile.documentCount || 0;
        if (chatCount) chatCount.textContent = profile.chatSessionCount || 0;
        if (activityCount) activityCount.textContent = profile.activityCount || 0;



        // Load profile activities
        loadProfileActivities();

    } catch (error) {
        console.error('Error loading profile:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải thông tin hồ sơ', 'error');
        }
    }
}

async function loadProfileActivities() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const activities = await apiRequest('/api/user/activities?limit=20');
        const list = document.getElementById('profileActivityList');

        if (!list) return;

        if (!activities || activities.length === 0) {
            list.innerHTML = '<li class="activity-empty">Chưa có hoạt động nào</li>';
            return;
        }

        list.innerHTML = activities.map(activity => `
            <li class="activity-item-v2">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:500;">${getActionLabel(activity.action)}</span>
                    <span style="font-size:0.78rem;color:#6b7280;">${typeof formatDate !== 'undefined' ? formatDate(activity.createdAt) : activity.createdAt}</span>
                </div>
                ${activity.description ? `<div style="font-size:0.78rem;color:#9ca3af;">${activity.description}</div>` : ''}
            </li>
        `).join('');

    } catch (error) {
        console.error('Error loading profile activities:', error);
    }
}

async function updateProfile() {
    const fullName = document.getElementById('editFullName')?.value?.trim();
    const phone = document.getElementById('editPhone')?.value?.trim();
    const userName = document.getElementById('editUsername')?.value?.trim();
    const avatarInput = document.getElementById('editAvatarUrl');
    let avatarUrl = null;



    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        // Nếu có chọn ảnh mới, upload trước
        if (avatarInput && avatarInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', avatarInput.files[0]);

            const uploadRes = await apiRequest('/api/users/upload-avatar', {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
                // NOTE: Do not set Content-Type header for FormData, browser will set it automatically with boundary
            }, true); // Use raw fetch wrapper if possible, or ensure apiRequest doesn't override Content-Type

            avatarUrl = uploadRes.avatarUrl;
        }

        // Cập nhật profile
        const payload = { fullName, phone, userName };
        if (avatarUrl) payload.avatarUrl = avatarUrl;

        await apiRequest('/api/users/profile', {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        // Update local storage bằng hàm từ auth.js
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

        if (typeof showToast !== 'undefined') {
            showToast('Cập nhật hồ sơ thành công!', 'success');
        }

        loadUserProfile(); // Reload data to update view

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

        // Clear password fields
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

// =============================================
// HELPER FUNCTIONS
// =============================================

function getActionLabel(action) {
    const labels = {
        'LOGIN': 'Đăng nhập',
        'VIEW_DOCUMENT': 'Xem tài liệu',
        'DOWNLOAD_DOCUMENT': 'Tải tài liệu',
        'CHAT_QUERY': 'Hỏi AI',
        'SEARCH': 'Tìm kiếm'
    };
    return labels[action] || action;
}

function switchProfileTab(tabId, btn) {
    // Hide all panels
    document.querySelectorAll('.settings-card').forEach(panel => panel.classList.remove('active'));

    // Show selected panel
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

    // Update active button
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function uploadAvatar(input) {
    const file = input?.files?.[0];
    if (!file) return;

    // Validate image
    if (!file.type.startsWith('image/')) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng chọn file ảnh', 'warning');
        }
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    apiRequest('/api/users/avatar', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) throw new Error('Upload thất bại');
            return response.json();
        })
        .then(data => {
            if (typeof showToast !== 'undefined') {
                showToast('Cập nhật ảnh đại diện thành công!', 'success');
            }
            // Update avatar display
            if (data.avatarUrl) {
                const avatarEl = document.getElementById('profileAvatar');
                if (avatarEl) {
                    avatarEl.innerHTML = `<img src="${data.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                }
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            if (typeof showToast !== 'undefined') {
                showToast(error.message || 'Không thể upload ảnh', 'error');
            }
        });
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

// ===== EXPOSE GLOBAL FUNCTIONS =====
window.viewUserDocument = viewUserDocument;
window.downloadDocument = downloadDocument;
window.createNewChat = createNewChat;
window.openChatSession = openChatSession;
window.sendChatMessage = sendChatMessage;
window.renameChatSession = renameChatSession;
window.submitRenameChat = submitRenameChat;
window.deleteChatSession = deleteChatSession;
window.askAIAboutDocument = askAIAboutDocument;
window.setDocView = setDocView;
window.switchProfileTab = switchProfileTab;
window.uploadAvatar = uploadAvatar;
window.togglePassVis = togglePassVis;
window.checkPassStrength = checkPassStrength;
window.updateProfile = updateProfile;
window.changePassword = changePassword;
window.filterUserDocuments = filterUserDocuments;

// ===== DOWNLOAD FUNCTION =====
async function downloadDocument(docId) {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        // Lấy thông tin document
        const doc = await apiRequest(`/api/documents/${docId}`);

        // Tạo link tải
        const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : localStorage.getItem('accessToken');
        const downloadUrl = `${API_BASE}/api/documents/${docId}/download`;

        // Mở link tải trong tab mới
        window.open(`${downloadUrl}?token=${token}`, '_blank');

        if (typeof showToast !== 'undefined') {
            showToast('Đang tải tài liệu...', 'success');
        }

    } catch (error) {
        console.error('Error downloading document:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải tài liệu', 'error');
        }
    }
}

// ===== UPDATE PAGINATION =====
function updatePagination(containerId, currentPage, totalPages) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';

    // Previous
    html += `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<button class="page-btn active">${i}</button>`;
        } else if (i <= 3 || i > totalPages - 3 || Math.abs(i - currentPage) <= 1) {
            html += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        } else if (i === 4 && currentPage > 4) {
            html += `<span>...</span>`;
        }
    }

    // Next
    html += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;
    html += '</div>';

    container.innerHTML = html;
}

function changePage(page) {
    if (page < 1) return;
    if (page > Math.ceil(UserState.documents.total / UserState.documents.pageSize)) return;

    UserState.documents.page = page;
    loadUserDocuments();
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function () {
    // Kiểm tra đăng nhập
    if (typeof isLoggedIn === 'undefined' || !isLoggedIn()) {
        window.location.href = '/login';
        return;
    }

    const user = typeof getUser !== 'undefined' ? getUser() : null;
    if (user && user.role !== 'ADMIN') {
        initUserDashboard();
        loadHomeData();
    }
});
// ===== DOCUMENT PERMISSION MANAGEMENT =====
let currentPermissionDocId = null;

async function openPermissionModal(docId, docName) {
    try {
        currentPermissionDocId = docId;

        const titleEl = document.getElementById('permissionModalTitle');
        if (titleEl) {
            titleEl.textContent = `Quản lý Quyền Truy cập - ${docName || 'Tài liệu'}`;
        }

        // Reset state
        const tbodyEl = document.getElementById('permissionListBody');
        if (tbodyEl) {
            tbodyEl.innerHTML = '<tr><td colspan="4" class="empty-state" style="text-align:center; padding: 20px;">Đang tải dữ liệu...</td></tr>';
        }

        const deptSelectEl = document.getElementById('departmentSelect');
        if (deptSelectEl) {
            deptSelectEl.innerHTML = '<option value="">-- Đang tải danh sách... --</option>';
        }

        if (typeof openModal === 'function') {
            openModal('permissionModal');
        } else {
            console.error("Hàm openModal không tồn tại!");
            alert("Lỗi hệ thống: Không tìm thấy hàm hiển thị giao diện. Vui lòng thử lại.");
            return;
        }

        await Promise.all([
            loadDepartmentsForShare(),
            loadDocumentPermissions(docId)
        ]);
    } catch (err) {
        console.error("Lỗi khi mở modal quản lý quyền:", err);
        alert("Có lỗi xảy ra khi mở quản lý quyền: " + err.message);
    }
}

async function loadDepartmentsForShare() {
    try {
        const departments = await apiRequest('/api/departments');
        const currentUser = JSON.parse(localStorage.getItem('user'));

        const select = document.getElementById('departmentSelect');
        if (!select) {
            throw new Error("Không tìm thấy phần tử departmentSelect trong DOM");
        }
        select.innerHTML = '<option value="">-- Chọn phòng ban --</option>\n<option value="0">-- Tất cả phòng ban --</option>';

        departments.forEach(dept => {
            // Đừng hiển thị phòng ban của chính mình vì mình đã có quyền
            if (!currentUser || currentUser.departmentId !== dept.id) {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.name;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading departments:', error);
        document.getElementById('departmentSelect').innerHTML = '<option value="">Lỗi tải danh sách</option>';
    }
}

async function loadDocumentPermissions(docId) {
    try {
        const tbody = document.getElementById('permissionListBody');
        if (!tbody) {
            throw new Error("Không tìm thấy phần tử permissionListBody trong DOM");
        }

        const permissions = await apiRequest(`/api/documents/${docId}/permissions`);

        if (permissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="text-align:center; padding: 20px; color: #64748b;">Chưa chia sẻ cho phòng ban nào</td></tr>';
            return;
        }

        tbody.innerHTML = permissions.map(perm => {
            const deptName = perm.departmentName || 'Tất cả phòng ban';
            return `
            <tr>
                <td style="font-weight: 500;">${escapeHtml(deptName)}</td>
                <td>${typeof formatDate !== 'undefined' ? formatDate(perm.createdAt) : perm.createdAt}</td>
                <td>${escapeHtml(perm.grantedByName || '-')}</td>
                <td style="text-align: center;">
                    <button class="btn-icon" style="color: #ef4444;" onclick="revokeDocumentPermission(${perm.departmentId || 0})" title="Thu hồi">🗑️</button>
                </td>
            </tr>
        `}).join('');
    } catch (error) {
        console.error('Error loading permissions:', error);
        const tbody = document.getElementById('permissionListBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="text-align:center; color: #ef4444;">Lỗi khi tải dữ liệu</td></tr>';
        throw error; // Re-throw to be caught by Promise.all
    }
}

async function shareDocumentPermission() {
    if (!currentPermissionDocId) return;

    const select = document.getElementById('departmentSelect');
    const deptId = select.value;

    if (!deptId) {
        showToast('Vui lòng chọn phòng ban để chia sẻ', 'error');
        return;
    }

    const btn = document.getElementById('btnShareDoc');
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';

    try {
        await apiRequest(`/api/documents/${currentPermissionDocId}/permissions`, {
            method: 'POST',
            body: { departmentId: parseInt(deptId) }
        });

        showToast('Đã chia sẻ thành công', 'success');
        select.value = ''; // reset
        await loadDocumentPermissions(currentPermissionDocId); // reload list
    } catch (error) {
        console.error('Error sharing document:', error);
        showToast(error.message || 'Có lỗi xảy ra khi chia sẻ', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Chia sẻ';
    }
}

async function revokeDocumentPermission(deptId) {
    if (!currentPermissionDocId || !confirm('Bạn có chắc chắn muốn thu hồi quyền truy cập của phòng ban này?')) return;

    try {
        await apiRequest(`/api/documents/${currentPermissionDocId}/permissions/${deptId}`, {
            method: 'DELETE'
        });

        showToast('Đã thu hồi quyền thành công', 'success');
        await loadDocumentPermissions(currentPermissionDocId); // reload list
    } catch (error) {
        console.error('Error revoking permission:', error);
        showToast(error.message || 'Có lỗi xảy ra khi thu hồi', 'error');
    }
}

// =============================================
// EMPLOYEES MANAGEMENT
// =============================================

async function loadEmployees(page = 1, size = 10, search = '') {
    try {
        if (typeof apiRequest === 'undefined') return;

        // Cập nhật giá trị search và status từ input trên màn hình
        const searchInput = document.getElementById('employeeSearch');
        if (searchInput && search === '') {
            search = searchInput.value;
        }
        const statusFilter = document.getElementById('employeeStatusFilter');
        const status = statusFilter ? statusFilter.value : '';

        let url = `/api/manager/users?page=${page}&size=${size}&search=${encodeURIComponent(search)}`;
        if (status) {
            url += `&status=${status}`;
        }

        const response = await apiRequest(url);
        renderEmployees(response.content || response, response.totalElements, page, size);
    } catch (error) {
        console.error('Error loading employees:', error);
        if (typeof showToast !== 'undefined') showToast('Không thể tải danh sách nhân viên', 'error');
    }
}

function renderEmployees(users, total, currentPage = 1, size = 10) {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="text-align:center; padding: 40px 0;"><i class="fa-solid fa-users" style="font-size:2rem; color:#d1d5db; margin-bottom:12px;"></i><p>Không có nhân viên nào</p></td></tr>';

        const pageInfo = document.getElementById('employeePageInfo');
        if (pageInfo) pageInfo.textContent = 'Hiển thị 0 nhân viên';

        const pagination = document.getElementById('employeePagination');
        if (pagination) pagination.innerHTML = '';
        return;
    }

    tbody.innerHTML = users.map(u => {
        const statusBadge = u.isActive
            ? '<span class="status-badge" style="background:#dcfce7;color:#166534;"><i class="fa-solid fa-check"></i> Hoạt động</span>'
            : '<span class="status-badge" style="background:#fee2e2;color:#b91c1c;"><i class="fa-solid fa-lock"></i> Đã khóa</span>';

        return `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:50%; background:#6366f1; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                        ${u.avatarUrl ? `<img src="${u.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : (u.fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight:600; color:#111827; margin-bottom: 2px;">${u.fullName}</div>
                        <div style="font-size:0.8rem; color:#6b7280; display:flex; align-items:center; gap:8px;">
                            <span title="Tên đăng nhập"><i class="fa-solid fa-at" style="color:#9ca3af;"></i> ${u.username}</span>
                            ${u.phone ? `<span style="color:#e5e7eb;">|</span><span title="Số điện thoại"><i class="fa-solid fa-phone" style="color:#9ca3af; font-size: 0.75rem;"></i> ${u.phone}</span>` : '<span style="color:#e5e7eb;">|</span><span title="Số điện thoại" style="color:#d1d5db; font-style:italic;">Chưa cập nhật SĐT</span>'}
                        </div>
                    </div>
                </div>
            </td>
            <td style="color:#4b5563;">
                <div>${u.email || 'Chưa có email'}</div>
            </td>
            <td>${statusBadge}</td>
            <td style="text-align:right;">
                <button class="btn-icon" onclick="editEmployee(${u.id})" title="Sửa"><i class="fa-solid fa-pen-to-square"></i></button>
            </td>
        </tr>`;
    }).join('');

    const pageInfo = document.getElementById('employeePageInfo');
    if (pageInfo) {
        if (total !== undefined) {
            pageInfo.textContent = `Hiển thị ${users.length} / ${total} nhân viên`;
        } else {
            pageInfo.textContent = `Hiển thị ${users.length} nhân viên`;
        }
    }

    // Update Pagination
    updateEmployeePagination(currentPage, total, size);
}

function updateEmployeePagination(currentPage, total, size) {
    const container = document.getElementById('employeePagination');
    if (!container) return;

    if (!total || total <= size) {
        container.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(total / size);
    let html = '';

    html += `<button class="page-btn" onclick="loadEmployees(${currentPage - 1}, ${size})" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<button class="page-btn active">${i}</button>`;
        } else if (i <= 3 || i > totalPages - 3 || Math.abs(i - currentPage) <= 1) {
            html += `<button class="page-btn" onclick="loadEmployees(${i}, ${size})">${i}</button>`;
        } else if (i === 4 && currentPage > 4) {
            html += `<span>...</span>`;
        }
    }

    html += `<button class="page-btn" onclick="loadEmployees(${currentPage + 1}, ${size})" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;

    container.innerHTML = html;
}

function loadReports() {
    // Placeholder for reports tab
    console.log("Loading reports...");
}

// Gọi loadManagerData nếu form init chạy lại
if (typeof loadManagerData === 'function' && document.getElementById('tabManager')?.style.display === 'block') {
    loadManagerData();
}

async function editEmployee(id) {
    try {
        const user = await apiRequest(`/api/manager/users/${id}`);

        document.getElementById('employeeForm').reset();
        document.getElementById('empId').value = user.id;
        document.getElementById('employeeModalTitle').textContent = 'Chỉnh sửa nhân viên';

        document.getElementById('empFullName').value = user.fullName || '';
        document.getElementById('empEmail').value = user.email || '';
        document.getElementById('empPhone').value = user.phone || '';

        // Disable editing username and password
        document.getElementById('groupEmpUsername').style.display = 'none';
        document.getElementById('groupEmpPassword').style.display = 'none';
        document.getElementById('empUserName').required = false;
        document.getElementById('empPassword').required = false;

        if (typeof openModal === 'function') {
            openModal('employeeModal');
        } else {
            document.getElementById('employeeModal').style.display = 'flex';
        }
    } catch (error) {
        console.error("Error getting user details:", error);
        if (typeof showToast !== 'undefined') showToast("Không thể tải thông tin nhân viên", "error");
    }
}

function closeEmployeeModal() {
    if (typeof closeModal === 'function') {
        closeModal('employeeModal');
    } else {
        document.getElementById('employeeModal').style.display = 'none';
    }
}

async function saveEmployee() {
    const id = document.getElementById('empId').value;
    const form = document.getElementById('employeeForm');

    if (!id) {
        if (typeof showToast !== 'undefined') showToast('Không thể thêm nhân viên mới. Chức năng này chỉ dành cho Admin.', 'warning');
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        fullName: document.getElementById('empFullName').value.trim(),
        email: document.getElementById('empEmail').value.trim(),
        phone: document.getElementById('empPhone').value.trim()
    };

    try {
        await apiRequest(`/api/manager/users/${id}`, { method: 'PUT', body: data });
        if (typeof showToast !== 'undefined') showToast('Cập nhật thành công', 'success');
        closeEmployeeModal();
        loadEmployees(1);
    } catch (error) {
        console.error('Error saving employee:', error);
        if (typeof showToast !== 'undefined') showToast('Lỗi khi lưu thông tin: ' + (error.message || ''), 'error');
    }
}

async function lockEmployee(id) {
    if (confirm("Bạn có chắc chắn muốn khóa tài khoản này?")) {
        try {
            await apiRequest(`/api/manager/users/${id}/lock`, { method: 'PUT' });
            if (typeof showToast !== 'undefined') showToast("Đã khóa tài khoản", "success");
            loadEmployees(1);
        } catch (error) {
            if (typeof showToast !== 'undefined') showToast("Lỗi khi khóa tài khoản", "error");
        }
    }
}

async function unlockEmployee(id) {
    if (confirm("Bạn muốn mở khóa tài khoản này?")) {
        try {
            await apiRequest(`/api/manager/users/${id}/unlock`, { method: 'PUT' });
            if (typeof showToast !== 'undefined') showToast("Đã mở khóa tài khoản", "success");
            loadEmployees(1);
        } catch (error) {
            if (typeof showToast !== 'undefined') showToast("Lỗi khi mở khóa tài khoản", "error");
        }
    }
}

async function deleteEmployee(id) {
    if (confirm("Bạn có chắc chắn muốn XÓA nhân viên này khỏi hệ thống? Dữ liệu không thể phục hồi!")) {
        try {
            await apiRequest(`/api/manager/users/${id}`, { method: 'DELETE' });
            if (typeof showToast !== 'undefined') showToast("Đã xóa nhân viên", "success");
            loadEmployees(1);
        } catch (error) {
            if (typeof showToast !== 'undefined') showToast("Lỗi khi xóa nhân viên", "error");
        }
    }
}

// Attach to switchTab so it loads data when switching to Employee tab
document.addEventListener('DOMContentLoaded', () => {
    // Monkey-patch switchTab to load employees when tab is active
    if (typeof window.switchTab === 'function') {
        const originalSwitchTab = window.switchTab;
        window.switchTab = function (tabId, menuItem) {
            originalSwitchTab(tabId, menuItem);
            if (tabId === 'tabEmployees') {
                loadEmployees(1);
            }
        };
    }
});
