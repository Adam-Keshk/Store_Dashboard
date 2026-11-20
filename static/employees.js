(async function initEmployees() {

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

        async function renderEmployees() {

            const employees = await api("/employees");

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

                        <a class="active" href="employees.html">
                            Employees
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
                            <h1>Employees</h1>
                        </div>
                    </header>

                    <div id="page-message" class="notice hidden"></div>

                    <section class="panel">

                        <h2>Create Employee Account</h2>

                        <p class="description">
                            New employees can use these details to log in.
                        </p>

                        <form id="employee-form">

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
                                Create Employee
                            </button>

                        </form>

                    </section>

                    <section class="panel">

                        <div class="panel-header">

                            <h2>Employees List</h2>

                            <span class="status completed">
                                ${employees.length} Employees
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

                                    ${employees.map(employee => `
                                        <tr>

                                            <td>${employee.id}</td>

                                            <td>
                                                ${escapeHTML(employee.username)}
                                            </td>

                                            <td>
                                                ${escapeHTML(employee.email)}
                                            </td>

                                            <td>
                                                ${escapeHTML(employee.phone)}
                                            </td>

                                            <td>

                                                <button
                                                    class="btn btn-small btn-danger"
                                                    data-delete="${employee.id}"
                                                    data-name="${escapeHTML(employee.username)}"
                                                >
                                                    Delete
                                                </button>

                                            </td>

                                        </tr>
                                    `).join("") || `
                                        <tr>
                                            <td colspan="5" class="empty">
                                                No employees found.
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

            // Create Employee
            document.getElementById("employee-form").addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    const values = Object.fromEntries(
                        new FormData(event.currentTarget)
                    );

                    try {

                        await api(
                            "/add_employee",
                            {
                                method: "POST",
                                body: JSON.stringify(values)
                            }
                        );

                        alert("Employee created successfully.");

                        await renderEmployees();

                    } catch (error) {

                        alert(error.message);

                    }

                }
            );

            // Delete Employee
            document.querySelectorAll("[data-delete]").forEach(button => {

                button.addEventListener("click", async () => {

                    const confirmed = confirm(
                        `Are you sure you want to delete ${button.dataset.name}?`
                    );

                    if (!confirmed) return;

                    try {

                        await api(
                            `/delete_employee/${button.dataset.delete}`,
                            {
                                method: "DELETE"
                            }
                        );

                        alert("Employee deleted successfully.");

                        await renderEmployees();

                    } catch (error) {

                        alert(error.message);

                    }

                });

            });

        }

        await renderEmployees();

    } catch (error) {

        document.body.innerHTML = `
            <div class="error-page">
                ${escapeHTML(error.message)}
            </div>
        `;

    }

})();