const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/employee/:empId', authenticateToken, attendanceController.getEmployeeAttendance);
router.get('/date/:date', authenticateToken, authorizeRoles('admin', 'hr'), attendanceController.getAttendanceByDate);
router.post('/', authenticateToken, authorizeRoles('admin', 'hr'), attendanceController.markAttendance);
router.post('/bulk', authenticateToken, authorizeRoles('admin', 'hr'), attendanceController.bulkMarkAttendance);
router.put('/:attId', authenticateToken, authorizeRoles('admin', 'hr'), attendanceController.updateAttendance);

module.exports = router;