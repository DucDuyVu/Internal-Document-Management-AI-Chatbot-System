/**
 * ============================================
 * API Helper
 * Tự động:
 * 1. Gắn Access Token
 * 2. Refresh Token khi Access Token hết hạn
 * 3. Gửi lại request cũ
 * ============================================
 */

async function apiRequest(url, method = "GET", body = null) {

    // Header mặc định
    const headers = {
        "Content-Type": "application/json"
    };

    // Lấy Access Token
    const accessToken = getAccessToken();

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    // Request lần 1
    let response = await fetch(url, {

        method: method,

        headers: headers,

        body: body ? JSON.stringify(body) : null

    });

    // Nếu Access Token hết hạn
    if (response.status === 401) {

        console.log("Access Token hết hạn -> Refresh Token");

        const success = await refreshAccessToken();

        // Refresh Token cũng hết hạn
        if (!success) {

            return response;

        }

        // Lấy Access Token mới
        headers.Authorization =
            `Bearer ${getAccessToken()}`;

        // Gửi lại request cũ
        response = await fetch(url, {

            method: method,

            headers: headers,

            body: body ? JSON.stringify(body) : null

        });

    }

    return response;
}