const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { updateInvoiceSettings,getInvoices } = require('../controller/adminInvoicesController');

const router = express.Router();

router.post('/invoice-settings', authMiddleware(['admin', 'host']), (req, res, next) => {
  console.log('Accessing invoice-settings route');
  updateInvoiceSettings(req, res, next);
});
router.get('/getInvoices',authMiddleware(['user']),(req,res,next) =>{
  console.log('getting invoice-settings route');

  getInvoices(req,res,next);
});

module.exports = router;