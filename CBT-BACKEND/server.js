// 1. THIS MUST BE THE VERY FIRST LINE
require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
// 2. Add this temporary log to verify the variable is actually there
console.log("Database URL found:", process.env.POSTGRES_URL ? "YES" : "NO");

const db = require('./models'); // Now this will work

const app = express();

app.use(cors());
app.use(express.json());

// Import Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Sync the database (Check if tables exist, create them if they don't)
db.sequelize.sync().then(() => {
    console.log("✅ Database connected and tables synced!");
    if (process.env.NODE_ENV !== 'production') {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;