const express = require('express');
const router = express.Router();
const { updateAdminProfile,getAdminProfileDetails} = require('../controllers/adminProfile/adminProfile');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const {authMiddleware} = require("../../middlewares/authMiddleware")

router.post("/save-admin-profile",authMiddleware(['admin']),upload.single('profileImage'),updateAdminProfile);
router.get("/get-admin-profile",authMiddleware(['admin']),getAdminProfileDetails);


module.exports = router;