const db = require('../config/db');
const bcrypt = require('bcrypt');

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const { status, department, search } = req.query;
    
    let query = `
      SELECT e.*, s.basic_salary, s.hra, s.da, s.ta 
      FROM employees e 
      LEFT JOIN salary_structure s ON e.salary_id = s.salary_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }

    if (department) {
      query += ' AND e.department = ?';
      params.push(department);
    }

    if (search) {
      query += ' AND (e.name LIKE ? OR e.email LIKE ? OR e.designation LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY e.emp_id DESC';

    const [employees] = await db.query(query, params);
    res.json({ success: true, data: employees });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const [employees] = await db.query(
      `SELECT e.*, s.* 
       FROM employees e 
       LEFT JOIN salary_structure s ON e.salary_id = s.salary_id 
       WHERE e.emp_id = ?`,
      [req.params.id]
    );

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ success: true, data: employees[0] });

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

// Create employee
exports.createEmployee = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      name, email, phone, designation, department, 
      join_date, bank_account, ifsc_code, pan_number
    } = req.body;

    // Check if email already exists
    const [existing] = await connection.query(
      'SELECT emp_id FROM employees WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Insert employee
    const [result] = await connection.query(
      `INSERT INTO employees 
       (name, email, phone, designation, department, join_date, bank_account, ifsc_code, pan_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, designation, department, join_date, bank_account, ifsc_code, pan_number]
    );

    const empId = result.insertId;

    // Create user account
    const username = email.split('@')[0];
    const defaultPassword = 'emp123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await connection.query(
      'INSERT INTO users (username, password_hash, role, emp_id) VALUES (?, ?, ?, ?)',
      [username, passwordHash, 'employee', empId]
    );

    // Initialize leave balance
    await connection.query(
      'INSERT INTO leave_balance (emp_id, year) VALUES (?, ?)',
      [empId, new Date().getFullYear()]
    );

    await connection.commit();

    // Log action
    await db.query(
      'INSERT INTO audit_log (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.userId, 'CREATE_EMPLOYEE', 'employees', empId]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Employee created successfully',
      empId,
      credentials: { username, password: defaultPassword }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  } finally {
    connection.release();
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const empId = req.params.id;
    const updateFields = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateFields.emp_id;
    delete updateFields.created_at;
    delete updateFields.salary_id;

    const keys = Object.keys(updateFields);
    const values = Object.values(updateFields);

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    values.push(empId);

    await db.query(
      `UPDATE employees SET ${setClause} WHERE emp_id = ?`,
      values
    );

    // Log action
    await db.query(
      'INSERT INTO audit_log (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.userId, 'UPDATE_EMPLOYEE', 'employees', empId]
    );

    res.json({ success: true, message: 'Employee updated successfully' });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

// Delete employee (soft delete)
exports.deleteEmployee = async (req, res) => {
  try {
    const empId = req.params.id;

    await db.query(
      'UPDATE employees SET status = ? WHERE emp_id = ?',
      ['inactive', empId]
    );

    // Log action
    await db.query(
      'INSERT INTO audit_log (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.userId, 'DELETE_EMPLOYEE', 'employees', empId]
    );

    res.json({ success: true, message: 'Employee deleted successfully' });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};