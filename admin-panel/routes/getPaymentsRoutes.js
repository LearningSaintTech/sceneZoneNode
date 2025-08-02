const express = require('express');
const router = express.Router();
const { getPaymentDetails,searchPaymentDetails,exportPaymentDetailsToCsv} = require('../controllers/getpaymentsDetails/getPaymentsController');
const {authMiddleware} = require("../../middlewares/authMiddleware")

router.get("/get-payment-details",authMiddleware(['admin']),getPaymentDetails);
router.get("/search-payment-details",authMiddleware(['admin']),searchPaymentDetails);
router.get("/export-payments",authMiddleware(['admin']),exportPaymentDetailsToCsv)


module.exports = router;