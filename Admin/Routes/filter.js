const {filterUsers} = require("../controllers/FilterUsers/filterUsers");
const {authMiddleware} = require("../../middlewares/authMiddleware");
const express = require("express");
const router = express.Router();


router.get("/filter-Users",authMiddleware(['admin']),filterUsers);


module.exports = router;