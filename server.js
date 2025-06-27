const express = require('express');
require('dotenv').config();
const cors = require('cors')
const path = require('path')
const userRoutes = require("./routes/user.routes.js")
const adminRoutes = require("./routes/admin.routes.js")
const connectDB = require('./config/db.js');
const app = express();
connectDB();
app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
    console.log(`Server running on port${PORT}`);
})
