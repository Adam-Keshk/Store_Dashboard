(async function initStorage() {

    if (!requireAuth()) return;

    try {

        const user = await loadCurrentUser();

        let items = await api("/storage");

        async function renderStorage() {

            items = await api("/storage");

            const totalValue = items.reduce(
                (sum, item) => {
                    return sum + Number(
                        item.all_price ??
                        item.price * item.quantity
                    );
                },
                0
            );

            const totalQuantity = items.reduce(
                (sum, item) => sum + Number(item.quantity),
                0
            );

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

                        ${user.role === "admin" ? `
                            <a href="employees.html">
                                Employees
                            </a>
                        ` : ""}

                        <a class="active" href="storage.html">
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
                            <h1>Storage</h1>
                        </div>

                        <span class="role-badge">
                            ${user.role.toUpperCase()}
                        </span>

                    </header>

                    <div id="page-message" class="notice hidden"></div>

                    <section class="stats-grid">

                        <div class="stat-card">
                            <p>Total Products</p>
                            <h2>${items.length}</h2>
                        </div>

                        <div class="stat-card">
                            <p>Total Quantity</p>
                            <h2>${totalQuantity}</h2>
                        </div>

                        <div class="stat-card">
                            <p>Total Inventory Value</p>
                            <h2>${money(totalValue)}</h2>
                        </div>

                    </section>

                    ${user.role === "admin" ? `

                        <section class="panel">

                            <h2>Add Product</h2>

                            <form id="item-form">

                                <div class="form-grid">

                                    <div class="field">
                                        <label>Product Name</label>

                                        <input
                                            name="name"
                                            type="text"
                                            required
                                        >
                                    </div>

                                    <div class="field">
                                        <label>Price</label>

                                        <input
                                            name="price"
                                            type="number"
                                            min="0"
                                            required
                                        >
                                    </div>

                                    <div class="field">
                                        <label>Quantity</label>

                                        <input
                                            name="quantity"
                                            type="number"
                                            min="0"
                                            required
                                        >
                                    </div>

                                </div>

                                <button class="btn" type="submit">
                                    Add Product
                                </button>

                            </form>

                        </section>

                    ` : ""}

                    <section class="panel">

                        <div class="panel-header">

                            <h2>Inventory</h2>

                            ${user.role === "admin" ? `
                                <button
                                    class="btn btn-danger btn-small"
                                    id="empty-storage"
                                >
                                    Empty Storage
                                </button>
                            ` : ""}

                        </div>

                        <div class="table-wrapper">

                            <table>

                                <thead>

                                    <tr>
                                        <th>ID</th>
                                        <th>Product</th>
                                        <th>Price</th>
                                        <th>Quantity</th>
                                        <th>Total</th>

                                        ${user.role === "admin" ? `
                                            <th>Actions</th>
                                        ` : ""}
                                    </tr>

                                </thead>

                                <tbody>

                                    ${items.map(item => `

                                        <tr>

                                            <td>${item.id}</td>

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

                                            ${user.role === "admin" ? `

                                                <td>

                                                    <button
                                                        class="btn btn-small"
                                                        data-edit="${item.id}"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        class="btn btn-small btn-danger"
                                                        data-delete="${item.id}"
                                                    >
                                                        Delete
                                                    </button>

                                                </td>

                                            ` : ""}

                                        </tr>

                                    `).join("") || `

                                        <tr>
                                            <td
                                                colspan="${user.role === "admin" ? 6 : 5}"
                                                class="empty"
                                            >
                                                Storage is empty.
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

            // Add product
            document.getElementById("item-form")?.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    const values = Object.fromEntries(
                        new FormData(event.currentTarget)
                    );

                    values.price = Number(values.price);
                    values.quantity = Number(values.quantity);

                    try {

                        await api(
                            "/add_item",
                            {
                                method: "POST",
                                body: JSON.stringify(values)
                            }
                        );

                        showMessage("Product added successfully.");

                        await renderStorage();

                    } catch (error) {

                        showMessage(error.message, "error");

                    }

                }
            );

            // Delete product
            document.querySelectorAll("[data-delete]").forEach(button => {

                button.addEventListener("click", async () => {

                    if (!confirm("Delete this product?")) return;

                    try {

                        await api(
                            `/delete_item/${button.dataset.delete}`,
                            {
                                method: "DELETE"
                            }
                        );

                        showMessage("Product deleted.");

                        await renderStorage();

                    } catch (error) {

                        showMessage(error.message, "error");

                    }

                });

            });

            // Edit product
            document.querySelectorAll("[data-edit]").forEach(button => {

                button.addEventListener("click", async () => {

                    const item = items.find(
                        x => x.id === Number(button.dataset.edit)
                    );

                    const name = prompt("Product name:", item.name);

                    if (name === null) return;

                    const price = prompt("Price:", item.price);

                    if (price === null) return;

                    const quantity = prompt(
                        "Quantity:",
                        item.quantity
                    );

                    if (quantity === null) return;

                    const values = {
                        name: name.trim(),
                        price: Number(price),
                        quantity: Number(quantity)
                    };

                    if (
                        !values.name ||
                        !Number.isFinite(values.price) ||
                        values.price < 0 ||
                        !Number.isInteger(values.quantity) ||
                        values.quantity < 0
                    ) {

                        showMessage(
                            "Please enter valid product information.",
                            "error"
                        );

                        return;
                    }

                    try {

                        await api(
                            `/update_item/${item.id}`,
                            {
                                method: "PUT",
                                body: JSON.stringify(values)
                            }
                        );

                        showMessage("Product updated.");

                        await renderStorage();

                    } catch (error) {

                        showMessage(error.message, "error");

                    }

                });

            });

            // Empty storage
            document.getElementById("empty-storage")?.addEventListener(
                "click",
                async () => {

                    if (!confirm(
                        "Are you sure you want to delete all products?"
                    )) return;

                    try {

                        await api(
                            "/empty_storage",
                            {
                                method: "DELETE"
                            }
                        );

                        showMessage("Storage emptied.");

                        await renderStorage();

                    } catch (error) {

                        showMessage(error.message, "error");

                    }

                }
            );

        }

        await renderStorage();

    } catch (error) {

        document.body.innerHTML = `
            <div class="error-page">
                ${escapeHTML(error.message)}
            </div>
        `;

    }

})();