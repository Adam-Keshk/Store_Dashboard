(async function initUsers() {

    if (!requireAuth()) return;

    try {

        const user = await loadCurrentUser();

        if (user.role !== "admin") {

            document.body.innerHTML = `
                <h2>Access Denied</h2>
                <p>Administrator permission required.</p>
                <a href="dashboard.html">Back to Dashboard</a>
            `;

            return;
        }

        async function renderUsers() {

            const members = await api("/users");

            document.body.innerHTML = `

            <div class="layout">

                <aside class="sidebar">

                    <div class="brand">
                        <div class="brand-logo">G</div>
                        <div>
                            <h2>GRAYLINE</h2>
                            <small>MANAGEMENT</small>
                        </div>
                    </div>

                    <nav>

                        <a href="dashboard.html">
                            Dashboard
                        </a>

                        <a href="tasks.html">
                            Tasks
                        </a>

                        <a class="active" href="users.html">
                            Users
                        </a>

                        <a href="storage.html">
                            Storage
                        </a>

                    </nav>

                    <div class="sidebar-bottom">

                        <p>${escapeHTML(user.username)}</p>

                        <small>ADMIN</small>

                        <button data-logout class="logout-btn">
                            Logout
                        </button>

                    </div>

                </aside>

                <main class="main-content">

                    <header class="topbar">
                        <div>
                            <small>GRAYLINE MANAGEMENT</small>
                            <h1>Users</h1>
                        </div>
                    </header>

                    <div id="page-message" class="notice hidden"></div>

                    <section class="panel">

                        <h2>Create User Account</h2>

                        <p class="description">
                            New users can use these details to log in.
                        </p>

                        <form id="user-form">

                            <div class="form-grid">

                                <div class="field">
                                    <label>Username</label>

                                    <input
                                        name="username"
                                        type="text"
                                        required
                                        minlength="3"
                                    >
                                </div>

                                <div class="field">
                                    <label>Email</label>

                                    <input
                                        name="email"
                                        type="email"
                                        required
                                    >
                                </div>

                                <div class="field">
                                    <label>Phone</label>

                                    <input
                                        name="phone"
                                        type="text"
                                        required
                                    >
                                </div>

                                <div class="field">
                                    <label>Password</label>

                                    <input
                                        name="password"
                                        type="password"
                                        required
                                        minlength="6"
                                    >
                                </div>

                            </div>

                            <button class="btn" type="submit">
                                Create User
                            </button>

                        </form>

                    </section>

                    <section class="panel">

                        <div class="panel-header">

                            <h2>Users List</h2>

                            <span class="status completed">
                                ${members.length} Users
                            </span>

                        </div>

                        <div class="table-wrapper">

                            <table>

                                <thead>

                                    <tr>
                                        <th>ID</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Action</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    ${members.map(member => `
                                        <tr>

                                            <td>${member.id}</td>

                                            <td>
                                                ${escapeHTML(member.username)}
                                            </td>

                                            <td>
                                                ${escapeHTML(member.email)}
                                            </td>

                                            <td>
                                                ${escapeHTML(member.phone)}
                                            </td>

                                            <td>

                                                <button
                                                    class="btn btn-small btn-danger"
                                                    data-delete="${member.id}"
                                                    data-name="${escapeHTML(member.username)}"
                                                >
                                                    Delete
                                                </button>

                                            </td>

                                        </tr>
                                    `).join("") || `
                                        <tr>
                                            <td colspan="5" class="empty">
                                                No users found.
                                            </td>
                                        </tr>
                                    `}

                                </tbody>

                            </table>

                        </div>

                    </section>

                </main>

            </div>

            `;

            // Create User
            document.getElementById("user-form").addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    const values = Object.fromEntries(
                        new FormData(event.currentTarget)
                    );

                    try {

                        await api(
                            "/add_user",
                            {
                                method: "POST",
                                body: JSON.stringify(values)
                            }
                        );

                        alert("User created successfully.");

                        await renderUsers();

                    } catch (error) {

                        alert(error.message);

                    }

                }
            );

            // Delete User
            document.querySelectorAll("[data-delete]").forEach(button => {

                button.addEventListener("click", async () => {

                    const confirmed = confirm(
                        `Are you sure you want to delete ${button.dataset.name}?`
                    );

                    if (!confirmed) return;

                    try {

                        await api(
                            `/delete_user/${button.dataset.delete}`,
                            {
                                method: "DELETE"
                            }
                        );

                        alert("User deleted successfully.");

                        await renderUsers();

                    } catch (error) {

                        alert(error.message);

                    }

                });

            });

        }

        await renderUsers();

    } catch (error) {

        document.body.innerHTML = `
            <div class="error-page">
                ${escapeHTML(error.message)}
            </div>
        `;

    }

})();