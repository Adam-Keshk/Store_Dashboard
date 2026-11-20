(async function initDashboard() {

    if (!requireAuth()) return;

    try {

        const user = await loadCurrentUser();

        const items = await api("/storage");
        const tasks = await api("/tasks");

        let employees = [];

        if (user.role === "admin") {
            employees = await api("/employees");
        }

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

                    <a class="active" href="dashboard.html">
                        Dashboard
                    </a>

                    <a href="tasks.html">
                        Tasks
                    </a>

                    <a
                        class="admin-only"
                        href="employees.html"
                    >
                        Employees
                    </a>

                    <a href="storage.html">
                        Storage
                    </a>

                </nav>

                <div class="sidebar-bottom">

                    <p>${escapeHTML(user.username)}</p>

                    <small>${escapeHTML(user.role)}</small>

                    <button data-logout class="logout-btn">
                        Logout
                    </button>

                </div>

            </aside>

            <main class="main-content">

                <header class="topbar">
                    <div>
                        <small>GRAYLINE MANAGEMENT</small>
                        <h1>Dashboard</h1>
                    </div>

                    <span class="role-badge">
                        ${escapeHTML(user.role.toUpperCase())}
                    </span>
                </header>

                <div class="welcome">
                    <h2>
                        Welcome back,
                        ${escapeHTML(user.username)}.
                    </h2>

                    <p>
                        Here is your workspace overview.
                    </p>
                </div>

                <section class="stats-grid">

                    <div class="stat-card">
                        <p>Inventory Items</p>
                        <h2>${items.length}</h2>
                    </div>

                    <div class="stat-card">
                        <p>Pending Tasks</p>
                        <h2>${tasks.pending.length}</h2>
                    </div>

                    <div class="stat-card">
                        <p>Completed Tasks</p>
                        <h2>${tasks.completed.length}</h2>
                    </div>

                    ${user.role === "admin" ? `
                        <div class="stat-card">
                            <p>Employees</p>
                            <h2>${employees.length}</h2>
                        </div>
                    ` : ""}

                </section>

                <section class="panel">

                    <div class="panel-header">
                        <h2>Recent Inventory</h2>

                        <a href="storage.html">
                            View Storage →
                        </a>
                    </div>

                    <div class="table-wrapper">

                        <table>

                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Price</th>
                                    <th>Quantity</th>
                                    <th>Total</th>
                                </tr>
                            </thead>

                            <tbody>

                                ${items.slice(0, 5).map(item => `
                                    <tr>
                                        <td>
                                            ${escapeHTML(item.name)}
                                        </td>

                                        <td>
                                            ${money(item.price)}
                                        </td>

                                        <td>
                                            ${item.quantity}
                                        </td>

                                        <td>
                                            ${money(
                                                item.all_price ??
                                                item.price * item.quantity
                                            )}
                                        </td>
                                    </tr>
                                `).join("") || `
                                    <tr>
                                        <td colspan="4" class="empty">
                                            No inventory items found.
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

        // Apply admin visibility after rendering
        document.querySelectorAll(".admin-only").forEach(element => {
            element.classList.toggle(
                "hidden",
                user.role !== "admin"
            );
        });

    } catch (error) {

        document.body.innerHTML = `
            <div class="error-page">
                ${escapeHTML(error.message)}
            </div>
        `;

    }

})();