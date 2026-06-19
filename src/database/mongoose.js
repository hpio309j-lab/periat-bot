const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB with retry logic
const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('Error: MONGODB_URI is not set in .env file');
        console.log('Please create a .env file in the project root with:');
        console.log('MONGODB_URI=your_mongodb_connection_string');
        process.exit(1);
    }

    const maxRetries = 5;
    let retries = 0;
    let connected = false;

    while (!connected && retries < maxRetries) {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
                heartbeatFrequencyMS: 30000, // Default is 10000 (10s)
                socketTimeoutMS: 45000, // Default is 0 (no timeout)
            });
            
            connected = true;
            console.log('MongoDB connected successfully');
        } catch (error) {
            retries++;
            console.error(`MongoDB connection attempt ${retries} failed:`, error.message);
            
            if (retries >= maxRetries) {
                console.error('Maximum MongoDB connection retries reached. Exiting...');
                process.exit(1);
            }
            
            // Wait before trying again (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, retries), 10000);
            console.log(`Waiting ${waitTime}ms before retrying...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    // Handle connection events for better stability
    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected! Attempting to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });

    // Handle application termination
    process.on('SIGINT', async () => {
        try {
            await mongoose.connection.close();
            console.log('MongoDB connection closed due to app termination');
            process.exit(0);
        } catch (err) {
            console.error('Error closing MongoDB connection:', err);
            process.exit(1);
        }
    });
};

module.exports = { connectDB };