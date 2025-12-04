const db = require('../config/db');
const { generatePayslip } = require('../utils/pdfGenerator');
const { sendPayslipEmail } = require('../utils/emailService');
const { spawn } = require('child_process');
const path = require('path');

// Get payroll by month
exports.getPayrollByMonth = async (req, res) => {
  try {
    const { month } = req.params;

    const [payroll] = await db.query(
      `SELECT p.*, e.name, e.designation, e.department, e.email
       FROM payroll p
       JOIN employees e ON p.emp_id = e.emp_id
       WHERE p.month = ?
       ORDER BY e.name`,
      [month]
    );

    // Calculate summary
    const summary = {
      totalEmployees: payroll.length,
      totalGrossSalary: payroll.reduce((sum, p) => sum + parseFloat(p.gross_salary || 0), 0),
      totalDeductions: payroll.reduce((sum, p) => sum + parseFloat(p.total_deductions || 0), 0),
      totalNetSalary: payroll.reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0),
      totalTDS: payroll.reduce((sum, p) => sum + parseFloat(p.tds || 0), 0)
    };

    res.json({ success: true, data: payroll, summary });

  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
};

// Get employee payroll
exports.getEmployeePayroll = async (req, res) => {
  try {
    const { empId } = req.params;
    const { year, limit } = req.query;

    let query = `
      SELECT p.*, e.name, e.designation 
      FROM payroll p
      JOIN employees e ON p.emp_id = e.emp_id
      WHERE p.emp_id = ?
    `;
    const params = [empId];

    if (year) {
      query += ' AND YEAR(STR_TO_DATE(CONCAT(p.month, "-01"), "%Y-%m-%d")) = ?';
      params.push(year);
    }

    query += ' ORDER BY p.month DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const [payroll] = await db.query(query, params);

    res.json({ success: true, data: payroll });

  } catch (error) {
    console.error('Get employee payroll error:', error);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
};

// Get payslip
exports.getPayslip = async (req, res) => {
  try {
    const payrollId = req.params.payrollId;

    const [payroll] = await db.query(
      `SELECT p.*, e.* 
       FROM payroll p
       JOIN employees e ON p.emp_id = e.emp_id
       WHERE p.payroll_id = ?`,
      [payrollId]
    );

    if (payroll.length === 0) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    res.json({ success: true, data: payroll[0] });

  } catch (error) {
    console.error('Get payslip error:', error);
    res.status(500).json({ error: 'Failed to fetch payslip' });
  }
};

// Process payroll
exports.processPayroll = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { month, employeeIds } = req.body; // month format: YYYY-MM

    // Get active employees
    let query = 'SELECT * FROM employees WHERE status = "active"';
    const params = [];

    if (employeeIds && employeeIds.length > 0) {
      query += ' AND emp_id IN (?)';
      params.push(employeeIds);
    }

    const [employees] = await connection.query(query, params);

    const results = [];

    for (const employee of employees) {
      try {
        // Get salary structure
        const [salary] = await connection.query(
          `SELECT * FROM salary_structure 
           WHERE emp_id = ? AND effective_from <= LAST_DAY(?)
           AND (effective_to IS NULL OR effective_to >= LAST_DAY(?))
           ORDER BY effective_from DESC LIMIT 1`,
          [employee.emp_id, month + '-01', month + '-01']
        );

        if (salary.length === 0) {
          results.push({
            emp_id: employee.emp_id,
            name: employee.name,
            status: 'skipped',
            message: 'No salary structure found'
          });
          continue;
        }

        const salaryData = salary[0];

        // Get attendance for the month
        const [attendance] = await connection.query(
          `SELECT 
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as days_present,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as days_absent,
            SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as days_half,
            SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as days_leave,
            SUM(overtime_hours) as total_overtime
           FROM attendance
           WHERE emp_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
          [employee.emp_id, month]
        );

        const attData = attendance[0];
        const daysPresent = parseInt(attData.days_present || 0);
        const daysAbsent = parseInt(attData.days_absent || 0);
        const daysHalf = parseInt(attData.days_half || 0);
        const daysLeave = parseInt(attData.days_leave || 0);
        const overtimeHours = parseFloat(attData.total_overtime || 0);

        // Calculate working days (assuming 30 days per month)
        const workingDays = 30;
        const effectiveDays = daysPresent + daysLeave + (daysHalf * 0.5);

        // Calculate basic salary (pro-rated)
        const basicSalary = (parseFloat(salaryData.basic_salary) / workingDays) * effectiveDays;

        // Calculate allowances
        const hra = (parseFloat(salaryData.hra || 0) / workingDays) * effectiveDays;
        const da = (parseFloat(salaryData.da || 0) / workingDays) * effectiveDays;
        const ta = (parseFloat(salaryData.ta || 0) / workingDays) * effectiveDays;
        const medicalAllowance = (parseFloat(salaryData.medical_allowance || 0) / workingDays) * effectiveDays;
        const specialAllowance = (parseFloat(salaryData.special_allowance || 0) / workingDays) * effectiveDays;

        // Calculate overtime pay (assuming 1.5x hourly rate)
        const hourlyRate = parseFloat(salaryData.basic_salary) / (workingDays * 8);
        const overtimePay = overtimeHours * hourlyRate * 1.5;

        // Calculate total allowances
        const totalAllowances = hra + da + ta + medicalAllowance + specialAllowance + overtimePay;

        // Calculate gross salary
        const grossSalary = basicSalary + totalAllowances;

        // Calculate deductions
        const pfDeduction = parseFloat(salaryData.pf_deduction || 0);
        const professionalTax = parseFloat(salaryData.professional_tax || 0);
        const esi = parseFloat(salaryData.esi || 0);

        // Calculate TDS using Python script
        let tds = 0;
        try {
          const annualIncome = grossSalary * 12;
          tds = await calculateTDS(annualIncome);
          tds = tds / 12; // Monthly TDS
        } catch (error) {
          console.error('TDS calculation error:', error);
        }

        // Calculate total deductions
        const totalDeductions = pfDeduction + professionalTax + esi + tds;

        // Calculate net salary
        const netSalary = grossSalary - totalDeductions;

        // Check if payroll already exists
        const [existing] = await connection.query(
          'SELECT payroll_id FROM payroll WHERE emp_id = ? AND month = ?',
          [employee.emp_id, month]
        );

        let payrollId;

        if (existing.length > 0) {
          // Update existing payroll
          payrollId = existing[0].payroll_id;
          await connection.query(
            `UPDATE payroll SET
             basic_salary = ?, hra = ?, da = ?, ta = ?, 
             medical_allowance = ?, special_allowance = ?, overtime_pay = ?,
             total_allowances = ?, gross_salary = ?,
             pf_deduction = ?, professional_tax = ?, esi = ?, tds = ?,
             total_deductions = ?, net_salary = ?,
             days_present = ?, days_absent = ?, days_half = ?, days_leave = ?,
             working_days = ?, processed_by = ?, processed_at = NOW()
             WHERE payroll_id = ?`,
            [
              basicSalary, hra, da, ta, medicalAllowance, specialAllowance, overtimePay,
              totalAllowances, grossSalary,
              pfDeduction, professionalTax, esi, tds,
              totalDeductions, netSalary,
              daysPresent, daysAbsent, daysHalf, daysLeave,
              workingDays, req.user.userId, payrollId
            ]
          );
        } else {
          // Insert new payroll
          const [result] = await connection.query(
            `INSERT INTO payroll (
              emp_id, month, basic_salary, hra, da, ta, 
              medical_allowance, special_allowance, overtime_pay,
              total_allowances, gross_salary,
              pf_deduction, professional_tax, esi, tds,
              total_deductions, net_salary,
              days_present, days_absent, days_half, days_leave,
              working_days, processed_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              employee.emp_id, month, basicSalary, hra, da, ta,
              medicalAllowance, specialAllowance, overtimePay,
              totalAllowances, grossSalary,
              pfDeduction, professionalTax, esi, tds,
              totalDeductions, netSalary,
              daysPresent, daysAbsent, daysHalf, daysLeave,
              workingDays, req.user.userId
            ]
          );
          payrollId = result.insertId;
        }

        // Generate payslip PDF
        try {
          const payslipPath = await generatePayslip({
            ...employee,
            payrollId,
            month,
            basicSalary,
            hra, da, ta, medicalAllowance, specialAllowance, overtimePay,
            totalAllowances, grossSalary,
            pfDeduction, professionalTax, esi, tds,
            totalDeductions, netSalary,
            daysPresent, daysAbsent, daysHalf, daysLeave, workingDays
          });

          // Update payslip path
          await connection.query(
            'UPDATE payroll SET payslip_path = ? WHERE payroll_id = ?',
            [payslipPath, payrollId]
          );

          // Send email
          if (employee.email) {
            await sendPayslipEmail(employee.email, employee.name, month, payslipPath);
          }
        } catch (error) {
          console.error('Payslip generation error:', error);
        }

        results.push({
          emp_id: employee.emp_id,
          name: employee.name,
          status: 'success',
          payrollId,
          netSalary: netSalary.toFixed(2)
        });

      } catch (error) {
        console.error(`Error processing payroll for ${employee.name}:`, error);
        results.push({
          emp_id: employee.emp_id,
          name: employee.name,
          status: 'error',
          message: error.message
        });
      }
    }

    await connection.commit();

    // Log action
    await db.query(
      'INSERT INTO audit_log (user_id, action, table_name) VALUES (?, ?, ?)',
      [req.user.userId, 'PROCESS_PAYROLL', 'payroll']
    );

    res.json({
      success: true,
      message: `Payroll processed for ${results.filter(r => r.status === 'success').length} employees`,
      results
    });

  } catch (error) {
    await connection.rollback();
    console.error('Process payroll error:', error);
    res.status(500).json({ error: 'Failed to process payroll' });
  } finally {
    connection.release();
  }
};

