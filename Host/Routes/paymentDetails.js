const express = require("express");
const router = express.Router();
const {

    createPayment,
    getPayment,
    updatePayment,
    deletePayment
} = require("../controllers/paymentDetails/paymentDetails");
const {authMiddleware} = require("../../middlewares/authMiddleware");



router.post("/create-payment",authMiddleware(['host']), createPayment);
router.get("/get-payment",authMiddleware(['host']), getPayment);
router.put("/update-payment", authMiddleware(['host']),updatePayment);
router.delete("/delete-payment",authMiddleware(['host']),deletePayment);


module.exports = router;

