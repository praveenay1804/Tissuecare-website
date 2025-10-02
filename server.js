const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Multer configuration for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'public', 'images');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Data file paths
const productsFile = path.join(__dirname, 'data', 'products.json');
const ordersFile = path.join(__dirname, 'data', 'orders.json');
const usersFile = path.join(__dirname, 'data', 'users.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(productsFile))) {
    fs.mkdirSync(path.dirname(productsFile), { recursive: true });
}

// Initialize data files if they don't exist
const initializeFile = (filePath, defaultData = []) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
};

initializeFile(productsFile);
initializeFile(ordersFile);
initializeFile(usersFile, [{ username: 'admin', password: 'admin123' }]);

// Helper functions to read/write data
const readJSON = (filePath) => {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return [];
    }
};

const writeJSON = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Routes

// Get all products
app.get('/api/products', (req, res) => {
    const products = readJSON(productsFile);
    res.json(products);
});

// Add new product
app.post('/api/products', upload.single('image'), (req, res) => {
    const products = readJSON(productsFile);
    const newProduct = {
        id: uuidv4(),
        name: req.body.name,
        price: parseFloat(req.body.price),
        description: req.body.description,
        image: req.file ? '/images/' + req.file.filename : '/images/placeholder.jpg',
        category: req.body.category,
        stock: parseInt(req.body.stock)
    };
    products.push(newProduct);
    writeJSON(productsFile, products);
    res.json(newProduct);
});

// Update product
app.put('/api/products/:id', upload.single('image'), (req, res) => {
    const products = readJSON(productsFile);
    const productIndex = products.findIndex(p => p.id === req.params.id);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = {
        ...products[productIndex],
        name: req.body.name,
        price: parseFloat(req.body.price),
        description: req.body.description,
        category: req.body.category,
        stock: parseInt(req.body.stock)
    };

    if (req.file) {
        updatedProduct.image = '/images/' + req.file.filename;
    }

    products[productIndex] = updatedProduct;
    writeJSON(productsFile, products);
    res.json(updatedProduct);
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    let products = readJSON(productsFile);
    products = products.filter(p => p.id !== req.params.id);
    writeJSON(productsFile, products);
    res.json({ message: 'Product deleted successfully' });
});

// Create order
app.post('/api/orders', (req, res) => {
    const orders = readJSON(ordersFile);
    const newOrder = {
        id: uuidv4(),
        ...req.body,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    writeJSON(ordersFile, orders);
    res.json(newOrder);
});

// Get all orders
app.get('/api/orders', (req, res) => {
    const orders = readJSON(ordersFile);
    res.json(orders);
});

// Update order status
app.patch('/api/orders/:id/confirm', (req, res) => {
    const orders = readJSON(ordersFile);
    const order = orders.find(o => o.id === req.params.id);

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    order.status = 'confirmed';
    order.confirmedAt = new Date().toISOString();
    writeJSON(ordersFile, orders);
    res.json(order);
});

// User authentication
app.post('/api/login', (req, res) => {
    const users = readJSON(usersFile);
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`TissueCare server running on http://localhost:${PORT}`);
});