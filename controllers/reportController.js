const db = require('../config/db');

// Get payroll summary
exports.getPayrollSummary = async (req, res) => {
  try {
    const { startMonth, endMonth } = req.query;

    let query = `
      SELECT 
        month,
        COUNT(*) as employee_count,
        SUM(gross_salary) as total_gross,
        SUM(total_deductions) as total_deductions,
        SUM(net_salary) as total_net,
        SUM(tds) as total_tds,
        SUM(pf_deduction) as total_pf
      FROM payroll
      WHERE 1=1
    `;
    const params = [];

    if (startMonth) {
      query += ' AND month >= ?';
      params.push(startMonth);
    }

    if (endMonth) {
      query += ' AND month <= ?';
      params.push(endMonth);
    }

    query += ' GROUP BY month ORDER BY month DESC';

    const [summary] = await db.query(query, params);

    res.json({ success: true, data: summary });

  } catch (error) {
    console.error('Get payroll summary error:', error);
    res.status(500).json({ error: 'Failed to fetch payroll summary' });
  }
};

// Get department-wise report
exports.getDepartmentWiseReport = async (req, res) => {
  try {
    const { month } = req.query;

    const [report] = await db.query(
      `SELECT 
        e.department,
        COUNT(DISTINCT e.emp_id) as employee_count,
        AVG(p.gross_salary) as avg_salary,
        SUM(p.gross_salary) as total_salary,
        SUM(p.total_deductions) as total_deductions,
        SUM(p.net_salary) as total_net_salary
       FROM employees e
       LEFT JOIN payroll p ON e.emp_id = p.emp_id AND p.month = ?
       WHERE e.status = 'active'
       GROUP BY e.department
       ORDER BY total_salary DESC`,
      [month || new Date().toISOString().slice(0, 7)]
    );

    res.json({ success: true, data: report });

  } catch (error) {
    console.error('Get department report error:', error);
    res.status(500).json({ error: 'Failed to fetch department report' });
  }
};

// Get attendance summary
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { month, year } = req.query;

    let query = `
      SELECT 
        e.emp_id,
        e.name,
        e.department,
        e.designation,
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) as half_days,
        SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_days,
        SUM(a.working_hours) as total_hours
      FROM employees e
      LEFT JOIN attendance a ON e.emp_id = a.emp_id
      WHERE e.status = 'active'
    `;
    const params = [];

    if (month && year) {
      query += ' AND MONTH(a.date) = ? AND YEAR(a.date) = ?';
      params.push(month, year);
    }

    query += ' GROUP BY e.emp_id ORDER BY e.name';

    const [summary] = await db.query(query, params);

    res.json({ success: true, data: summary });

  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
};

// Get leave summary
exports.getLeaveSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const [summary] = await db.query(
      `SELECT 
        e.emp_id,
        e.name,
        e.department,
        lb.casual_leave,
        lb.casual_used,
        (lb.casual_leave - lb.casual_used) as casual_remaining,
        lb.sick_leave,
        lb.sick_used,
        (lb.sick_leave - lb.sick_used) as sick_remaining,
        lb.earned_leave,
        lb.earned_used,
        (lb.earned_leave - lb.earned_used) as earned_remaining
       FROM employees e
       LEFT JOIN leave_balance lb ON e.emp_id = lb.emp_id AND lb.year = ?
       WHERE e.status = 'active'
       ORDER BY e.name`,
      [currentYear]
    );

    res.json({ success: true, data: summary });

  } catch (error) {
    console.error('Get leave summary error:', error);
    res.status(500).json({ error: 'Failed to fetch leave summary' });
  }
};

// Get tax report
exports.getTaxReport = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const [report] = await db.query(
      `SELECT 
        e.emp_id,
        e.name,
        e.pan_number,
        e.department,
        SUM(p.gross_salary) as annual_gross,
        SUM(p.tds) as annual_tds,
        SUM(p.pf_deduction) as annual_pf,
        SUM(p.professional_tax) as annual_pt
       FROM employees e
       JOIN payroll p ON e.emp_id = p.emp_id
       WHERE YEAR(STR_TO_DATE(CONCAT(p.month, '-01'), '%Y-%m-%d')) = ?
       GROUP BY e.emp_id
       ORDER BY annual_tds DESC`,
      [currentYear]
    );

    res.json({ success: true, data: report });

  } catch (error) {
    console.error('Get tax report error:', error);
    res.status(500).json({ error: 'Failed to fetch tax report' });
  }
};