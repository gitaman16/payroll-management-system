const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/payroll-summary', authenticateToken, authorizeRoles('admin', 'hr'), reportController.getPayrollSummary);
router.get('/department-wise', authenticateToken, authorizeRoles('admin', 'hr'), reportController.getDepartmentWiseReport);
router.get('/attendance-summary', authenticateToken, authorizeRoles('admin', 'hr'), reportController.getAttendanceSummary);
router.get('/leave-summary', authenticateToken, authorizeRoles('admin', 'hr'), reportController.getLeaveSummary);
router.get('/tax-report', authenticateToken, authorizeRoles('admin', 'hr'), reportController.getTaxReport);

module.exports = router;