const API_BASE = window.location.origin;

// Authentication
function getToken() {
    return localStorage.getItem("access_token");
}

function setToken(token) {
    localStorage.setItem("access_token", token);
}

function clearSession() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("grayline_user");
}

// Messages
function showMessage(
    message,
    type = "success",
    target = "page-message"
) {
    const element = document.getElementById(target);

    if (!element) return;

    element.textContent = message;
    element.className =
        `notice ${type === "error" ? "error" : ""}`;

    element.classList.remove("hidden");
}

function hideMessage(target = "page-message") {
    document.getElementById(target)?.classList.add("hidden");
}

// API Request
async function api(path, options = {}) {

    const headers = {
        ...(options.headers || {})
    };

    if (
        options.body &&
        !(options.body instanceof FormData)
    ) {
        headers["Content-Type"] = "application/json";
    }

    if (getToken()) {
        headers.Authorization = `Bearer ${getToken()}`;
    }

    const response = await fetch(
        `${API_BASE}${path}`,
        {
            ...options,
            headers
        }
    );

    const raw = await response.text();

    let data = null;

    try {
        data = raw ? JSON.parse(raw) : null;
    } catch {
        data = raw;
    }

    if (
        response.status === 401 &&
        path !== "/login" &&
        path !== "/signup"
    ) {
        clearSession();
        location.replace("/static/index.html");
    }

    if (!response.ok) {
        throw new Error(
            data?.detail || `Request failed (${response.status})`
        );
    }

    return data;
}

// Require Authentication
function requireAuth() {

    if (!getToken()) {
        location.replace("/static/index.html");
        return false;
    }

    return true;
}

// Current User
async function loadCurrentUser() {

    const user = await api("/me");

    localStorage.setItem(
        "grayline_user",
        JSON.stringify(user)
    );

    document.querySelectorAll("#side-username").forEach(
        element => element.textContent = user.username
    );

    document.querySelectorAll("#side-role").forEach(
        element => element.textContent = user.role.toUpperCase()
    );

    document.querySelectorAll(".admin-only").forEach(
        element => {
            element.classList.toggle(
                "hidden",
                user.role !== "admin"
            );
        }
    );

    return user;
}

// Logout
function logout() {

    clearSession();

    location.href = "/static/index.html";
}

document.addEventListener("click", event => {

    if (event.target.closest("[data-logout]")) {
        logout();
    }

});

// Utilities
function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );
}

function money(value) {

    return new Intl.NumberFormat(
        undefined,
        { maximumFractionDigits: 2 }
    ).format(Number(value) || 0);
}