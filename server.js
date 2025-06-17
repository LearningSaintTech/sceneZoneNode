const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config(); 

const userAuthentication = require("./User/Routes/Auth");
const hostAuthentication = require("./Host/Routes/Auth");
const artistAuthentication = require("./Artist/Routes/Auth");
const adminAuthentication = require("./Admin/Routes/Auth");
const userProfile = require("./User/Routes/userProfile");
const artistProfile = require("./Artist/Routes/profile");
const hostProfile = require("./Host/Routes/Profile");
const events = require("./Host/Routes/Event")
const shortlistAritst = require("./Host/Routes/shortlistArtist");
const sendInvitation = require("./Host/Routes/invitation");
const respondToInvitation = require("./Artist/Routes/respondInvite");
const eventApplication = require("./Artist/Routes/eventApplication")
const AritstFilter = require("./Host/Routes/Filter")
const userFavouriteEvent = require("./User/Routes/favouriteEvent")
const filterEvents = require("./Artist/Routes/filter")
const adminVerify = require("./Admin/Routes/Verification");
const HostForgotPassword = require("./Host/Routes/forgotPassword");
const ArtistForgotPassword = require("./Artist/Routes/forgotPassword");
const UserForgotPassword = require("./User/Routes/ForgotPassword");
const adminProfile = require("./Admin/Routes/profile");
const createUser = require("./Admin/Routes/createUser");
const userPaymentDetails = require("./User/Routes/paymentDetails");
const hostPaymentDetails = require("./Host/Routes/paymentDetails");
const guestRequest = require("./User/Routes/guestList");
const respondguestRequest = require("./Artist/Routes/respondtoGuestlist");
const filterUsers = require("./Admin/Routes/filter");
const AppUsers = require("./Admin/Routes/allUsers");
const AdminForgotPassword = require("./Admin/Routes/forgotPassword");
const RateArtist = require("./Host/Routes/Rating");
const RateEvent = require("./Artist/Routes/Rating");
const app = express();
const PORT = process.env.PORT;

connectDB();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Server Running");
});

app.use("/api/user/auth", userAuthentication);
app.use("/api/user", userProfile, userFavouriteEvent, UserForgotPassword,userPaymentDetails,guestRequest,RateEvent); 
app.use("/api/host/auth", hostAuthentication);
app.use(
  "/api/host",
  hostProfile,
  shortlistAritst,
  sendInvitation,
  AritstFilter,
  HostForgotPassword,
  hostPaymentDetails,
  RateArtist
);
app.use("/api/host/events", events);
app.use("/api/artist/auth", artistAuthentication);
app.use(
  "/api/artist",
  artistProfile,
  respondToInvitation,
  eventApplication,
  filterEvents,
  ArtistForgotPassword,
  respondguestRequest,
  RateEvent
); 
app.use("/api/admin/auth", adminAuthentication);
app.use("/api/admin", adminVerify,adminProfile,createUser,filterUsers,AppUsers,AdminForgotPassword);


app.listen(PORT,'0.0.0.0' ,() =>
  console.log(`Server running on http://localhost:${PORT}`)
);
