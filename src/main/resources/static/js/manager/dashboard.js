/* =============================================
   user-dashboard.js – IDMS User Dashboard (ĐÃ SỬA)
   Chức năng: Documents, AI Chatbot, Search, Profile
   ============================================= */

// ===== FILE TYPE STYLE HELPER (đồng bộ màu với Admin) =====
function getDocStyle(type) {
    if (typeof getDocFileStyle !== 'undefined') return getDocFileStyle(type);
    // Fallback inline nếu common.js chưa load
    if (!type) return { color: '#6b7280', bg: '#f9fafb', icon: 'fa-file' };
    const t = type.split('/').pop().toLowerCase();
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

            // switchTab từ common.js sẽ dispatch 'tabSwitched' event -> loadUserTabData
            if (typeof switchTab !== 'undefined') {
                switchTab(tabId, this);
            }
        });
    });
}

function setupUserEventListeners() {
    if (typeof initCitationPopover === 'function') initCitationPopover();
    if (typeof initSignaturePad === 'function') initSignaturePad();
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

    // Upload Document
    const uploadInput = document.getElementById('uploadDocInput');
    if (uploadInput) {
        uploadInput.addEventListener('change', handleUploadDocument);
    }

    // Chat input
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    if (chatInput) {
        chatInput.addEventListener('keydown', handleChatKeydown);
        chatInput.addEventListener('input', function () {
            autoResizeTextarea(this);
        });
    }
    
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', function() {
            if (chatInput.value.trim() !== '') {
                sendMessage();
            }
        });
    }

    // Global search
    const globalSearch = document.getElementById('globalSearchInput');
    if (globalSearch && typeof debounce !== 'undefined') {
        globalSearch.addEventListener('input', debounce(() => {
            const dropdown = document.getElementById('globalSearchDropdown');
            if (globalSearch.value.trim().length >= 2) {
                if (dropdown) dropdown.style.display = 'block';
                performSearch();
            } else {
                if (dropdown) dropdown.style.display = 'none';
                const res = document.getElementById('globalSearchResults');
                if (res) res.innerHTML = '';
            }
        }, 500));
        
        // Hide dropdown when click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.topbar-search')) {
                const dropdown = document.getElementById('globalSearchDropdown');
                if (dropdown) dropdown.style.display = 'none';
            }
        });
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

// ===== NOTEBOOKLM CITATION POPOVER =====
function initCitationPopover() {
    if (document.getElementById('citation-popover')) return;
    const popover = document.createElement('div');
    popover.id = 'citation-popover';
    popover.className = 'citation-popover';
    popover.innerHTML = `
        <div class='citation-popover-title'><i class='fa-solid fa-file-lines'></i> <span id='citation-popover-title-text'></span></div>
        <div id='citation-popover-excerpt' class='citation-popover-excerpt'></div>
    `;
    document.body.appendChild(popover);
}

window.showCitationPopover = function(element, title, excerpt) {
    const popover = document.getElementById('citation-popover');
    if (!popover) return;
    document.getElementById('citation-popover-title-text').textContent = title;
    document.getElementById('citation-popover-excerpt').textContent = '"' + excerpt + '"';
    
    // Position it
    const rect = element.getBoundingClientRect();
    popover.style.display = 'block';
    const popoverHeight = popover.offsetHeight;
    
    popover.style.left = Math.max(10, rect.left - 130) + 'px';
    popover.style.top = (rect.top - popoverHeight - 10) + 'px';
    
    // If it goes off top, show below
    if (rect.top - popoverHeight - 10 < 0) {
        popover.style.top = (rect.bottom + 10) + 'px';
    }
    
    requestAnimationFrame(() => {
        popover.classList.add('visible');
    });
};

window.hideCitationPopover = function() {
    const popover = document.getElementById('citation-popover');
    if (popover) {
        popover.classList.remove('visible');
        setTimeout(() => {
            if (!popover.classList.contains('visible')) {
                popover.style.display = 'none';
            }
        }, 200);
    }
};

document.addEventListener('DOMContentLoaded', initCitationPopover);

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

async function viewRoleDetail(id) {
    alert('Tính năng đang phát triển');
}

async function deleteDocumentManager(docId, fileName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu "${fileName}"?\nHành động này không thể hoàn tác và sẽ xóa toàn bộ dữ liệu AI liên quan.`)) {
        return;
    }
    
    try {
        const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : (localStorage.getItem('accessToken') || '');
        const res = await fetch(`/api/manager/documents/${docId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const msg = await res.text();
        if (res.ok) {
            if (typeof showToast !== 'undefined') showToast("Đã xóa tài liệu thành công!", "success");
            else alert("Đã xóa tài liệu thành công!");
            
            if (typeof fetchDocuments === 'function') fetchDocuments();
            else loadUserDocuments();
        } else {
            if (typeof showToast !== 'undefined') showToast(msg || "Lỗi khi xóa tài liệu", "error");
            else alert("Lỗi: " + msg);
        }
    } catch(e) {
        console.error(e);
        if (typeof showToast !== 'undefined') showToast(e.message, "error");
        else alert(e.message);
    }
}
window.deleteDocumentManager = deleteDocumentManager;

