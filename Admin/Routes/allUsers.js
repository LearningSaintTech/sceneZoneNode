const {getAllAppUsers} = require("../controllers/getAllUsers/allUsers");
const {authMiddleware} = require("../../middlewares/authMiddleware");
const express = require("express");
const router = express.Router();


router.get("/get-all-users",authMiddleware(['admin']),getAllAppUsers  );


module.exports = router;