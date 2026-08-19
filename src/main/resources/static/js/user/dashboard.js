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
    if (['png','jpg','jpeg','gif','webp','svg'].includes(t)) return { color: '#7c3aed', bg: '#f5f3ff', icon: 'fa-file-image' };
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
    currentTab: 'tabHome',
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
    // dashboard.js chỉ chạy trên /user/dashboard
    // Các trang khác như /user/chat có script riêng (chat.js)
    if (!window.location.pathname.startsWith('/user/dashboard')) return;

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

    // Kiểm tra role
    if (user.role === 'ADMIN') {
        window.location.href = '/admin/dashboard';
        return;
    }
    if (user.role === 'MANAGER') {
        window.location.href = '/manager/dashboard';
        return;
    }

    initUserDashboard();
    loadHomeData();
});

function initUserDashboard() {
    setupUserSidebar();
    setupUserEventListeners();
    
    const user = typeof getUser !== 'undefined' ? getUser() : null;
    if (typeof updateUserUI !== 'undefined') {
        updateUserUI(user);
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
    if (typeof initCitationPopover === 'function') initCitationPopover();
    if (typeof initCitationPopover === 'function') initCitationPopover();
    // Document search
    const docSearch = document.getElementById('docSearchInput');
    if (docSearch && typeof debounce !== 'undefined') {
        docSearch.addEventListener('input', debounce(filterUserDocuments, 300));
    }

    // Document filters
    ['docTypeFilter', 'docSortFilter', 'docDeptFilter', 'docStartDateFilter', 'docEndDateFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', filterUserDocuments);
    });

    // Pagination buttons
    const prevBtn = document.getElementById('prevDocPage');
    const nextBtn = document.getElementById('nextDocPage');
    if (prevBtn) prevBtn.addEventListener('click', () => { if (UserState.documents.page > 1) { UserState.documents.page--; renderUserDocuments(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { const maxPage = Math.ceil(UserState.documents.filtered.length / UserState.documents.pageSize); if (UserState.documents.page < maxPage) { UserState.documents.page++; renderUserDocuments(); } });

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
            loadSearchFilters();
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
                        ${(doc.uploadedByName || doc.departmentName) ? `<div class="doc-card-meta" style="margin-top:4px;"><i class="fa-solid fa-user" style="color:#9ca3af;"></i> ${doc.uploadedByName || 'Người dùng'} &bull; <i class="fa-solid fa-building" style="color:#9ca3af;"></i> ${doc.departmentName || 'Tất cả phòng ban'}</div>` : ''}
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
            if(wLastLoginWrap) wLastLoginWrap.style.display = 'inline';
        }

    } catch (error) {
        console.error('Error loading home data:', error);
        
        document.querySelectorAll('.stat-value').forEach(el => {
            el.classList.remove('skeleton-loader');
            el.textContent = 'Lỗi';
            el.style.fontSize = '1.2rem';
        });
        
        const list = document.getElementById('activityList');
        if(list) list.innerHTML = '<li class="activity-item"><div class="activity-dot red"></div><div class="activity-info"><p>Không tải được</p><span>—</span></div></li>';
        
        const grid = document.getElementById('recentDocGrid');
        if(grid) grid.innerHTML = '<div class="empty-state"><span>⚠️</span><p>Không tải được dữ liệu</p></div>';

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

        // Tải toàn bộ danh sách (ví dụ 5000) để Frontend tự xử lý phân trang và lọc
        const response = await apiRequest(`/api/documents?page=0&size=5000`);

        UserState.documents.data = response.content || response;
        UserState.documents.filtered = [...UserState.documents.data];
        
        // Reset về trang 1 mỗi lần tải mới
        UserState.documents.page = 1;
        
        filterUserDocuments();

    } catch (error) {
        console.error('Error loading documents:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải danh sách tài liệu', 'error');
        }
        const gridView = document.getElementById('docGridView');
        if (gridView) {
            gridView.innerHTML = '<div class="empty-state"><span>❌</span><p>Lỗi tải dữ liệu. Vui lòng thử lại sau.</p></div>';
        }
        const listBody = document.getElementById('docListBody');
        if (listBody) {
            listBody.innerHTML = '<tr><td colspan="6" class="empty-state"><span>❌</span>Lỗi tải dữ liệu</td></tr>';
        }
    }
}

