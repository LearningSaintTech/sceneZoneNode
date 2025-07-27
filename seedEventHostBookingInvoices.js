const mongoose = require('mongoose');
const EventHostBookingInvoices = require('../sceneZoneNode/artistHostBooking/models/invoices');

const MONGO_URI = 'mongodb+srv://shwetkhuswaha62:m8GoqttXZmIuAAlT@cluster0.i0g6ujy.mongodb.net/';

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI not provided, using default:', MONGO_URI);
    }
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const settings = await EventHostBookingInvoices.getSingleton();
    console.log('Seeded EventHostBookingInvoices:', settings);
  } catch (err) {
    console.error('Error seeding EventHostBookingInvoices:', err);
    process.exit(1); // Exit with failure code for CI/CD
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();