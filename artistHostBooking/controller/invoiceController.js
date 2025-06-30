const Invoice = require('../models/invoices');

// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private (adjust based on your auth requirements)
const createInvoice = (async (req, res) => {
  const { platform_fees, taxes } = req.body;

  // Validate input
  if (!platform_fees || !platform_fees.amount || !taxes || !taxes.amount) {
    res.status(400);
    throw new Error('Platform fees and taxes are required');
  }

  const invoice = await Invoice.create({
    platform_fees,
    taxes,
  });

  res.status(201).json({
    success: true,
    data: invoice,
  });
});

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getAllInvoices = (async (req, res) => {
  const invoices = await Invoice.find().lean();
  res.status(200).json({
    success: true,
    data: invoices,
  });
});

// @desc    Get a single invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = (async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).lean();

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

// @desc    Update an invoice by ID
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = (async (req, res) => {
  const { platform_fees, taxes } = req.body;

  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Update fields if provided
  if (platform_fees && platform_fees.amount !== undefined) {
    invoice.platform_fees.amount = platform_fees.amount;
  }
  if (taxes && taxes.amount !== undefined) {
    invoice.taxes.amount = taxes.amount;
  }

  const updatedInvoice = await invoice.save();

  res.status(200).json({
    success: true,
    data: updatedInvoice,
  });
});

// @desc    Delete an invoice by ID
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = (async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  await invoice.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Invoice deleted successfully',
  });
});

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
};