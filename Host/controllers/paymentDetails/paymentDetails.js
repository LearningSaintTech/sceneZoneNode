const Payment = require('../../models/paymentDetails/paymentDetails');
const { apiResponse } = require('../../../utils/apiResponse');


// Create Payment
exports.createPayment = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const payment = new Payment({
      ...req.body,
      hostId,
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
    const hostId = req.user.hostId;
    const payments = await Payment.find({hostId });
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
    const hostId = req.user.hostId;
    console.log("hostId",hostId);
    const updatedPayment = await Payment.findOneAndUpdate(
      {  hostId }, 
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
    const hostId= req.user.hostId;
    const deletedPayment = await Payment.findOneAndDelete({
      hostId,
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