async function loadHomeData() {
    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        const data = await apiRequest('/api/dashboard/stats');

        // Bỏ skeleton loaders
        document.querySelectorAll('.stat-value, .kpi-value').forEach(el => el.classList.remove('skeleton-loader'));

        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        
        // Cập nhật các ID của Admin (nếu có)
        setEl('statDocCount', data.documentCount || 0);
        setEl('statChatCount', data.chatSessionCount || 0);
        setEl('statViewCount', data.viewCount || 0);
        setEl('statSearchCount', data.searchCount || 0);

        // Cập nhật các ID của Manager
        setEl('msEmployeeCount', data.employeeCount || 0);
        setEl('msTotalDocs', data.documentCount || 0);
        setEl('msPendingDocs', data.pendingApprovalCount || 0);
        setEl('msOnlineUsers', data.onlineUsers || 0);

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
                const wDept = document.getElementById('wDept');
                if (wDept) wDept.textContent = currentUser.departmentName;
                const wDeptWrap = document.getElementById('wDeptWrap');
                if (wDeptWrap) wDeptWrap.style.display = 'inline';
            }
            if (currentUser.role) {
                const roleLabels = { 'USER': 'Nhân viên', 'MANAGER': 'Trưởng phòng', 'ADMIN': 'Quản trị viên' };
                const wRole = document.getElementById('wRole');
                if (wRole) wRole.textContent = roleLabels[currentUser.role] || currentUser.role;
                const wRoleWrap = document.getElementById('wRoleWrap');
                if (wRoleWrap) wRoleWrap.style.display = 'inline';
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

                let combinedStatusClass = '';
                let combinedStatusLabel = '';
                let badgeBg = '#f1f5f9';
                let badgeColor = '#64748b';
                let isManagerPending = false;

                // Determine consolidated status
                if (doc.approvalStatus === 'PENDING') {
                    combinedStatusClass = 'status-pending';
                    combinedStatusLabel = 'Chờ duyệt';
                    badgeBg = '#fef3c7'; badgeColor = '#d97706';
                    isManagerPending = true;
                } else if (doc.approvalStatus === 'REJECTED') {
                    combinedStatusClass = 'status-failed';
                    combinedStatusLabel = 'Cần sửa đổi';
                    badgeBg = '#fee2e2'; badgeColor = '#ef4444';
                } else {
                    // It is APPROVED by manager. Now check AI status
                    if (doc.status === 'PENDING' || doc.status === 'PROCESSING') {
                        combinedStatusClass = 'status-processing'; // class màu xanh dương
                        combinedStatusLabel = 'AI Đang xử lý';
                        badgeBg = '#e0e7ff'; badgeColor = '#4f46e5';
                    } else if (doc.status === 'FAILED') {
                        combinedStatusClass = 'status-failed';
                        combinedStatusLabel = 'Lỗi xử lý';
                        badgeBg = '#fee2e2'; badgeColor = '#ef4444';
                    } else {
                        combinedStatusClass = 'status-success';
                        combinedStatusLabel = 'Hoàn tất';
                        badgeBg = '#dcfce7'; badgeColor = '#16a34a';
                    }
                }



                let actionBtnHtml = '';
                if (combinedStatusClass === 'status-processing') {
                    actionBtnHtml = `<button style="background:transparent;border:none;color:#94a3b8;font-weight:700;font-size:0.95rem;cursor:not-allowed;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;" disabled>
                            <i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý
                        </button>`;
                } else if (combinedStatusClass === 'status-failed') {
                    actionBtnHtml = `<button style="background:transparent;border:none;color:#ef4444;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); openDocumentDetail(${doc.id})">
                            <i class="fa-regular fa-circle-xmark"></i> Xem lỗi
                        </button>`;
                } else if (combinedStatusClass === 'status-pending') {
                    actionBtnHtml = `<button style="background:transparent;border:none;color:#d97706;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); openDocumentDetail(${doc.id})">
                            <i class="fa-solid fa-pen-to-square"></i> Phê duyệt
                        </button>`;
                } else {
                    actionBtnHtml = `<button style="background:transparent;border:none;color:#4f46e5;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); openDocumentDetail(${doc.id})">
                            <i class="fa-regular fa-eye"></i> Xem chi tiết
                        </button>`;
                }

                return `
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s; min-height:180px;" onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.06)'; this.style.borderColor='#cbd5e1'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'; this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="width:44px;height:44px;background:${style.bg};color:${style.color};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">
                            <i class="fa-solid ${style.icon}"></i>
                        </div>
                        <div class="badge ${combinedStatusClass}" style="background:${badgeBg};color:${badgeColor};padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;white-space:nowrap;">${combinedStatusLabel}</div>
                    </div>
                    
                    <div style="flex:1;">
                        <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 8px 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;" title="${doc.fileName}">${doc.fileName}</h3>
                        <div style="font-size:0.8rem;color:#64748b;font-weight:500;margin-bottom:4px;">
                            ID: <strong style="color:#475569;">DOC-${String(doc.id).padStart(4, '0')}</strong> &bull; Ngày: ${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}
                        </div>
                        <div style="font-size:0.8rem;color:#64748b;font-weight:500;">
                            Tác giả: <strong style="color:#475569;">${doc.uploadedByName || 'Không rõ'}</strong>
                        </div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:12px; border-top:1px solid #f1f5f9;">
                        <span style="font-size:0.85rem;color:#94a3b8;font-weight:600;">${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</span>
                        <div style="display:flex; gap:8px;">
                            <button style="background:transparent;border:none;color:#ef4444;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); deleteDocumentManager(${doc.id}, '${doc.fileName ? doc.fileName.replace(/'/g, "\\'") : ''}')" title="Xóa tài liệu"><i class="fa-solid fa-trash-can"></i> Xóa</button>
                            ${actionBtnHtml}
                        </div>
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
                const isManagerPending = doc.approvalStatus === 'PENDING';
                let canManagePerms = false;
                try {
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        const u = JSON.parse(userStr);
                        const isSystemAdmin = u.role === 'ADMIN' || (u.roles && u.roles.includes('ROLE_ADMIN'));
                        const isOwnerManager = (u.role === 'MANAGER' || (u.roles && u.roles.includes('ROLE_MANAGER'))) && doc.departmentId && u.departmentId === doc.departmentId;
                        canManagePerms = isSystemAdmin || isOwnerManager;
                    }
                } catch(e) {}
                const cannotShare = doc.status === 'FAILED' || doc.status === 'PENDING' || doc.approvalStatus !== 'APPROVED' || !canManagePerms;
                return `
                <tr style="cursor:pointer; ${isFailed ? 'background-color: #fef2f2;' : ''}" onmouseover="this.style.background='${isFailed ? '#fee2e2' : '#f9fafb'}'" onmouseout="this.style.background='${isFailed ? '#fef2f2' : ''}'">
                    <td onclick="openDocumentDetail(${doc.id})" title="Click để xem chi tiết">
                        <span style="font-size:1.1rem;">${typeof getFileIcon !== 'undefined' ? getFileIcon(doc.fileType) : '📄'}</span>
                        <span style="font-weight:500;color:#4f46e5;">${doc.fileName}</span>
                    </td>
                    <td>${doc.fileType ? doc.fileType.split('/').pop().toUpperCase() : ''}</td>
                    <td>${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</td>
                    <td>${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</td>
                    <td>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span class="status-badge ${typeof getStatusClass !== 'undefined' ? getStatusClass(doc.status) : ''}">AI: ${typeof getStatusLabel !== 'undefined' ? getStatusLabel(doc.status) : doc.status}</span>
                            ${doc.approvalStatus ? `<span class="status-badge ${doc.approvalStatus === 'APPROVED' ? 'status-success' : (doc.approvalStatus === 'PENDING' ? 'status-pending' : 'status-failed')}">Duyệt: ${doc.approvalStatus}</span>` : ''}
                        </div>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="event.stopPropagation(); ${isManagerPending ? `approveDocument(${doc.id})` : 'return false;'}" title="${isManagerPending ? 'Duyệt tài liệu' : 'Đã xử lý'}" style="color:${isManagerPending ? '#10b981' : '#cbd5e1'}; ${isManagerPending ? '' : 'cursor:not-allowed;'}">✅</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); ${isManagerPending ? `rejectDocument(${doc.id})` : 'return false;'}" title="${isManagerPending ? 'Từ chối' : 'Đã xử lý'}" style="color:${isManagerPending ? '#ef4444' : '#cbd5e1'}; ${isManagerPending ? '' : 'cursor:not-allowed;'}">❌</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); viewDocumentInline(${doc.id})" title="Xem chi tiết">👁️</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); downloadDocument(${doc.id}, '${(doc.fileName || '').replace(/'/g, "\\'")}')" title="Tải xuống">⬇️</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deleteDocumentManager(${doc.id}, '${(doc.fileName || '').replace(/'/g, "\\'")}')" title="Xóa tài liệu" style="color:#ef4444;">🗑️</button>
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
    const activePill = document.querySelector('#docTypePillFilter .pill-btn.active');
    const typeFilter = activePill ? activePill.getAttribute('data-filter') : '';
    const sortFilter = document.getElementById('docSortFilter')?.value || 'newest';

    UserState.documents.filtered = UserState.documents.data.filter(doc => {
        const matchesSearch = !searchTerm || 
            doc.fileName?.toLowerCase().includes(searchTerm) || 
            ('doc-' + String(doc.id).padStart(4, '0')).includes(searchTerm) || 
            (doc.uploadedByName || '').toLowerCase().includes(searchTerm);
            
        let matchesType = true;
        if (typeFilter) {
            let combinedStatus = '';
            if (doc.approvalStatus === 'PENDING') combinedStatus = 'APPROVAL_PENDING';
            else if (doc.approvalStatus === 'REJECTED') combinedStatus = 'FAILED_OR_REJECTED';
            else {
                if (doc.status === 'PENDING' || doc.status === 'PROCESSING') combinedStatus = 'PROCESSING';
                else if (doc.status === 'FAILED') combinedStatus = 'FAILED_OR_REJECTED';
                else combinedStatus = 'SUCCESS';
            }
            matchesType = (combinedStatus === typeFilter);
        }
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

window.setDocFilter = function(btn) {
    const pills = document.querySelectorAll('#docTypePillFilter .pill-btn');
    if (pills) {
        pills.forEach(el => el.classList.remove('active'));
    }
    btn.classList.add('active');
    filterUserDocuments();
};

function setDocView(view) {
    UserState.documents.view = view;

    document.getElementById('btnGridView')?.classList.toggle('active', view === 'grid');
    document.getElementById('btnListView')?.classList.toggle('active', view === 'list');
    document.getElementById('docGridView').style.display = view === 'grid' ? 'grid' : 'none';
    document.getElementById('docListView').style.display = view === 'list' ? 'block' : 'none';

    renderUserDocuments();
}

async function handleUploadDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        if (typeof showToast !== 'undefined') showToast('Kích thước file không được vượt quá 10MB', 'error');
        event.target.value = ''; // Reset input
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Nếu user thuộc phòng ban nào, truyền lên server (để server lưu departmentId)
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser && currentUser.departmentId) {
        formData.append('departmentId', currentUser.departmentId);
    }

    try {
        if (typeof showToast !== 'undefined') showToast('Đang tải lên...', 'info');

        const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : (localStorage.getItem('accessToken') || localStorage.getItem('token') || '');
        const url = `${typeof API_BASE !== 'undefined' ? API_BASE : ''}/api/documents/upload`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || 'Upload thất bại');
        }

        if (typeof showToast !== 'undefined') showToast('Tải lên thành công! Đang chờ duyệt.', 'success');

        // Refresh danh sách
        loadUserDocuments();

    } catch (error) {
        console.error('Error uploading file:', error);
        if (typeof showToast !== 'undefined') showToast(error.message, 'error');
    } finally {
        event.target.value = ''; // Reset input
    }
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
            downloadBtn.onclick = () => downloadDocument(docId, doc.fileName);
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

function showConfirmDialog(title, message, callback) {
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMsg');
    const actionBtn = document.getElementById('confirmActionBtn');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    UserState.confirmCallback = callback;

    if (actionBtn) {
        actionBtn.textContent = 'Xác nhận';
        actionBtn.className = 'btn-card-primary'; // Dùng class nút xanh đen cho đẹp
        // Phải gán lại event listener hoặc ghi đè onclick
        actionBtn.onclick = function () {
            if (UserState.confirmCallback) {
                UserState.confirmCallback();
            }
            if (typeof closeModal !== 'undefined') {
                closeModal('confirmModal');
            }
            UserState.confirmCallback = null;
        };
    }

    if (typeof openModal !== 'undefined') {
        openModal('confirmModal');
    }
}

async function loadPendingApprovals() {
    try {
        if (typeof apiRequest === 'undefined') return;

        const response = await apiRequest('/api/manager/documents/pending');
        const docs = response.content || response || [];
        const container = document.getElementById('approvalsListContainer');
        const badge1 = document.getElementById('navPendingBadge');
        const badge2 = document.getElementById('approvalsTabBadge');

        const pendingDocsCount = docs.filter(doc => doc.approvalStatus === 'PENDING').length;

        if (badge1) {
            if (pendingDocsCount > 0) {
                badge1.textContent = pendingDocsCount;
                badge1.style.display = 'inline-block';
            } else {
                badge1.style.display = 'none';
            }
        }
        if (badge2) {
            badge2.textContent = pendingDocsCount;
        }

        if (!container) return;

        if (docs.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 0; color:#6b7280;">
                    <i class="fa-regular fa-folder-open" style="font-size:2.5rem; margin-bottom:12px; color:#cbd5e1;"></i>
                    <p style="font-size:1.1rem; font-weight:500;">Chưa có tài liệu nào chờ phê duyệt</p>
                </div>`;
            return;
        }

        container.innerHTML = docs.map(doc => {
            const author = doc.uploadedByName || doc.author || 'Không xác định';
            const dept = doc.departmentName || 'Chung';
            const dateStr = typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt;
            const docIdCode = 'DOC-' + String(doc.id).padStart(4, '0');

            let typeLabel = 'Tài liệu';
            const fName = (doc.fileName || '').toLowerCase();
            if (fName.includes('hợp đồng')) typeLabel = 'Hợp đồng';
            else if (fName.includes('tờ trình')) typeLabel = 'Tờ trình';
            else if (fName.includes('quyết định')) typeLabel = 'Quyết định';
            else if (fName.includes('quy trình')) typeLabel = 'Quy trình';

            let badgeHtml = '';
            let actionButtonsHtml = '';

            if (doc.approvalStatus === 'REJECTED') {
                badgeHtml = `<span style="background:#fee2e2; color:#ef4444; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600; white-space:nowrap;">Cần sửa đổi</span>`;
                actionButtonsHtml = `
                    <button onclick="openDocumentDetail(${doc.id})" style="background:#ffffff; border:1px solid #e2e8f0; color:#475569; padding:8px 16px; border-radius:8px; font-size:0.9rem; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.color='#0f172a';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.color='#475569';">
                        <i class="fa-regular fa-eye"></i> Chi tiết & Phụ lục
                    </button>
                `;
            } else if (doc.approvalStatus === 'APPROVED') {
                badgeHtml = `<span style="background:#dcfce7; color:#166534; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600; white-space:nowrap;">Đã duyệt</span>`;
                actionButtonsHtml = `
                    <button onclick="openDocumentDetail(${doc.id})" style="background:#ffffff; border:1px solid #e2e8f0; color:#475569; padding:8px 16px; border-radius:8px; font-size:0.9rem; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.color='#0f172a';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.color='#475569';">
                        <i class="fa-regular fa-eye"></i> Chi tiết & Phụ lục
                    </button>
                `;
            } else {
                badgeHtml = `<span style="background:#fef3c7; color:#d97706; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600; white-space:nowrap;">Chờ duyệt</span>`;
                actionButtonsHtml = `
                    <button onclick="openDocumentDetail(${doc.id})" style="background:#ffffff; border:1px solid #e2e8f0; color:#475569; padding:8px 16px; border-radius:8px; font-size:0.9rem; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.color='#0f172a';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.color='#475569';">
                        <i class="fa-regular fa-eye"></i> Chi tiết
                    </button>
                    <button onclick="rejectDocument(${doc.id})" style="background:#fef3c7; color:#d97706; border:none; padding:8px 16px; border-radius:8px; font-size:0.9rem; font-weight:600; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#fde68a'" onmouseout="this.style.background='#fef3c7'">
                        Yêu cầu sửa
                    </button>
                    <button onclick="approveDocument(${doc.id})" style="background:#10b981; color:#ffffff; border:none; padding:8px 20px; border-radius:8px; font-size:0.9rem; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; transition:background 0.2s; box-shadow:0 2px 4px rgba(16, 185, 129, 0.2);" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                        <i class="fa-regular fa-circle-check"></i> Duyệt Ngay
                    </button>
                `;
            }

            return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:20px 24px; box-shadow:0 2px 6px -1px rgba(0,0,0,0.02); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
                
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <h4 style="font-size:1.15rem; font-weight:700; color:#0f172a; margin:0;">${doc.fileName}</h4>
                        ${badgeHtml}
                        <span style="background:#f1f5f9; color:#64748b; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600; white-space:nowrap;">${typeLabel}</span>
                    </div>
                    <div style="font-size:0.85rem; color:#64748b; font-weight:500;">
                        ${docIdCode} &bull; Phòng ban: ${dept} &bull; Tác giả: ${author} &bull; Ngày tạo: ${dateStr}
                    </div>
                </div>

                <div style="display:flex; gap:12px; align-items:center; flex-shrink:0;">
                    ${actionButtonsHtml}
                </div>
            </div>
            `;
        }).join('');

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
    if (typeof openModal !== 'undefined') {
        document.getElementById('rejectDocId').value = docId;
        document.getElementById('rejectReason').value = '';
        openModal('rejectDocModal');
    } else {
        if (confirm('Bạn có chắc chắn muốn từ chối tài liệu này?')) {
            await executeRejectFallback(docId, "Bị từ chối bởi Quản lý");
        }
    }
}

async function executeReject() {
    const docId = document.getElementById('rejectDocId').value;
    const reason = document.getElementById('rejectReason').value;
    if (!reason.trim()) {
        if (typeof showToast !== 'undefined') showToast('Vui lòng nhập lý do từ chối', 'error');
        return;
    }
    await executeRejectFallback(docId, reason);
    if (typeof closeModal !== 'undefined') closeModal('rejectDocModal');
}

async function executeRejectFallback(docId, reason) {
    try {
        if (typeof apiRequest === 'undefined') throw new Error('apiRequest not found');

        await apiRequest(`/api/manager/documents/${docId}/reject`, {
            method: 'PUT',
            body: JSON.stringify({ reason: reason })
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
            <div class="chat-session-meta">${typeof formatDate !== 'undefined' ? formatDate(session.updatedAt) : session.updatedAt}</div>
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

        const messages = await apiRequest(`/api/user/chat-sessions/${sessionId}/messages`);

        const sessionMeta = UserState.chat.sessions.find(s => s.id === sessionId);
        const session = {
            title: sessionMeta ? sessionMeta.title : 'Cuộc hội thoại',
            messageCount: messages ? messages.length : 0
        };

        UserState.chat.currentSessionId = sessionId;
        UserState.chat.messages = messages || [];

        const emptyState = document.getElementById('chatEmptyState');
        const active = document.getElementById('chatActive');
        const title = document.getElementById('chatSessionTitle');
        const meta = document.getElementById('chatSessionMeta');

        if (emptyState) emptyState.style.display = 'none';
        if (active) active.style.display = 'flex';
        if (title) title.textContent = session.title || 'Cuộc hội thoại';
        // (Bỏ phần hiển thị số tin nhắn)

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

    container.innerHTML = messages.map(msg => {
        const refs = msg.fileRefs || msg.sources;
        return `
        <div class="chat-message ${msg.role === 'USER' ? 'user' : 'assistant'}">
            <div class="chat-message-avatar">
                ${msg.role === 'USER' ? '👤' : '🤖'}
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text">${formatMessageContent(msg.content, refs)}</div>
                <div class="chat-message-time">${typeof formatDate !== 'undefined' ? formatDate(msg.createdAt) : msg.createdAt}</div>
            </div>
        </div>
        `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function formatMessageContent(content, sources) {
    if (!content) return '';
    if (typeof marked === "undefined") {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }
    
    let rawHtml = marked.parse(content);
    let cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['data-index'] });
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = cleanHtml;
    
    function processTextNodes(node) {
        if (node.nodeType === 1) { // Element
            const tag = node.tagName.toLowerCase();
            if (["code", "pre", "a"].includes(tag)) return;
            Array.from(node.childNodes).forEach(processTextNodes);
        } else if (node.nodeType === 3) { // Text
            if (/\[(\d+)\]/.test(node.nodeValue)) {
                const spanWrapper = document.createElement('span');
                const escapedText = node.nodeValue; 
                
                spanWrapper.innerHTML = escapedText.replace(/\[(\d+)\]/g, function(m, numStr) {
                    const num = parseInt(numStr, 10);
                    if (sources && sources[num]) {
                        const source = sources[num];
                        const title = source.fileName || "Tài liệu";
                        const excerpt = source.excerpt || "";
                        const t = title.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ').replace(/\r/g, '');
                        const e = excerpt.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ').replace(/\r/g, '');
                        return '<span class="citation-badge" data-index="' + num + '" ' +
                            'onmouseenter="showCitationPopover(this, \'' + t + '\', \'' + e + '\')" ' +
                            'onmouseleave="hideCitationPopover()">' + (num + 1) + '</span>';
                    }
                    return m;
                });
                node.replaceWith(...spanWrapper.childNodes);
            }
        }
    }
    Array.from(tempDiv.childNodes).forEach(processTextNodes);
    return tempDiv.innerHTML;
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
        const container = document.getElementById('globalSearchDropdown') && document.getElementById('globalSearchDropdown').style.display !== 'none' ? document.getElementById('globalSearchResults') : document.getElementById('searchResults');
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

        const dropdown = document.getElementById('globalSearchDropdown');
        const isGlobal = dropdown && dropdown.style.display !== 'none';
        
        const endpoint = isGlobal ? `/api/search?q=${encodeURIComponent(query)}` : `/api/search/ai?q=${encodeURIComponent(query)}`;
        const response = await apiRequest(endpoint);

        // Kết hợp documents và users vào mảng results để render
        const results = [];
        if (isGlobal) {
            if (response.documents) {
                response.documents.forEach(doc => results.push({ ...doc, type: 'document' }));
            }
        } else {
            // For AI search, response is already an array of AiSearchDto
            if (Array.isArray(response)) {
                response.forEach(doc => results.push(doc));
            }
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
    const container = document.getElementById('globalSearchDropdown') && document.getElementById('globalSearchDropdown').style.display !== 'none' ? document.getElementById('globalSearchResults') : document.getElementById('searchResults');
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

        // profile.manager is how Jackson serializes boolean isManager
        if (profile.manager === true || profile.isManager === true) {
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
        const viewJobTitle = document.getElementById('viewJobTitle');
        const viewSignature = document.getElementById('viewSignature');

        if (viewFullName) viewFullName.textContent = profile.fullName || '—';
        if (viewUsername) viewUsername.textContent = profile.username || profile.userName || '—';
        if (viewEmail) viewEmail.textContent = profile.email || '—';
        if (viewPhone) viewPhone.textContent = profile.phone || '—';
        if (viewDept) viewDept.textContent = profile.departmentName || 'Toàn hệ thống';
        if (viewJobTitle) viewJobTitle.textContent = profile.jobTitle || '—';
        if (viewRole) {
            const roles = { ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', USER: 'Nhân viên' };
            viewRole.textContent = roles[profile.role] || profile.role || '—';
        }
        if (viewCreatedAt) viewCreatedAt.textContent = profile.createdAt ? (typeof formatDate !== 'undefined' ? formatDate(profile.createdAt) : profile.createdAt) : '—';
        if (viewLastLogin) viewLastLogin.textContent = profile.lastLogin ? (typeof formatDate !== 'undefined' ? formatDate(profile.lastLogin) : profile.lastLogin) : '—';
        if (viewSignature) {
            if (profile.signatureUrl) {
                viewSignature.innerHTML = `<img src="${profile.signatureUrl}" alt="Chữ ký" style="max-height: 80px; max-width: 100%; object-fit: contain;">`;
                viewSignature.style.padding = '0';
                viewSignature.style.background = 'transparent';
                viewSignature.style.border = 'none';
            } else {
                viewSignature.textContent = 'Chưa thiết lập chữ ký';
                viewSignature.style.padding = '12px';
                viewSignature.style.background = '#f8fafc';
                viewSignature.style.border = '1px dashed var(--border-color)';
            }
        }

        // Update form
        const fullNameInput = document.getElementById('editFullName');
        const phoneInput = document.getElementById('editPhone');
        const avatarInput = document.getElementById('editAvatarUrl');
        const usernameInput = document.getElementById('editUsername');
        const emailInput = document.getElementById('editEmail');
        const deptInput = document.getElementById('editDept');
        const jobTitleInput = document.getElementById('editJobTitle');

        if (fullNameInput) fullNameInput.value = profile.fullName || '';
        if (phoneInput) phoneInput.value = profile.phone || '';
        if (usernameInput) usernameInput.value = profile.userName || '';
        if (emailInput) emailInput.value = profile.email || '';
        if (deptInput) deptInput.value = profile.departmentName || '';
        if (jobTitleInput) jobTitleInput.value = profile.jobTitle || '';

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

        const activities = await apiRequest('/api/activity-logs/recent?limit=20');
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
    const signatureInput = document.getElementById('editSignatureUrl');
    let avatarUrl = null;
    let signatureUrl = null;

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
            }, true);

            avatarUrl = uploadRes.avatarUrl;
        }

        // Nếu có chọn ảnh chữ ký, hoặc vẽ chữ ký mới
        if (signatureInput && signatureInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', signatureInput.files[0]);

            const uploadRes = await apiRequest('/api/users/upload-signature', {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            }, true);

            signatureUrl = uploadRes.signatureUrl;
        } else if (signatureCanvas) {
            // Check if canvas is drawn
            const blank = document.createElement('canvas');
            blank.width = signatureCanvas.width;
            blank.height = signatureCanvas.height;
            if (signatureCanvas.toDataURL() !== blank.toDataURL()) {
                const blob = await new Promise(resolve => signatureCanvas.toBlob(resolve, 'image/png'));
                const formData = new FormData();
                formData.append('file', blob, 'signature.png');
                
                const uploadRes = await apiRequest('/api/users/upload-signature', {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                }, true);
                signatureUrl = uploadRes.signatureUrl;
            }
        }

        // Cập nhật profile
        const payload = { fullName, phone, userName };
        if (avatarUrl) payload.avatarUrl = avatarUrl;
        if (signatureUrl) payload.signatureUrl = signatureUrl;

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
                if (signatureUrl) user.signatureUrl = signatureUrl;
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
            showToast('Không thể tải xuống tài liệu', 'error');
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


// ===== DOCUMENT PERMISSION MANAGEMENT =====
let currentPermissionDocId = null;

async function openPermissionModal(docId, docName) {
    try {
        currentPermissionDocId = docId;

        const titleEl = document.getElementById('permissionModalSubtitle');
        if (titleEl) {
            titleEl.textContent = `${docName || 'Tài liệu'}`;
        }

        // Reset state
        const tbody = document.getElementById('permissionListBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><span>🔐</span>Đang tải dữ liệu...</td></tr>';
        }

        const targetSelectEl = document.getElementById('departmentSelect');
        if (targetSelectEl) {
            targetSelectEl.innerHTML = '<option value="">-- Đang tải danh sách... --</option>';
        }

        if (typeof openModal === 'function') {
            openModal('permissionModal');
        } else {
            console.error("Hàm openModal không tồn tại!");
            alert("Lỗi hệ thống: Không tìm thấy hàm hiển thị giao diện. Vui lòng thử lại.");
            return;
        }

        await Promise.all([
            loadPermissionTargets(),
            loadDocumentPermissions(docId)
        ]);
    } catch (err) {
        console.error("Lỗi khi mở modal quản lý quyền:", err);
        alert("Có lỗi xảy ra khi mở quản lý quyền: " + err.message);
    }
}

async function loadPermissionTargets() {
    try {
        const select = document.getElementById('departmentSelect');
        if (!select) return;

        select.innerHTML = '<option value="">-- Đang tải... --</option>';

        const currentUser = JSON.parse(localStorage.getItem('user'));

        // Fetch departments
        const departments = await apiRequest('/api/departments').catch(() => []);

        select.innerHTML = '<option value="">-- Chọn đối tượng --</option>';

        // Departments
        const optgroupDept = document.createElement('optgroup');
        optgroupDept.label = "Phòng ban";
        optgroupDept.appendChild(new Option("Nội bộ công ty (Tất cả)", "public_0"));

        if (Array.isArray(departments)) {
            departments.forEach(dept => {
                if (!currentUser || currentUser.departmentId !== dept.id) {
                    optgroupDept.appendChild(new Option(dept.name, `dept_${dept.id}`));
                }
            });
        }
        select.appendChild(optgroupDept);

    } catch (error) {
        console.error('Error loading targets:', error);
        document.getElementById('departmentSelect').innerHTML = '<option value="">Lỗi tải danh sách</option>';
    }
}

function calculateTimeLeft(expiresAt) {
    if (!expiresAt) return "không giới hạn";
    const expDate = new Date(expiresAt);
    const now = new Date();
    if (expDate < now) return "đã hết hạn";

    const diffTime = Math.abs(expDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `còn ${diffDays} ngày`;
}

function formatRole(role) {
    switch (role) {
        case 'VIEW': return 'Xem';
        case 'DOWNLOAD': return 'Tải xuống';
        case 'EDIT': return 'Chỉnh sửa';
        default: return 'Xem';
    }
}

async function loadDocumentPermissions(docId) {
    try {
        const tbody = document.getElementById('permissionListBody');
        if (!tbody) return;

        const permissions = await apiRequest(`/api/documents/${docId}/permissions`);

        if (permissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Chưa chia sẻ cho ai</td></tr>';
            return;
        }

        tbody.innerHTML = permissions.map(perm => {
            let name = "";
            let icon = "";
            if (perm.isPublicLink) {
                name = "Link công khai";
                icon = "🌐";
            } else if (perm.userId) {
                name = perm.userName;
                icon = "👤";
            } else {
                name = perm.departmentName || "Tất cả phòng ban";
                icon = "🏢";
            }

            const dateStr = perm.createdAt ? (typeof formatDate !== 'undefined' ? formatDate(perm.createdAt) : perm.createdAt) : 'Không xác định';

            return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span>${icon}</span>
                        <span style="font-weight:500;">${escapeHtml(name)}</span>
                    </div>
                </td>
                <td>${dateStr}</td>
                <td>${perm.sharedByName || 'Admin'}</td>
                <td style="text-align:center;">
                    <button class="btn-cancel" onclick="revokeDocumentPermission(${perm.id})" style="font-size: 0.85rem; padding: 4px 8px; color: #ef4444; border-color: #fca5a5;">
                        Thu hồi
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading permissions:', error);
        const tbody = document.getElementById('permissionListBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #ef4444;">Lỗi khi tải dữ liệu</td></tr>';
    }
}

async function shareDocumentPermission() {
    if (!currentPermissionDocId) return;

    const select = document.getElementById('departmentSelect');
    const target = select.value;

    if (!target) {
        showToast('Vui lòng chọn đối tượng để chia sẻ', 'error');
        return;
    }

    const roleElement = document.getElementById('shareRoleSelect');
    const role = roleElement ? roleElement.value : 'VIEW';

    const btn = document.getElementById('btnShareDoc');
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';

    const payload = {
        role: role,
        isPublicLink: false
    };

    if (target.startsWith('dept_')) {
        payload.departmentId = parseInt(target.replace('dept_', ''));
    } else if (target.startsWith('public_')) {
        payload.isPublicLink = true;
        payload.departmentId = null;
    }

    try {
        await apiRequest(`/api/documents/${currentPermissionDocId}/permissions`, {
            method: 'POST',
            body: payload
        });

        showToast('Đã chia sẻ thành công', 'success');
        select.value = '';
        await loadDocumentPermissions(currentPermissionDocId);
    } catch (error) {
        console.error('Error sharing document:', error);
        showToast(error.message || 'Có lỗi xảy ra khi chia sẻ', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Chia sẻ';
    }
}

async function createPublicLink() {
    if (!currentPermissionDocId) return;

    const role = document.getElementById('shareRoleSelect').value;
    const duration = document.getElementById('shareDurationSelect').value;

    const btn = document.getElementById('btnCreatePublicLink');
    btn.disabled = true;
    btn.textContent = '...';

    try {
        await apiRequest(`/api/documents/${currentPermissionDocId}/permissions`, {
            method: 'POST',
            body: {
                role: role,
                expiresInDays: duration ? parseInt(duration) : null,
                isPublicLink: true
            }
        });

        showToast('Đã tạo link công khai thành công', 'success');
        await loadDocumentPermissions(currentPermissionDocId);
    } catch (error) {
        console.error('Error creating public link:', error);
        showToast(error.message || 'Có lỗi xảy ra khi tạo link (Có thể bạn không có quyền)', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Tạo link';
    }
}

async function revokeDocumentPermission(permissionId) {
    if (!currentPermissionDocId || !confirm('Bạn có chắc chắn muốn thu hồi quyền truy cập này?')) return;

    try {
        await apiRequest(`/api/documents/${currentPermissionDocId}/permissions/${permissionId}`, {
            method: 'DELETE'
        });

        showToast('Đã thu hồi quyền thành công', 'success');
        await loadDocumentPermissions(currentPermissionDocId);
    } catch (error) {
        console.error('Error revoking permission:', error);
        showToast(error.message || 'Có lỗi xảy ra khi thu hồi', 'error');
    }
}

async function revokeAllPermissions() {
    if (!currentPermissionDocId || !confirm('Bạn có chắc chắn muốn thu hồi TẤT CẢ quyền truy cập của tài liệu này?')) return;

    try {
        await apiRequest(`/api/documents/${currentPermissionDocId}/permissions/all`, {
            method: 'DELETE'
        });

        showToast('Đã thu hồi tất cả quyền thành công', 'success');
        await loadDocumentPermissions(currentPermissionDocId);
    } catch (error) {
        console.error('Error revoking all permissions:', error);
        showToast(error.message || 'Có lỗi xảy ra khi thu hồi', 'error');
    }
}

function renderEmployees(users, total, currentPage = 1, size = 10) {
    const grid = document.getElementById('employeeGrid');
    if (!grid) return;

    const pageInfo = document.getElementById('employeePageInfo');

    if (!users || users.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
            <span style="font-size: 2rem; display: block; margin-bottom: 8px;">👥</span>
            <p style="font-size:0.95rem;">Không có nhân viên nào trong phòng ban</p>
        </div>`;
        if (pageInfo) pageInfo.textContent = 'Hiển thị 0 nhân viên';
        const pagination = document.getElementById('employeePagination');
        if (pagination) pagination.innerHTML = '';
        return;
    }

    grid.innerHTML = users.map(u => {
        const initials = (u.fullName || 'U').charAt(0).toUpperCase();
        const avatarBg = u.isActive ? '#6366f1' : '#9ca3af';
        const statusBadge = u.isActive
            ? '<span class="status-badge" style="background:#dcfce7;color:#166534;"><i class="fa-solid fa-check"></i> Hoạt động</span>'
            : '<span class="status-badge" style="background:#fee2e2;color:#b91c1c;"><i class="fa-solid fa-lock"></i> Đã khóa</span>';

        return `
        <div style="background:#fff; border-radius:16px; border:1px solid #e2e8f0; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'">
            <div style="display:flex; align-items:center; gap:14px;">
                <div style="width:48px; height:48px; border-radius:50%; background:${avatarBg}; color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1.2rem; flex-shrink:0; box-shadow:0 4px 10px rgba(99,102,241,0.3);">
                    ${u.avatarUrl ? `<img src="${u.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : initials}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:700; color:#111827; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.fullName || '—'}</div>
                    <div style="font-size:0.8rem; color:#6b7280; margin-top:2px;"><i class="fa-solid fa-at" style="color:#a5b4fc;"></i> ${u.username}</div>
                </div>
                ${statusBadge}
            </div>
            <div style="border-top:1px solid #f1f5f9; padding-top:10px; display:flex; flex-direction:column; gap:6px; font-size:0.82rem; color:#6b7280;">
                <div><i class="fa-solid fa-envelope" style="color:#a5b4fc; width:16px;"></i> ${u.email || '<span style="color:#d1d5db; font-style:italic;">Chưa có email</span>'}</div>
                <div><i class="fa-solid fa-phone" style="color:#a5b4fc; width:16px;"></i> ${u.phone || '<span style="color:#d1d5db; font-style:italic;">Chưa cập nhật SĐT</span>'}</div>
                ${u.departmentName ? `<div><i class="fa-solid fa-building" style="color:#a5b4fc; width:16px;"></i> ${u.departmentName}</div>` : ''}
            </div>
            <div style="display:flex; gap:8px; margin-top:4px;">
                <button class="btn-icon" onclick="editEmployee(${u.id})" title="Chỉnh sửa"
                    style="flex:1; padding:8px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; color:#4f46e5; cursor:pointer; font-size:0.82rem; font-weight:600; transition:all 0.2s;"
                    onmouseover="this.style.background='#eef2ff'" onmouseout="this.style.background='#f8fafc'">
                    <i class="fa-solid fa-pen-to-square"></i> Chỉnh sửa
                </button>
            </div>
        </div>`;
    }).join('');

    if (pageInfo) {
        pageInfo.textContent = total !== undefined
            ? `Hiển thị ${users.length} / ${total} nhân viên`
            : `Hiển thị ${users.length} nhân viên`;
    }

    updateEmployeePagination(currentPage, total, size);
}

// =============================================
// SIGNATURE PAD
// =============================================
let signaturePadContext = null;
let isDrawingSignature = false;
let signatureCanvas = null;

function initSignaturePad() {
    signatureCanvas = document.getElementById('signaturePad');
    if (!signatureCanvas) return;
    
    signaturePadContext = signatureCanvas.getContext('2d');
    signaturePadContext.strokeStyle = '#0f172a';
    signaturePadContext.lineWidth = 2;
    signaturePadContext.lineCap = 'round';
    signaturePadContext.lineJoin = 'round';

    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', drawSignature);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch support
    signatureCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    signatureCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    signatureCanvas.addEventListener('touchend', stopDrawing);
}

function getPointerPos(e) {
    const rect = signatureCanvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
    if (!signaturePadContext) return;
    
    // Mutually exclusive: if user draws, remove any uploaded file preview
    removeUploadedSignature(false);
    
    isDrawingSignature = true;
    const pos = getPointerPos(e);
    signaturePadContext.beginPath();
    signaturePadContext.moveTo(pos.x, pos.y);
}

function drawSignature(e) {
    if (!isDrawingSignature || !signaturePadContext) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    signaturePadContext.lineTo(pos.x, pos.y);
    signaturePadContext.stroke();
}

function stopDrawing() {
    isDrawingSignature = false;
}

function handleTouchStart(e) {
    if (e.target === signatureCanvas) e.preventDefault();
    startDrawing(e);
}

function handleTouchMove(e) {
    if (e.target === signatureCanvas) e.preventDefault();
    drawSignature(e);
}

function clearSignature() {
    if (signaturePadContext && signatureCanvas) {
        signaturePadContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    }
}

function previewSignature(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Mutually exclusive: if user uploads, clear the drawing canvas
    clearSignature();

    const reader = new FileReader();
    reader.onload = function(event) {
        const previewImg = document.getElementById('signaturePreviewImg');
        const initials = document.getElementById('signaturePreviewInitials');
        const removeBtn = document.getElementById('removeSignatureImgBtn');

        if (previewImg) {
            previewImg.src = event.target.result;
            previewImg.style.display = 'block';
        }
        if (initials) initials.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function removeUploadedSignature(doClearCanvas = true) {
    const fileInput = document.getElementById('editSignatureUrl');
    const previewImg = document.getElementById('signaturePreviewImg');
    const initials = document.getElementById('signaturePreviewInitials');
    const removeBtn = document.getElementById('removeSignatureImgBtn');
    
    if (fileInput) fileInput.value = '';
    if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
    }
    if (initials) initials.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'none';
    
    if (doClearCanvas) {
        clearSignature();
    }
}

function loadReports() {
    loadManagerReportStats();
}

async function loadManagerReportStats() {
    try {
        const stats = await apiRequest('/api/manager/reports/stats');

        // Stat cards
        const repTotalDocs = document.getElementById('repTotalDocs');
        if (repTotalDocs) repTotalDocs.textContent = stats.totalDocuments || 0;

        const repApprovalRate = document.getElementById('repApprovalRate');
        if (repApprovalRate) {
            const rate = stats.approvalRate || 0;
            repApprovalRate.textContent = rate.toFixed(1) + '%';
        }

        const repAvgTime = document.getElementById('repAvgTime');
        if (repAvgTime) {
            const hrs = stats.avgProcessingHours || 0;
            repAvgTime.textContent = hrs > 0 ? hrs.toFixed(1) + ' giờ' : '0 giờ';
        }

        // Trend chart (line chart)
        const trendCtx = document.getElementById('trendChart');
        if (trendCtx && stats.trendLabels && typeof Chart !== 'undefined') {
            if (window._trendChart) window._trendChart.destroy();
            window._trendChart = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: stats.trendLabels || [],
                    datasets: [
                        {
                            label: 'Tài liệu khởi tạo',
                            data: stats.trendDataCreated || [],
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99,102,241,0.08)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#6366f1'
                        },
                        {
                            label: 'Đã phê duyệt',
                            data: stats.trendDataApproved || [],
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16,185,129,0.08)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#10b981'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        // Status donut chart
        const typeCtx = document.getElementById('typeChart');
        if (typeCtx && stats.statusLabels && typeof Chart !== 'undefined') {
            if (window._typeChart) window._typeChart.destroy();
            window._typeChart = new Chart(typeCtx, {
                type: 'doughnut',
                data: {
                    labels: stats.statusLabels || [],
                    datasets: [{
                        data: stats.statusData || [],
                        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } },
                    cutout: '65%'
                }
            });
        }

    } catch (error) {
        console.error('Error loading report stats:', error);
        if (typeof showToast !== 'undefined') showToast('Không thể tải dữ liệu báo cáo: ' + error.message, 'error');
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

        // Read-only header
        const roEmail = document.getElementById('roEmail');
        if (roEmail) roEmail.textContent = user.email || user.username || '-';
        
        const roRole = document.getElementById('roRole');
        const roleMap = { 'ADMIN': 'Quản trị viên', 'MANAGER': 'Quản lý', 'USER': 'Nhân viên' };
        if (roRole) roRole.textContent = roleMap[user.role] || user.role || '-';
        
        const roDepartment = document.getElementById('roDepartment');
        if (roDepartment) roDepartment.textContent = user.departmentName || 'Không thuộc phòng ban';
        
        const roManagerName = document.getElementById('roManagerName');
        if (roManagerName) roManagerName.textContent = user.managerName || 'Không có';
        
        const roAvatar = document.getElementById('roAvatar');
        if (roAvatar) {
            if (user.avatarUrl) {
                roAvatar.innerHTML = `<img src="${user.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else if (typeof generateDefaultAvatar !== 'undefined') {
                roAvatar.innerHTML = `<img src="${generateDefaultAvatar(user.fullName)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                roAvatar.textContent = user.fullName ? user.fullName.charAt(0).toUpperCase() : '?';
            }
        }

        // Form fields
        const empEmployeeCode = document.getElementById('empEmployeeCode');
        if (empEmployeeCode) empEmployeeCode.value = user.employeeCode || '';
        
        const empJobTitle = document.getElementById('empJobTitle');
        if (empJobTitle) empJobTitle.value = user.jobTitle || '';
        
        const empIsActive = document.getElementById('empIsActive');
        if (empIsActive) empIsActive.value = user.isActive !== false ? "true" : "false";

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

// Listen to tabSwitched event from common.js switchTab
document.addEventListener('tabSwitched', function(e) {
    loadUserTabData(e.detail.tabId);
});

// ===== AI REPORT FUNCTIONS =====
async function generateAiReport() {
    if (typeof showModal !== 'undefined') showModal('aiReportModal');
    
    const loadingEl = document.getElementById('aiReportLoading');
    const contentWrapper = document.getElementById('aiReportContentWrapper');
    const contentEl = document.getElementById('aiReportContent');
    const btnAiReport = document.getElementById('btnAiReport');
    
    if (loadingEl) loadingEl.style.display = 'flex';
    if (contentWrapper) contentWrapper.style.display = 'none';
    if (contentEl) contentEl.innerHTML = '';
    
    if (btnAiReport) {
        btnAiReport.disabled = true;
        btnAiReport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang phân tích...';
    }
    
    try {
        if (typeof apiRequest === 'undefined') throw new Error('apiRequest is not defined');
        
        const response = await apiRequest('/api/manager/reports/ai-analysis', {
            method: 'GET'
        });
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentWrapper) contentWrapper.style.display = 'block';
        
        if (contentEl && response && response.content) {
            // Render markdown using marked
            if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
                contentEl.innerHTML = marked.parse(response.content);
            } else {
                contentEl.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${response.content}</pre>`;
            }
        }
    } catch (error) {
        console.error('Error generating AI report:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentWrapper) contentWrapper.style.display = 'block';
        if (contentEl) {
            contentEl.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 20px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 12px;"></i><br>
                Có lỗi xảy ra khi tạo báo cáo AI:<br>${error.message || 'Lỗi không xác định'}
            </div>`;
        }
    } finally {
        if (btnAiReport) {
            btnAiReport.disabled = false;
            btnAiReport.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI Phân Tích Báo Cáo';
        }
    }
}

function copyAiReport() {
    const contentEl = document.getElementById('aiReportContent');
    if (!contentEl) return;
    
    const text = contentEl.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast !== 'undefined') {
            showToast('Đã sao chép báo cáo vào khay nhớ tạm', 'success');
        } else {
            alert('Đã sao chép báo cáo!');
        }
    }).catch(err => {
        console.error('Error copying text:', err);
        if (typeof showToast !== 'undefined') showToast('Không thể sao chép văn bản', 'error');
    });
}