// Regenerate payslip
exports.regeneratePayslip = async (req, res) => {
  try {
    const payrollId = req.params.payrollId;

    // Get payroll data
    const [payroll] = await db.query(
      `SELECT p.*, e.* 
       FROM payroll p
       JOIN employees e ON p.emp_id = e.emp_id
       WHERE p.payroll_id = ?`,
      [payrollId]
    );

    if (payroll.length === 0) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    const data = payroll[0];

    // Generate payslip
    const payslipPath = await generatePayslip(data);

    // Update path
    await db.query(
      'UPDATE payroll SET payslip_path = ? WHERE payroll_id = ?',
      [payslipPath, payrollId]
    );

    // Send email
    if (data.email) {
      await sendPayslipEmail(data.email, data.name, data.month, payslipPath);
    }

    res.json({
      success: true,
      message: 'Payslip regenerated successfully',
      payslipPath
    });

  } catch (error) {
    console.error('Regenerate payslip error:', error);
    res.status(500).json({ error: 'Failed to regenerate payslip' });
  }
};

// Helper function to calculate TDS using Python
function calculateTDS(annualIncome) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../utils/taxCalculator.py');
    const python = spawn('python3', [pythonScript, annualIncome.toString()]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(error || 'Python script failed'));
      } else {
        try {
          const tds = parseFloat(result.trim());
          resolve(tds);
        } catch (err) {
          reject(new Error('Invalid TDS calculation result'));
        }
      }
    });
  });
}