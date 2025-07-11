const EventHostBookingInvoices = require('../model/eventHostBookingInvoices');
const { apiResponse } = require('../../utils/apiResponse');

exports.updateInvoiceSettings = async (req, res) => {
  const { platformFees, taxRate } = req.body;
  console.log(`Updating invoice settings: platformFees=${platformFees}, taxRate=${taxRate}`);

  try {
    // Validate inputs
    if (!Number.isFinite(platformFees) || !Number.isFinite(taxRate)) {
      console.log('Validation failed: Invalid input types');
      return apiResponse(res, {
        success: false,
        message: 'Platform fees and tax rate must be valid numbers',
        statusCode: 400,
      });
    }

    if (platformFees < 0 || taxRate < 0) {
      console.log('Validation failed: Negative values provided');
      return apiResponse(res, {
        success: false,
        message: 'Platform fees and tax rate cannot be negative',
        statusCode: 400,
      });
    }

    // Use singleton pattern
    let invoiceSettings = await EventHostBookingInvoices.getSingleton();
    invoiceSettings.platformFees = platformFees;
    invoiceSettings.taxRate = taxRate;
    await invoiceSettings.save();
    console.log(`Invoice settings updated: ${JSON.stringify(invoiceSettings)}`);

    return apiResponse(res, {
      success: true,
      message: 'Invoice settings updated successfully',
      data: { invoiceSettings },
    });
  } catch (error) {
    console.error(`Error updating invoice settings: ${error.message}`);
    return apiResponse(res, {
      success: false,
      message: 'Failed to update invoice settings',
      error: error.message,
      statusCode: 500,
    });
  }
};
exports.getInvoices = async (req, res) => {
  try {
    

  
      invoices = await EventHostBookingInvoices.find();
      console.log(`Retrieved ${invoices.length} invoices `);
  
     
    

    if (!invoices || invoices.length === 0) {
      console.log('No invoices found');
      return apiResponse(res, {
        success: true,
        message: 'No invoices found',
        data: [],
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Invoices retrieved successfully',
      data: invoices,
      statusCode: 200,
    });
  } catch (error) {
    console.error(`Error fetching invoices: ${error.message}`);
    return apiResponse(res, {
      success: false,
      message: 'Failed to retrieve invoices',
      error: error.message,
      statusCode: 500,
    });
  }
};