(async function initTasks() {

    if (!requireAuth()) return;

    try {

        const user = await loadCurrentUser();

        let tasks = await api("/tasks");

        let employees = [];

        if (user.role === "admin") {
            employees = await api("/employees");
        }

        function renderTasks() {

            const pendingRows = tasks.pending.map(task => `
                <tr>

                    <td>
                        <strong>${escapeHTML(task.name)}</strong>
                        <p class="description">
                            ${escapeHTML(task.description)}
                        </p>
                    </td>

                    ${user.role === "admin" ? `
                        <td>
                            ${escapeHTML(task.employee_username || "—")}
                        </td>
                    ` : ""}

                    <td>
                        <span class="status pending">
                            Pending
                        </span>
                    </td>

                    <td>
                        <button
                            class="btn btn-small"
                            data-complete="${task.id}"
                        >
                            Complete
                        </button>
                    </td>

                </tr>
            `).join("");

            const completedRows = tasks.completed.map(task => `
                <tr>

                    <td>
                        <strong>${escapeHTML(task.name)}</strong>
                        <p class="description">
                            ${escapeHTML(task.description)}
                        </p>
                    </td>

                    ${user.role === "admin" ? `
                        <td>
                            ${escapeHTML(task.employee_username || "—")}
                        </td>
                    ` : ""}

                    <td>
                        <span class="status completed">
                            Completed
                        </span>
                    </td>

                    <td>—</td>

                </tr>
            `).join("");

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

                        <a class="active" href="tasks.html">
                            Tasks
                        </a>

                        ${user.role === "admin" ? `
                            <a href="employees.html">
                                Employees
                            </a>
                        ` : ""}

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
                            <h1>Tasks</h1>
                        </div>

                        <span class="role-badge">
                            ${escapeHTML(user.role.toUpperCase())}
                        </span>
                    </header>

                    <div id="page-message" class="notice hidden"></div>

                    ${user.role === "admin" ? `

                        <section class="panel">

                            <h2>Assign New Task</h2>

                            <form id="task-form">

                                <div class="form-grid">

                                    <div class="field">
                                        <label>Task Name</label>

                                        <input
                                            type="text"
                                            name="name"
                                            required
                                        >
                                    </div>

                                    <div class="field">
                                        <label>Assign To</label>

                                        <select
                                            name="employee_id"
                                            required
                                        >

                                            <option value="">
                                                Select Employee
                                            </option>

                                            ${employees.map(employee => `
                                                <option value="${employee.id}">
                                                    ${escapeHTML(employee.username)}
                                                </option>
                                            `).join("")}

                                        </select>
                                    </div>

                                    <div class="field full">
                                        <label>Description</label>

                                        <textarea
                                            name="description"
                                            required
                                        ></textarea>
                                    </div>

                                </div>

                                <button
                                    class="btn"
                                    type="submit"
                                    ${employees.length === 0 ? "disabled" : ""}
                                >
                                    Assign Task
                                </button>

                                ${employees.length === 0 ? `
                                    <p class="description">
                                        Create an employee account first.
                                    </p>
                                ` : ""}

                            </form>

                        </section>

                    ` : ""}

                    <section class="panel">

                        <div class="panel-header">
                            <h2>Pending Tasks</h2>

                            <span class="status pending">
                                ${tasks.pending.length}
                            </span>
                        </div>

                        <div class="table-wrapper">

                            <table>

                                <thead>
                                    <tr>
                                        <th>Task</th>
                                        ${user.role === "admin" ? "<th>Employee</th>" : ""}
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    ${pendingRows || `
                                        <tr>
                                            <td
                                                colspan="${user.role === "admin" ? 4 : 3}"
                                                class="empty"
                                            >
                                                No pending tasks.
                                            </td>
                                        </tr>
                                    `}

                                </tbody>

                            </table>

                        </div>

                    </section>

                    <section class="panel">

                        <div class="panel-header">
                            <h2>Completed Tasks</h2>

                            <span class="status completed">
                                ${tasks.completed.length}
                            </span>
                        </div>

                        <div class="table-wrapper">

                            <table>

                                <thead>
                                    <tr>
                                        <th>Task</th>
                                        ${user.role === "admin" ? "<th>Employee</th>" : ""}
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    ${completedRows || `
                                        <tr>
                                            <td
                                                colspan="${user.role === "admin" ? 4 : 3}"
                                                class="empty"
                                            >
                                                No completed tasks.
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

            // Assign task
            document.getElementById("task-form")?.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    const values = Object.fromEntries(
                        new FormData(event.currentTarget)
                    );

                    values.employee_id = Number(values.employee_id);

                    try {

                        await api(
                            "/tasks",
                            {
                                method: "POST",
                                body: JSON.stringify(values)
                            }
                        );

                        showMessage("Task assigned successfully.");

                        tasks = await api("/tasks");

                        renderTasks();

                    } catch (error) {

                        showMessage(error.message, "error");

                    }

                }
            );

            // Complete task
            document.querySelectorAll("[data-complete]").forEach(button => {

                button.addEventListener("click", async () => {

                    try {

                        await api(
                            `/tasks/checked/${button.dataset.complete}`,
                            {
                                method: "PUT"
                            }
                        );

                        tasks = await api("/tasks");

                        renderTasks();

                        showMessage("Task completed successfully.");

                    } catch (error) {

                        showMessage(error.message, "error");

                    }

                });

            });

        }

        renderTasks();

    } catch (error) {

        document.body.innerHTML = `
            <div class="error-page">
                ${escapeHTML(error.message)}
            </div>
        `;

    }

})();