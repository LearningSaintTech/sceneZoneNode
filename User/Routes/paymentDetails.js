const express = require("express");
const router = express.Router();
const {

    createPayment,
    getPayment,
    updatePayment,
    deletePayment
} = require("../controllers/PaymentDetails/paymentDetails");
const {authMiddleware} = require("../../middlewares/authMiddleware");



router.post("/create-payment",authMiddleware(['user']), createPayment);
router.get("/get-payment",authMiddleware(['user']), getPayment);
router.put("/update-payment", authMiddleware(['user']),updatePayment);
router.delete("/delete-payment",authMiddleware(['user']),deletePayment);


module.exports = router;

