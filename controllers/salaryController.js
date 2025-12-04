const db = require('../config/db');

// Get employee salary structure
exports.getEmployeeSalary = async (req, res) => {
  try {
    const empId = req.params.empId;

    const [salary] = await db.query(
      `SELECT s.*, e.name, e.designation 
       FROM salary_structure s
       JOIN employees e ON s.emp_id = e.emp_id
       WHERE s.emp_id = ? AND (s.effective_to IS NULL OR s.effective_to >= CURDATE())
       ORDER BY s.effective_from DESC
       LIMIT 1`,
      [empId]
    );

    if (salary.length === 0) {
      return res.status(404).json({ error: 'Salary structure not found' });
    }

    // Calculate gross salary
    const salaryData = salary[0];
    const grossSalary = 
      parseFloat(salaryData.basic_salary) +
      parseFloat(salaryData.hra || 0) +
      parseFloat(salaryData.da || 0) +
      parseFloat(salaryData.ta || 0) +
      parseFloat(salaryData.medical_allowance || 0) +
      parseFloat(salaryData.special_allowance || 0);

    const totalDeductions = 
      parseFloat(salaryData.pf_deduction || 0) +
      parseFloat(salaryData.professional_tax || 0) +
      parseFloat(salaryData.esi || 0);

    const netSalary = grossSalary - totalDeductions;

    res.json({
      success: true,
      data: {
        ...salaryData,
        gross_salary: grossSalary.toFixed(2),
        total_deductions: totalDeductions.toFixed(2),
        net_salary: netSalary.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Get salary error:', error);
    res.status(500).json({ error: 'Failed to fetch salary structure' });
  }
};

// Create salary structure
exports.createSalaryStructure = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      emp_id, basic_salary, hra, da, ta, medical_allowance, special_allowance,
      pf_deduction, professional_tax, esi, effective_from
    } = req.body;

    // Validate employee exists
    const [employee] = await connection.query(
      'SELECT emp_id FROM employees WHERE emp_id = ?',
      [emp_id]
    );

    if (employee.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Close previous salary structure
    await connection.query(
      'UPDATE salary_structure SET effective_to = DATE_SUB(?, INTERVAL 1 DAY) WHERE emp_id = ? AND effective_to IS NULL',
      [effective_from, emp_id]
    );

    // Insert new salary structure
    const [result] = await connection.query(
      `INSERT INTO salary_structure 
       (emp_id, basic_salary, hra, da, ta, medical_allowance, special_allowance, 
        pf_deduction, professional_tax, esi, effective_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [emp_id, basic_salary, hra || 0, da || 0, ta || 0, medical_allowance || 0, 
       special_allowance || 0, pf_deduction || 0, professional_tax || 0, esi || 0, effective_from]
    );

    const salaryId = result.insertId;

    // Update employee's salary_id
    await connection.query(
      'UPDATE employees SET salary_id = ? WHERE emp_id = ?',
      [salaryId, emp_id]
    );

    await connection.commit();

    // Log action
    await db.query(
      'INSERT INTO audit_log (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.userId, 'CREATE_SALARY', 'salary_structure', salaryId]
    );

    res.status(201).json({
      success: true,
      message: 'Salary structure created successfully',
      salaryId
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create salary error:', error);
    res.status(500).json({ error: 'Failed to create salary structure' });
  } finally {
    connection.release();
  }
};

// Update salary structure
exports.updateSalaryStructure = async (req, res) => {
  try {
    const salaryId = req.params.salaryId;
    const updateFields = req.body;

    delete updateFields.salary_id;
    delete updateFields.emp_id;
    delete updateFields.created_at;

    const keys = Object.keys(updateFields);
    const values = Object.values(updateFields);

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    values.push(salaryId);

    await db.query(
      `UPDATE salary_structure SET ${setClause} WHERE salary_id = ?`,
      values
    );

    // Log action
    await db.query(
      'INSERT INTO audit_log (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.userId, 'UPDATE_SALARY', 'salary_structure', salaryId]
    );

    res.json({ success: true, message: 'Salary structure updated successfully' });

  } catch (error) {
    console.error('Update salary error:', error);
    res.status(500).json({ error: 'Failed to update salary structure' });
  }
};

// Delete salary structure
exports.deleteSalaryStructure = async (req, res) => {
  try {
    const salaryId = req.params.salaryId;

    await db.query(
      'UPDATE salary_structure SET effective_to = CURDATE() WHERE salary_id = ?',
      [salaryId]
    );

    // Log action
    await db.query(
      'INSERT INTO audit_log (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.userId, 'DELETE_SALARY', 'salary_structure', salaryId]
    );

    res.json({ success: true, message: 'Salary structure deleted successfully' });

  } catch (error) {
    console.error('Delete salary error:', error);
    res.status(500).json({ error: 'Failed to delete salary structure' });
  }
};