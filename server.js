const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotspot_hunter';
console.log("Using MongoDB URI:", MONGO_URI);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(`Connected to MongoDB: ${MONGO_URI.replace(/\/\/.*@/, "//[HIDDEN]@")}`);
}).catch(err => {
    console.error('MongoDB connection error:', err);
});


// Define the schema without 'month'
const RideSchema = new mongoose.Schema({
    h3_index: { type: String, required: true },
    day_of_week: { type: Number, required: true }, // 0 (Monday) - 6 (Sunday)
    hour: { type: Number, required: true } // 0 - 23
}, { collection: 'Ride' });

// Create a model using the schema
const Ride = mongoose.model('Ride', RideSchema);

// API to get rides based on weekday and hour
app.get("/get_hex_data", async (req, res) => {
    const { weekday, hour } = req.query;
    
    // Convert query params to numbers
    const matchQuery = {
        day_of_week: parseInt(weekday),
        hour: parseInt(hour)
    };

    try {
        const rides = await Ride.aggregate([
            { $match: matchQuery }, 
            {
                $group: {
                    _id: "$h3_index",
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log(`Unique H3 indexes found: ${rides.length}`);

        if (rides.length === 0) {
            return res.status(404).json({ message: "No rides found" });
        }

        res.json(rides.map(ride => ({
            h3_index: ride._id,
            count: ride.count
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/check_db", async (req, res) => {
    try {
        const count = await Ride.countDocuments(); // Count total records
        res.json({ message: "MongoDB is connected", total_records: count });
    } catch (error) {
        res.status(500).json({ error: "MongoDB connection failed", details: error.message });
    }
});

// Start the server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

module.exports = app;