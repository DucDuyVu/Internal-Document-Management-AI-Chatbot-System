const form = document.getElementById("registerForm");
const btn = document.getElementById("submitBtn");

const errorBox = document.getElementById("errorMsg");
const errorText = document.getElementById("errorText");

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

const togglePassword = document.getElementById("togglePass");
const toggleConfirm = document.getElementById("toggleConfirmPass");

const passHint = document.getElementById("passHint");

function showMessage(message, success = false) {

    errorText.textContent = message;

    errorBox.classList.remove("show");
    errorBox.classList.remove("success");

    if (success) {
        errorBox.classList.add("success");
    }

    errorBox.classList.add("show");
}

togglePassword.onclick = () => {

    password.type =
        password.type === "password"
            ? "text"
            : "password";

    togglePassword.textContent =
        password.type === "password"
            ? "Hiện"
            : "Ẩn";
};

toggleConfirm.onclick = () => {

    confirmPassword.type =
        confirmPassword.type === "password"
            ? "text"
            : "password";

    toggleConfirm.textContent =
        confirmPassword.type === "password"
            ? "Hiện"
            : "Ẩn";
};

password.addEventListener("input", () => {

    const value = password.value;

    const strong =
        value.length >= 8 &&
        /[A-Za-z]/.test(value) &&
        /\d/.test(value);

    if (value === "") {

        passHint.className = "hint";
        passHint.textContent =
            "Tối thiểu 8 ký tự.";

    } else if (strong) {

        passHint.className = "hint ok";
        passHint.textContent =
            "Mật khẩu đủ mạnh.";

    } else {

        passHint.className = "hint bad";
        passHint.textContent =
            "Cần tối thiểu 8 ký tự gồm chữ và số.";

    }

});

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    if (password.value !== confirmPassword.value) {

        showMessage("Mật khẩu xác nhận không khớp.");

        return;
    }

    btn.disabled = true;
    btn.classList.add("loading");

    try {

        const response = await fetch("/api/auth/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                fullName: fullName.value.trim(),

                email: email.value.trim(),

                password: password.value,

                confirmPassword: confirmPassword.value

            })

        });

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Đăng ký thất bại."
            );

        }

        showMessage(
            data.message || "Đăng ký thành công.",
            true
        );

        setTimeout(() => {

            window.location.href = "/login";

        }, 1500);

    }
    catch (err) {

        showMessage(err.message);

    }
    finally {

        btn.disabled = false;
        btn.classList.remove("loading");

    }

});