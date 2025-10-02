class TissueCareApp {
    constructor() {
        this.products = [];
        this.cart = this.initializeCart();
        this.init();
    }

    initializeCart() {
        try {
            const savedCart = localStorage.getItem('cart');
            const cart = savedCart ? JSON.parse(savedCart) : [];

            if (!Array.isArray(cart)) {
                console.warn('Cart data was corrupted, resetting to empty array');
                this.saveCart([]);
                return [];
            }

            return cart;
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            this.saveCart([]);
            return [];
        }
    }

    async init() {
        await this.loadProducts();
        this.renderProducts();
        this.updateCartCount();
        this.setupEventListeners();
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            this.products = await response.json();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        grid.innerHTML = this.products.map(product => `
            <div class="col-md-6 col-lg-4">
                <div class="card product-card fade-in">
                    <img src="${product.image}" class="card-img-top product-image" alt="${product.name}">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text text-muted">${product.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="h5 text-primary">₹${product.price}</span>
                            <button class="btn btn-primary add-to-cart" data-id="${product.id}">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.closest('button').dataset.id;
                this.addToCart(productId);
            });
        });
    }

    addToCart(productId) {
        if (!Array.isArray(this.cart)) {
            console.error('Cart is not an array, resetting...');
            this.cart = [];
            this.saveCart();
        }

        const product = this.products.find(p => p.id === productId);
        if (product) {
            const existingItem = this.cart.find(item => item.id === productId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                this.cart.push({...product, quantity: 1 });
            }
            this.saveCart();
            this.updateCartCount();
            this.showToast('Product added to cart!', 'success');
        }
    }

    removeFromCart(productId) {
        if (!Array.isArray(this.cart)) {
            this.cart = [];
        }
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartCount();
        this.renderCartItems();
    }

    updateQuantity(productId, change) {
        if (!Array.isArray(this.cart)) {
            this.cart = [];
            this.saveCart();
            return;
        }

        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.saveCart();
                this.renderCartItems();
            }
        }
    }

    saveCart() {
        try {
            localStorage.setItem('cart', JSON.stringify(this.cart));
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    updateCartCount() {
        if (!Array.isArray(this.cart)) {
            console.warn('Cart is not an array, resetting count to 0');
            document.getElementById('cartCount').textContent = '0';
            return;
        }

        const count = this.cart.reduce((total, item) => total + (item.quantity || 0), 0);
        document.getElementById('cartCount').textContent = count;
    }

    renderCartItems() {
        const container = document.getElementById('cartItems');
        if (!container) return;

        if (!Array.isArray(this.cart)) {
            this.cart = [];
        }

        const total = this.cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

        if (this.cart.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Your cart is empty</p>';
        } else {
            container.innerHTML = this.cart.map(item => `
                <div class="d-flex align-items-center mb-3">
                    <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover;" class="rounded me-3">
                    <div class="flex-grow-1">
                        <h6 class="mb-0">${item.name}</h6>
                        <small class="text-muted">₹${item.price} x ${item.quantity || 1}</small>
                    </div>
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="app.updateQuantity('${item.id}', -1)">-</button>
                        <span class="mx-2">${item.quantity || 1}</span>
                        <button class="btn btn-sm btn-outline-secondary me-3" onclick="app.updateQuantity('${item.id}', 1)">+</button>
                        <button class="btn btn-sm btn-danger" onclick="app.removeFromCart('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('cartTotal').textContent = total.toFixed(2);
    }

    setupEventListeners() {
        const cartModal = document.getElementById('cartModal');
        if (cartModal) {
            cartModal.addEventListener('show.bs.modal', () => {
                this.renderCartItems();
            });
        }

        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                if (this.cart.length === 0) {
                    this.showToast('Your cart is empty!', 'warning');
                    return;
                }
                const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
                cartModal.hide();
                const checkoutModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
                checkoutModal.show();
            });
        }

        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', async() => {
                await this.placeOrder();
            });
        }
    }

    async placeOrder() {
        const form = document.getElementById('checkoutForm');

        // Validate form fields
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const address = document.getElementById('customerAddress').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();

        // Basic validation
        if (!name) {
            this.showToast('Please enter your full name', 'error');
            document.getElementById('customerName').focus();
            return;
        }

        if (!email) {
            this.showToast('Please enter your email address', 'error');
            document.getElementById('customerEmail').focus();
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showToast('Please enter a valid email address', 'error');
            document.getElementById('customerEmail').focus();
            return;
        }

        if (!address) {
            this.showToast('Please enter your delivery address', 'error');
            document.getElementById('customerAddress').focus();
            return;
        }

        if (!phone) {
            this.showToast('Please enter your phone number', 'error');
            document.getElementById('customerPhone').focus();
            return;
        }

        // Basic phone validation (at least 10 digits)
        const phoneRegex = /^\d{10,}$/;
        const cleanPhone = phone.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            this.showToast('Please enter a valid phone number (at least 10 digits)', 'error');
            document.getElementById('customerPhone').focus();
            return;
        }

        // Ensure cart is an array
        if (!Array.isArray(this.cart)) {
            this.cart = [];
        }

        // Check if cart is empty
        if (this.cart.length === 0) {
            this.showToast('Your cart is empty!', 'warning');
            return;
        }

        const order = {
            customer: {
                name: name,
                email: email,
                address: address,
                phone: cleanPhone
            },
            items: this.cart,
            total: this.cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
        };

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });

            if (response.ok) {
                // Clear cart and reset form
                this.cart = [];
                this.saveCart();
                this.updateCartCount();

                // Close modals
                const checkoutModal = bootstrap.Modal.getInstance(document.getElementById('checkoutModal'));
                checkoutModal.hide();

                // Show success message
                this.showToast('Order placed successfully! Thank you for your purchase.', 'success');

                // Reset form
                form.reset();
            } else {
                this.showToast('Error placing order. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Order placement error:', error);
            this.showToast('Network error. Please check your connection and try again.', 'error');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const cartData = localStorage.getItem('cart');
        if (cartData) {
            const parsed = JSON.parse(cartData);
            if (!Array.isArray(parsed)) {
                localStorage.removeItem('cart');
                console.log('Cleared corrupted cart data');
            }
        }
    } catch (error) {
        localStorage.removeItem('cart');
        console.log('Cleared corrupted cart data due to parse error');
    }

    window.app = new TissueCareApp();
});