const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/employee/:empId', authenticateToken, leaveController.getEmployeeLeaves);
router.get('/balance/:empId', authenticateToken, leaveController.getLeaveBalance);
router.get('/pending', authenticateToken, authorizeRoles('admin', 'hr'), leaveController.getPendingLeaves);
router.post('/', authenticateToken, leaveController.applyLeave);
router.put('/:leaveId/approve', authenticateToken, authorizeRoles('admin', 'hr'), leaveController.approveLeave);
router.put('/:leaveId/reject', authenticateToken, authorizeRoles('admin', 'hr'), leaveController.rejectLeave);

module.exports = router;