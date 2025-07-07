const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

// User Routes
const userAuthentication = require("./User/Routes/Auth");
const userFirebaseAuth = require("./User/Routes/FirebaseAuthRoutes");
const userProfile = require("./User/Routes/userProfile");
const userFavouriteEvent = require("./User/Routes/favouriteEvent");
const userForgotPassword = require("./User/Routes/ForgotPassword");
const userPaymentDetails = require("./User/Routes/paymentDetails");
 const eventDashboard = require("./User/Routes/event/eventDashboardRoutes");
const filterRoutesUser = require("./User/Routes/filter");

// Artist Routes
const artistAuthentication = require("./Artist/Routes/Auth");
const artistFirebaseAuth = require("./Artist/Routes/FirebaseAuthRoutes");
const artistProfile = require("./Artist/Routes/profile");
const performanceGalleryRoutes = require("./Artist/Routes/performanceGalleryRoutes");
const respondToInvitation = require("./Artist/Routes/respondInvite");
const eventApplication = require("./Artist/Routes/eventApplication");
const artistEvents = require("./Artist/Routes/event");
const filterEvents = require("./Artist/Routes/filter");
const artistForgotPassword = require("./Artist/Routes/forgotPassword");
 const rateEvent = require("./Artist/Routes/Rating");
const likedEventRoutes = require("./Artist/Routes/likedEventRoutes");
const savedEventRoutes = require("./Artist/Routes/savedEvent");

// Host Routes
const hostAuthentication = require("./Host/Routes/Auth");
const hostFirebaseAuth = require("./Host/Routes/FirebaseAuthRoutes");
const hostProfile = require("./Host/Routes/Profile");
const events = require("./Host/Routes/Event");
const shortlistArtist = require("./Host/Routes/shortlistArtist");
const sendInvitation = require("./Host/Routes/invitation");
const artistFilter = require("./Host/Routes/Filter");
const hostForgotPassword = require("./Host/Routes/forgotPassword");
const hostPaymentDetails = require("./Host/Routes/paymentDetails");
const rateArtist = require("./Host/Routes/Rating");
const ticketSettingRoutes = require("./Host/Routes/ticketSetting");
const ticketBookingRoutes = require("./Host/Routes/ticketBooking");


// Admin Routes
const adminAuthentication = require("./Admin/Routes/Auth");
const adminVerify = require("./Admin/Routes/Verification");
const adminProfile = require("./Admin/Routes/profile");
const createUser = require("./Admin/Routes/createUser");
const filterUsers = require("./Admin/Routes/filter");
const appUsers = require("./Admin/Routes/allUsers");
const adminForgotPassword = require("./Admin/Routes/forgotPassword");
const bannerRoutes = require("./Admin/Routes/banner");


const invoiceRoutes = require("./artistHostBooking/routes/invoiceRoutes");
const bookingRoutes = require('./artistHostBooking/routes/bookingRoutes');
 const chatNegotiationRoutes = require('./artistHostChat/Routes/chatNegotiationRoutes');
 const guestListRoutes = require('./guestList/routes/guestListRoutes')
const app = express();
const PORT = process.env.PORT;

// Database Connection
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get("/", (req, res) => {
  res.send("Server Running");
});

// User Routes
app.use("/api/user/auth", userAuthentication);
app.use("/api/user/firebase-auth", userFirebaseAuth);
app.use("/api/user", [
  userProfile,
  userFavouriteEvent,
  userForgotPassword,
  userPaymentDetails,
 ]);
app.use("/api/user/ticket", ticketBookingRoutes);
app.use("/api/user/eventDashboard", eventDashboard);
app.use("/api/user/event", filterRoutesUser);

// Artist Routes
app.use("/api/artist/auth", artistAuthentication);
app.use("/api/artist/firebase-auth", artistFirebaseAuth);
app.use("/api/artist", [
  artistProfile,
  respondToInvitation,
  eventApplication,
  filterEvents,
  artistForgotPassword,
   rateEvent,
]);
app.use("/api/artist/profile", performanceGalleryRoutes);
app.use("/api/artist/event", [likedEventRoutes, savedEventRoutes]);
app.use("/api/artist/events", artistEvents);

// Host Routes
app.use("/api/host/auth", hostAuthentication);
app.use("/api/host/firebase-auth", hostFirebaseAuth);
app.use("/api/host", [
  hostProfile,
  shortlistArtist,
  sendInvitation,
  artistFilter,
  hostForgotPassword,
  hostPaymentDetails,
  rateArtist,
  ticketSettingRoutes,
]);
app.use("/api/host/events", events);


 
// Admin Routes
app.use("/api/admin/auth", adminAuthentication);
app.use("/api/admin", [
  adminVerify,
  adminProfile,
  createUser,
  filterUsers,
  appUsers,
  adminForgotPassword,
]);
app.use("/api/admin/banner", bannerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use('/api/bookings', bookingRoutes);
 app.use("/api/chat", chatNegotiationRoutes);
 app.use('/api/guest-list', guestListRoutes);

// Start Server
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on http://localhost:${PORT}`)
);