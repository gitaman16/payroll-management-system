const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/month/:month', authenticateToken, authorizeRoles('admin', 'hr'), payrollController.getPayrollByMonth);
router.get('/employee/:empId', authenticateToken, payrollController.getEmployeePayroll);
router.get('/payslip/:payrollId', authenticateToken, payrollController.getPayslip);
router.post('/process', authenticateToken, authorizeRoles('admin', 'hr'), payrollController.processPayroll);
router.post('/regenerate-payslip/:payrollId', authenticateToken, authorizeRoles('admin', 'hr'), payrollController.regeneratePayslip);

module.exports = router;