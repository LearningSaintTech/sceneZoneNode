const mongoose = require('mongoose');
const Invoice = require('./artistHostBooking/models/invoices'); // Adjust path to your Invoice model
require('dotenv').config(); // Load environment variables from .env file

// Sample invoice data
const invoiceData = [
  {
    platform_fees: { amount: 50.00 },
    taxes: { amount: 10.00 },
  }
];

// MongoDB connection function
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Seed function to clear and populate the Invoice collection
const seedInvoices = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Clear existing invoices
    await Invoice.deleteMany({});
    console.log('Existing invoices cleared');

    // Insert new invoice data
    await Invoice.insertMany(invoiceData);
    console.log('Invoices seeded successfully');

    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error seeding invoices:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedInvoices();