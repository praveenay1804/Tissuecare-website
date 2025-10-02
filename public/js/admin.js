class AdminDashboard {
    constructor() {
        this.products = [];
        this.orders = [];
        this.init();
    }

    async init() {
        if (!localStorage.getItem('adminLoggedIn')) {
            window.location.href = 'admin.html';
            return;
        }

        await this.loadData();
        this.setupEventListeners();
        this.setupTabNavigation();
    }

    async loadData() {
        await this.loadProducts();
        await this.loadOrders();
        this.updateDashboardStats();
        this.renderProductsTable();
        this.renderOrdersTable();
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            this.products = await response.json();
        } catch (error) {
            this.showError('Error loading products');
        }
    }

    async loadOrders() {
        try {
            const response = await fetch('/api/orders');
            this.orders = await response.json();
        } catch (error) {
            this.showError('Error loading orders');
        }
    }

    updateDashboardStats() {
        document.getElementById('totalProducts').textContent = this.products.length;
        document.getElementById('totalOrders').textContent = this.orders.length;
        document.getElementById('pendingOrders').textContent =
            this.orders.filter(order => order.status === 'pending').length;
    }

    renderProductsTable() {
        const tbody = document.getElementById('productsTable');
        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td><img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                <td>${product.name}</td>
                <td>₹${product.price}</td>
                <td>${product.stock}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="admin.editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="admin.deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderOrdersTable() {
            const tbody = document.getElementById('ordersTable');
            tbody.innerHTML = this.orders.map(order => `
            <tr>
                <td>${order.id.slice(0, 8)}...</td>
                <td>${order.customer.name}</td>
                <td>₹${order.total.toFixed(2)}</td>
                <td>
                    <span class="badge bg-${order.status === 'pending' ? 'warning' : 'success'}">
                        ${order.status}
                    </span>
                </td>
                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                    ${order.status === 'pending' ? 
                        `<button class="btn btn-sm btn-success" onclick="admin.confirmOrder('${order.id}')">
                            Confirm
                        </button>` : 
                        '<span class="text-muted">Confirmed</span>'
                    }
                </td>
            </tr>
        `).join('');
    }

    setupEventListeners() {
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.updatePageTitle(e.target.textContent.trim());
            });
        });
    }

    setupTabNavigation() {
        const activeTab = document.querySelector('.nav-link.active');
        if (activeTab) {
            this.updatePageTitle(activeTab.textContent.trim());
        }
    }

    updatePageTitle(title) {
        document.getElementById('pageTitle').textContent = title;
    }

    async saveProduct() {
        const form = document.getElementById('productForm');
        const formData = new FormData();
        const productId = document.getElementById('productId').value;

        formData.append('name', document.getElementById('productName').value);
        formData.append('price', document.getElementById('productPrice').value);
        formData.append('description', document.getElementById('productDescription').value);
        formData.append('category', document.getElementById('productCategory').value);
        formData.append('stock', document.getElementById('productStock').value);

        const imageFile = document.getElementById('productImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            const url = productId ? `/api/products/${productId}` : '/api/products';
            const method = productId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                body: formData
            });

            if (response.ok) {
                await this.loadData();
                this.hideProductModal();
                this.showSuccess('Product saved successfully!');
            }
        } catch (error) {
            this.showError('Error saving product');
        }
    }

    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            document.getElementById('productModalTitle').textContent = 'Edit Product';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productStock').value = product.stock;

            const modal = new bootstrap.Modal(document.getElementById('productModal'));
            modal.show();
        }
    }

    async deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                const response = await fetch(`/api/products/${productId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    await this.loadData();
                    this.showSuccess('Product deleted successfully!');
                }
            } catch (error) {
                this.showError('Error deleting product');
            }
        }
    }

    async confirmOrder(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}/confirm`, {
                method: 'PATCH'
            });

            if (response.ok) {
                await this.loadData();
                this.showSuccess('Order confirmed successfully!');
            }
        } catch (error) {
            this.showError('Error confirming order');
        }
    }

    hideProductModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
        modal.hide();
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('productModalTitle').textContent = 'Add New Product';
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const main = document.querySelector('main');
        main.insertBefore(alert, main.firstChild);

        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'admin.html';
}

document.addEventListener('DOMContentLoaded', () => {
    window.admin = new AdminDashboard();
});