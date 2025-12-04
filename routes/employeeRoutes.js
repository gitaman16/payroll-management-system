const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', authenticateToken, employeeController.getAllEmployees);
router.get('/:id', authenticateToken, employeeController.getEmployeeById);
router.post('/', authenticateToken, authorizeRoles('admin', 'hr'), employeeController.createEmployee);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'hr'), employeeController.updateEmployee);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), employeeController.deleteEmployee);

module.exports = router;