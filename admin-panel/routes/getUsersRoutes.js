const express = require('express');
const router = express.Router();
const {getAdminFullName,getAllAppUsers,getAllArtists,getAllHosts,getAllUsers,exportAllAppUsersToCsv,exportAllArtistsToCsv,exportAllHostsToCsv,exportAllUsersToCsv,searchUsers} = require('../controllers/getAppUsers/appUsersController');
const {authMiddleware} = require("../../middlewares/authMiddleware")

router.get("/get-all-app-users",authMiddleware(['admin']),getAllAppUsers);
router.get("/get-all-artists",authMiddleware(['admin']),getAllArtists);
router.get("/get-all-hosts",authMiddleware(['admin']),getAllHosts);
router.get("/get-all-users",authMiddleware(['admin']),getAllUsers);

router.get("/export-all-app-users",authMiddleware(['admin']),exportAllAppUsersToCsv);
router.get("/export-all-artists",authMiddleware(['admin']),exportAllArtistsToCsv);
router.get("/export-all-hosts",authMiddleware(['admin']),exportAllHostsToCsv);
router.get("/export-all-users",authMiddleware(['admin']),exportAllUsersToCsv);

router.get("/search-users",authMiddleware(['admin']),searchUsers);


router.get("/get-admin-name",authMiddleware(['admin']),getAdminFullName);



module.exports = router;