const express = require('express');
const router = express.Router();
const { countUsers} = require('../controllers/usersCount/userCountController');
const {authMiddleware} = require("../../middlewares/authMiddleware")

router.get("/count-Users",authMiddleware(['admin']),countUsers);


module.exports = router;