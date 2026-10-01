const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',       // Development
    'http://10.11.0.80:5000',      // Intranet production
    'http://10.11.0.80',           // Intranet (tanpa port)
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ROUTES ---

// Import Routes
const authRoutes = require('./routes/authRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const unitRoutes = require('./routes/unitRoutes');
const userRoutes = require('./routes/userRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/users', userRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'KAI Schedule API Server is running!' });
});

// --- SERVE FRONTEND (Production) ---
// Serve file statis hasil build Vite dari folder client/dist
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));


// Start Server — listen di 0.0.0.0 agar bisa diakses dari jaringan intranet
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server berjalan di http://10.11.0.80:${PORT}`);
});

// Catch-all: semua route yang bukan /api akan diarahkan ke index.html (SPA)
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});