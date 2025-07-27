const {createUser} = require("../controllers/createUser/createUser");
const {authMiddleware} = require("../../middlewares/authMiddleware");
const express = require("express");
const router = express.Router();


router.post("/create-User",authMiddleware(['admin']),createUser  );


module.exports = router;