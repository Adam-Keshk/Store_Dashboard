const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

const authTabs = document.querySelectorAll("[data-auth-tab]");

// Redirect if already logged in
if (getToken()) {
    location.replace("/static/dashboard.html");
}

// Switch between forms
authTabs.forEach(tab => {

    tab.addEventListener("click", () => {

        authTabs.forEach(item => {
            item.classList.toggle("active", item === tab);
        });

        const signup = tab.dataset.authTab === "signup";

        loginForm.classList.toggle("hidden", signup);
        signupForm.classList.toggle("hidden", !signup);

        hideMessage("auth-message");

    });

});

// Login
loginForm.addEventListener("submit", async event => {

    event.preventDefault();

    hideMessage("auth-message");

    const values = Object.fromEntries(
        new FormData(loginForm)
    );

    const button = loginForm.querySelector(
        'button[type="submit"]'
    );

    button.disabled = true;
    button.textContent = "Signing in...";

    try {

        const result = await api(
            "/login",
            {
                method: "POST",
                body: JSON.stringify(values)
            }
        );

        setToken(result.access_token);

        location.href = "/static/dashboard.html";

    } catch (error) {

        showMessage(
            error.message,
            "error",
            "auth-message"
        );

    } finally {

        button.disabled = false;
        button.textContent = "Sign in";

    }

});

// Signup
signupForm.addEventListener("submit", async event => {

    event.preventDefault();

    hideMessage("auth-message");

    const values = Object.fromEntries(
        new FormData(signupForm)
    );

    try {

        await api(
            "/signup",
            {
                method: "POST",
                body: JSON.stringify(values)
            }
        );

        signupForm.reset();

        authTabs.forEach(tab => {
            tab.classList.toggle(
                "active",
                tab.dataset.authTab === "login"
            );
        });

        signupForm.classList.add("hidden");
        loginForm.classList.remove("hidden");

        showMessage(
            "Account created successfully. You can now sign in.",
            "success",
            "auth-message"
        );

    } catch (error) {

        showMessage(
            error.message,
            "error",
            "auth-message"
        );

    }

});