function renderUserDocuments() {
    const allDocs = UserState.documents.filtered;
    const page = UserState.documents.page || 1;
    const pageSize = UserState.documents.pageSize || 20;
    
    // Tính tổng số trang và slice
    const totalItems = allDocs.length;
    const maxPage = Math.ceil(totalItems / pageSize) || 1;
    
    // Nếu page hiện tại lớn hơn maxPage (do lọc), reset về 1
    if (page > maxPage) {
        UserState.documents.page = 1;
    }
    
    const startIndex = (UserState.documents.page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const docs = allDocs.slice(startIndex, endIndex);

    const currentUser = JSON.parse(localStorage.getItem('user'));

    const canManagePerms = (doc) => {
        if (!currentUser) return false;
        // ADMIN can manage all. MANAGER can manage if doc belongs to their department
        return currentUser.role === 'ADMIN' || (currentUser.role === 'MANAGER' && doc.departmentId && currentUser.departmentId && Number(doc.departmentId) === Number(currentUser.departmentId));
    };

    // Cập nhật phân trang UI
    const prevBtn = document.getElementById('prevDocPage');
    const nextBtn = document.getElementById('nextDocPage');
    const pageInfo = document.getElementById('pageInfo');
    if (prevBtn) prevBtn.disabled = UserState.documents.page <= 1;
    if (nextBtn) nextBtn.disabled = UserState.documents.page >= maxPage;
    if (pageInfo) pageInfo.textContent = `Trang ${UserState.documents.page} / ${maxPage}`;

    // Update Summary Bar
    const totalCountEl = document.getElementById('docTotalCount');
    const failedCountEl = document.getElementById('docFailedCount');
    if (totalCountEl) totalCountEl.textContent = totalItems;
    if (failedCountEl) {
        const failedDocs = allDocs.filter(d => d.status === 'FAILED');
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
                const cannotShare = doc.status === 'FAILED' || doc.status === 'PENDING';
                
                let combinedStatusClass = '';
                let combinedStatusLabel = '';
                let badgeBg = '#f1f5f9';
                let badgeColor = '#475569';
                
                if (doc.approvalStatus === 'PENDING') {
                    combinedStatusClass = 'status-pending';
                    combinedStatusLabel = 'Chờ duyệt';
                    badgeBg = '#fef3c7';
                    badgeColor = '#d97706';
                } else if (doc.approvalStatus === 'REJECTED') {
                    combinedStatusClass = 'status-failed';
                    combinedStatusLabel = 'Từ chối';
                    badgeBg = '#fee2e2';
                    badgeColor = '#ef4444';
                } else {
                    if (doc.status === 'PENDING') {
                        combinedStatusClass = 'status-processing';
                        combinedStatusLabel = 'AI Đang xử lý';
                        badgeBg = '#e0e7ff';
                        badgeColor = '#4338ca';
                    } else if (doc.status === 'FAILED') {
                        combinedStatusClass = 'status-failed';
                        combinedStatusLabel = 'Lỗi AI';
                        badgeBg = '#fee2e2';
                        badgeColor = '#ef4444';
                    } else {
                        combinedStatusClass = 'status-success';
                        combinedStatusLabel = 'Hoàn tất';
                        badgeBg = '#dcfce7';
                        badgeColor = '#166534';
                    }
                }

                const isOwner = doc.uploadedBy && currentUser && doc.uploadedBy === currentUser.id;
                
                let actionBtnHtml = '';
                
                if (combinedStatusClass === 'status-processing') {
                    actionBtnHtml = `<button style="background:transparent;border:none;color:#94a3b8;font-weight:700;font-size:0.95rem;cursor:not-allowed;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;" disabled>
                            <i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý
                        </button>`;
                } else if (combinedStatusClass === 'status-failed') {
                    actionBtnHtml = `
                        <div style="display:flex; gap:8px;">
                            ${isOwner ? `<button style="background:transparent;border:none;color:#ef4444;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); deleteUserDocument(${doc.id})"><i class="fa-solid fa-trash-can"></i> Thu hồi</button>` : ''}
                            <button style="background:transparent;border:none;color:#ef4444;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); openDocumentDetail(${doc.id})">
                                <i class="fa-regular fa-circle-xmark"></i> Xem lỗi
                            </button>
                        </div>`;
                } else if (combinedStatusClass === 'status-pending') {
                    actionBtnHtml = `
                        <div style="display:flex; gap:8px;">
                            ${isOwner ? `<button style="background:transparent;border:none;color:#ef4444;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); deleteUserDocument(${doc.id})"><i class="fa-solid fa-trash-can"></i> Thu hồi</button>` : ''}
                            <button style="background:transparent;border:none;color:#d97706;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); openDocumentDetail(${doc.id})">
                                <i class="fa-regular fa-eye"></i> Xem chi tiết
                            </button>
                        </div>`;
                } else {
                    actionBtnHtml = `
                        <div style="display:flex; gap:8px;">
                            <button style="background:transparent;border:none;color:#4f46e5;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); downloadDocument(${doc.id}, '${(doc.fileName || '').replace(/'/g, "\\'")}')">
                                <i class="fa-solid fa-download"></i> Tải xuống
                            </button>
                            ${isOwner ? `<button style="background:transparent;border:none;color:${cannotShare ? '#cbd5e1' : '#3b82f6'};font-weight:700;font-size:0.95rem;cursor:${cannotShare ? 'not-allowed' : 'pointer'};display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='${cannotShare ? 'transparent' : '#eff6ff'}'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); ${cannotShare ? 'return false;' : `openPermissionModal(${doc.id}, '${(doc.fileName || '').replace(/'/g, "\\'")}')`}">
                                <i class="fa-solid fa-share-nodes"></i> Chia sẻ
                            </button>` : ''}
                            <button style="background:transparent;border:none;color:#4f46e5;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); openDocumentDetail(${doc.id})">
                                <i class="fa-regular fa-eye"></i> Xem
                            </button>
                        </div>`;
                }

                return `
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s; min-height:180px;" onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.06)'; this.style.borderColor='#cbd5e1'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'; this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="width:44px;height:44px;background:${style.bg};color:${style.color};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">
                            <i class="fa-solid ${style.icon}"></i>
                        </div>
                        <div class="badge ${combinedStatusClass}" style="background:${badgeBg};color:${badgeColor};padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;white-space:nowrap;">${combinedStatusLabel}</div>
                    </div>
                    
                    <div style="flex:1; cursor:pointer;" onclick="openDocumentDetail(${doc.id})">
                        <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 8px 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;" title="${doc.fileName}">${doc.fileName}</h3>
                        <div style="font-size:0.8rem;color:#64748b;font-weight:500;margin-bottom:4px;">
                            ID: <strong style="color:#475569;">DOC-${String(doc.id).padStart(4, '0')}</strong> &bull; Ngày: ${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}
                        </div>
                        <div style="font-size:0.8rem;color:#64748b;font-weight:500;">
                            Tác giả: <strong style="color:#475569;">${doc.uploadedByName || 'Bạn'}</strong>
                        </div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:12px; border-top:1px solid #f1f5f9;">
                        <span style="font-size:0.85rem;color:#94a3b8;font-weight:600;">${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</span>
                        ${actionBtnHtml}
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
                const isOwner = doc.uploadedBy && currentUser && doc.uploadedBy === currentUser.id;
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
                        <button class="btn-icon" onclick="event.stopPropagation(); viewDocumentInline(${doc.id})" title="Xem chi tiết">👁️</button>
                        ${isOwner ? `<button class="btn-icon" onclick="event.stopPropagation(); ${cannotShare ? 'return false;' : `openPermissionModal(${doc.id}, '${(doc.fileName || '').replace(/'/g, "\\'")}')`}" title="Chia sẻ" style="color:${cannotShare ? '#cbd5e1' : '#3b82f6'}; ${cannotShare ? 'cursor:not-allowed;' : ''}">🔗</button>` : ''}
                        <button class="btn-icon" onclick="event.stopPropagation(); downloadDocument(${doc.id}, '${(doc.fileName || '').replace(/'/g, "\\'")}')" title="Tải xuống">⬇️</button>
                    </td>
                </tr>
            `}).join('');
        }
    }

    if (typeof updatePagination !== 'undefined') {
        
    }
}

function filterUserDocuments() {
    const searchTerm = document.getElementById('docSearchInput')?.value?.toLowerCase() || '';
    
    // Lấy giá trị filter từ Pill Buttons (nếu có)
    const activePill = document.querySelector('#docTypePillFilter .pill-btn.active');
    const typeFilter = activePill ? activePill.getAttribute('data-filter') : '';
    
    const sortFilter = document.getElementById('docSortFilter')?.value || 'newest';
    const deptFilter = document.getElementById('docDeptFilter')?.value || '';
    const startDateFilter = document.getElementById('docStartDateFilter')?.value || '';
    const endDateFilter = document.getElementById('docEndDateFilter')?.value || '';

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

        let matchesDept = true;
        if (deptFilter) {
            matchesDept = (doc.departmentId && String(doc.departmentId) === String(deptFilter));
        }

        let matchesDate = true;
        if (startDateFilter || endDateFilter) {
            const docDate = new Date(doc.createdAt);
            if (startDateFilter) {
                const start = new Date(startDateFilter);
                start.setHours(0, 0, 0, 0);
                if (docDate < start) matchesDate = false;
            }
            if (endDateFilter) {
                const end = new Date(endDateFilter);
                end.setHours(23, 59, 59, 999);
                if (docDate > end) matchesDate = false;
            }
        }

        return matchesSearch && matchesType && matchesDept && matchesDate;
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

    // Always go back to page 1 after filtering
    UserState.documents.page = 1;

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
        const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : localStorage.getItem('accessToken');
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
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                    <div><strong>Tên file:</strong> ${doc.fileName}</div>
                    <div><strong>Loại:</strong> ${doc.fileType?.toUpperCase()}</div>
                    <div><strong>Kích thước:</strong> ${typeof formatFileSize !== 'undefined' ? formatFileSize(doc.fileSize) : doc.fileSize}</div>
                    <div><strong>Phòng ban:</strong> ${doc.departmentName || 'Chung'}</div>
                    <div><strong>Ngày upload:</strong> ${typeof formatDate !== 'undefined' ? formatDate(doc.createdAt) : doc.createdAt}</div>
                    <div><strong>Phiên bản:</strong> ${doc.version || 1}</div>
                </div>
                <div id="docViewerIframeContainer" style="height:500px;width:100%;border:1px solid #e5e7eb;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#f9fafb;">
                    <span>Đang tải nội dung tài liệu... <i class="fa-solid fa-spinner fa-spin"></i></span>
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

        // Fetch document content as blob for viewing
        const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : localStorage.getItem('access_token');
        if (token) {
            fetch(`${typeof API_BASE !== 'undefined' ? API_BASE : ''}/api/documents/${docId}/view`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                if (!res.ok) throw new Error('Cannot load document view');
                return res.blob();
            })
            .then(blob => {
                const objectUrl = URL.createObjectURL(blob);
                const iframeContainer = document.getElementById('docViewerIframeContainer');
                if (iframeContainer) {
                    iframeContainer.innerHTML = `<iframe src="${objectUrl}" style="width:100%;height:100%;border:none;border-radius:8px;"></iframe>`;
                }
            })
            .catch(err => {
                console.error('Error loading doc view:', err);
                const iframeContainer = document.getElementById('docViewerIframeContainer');
                if (iframeContainer) {
                    iframeContainer.innerHTML = `<span style="color:var(--error);">Không thể hiển thị tài liệu này trực tiếp. Vui lòng tải về để xem.</span>`;
                }
            });
        }

    } catch (error) {
        console.error('Error viewing document:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể xem chi tiết tài liệu', 'error');
        }
    }
}

async function deleteUserDocument(docId) {
    if (!confirm('Bạn có chắc chắn muốn thu hồi tài liệu này? Hệ thống sẽ xóa nó hoàn toàn.')) {
        return;
    }

    try {
        if (typeof apiRequest === 'undefined') {
            throw new Error('apiRequest() không tồn tại');
        }

        await apiRequest(`/api/documents/${docId}`, {
            method: 'DELETE'
        });

        if (typeof showToast !== 'undefined') showToast('Đã thu hồi tài liệu thành công', 'success');
        
        loadUserDocuments();
    } catch (error) {
        console.error('Lỗi khi xóa tài liệu:', error);
        if (typeof showToast !== 'undefined') showToast(error.message || 'Lỗi khi xóa tài liệu', 'error');
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
        
        const sessionInfo = UserState.chat.sessions.find(s => s.id === sessionId) || {};

        UserState.chat.currentSessionId = sessionId;
        UserState.chat.messages = messages || [];

        const emptyState = document.getElementById('chatEmptyState');
        const active = document.getElementById('chatActive');
        const title = document.getElementById('chatSessionTitle');
        const meta = document.getElementById('chatSessionMeta');

        if (emptyState) emptyState.style.display = 'none';
        if (active) active.style.display = 'flex';
        if (title) title.textContent = sessionInfo.title || 'Cuộc hội thoại';
        if (meta) meta.textContent = `${sessionInfo.messageCount || messages.length || 0} tin nhắn`;

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
    
    // Trigger notebook-style popover init if function exists
    if (typeof initNotebookPopover === 'function') initNotebookPopover();
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
                        const docId = source.documentId || '';
                        const p = source.pageNumber || '';
                        return '<span class="citation-badge" data-index="' + num + '" ' +
                            'onmouseenter="showCitationPopover(this, \'' + t + '\', \'' + e + '\', \'' + docId + '\', \'' + p + '\')" ' +
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

        // Send message
        const response = await apiRequest(`/api/chat/ask`, {
            method: 'POST',
            body: JSON.stringify({
                sessionId: UserState.chat.currentSessionId,
                question: message
            })
        });

        // Remove loading
        removeLoadingMessage(loadingMsg);

        // Add AI response
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
    if (typeof switchTab !== 'undefined') {
        const tabEl = document.querySelector('[data-tab="tabChat"]');
        if (tabEl) {
            switchTab('tabChat', tabEl);
            if (typeof loadUserTabData === 'function') loadUserTabData('tabChat');
        }
    }
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = `Cho tôi biết nội dung chính của tài liệu "${docName}"`;
        input.focus();
    }
    if (typeof closeModal !== 'undefined') {
        closeModal('docViewerModal');
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
        const docSelect = document.getElementById('docDeptFilter');

        if (select) {
            select.innerHTML = '<option value="">Tất cả phòng ban</option>';
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.name;
                select.appendChild(option);
            });
        }
        
        if (docSelect) {
            docSelect.innerHTML = '<option value="">Tất cả phòng ban</option>';
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.name;
                docSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error('Error loading search filters:', error);
    }
}

function removeAccents(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function performSearch() {
    const query = document.getElementById('globalSearchInput')?.value?.trim()
        || document.getElementById('tabSearchInput')?.value?.trim()
        || document.getElementById('searchInput')?.value?.trim();
        
    const dropdown = document.getElementById('globalSearchDropdown');
    const isGlobal = dropdown && dropdown.style.display !== 'none';
    const container = isGlobal ? document.getElementById('globalSearchResults') : document.getElementById('searchResults');

    if (!query || query.length < 2) {
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

        const endpoint = isGlobal ? `/api/search?q=${encodeURIComponent(query)}` : `/api/search/ai?q=${encodeURIComponent(query)}`;
        const response = await apiRequest(endpoint);

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
                 onclick="viewUserDocument(${result.documentId})">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <span style="font-size:1.5rem;">${typeof getFileIcon !== 'undefined' ? getFileIcon(result.fileType) : '📄'}</span>
                    <div>
                        <div style="font-weight:700;">${result.fileName}</div>
                        <div style="font-size:0.78rem;color:#6b7280;">🏢 ${result.departmentName || '—'} · ${typeof formatDate !== 'undefined' ? formatDate(result.createdAt) : result.createdAt}</div>
                    </div>
                </div>
                <div style="font-size:0.85rem;color:#374151;line-height:1.5;">
                    ${result.excerpt || result.content?.substring(0, 200) || '—'}
                </div>
                <div style="font-size:0.72rem;color:#9ca3af;margin-top:6px;">
                    📄 Trang ${result.pageNumber || '—'} · Độ liên quan: ${Math.round((result.score || 0) * 100)}%
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

        const profile = await apiRequest('/api/users/profile');
        if (profile.manager) {
            const msDeptName = document.getElementById('msDeptName');
            const msEmployeeCount = document.getElementById('msEmployeeCount');
            const msPendingDocs = document.getElementById('msPendingDocs');
            const msPendingReqs = document.getElementById('msPendingReqs');
            const msActiveSessions = document.getElementById('msActiveSessions');
            
            if (msDeptName) msDeptName.textContent = profile.departmentName || '—';
            if (msEmployeeCount) msEmployeeCount.textContent = profile.managedEmployeeCount || 0;
            if (msPendingDocs) msPendingDocs.textContent = profile.pendingDocumentCount || 0;
            if (msPendingReqs) msPendingReqs.textContent = profile.pendingRequestCount || 0;
            if (msActiveSessions) msActiveSessions.textContent = profile.activeSessionsCount || 0;
        }

    } catch (error) {
        console.error('Error loading manager data:', error);
        if (typeof showToast !== 'undefined') {
            showToast('Không thể tải dữ liệu quản lý', 'error');
        }
    }
}

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
        const viewJobTitle = document.getElementById('viewJobTitle');
        const viewCreatedAt = document.getElementById('viewCreatedAt');
        const viewLastLogin = document.getElementById('viewLastLogin');

        if (viewFullName) viewFullName.textContent = profile.fullName || '—';
        if (viewUsername) viewUsername.textContent = profile.username || profile.userName || '—';
        if (viewEmail) viewEmail.textContent = profile.email || '—';
        if (viewPhone) viewPhone.textContent = profile.phone || '—';
        if (viewDept) viewDept.textContent = profile.departmentName || 'Toàn hệ thống';
        if (viewJobTitle) {
            let defaultTitle = '';
            if (profile.role === 'ADMIN') defaultTitle = 'Giám đốc';
            else if (profile.role === 'MANAGER') defaultTitle = 'Trưởng phòng';
            else if (profile.role === 'USER') defaultTitle = 'Nhân viên';
            viewJobTitle.textContent = profile.jobTitle || defaultTitle || '—';
        }
        if (viewCreatedAt) viewCreatedAt.textContent = profile.createdAt ? (typeof formatDate !== 'undefined' ? formatDate(profile.createdAt) : profile.createdAt) : '—';
        if (viewLastLogin) viewLastLogin.textContent = profile.lastLogin ? (typeof formatDate !== 'undefined' ? formatDate(profile.lastLogin) : profile.lastLogin) : '—';

        // Update form
        const fullNameInput = document.getElementById('editFullName');
        const phoneInput = document.getElementById('editPhone');
        const avatarInput = document.getElementById('editAvatarUrl');
        const emailInput = document.getElementById('editEmail');
        const deptInput = document.getElementById('editDepartment');
        const jobTitleInput = document.getElementById('editJobTitle');

        if (fullNameInput) fullNameInput.value = profile.fullName || '';
        if (phoneInput) phoneInput.value = profile.phone || '';
        
        if (emailInput) emailInput.value = profile.email || '';
        if (deptInput) deptInput.value = profile.departmentName || 'Toàn hệ thống';
        
        if (jobTitleInput) {
            let defaultTitle = '';
            if (profile.role === 'ADMIN') defaultTitle = 'Giám đốc';
            else if (profile.role === 'MANAGER') defaultTitle = 'Trưởng phòng';
            else if (profile.role === 'USER') defaultTitle = 'Nhân viên';
            jobTitleInput.value = profile.jobTitle || defaultTitle;
        }

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
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tab') === 'chat') {
            const tabEl = document.querySelector('[data-tab="tabChat"]');
            if (tabEl && typeof switchTab !== 'undefined') {
                switchTab('tabChat', tabEl);
                if (typeof loadUserTabData === 'function') loadUserTabData('tabChat');
            }
        } else {
            loadHomeData();
        }
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

// ===== NOTEBOOKLM CITATION POPOVER =====
function initCitationPopover() {
    if (document.getElementById('citation-popover')) return;
    const popover = document.createElement('div');
    popover.id = 'citation-popover';
    popover.className = 'citation-popover';
    
    popover.onmouseenter = function() {
        this.classList.add('visible');
    };
    popover.onmouseleave = function() {
        hideCitationPopover();
    };

    popover.innerHTML = `
        <div class='citation-popover-title'><i class='fa-solid fa-file-lines'></i> <span id='citation-popover-title-text'></span></div>
        <div id='citation-popover-excerpt' class='citation-popover-excerpt'></div>
        <div style="margin-top: 10px; text-align: right;">
            <button id="citation-popover-link" class="btn-primary-sm" style="font-size: 0.75rem; padding: 4px 8px; display: none;"><i class="fa-solid fa-book-open"></i> Xem tài liệu gốc</button>
        </div>
    `;
    document.body.appendChild(popover);
}

window.showCitationPopover = function(element, title, excerpt, docId, pageNumber) {
    const popover = document.getElementById('citation-popover');
    if (!popover) return;
    
    let displayTitle = title;
    if (pageNumber && pageNumber !== 'null' && pageNumber !== '') {
        displayTitle += ` (Trang ${pageNumber})`;
    }
    
    document.getElementById('citation-popover-title-text').textContent = displayTitle;
    document.getElementById('citation-popover-excerpt').textContent = '"' + excerpt + '"';
    
    const linkBtn = document.getElementById('citation-popover-link');
    if (linkBtn) {
        if (docId) {
            linkBtn.style.display = 'inline-block';
            linkBtn.onclick = function() {
                const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : localStorage.getItem('accessToken');
                
                // User will scroll manually based on the page number shown in the popover title
                window.open('/api/documents/' + docId + '/view?token=' + token, '_blank');
            };
        } else {
            linkBtn.style.display = 'none';
        }
    }
    
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
        }, 300);
    }
};

document.addEventListener('DOMContentLoaded', initCitationPopover);


// --- Xử lý sự kiện Upload Modal (Tài liệu của tôi) ---
let selectedUploadFile = null;

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('uploadFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                selectedUploadFile = this.files[0];
                document.getElementById('uploadFileName').textContent = selectedUploadFile.name;
                document.getElementById('uploadFileSize').textContent = typeof formatFileSize !== 'undefined' ? formatFileSize(selectedUploadFile.size) : (selectedUploadFile.size / 1024 / 1024).toFixed(2) + ' MB';
                
                document.getElementById('uploadDropArea').style.display = 'none';
                document.getElementById('uploadFileSelectedBox').style.display = 'flex';
            }
        });
    }

    // Wrap closeModal để reset modal khi đóng
    if (typeof window.closeModal === 'function') {
        const originalCloseModal = window.closeModal;
        window.closeModal = function(id) {
            if (id === 'uploadDocModal') {
                clearSelectedUploadFile();
            }
            originalCloseModal(id);
        };
    }
});

function clearSelectedUploadFile() {
    selectedUploadFile = null;
    const fileInput = document.getElementById('uploadFileInput');
    if (fileInput) fileInput.value = '';
    
    const dropArea = document.getElementById('uploadDropArea');
    const selectedBox = document.getElementById('uploadFileSelectedBox');
    const progressWrap = document.getElementById('uploadProgressWrap');
    const progressFill = document.getElementById('uploadProgressFill');
    const submitBtn = document.getElementById('uploadSubmitBtn');
    
    if (dropArea) dropArea.style.display = 'flex';
    if (selectedBox) selectedBox.style.display = 'none';
    if (progressWrap) progressWrap.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tải lên';
    }
}

async function submitUploadDocument() {
    if (!selectedUploadFile) {
        if (typeof showToast !== 'undefined') showToast('Vui lòng chọn file để tải lên', 'warning');
        return;
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (selectedUploadFile.size > maxSize) {
        if (typeof showToast !== 'undefined') showToast('Kích thước file không được vượt quá 20MB', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', selectedUploadFile);
    
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser && currentUser.departmentId) {
        formData.append('departmentId', currentUser.departmentId);
    }

    const submitBtn = document.getElementById('uploadSubmitBtn');
    const progressWrap = document.getElementById('uploadProgressWrap');
    const progressFill = document.getElementById('uploadProgressFill');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xử lý...';
    }
    if (progressWrap) progressWrap.style.display = 'block';
    if (progressFill) progressFill.style.width = '50%'; // fake progress

    try {
        const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : localStorage.getItem('accessToken');
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

        if (progressFill) progressFill.style.width = '100%';
        if (typeof showToast !== 'undefined') showToast('Tải lên thành công! Đang chờ duyệt.', 'success');
        
        if (typeof loadUserDocuments === 'function') loadUserDocuments();
        
        if (typeof window.closeModal === 'function') window.closeModal('uploadDocModal');
        clearSelectedUploadFile();
        
    } catch (error) {
        console.error('Error uploading file:', error);
        if (typeof showToast !== 'undefined') showToast(error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Tải lên';
        }
        if (progressWrap) progressWrap.style.display = 'none';
        if (progressFill) progressFill.style.width = '0%';
    }
}
