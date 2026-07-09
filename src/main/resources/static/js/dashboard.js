// Kiểm tra đăng nhập
const user = getUser();

if (!user) {

    window.location.href = "/login";

}

// Hiển thị thông tin người dùng

document.getElementById("fullName").textContent =
user.fullName;

document.getElementById("welcomeName").textContent =
user.fullName;

document.getElementById("email").textContent =
user.email;

document.getElementById("role").textContent =
user.role;

// Nếu không phải ADMIN thì ẩn menu

if(user.role !== "ADMIN"){

    document.getElementById("adminMenu").style.display = "none";

}

// Logout

document
.getElementById("logoutBtn")
.addEventListener("click",logout);