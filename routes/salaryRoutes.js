const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/employee/:empId', authenticateToken, salaryController.getEmployeeSalary);
router.post('/', authenticateToken, authorizeRoles('admin', 'hr'), salaryController.createSalaryStructure);
router.put('/:salaryId', authenticateToken, authorizeRoles('admin', 'hr'), salaryController.updateSalaryStructure);
router.delete('/:salaryId', authenticateToken, authorizeRoles('admin'), salaryController.deleteSalaryStructure);

module.exports = router;