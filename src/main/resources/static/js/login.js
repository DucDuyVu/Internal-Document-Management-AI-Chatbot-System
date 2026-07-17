const form = document.getElementById("loginForm");

const btn = document.getElementById("submitBtn");

const errorBox = document.getElementById("errorMsg");

const errorText = document.getElementById("errorText");

const password = document.getElementById("password");

const toggle = document.getElementById("togglePass");

function showMessage(message) {

    errorText.textContent = message;

    errorBox.classList.add("show");

}

toggle.onclick = () => {

    password.type =
        password.type === "password"
            ? "text"
            : "password";

    toggle.textContent =
        password.type === "password"
            ? "Hiện"
            : "Ẩn";

};

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    errorBox.classList.remove("show");

    btn.disabled = true;

    btn.classList.add("loading");

    try {

        const response = await fetch("/api/auth/login", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                email: email.value.trim(),

                password: password.value

            })

        });

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Đăng nhập thất bại."
            );

        }

        localStorage.setItem(
            "accessToken",
            data.accessToken
        );

        localStorage.setItem(
            "refreshToken",
            data.refreshToken
        );

        localStorage.setItem(
            "user",
            JSON.stringify({

                id: data.userId,

                fullName: data.fullName,

                email: data.email,

                role: data.role

            })
        );

        window.location.href = "/dashboard";

    }
    catch (err) {

        showMessage(err.message);

    }
    finally {

        btn.classList.remove("loading");

        btn.disabled = false;

    }

});