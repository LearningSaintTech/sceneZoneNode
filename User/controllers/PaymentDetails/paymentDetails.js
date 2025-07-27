const Payment = require('../../models/PaymentDetails/userPaymentDetails');
const { apiResponse } = require('../../../utils/apiResponse');


// Create Payment
exports.createPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const payment = new Payment({
      ...req.body,
      userId,
    });
    const savedPayment = await payment.save();
    return apiResponse(res, {
      message: "Payment created successfully",
      data: savedPayment,
      statusCode: 201,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message,
      statusCode: 400,
    });
  }
};


// Get Payment 
exports.getPayment = async (req, res) => {
   try {
    const userId = req.user.userId;
    const payments = await Payment.find({ userId });
    if (!payments || payments.length === 0) {
      return apiResponse(res, {
        success: false,
        message: "No payment details found for this user",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      message: "Payment details fetched successfully",
      data: payments,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message,
      statusCode: 500,
    });
  }
};

// Update Payment
exports.updatePayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log("userId",userId);
    const updatedPayment = await Payment.findOneAndUpdate(
      {  userId }, 
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedPayment) {
      return apiResponse(res, {
        success: false,
        message: "Payment not found or not authorized",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      message: "Payment updated successfully",
      data: updatedPayment,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message,
      statusCode: 400,
    });
  }
};

// Delete Payment
exports.deletePayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const deletedPayment = await Payment.findOneAndDelete({
      userId,
    });

    if (!deletedPayment) {
      return apiResponse(res, {
        success: false,
        message: "Payment not found or not authorized",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      message: "Payment deleted successfully",
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message,
      statusCode: 500,
    });
  }
};