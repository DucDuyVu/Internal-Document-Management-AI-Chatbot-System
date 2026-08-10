
  (function() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        window.location.href = '/login';
        return;
      }

      const user = JSON.parse(userStr);

      if (user.role === 'ADMIN') {
        window.location.href = '/admin/dashboard';
        return;
      }

      // 1. Cập nhật Profile mới nhất từ Database
      fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
         if(res.ok) return res.json();
         throw new Error("Lỗi khi tải profile");
      })
      .then(freshUser => {
         localStorage.setItem('user', JSON.stringify(freshUser));
         if(typeof updateUserUI !== 'undefined') {
             updateUserUI(freshUser);
         }
      })
      .catch(e => console.error(e));

      // 2. Xử lý UI Chuông thông báo
      const bell = document.getElementById('notificationBell');
      const dropdown = document.getElementById('notificationDropdown');
      const badge = document.getElementById('notificationBadge');
      const notifList = document.getElementById('notificationList');

      if (bell && dropdown) {
        // Toggle dropdown
        bell.addEventListener('click', (e) => {
           if (e.target.closest('#notificationDropdown')) return;
           dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', (e) => {
           if (!bell.contains(e.target)) {
               dropdown.style.display = 'none';
           }
        });
      }

      // Hàm định dạng thời gian
      const timeAgo = (dateInput) => {
         if (!dateInput) return '';
         let date;
         if (Array.isArray(dateInput)) {
             date = new Date(dateInput[0], dateInput[1]-1, dateInput[2], dateInput[3]||0, dateInput[4]||0, dateInput[5]||0);
         } else {
             date = new Date(dateInput);
         }
         const seconds = Math.floor((new Date() - date) / 1000);
         let interval = Math.floor(seconds / 31536000);
         if (interval >= 1) return interval + " năm trước";
         interval = Math.floor(seconds / 2592000);
         if (interval >= 1) return interval + " tháng trước";
         interval = Math.floor(seconds / 86400);
         if (interval >= 1) return interval + " ngày trước";
         interval = Math.floor(seconds / 3600);
         if (interval >= 1) return interval + " giờ trước";
         interval = Math.floor(seconds / 60);
         if (interval >= 1) return interval + " phút trước";
         return "Vừa xong";
      };

      // 3. Hàm mở popup chi tiết thông báo
      window.openNotification = (id, title, message) => {
        const titleEl = document.getElementById("notificationTitle");
        const contentEl = document.getElementById("notificationContent");
        if (titleEl) titleEl.innerText = title;
        if (contentEl) contentEl.innerText = message;
        if (typeof openModal !== 'undefined') openModal("notificationModal");
        if (dropdown) dropdown.style.display = "none";

        const markAsRead = () => {
          fetch(`/api/notifications/${id}/read`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          }).then(() => fetchNotifications());
        };

        const okBtn = document.getElementById("notificationOkBtn");
        const closeBtn = document.querySelector("#notificationModal .modal-close");
        if (okBtn) okBtn.addEventListener("click", markAsRead, { once: true });
        if (closeBtn) closeBtn.addEventListener("click", markAsRead, { once: true });
      };

      // 4. Fetch all notifications
      const fetchNotifications = () => {
        fetch('/api/notifications/all', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.ok ? res.json() : [])
        .then(notifications => {
          if (!Array.isArray(notifications)) return;
          const unreadCount = notifications.filter(n => !n.read).length;
          if (badge) {
            if (unreadCount > 0) {
              badge.innerText = unreadCount;
              badge.style.display = "inline-block";
            } else {
              badge.style.display = "none";
            }
          }
          if (notifList) {
            if (notifications.length > 0) {
              notifList.innerHTML = notifications.map(notif => `
                <div class="notif-item" style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; cursor:pointer; background: ${notif.read ? '#ffffff' : '#e0f2fe'}"
                     onclick="openNotification(${notif.id}, '${(notif.title||'').replace(/'/g, "\\'")}', '${(notif.message||'').replace(/\n/g, "\\n").replace(/'/g, "\\'")}')">
                   <div style="font-weight: ${notif.read ? '500' : '700'}; font-size:0.875rem; color:#0f172a; margin-bottom:4px; display:flex; justify-content:space-between; align-items:start;">
                     <div style="padding-right:8px;">
                       ${notif.read ? '' : '<span style="display:inline-block; width:8px; height:8px; background:#ef4444; border-radius:50%; margin-right:6px;"></span>'}
                       ${notif.title}
                     </div>
                     <span style="font-size:0.75rem; color:#94a3b8; font-weight:400; white-space:nowrap; margin-top:2px;">${timeAgo(notif.createdAt)}</span>
                   </div>
                   <div style="font-size:0.8rem; color:#64748b; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${notif.message}</div>
                </div>
              `).join('');
            } else {
              notifList.innerHTML = '<div style="padding: 16px; text-align:center; color:#64748b; font-size:0.875rem;">Không có thông báo mới</div>';
            }
          }
        })
        .catch(err => console.error("Lỗi khi tải thông báo:", err));
      };

      // Tải lúc đầu
      fetchNotifications();

    } catch (e) {
      console.error("Auth check error:", e);
      window.location.href = "/login";
    }
  })();

