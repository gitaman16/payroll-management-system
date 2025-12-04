const db = require('../config/db');
const nodemailer = require('nodemailer');

// Get employee leaves
exports.getEmployeeLeaves = async (req, res) => {
  try {
    const empId = req.params.empId;

    const [leaves] = await db.query(
      `SELECT l.*, e.name, u.username as approved_by_name
       FROM leave_applications l
       JOIN employees e ON l.emp_id = e.emp_id
       LEFT JOIN users u ON l.approved_by = u.user_id
       WHERE l.emp_id = ?
       ORDER BY l.applied_at DESC`,
      [empId]
    );

    res.json({ success: true, data: leaves });

  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
};

// Get leave balance
exports.getLeaveBalance = async (req, res) => {
  try {
    const empId = req.params.empId;
    const year = new Date().getFullYear();

    const [balance] = await db.query(
      'SELECT * FROM leave_balance WHERE emp_id = ? AND year = ?',
      [empId, year]
    );

    if (balance.length === 0) {
      return res.status(404).json({ error: 'Leave balance not found' });
    }

    const data = balance[0];
    res.json({
      success: true,
      data: {
        casual: {
          total: data.casual_leave,
          used: data.casual_used,
          remaining: data.casual_leave - data.casual_used
        },
        sick: {
          total: data.sick_leave,
          used: data.sick_used,
          remaining: data.sick_leave - data.sick_used
        },
        earned: {
          total: data.earned_leave,
          used: data.earned_used,
          remaining: data.earned_leave - data.earned_used
        }
      }
    });

  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ error: 'Failed to fetch leave balance' });
  }
};

// Get pending leaves
exports.getPendingLeaves = async (req, res) => {
  try {
    const [leaves] = await db.query(
      `SELECT l.*, e.name, e.designation, e.department
       FROM leave_applications l
       JOIN employees e ON l.emp_id = e.emp_id
       WHERE l.status = 'pending'
       ORDER BY l.applied_at DESC`
    );

    res.json({ success: true, data: leaves });

  } catch (error) {
    console.error('Get pending leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch pending leaves' });
  }
};

// Apply leave
exports.applyLeave = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { emp_id, leave_type, from_date, to_date, reason } = req.body;

    // Calculate total days
    const fromDate = new Date(from_date);
    const toDate = new Date(to_date);
    const totalDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance
    const year = new Date().getFullYear();
    const [balance] = await connection.query(
      'SELECT * FROM leave_balance WHERE emp_id = ? AND year = ?',
      [emp_id, year]
    );

    if (balance.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Leave balance not found' });
    }

    const leaveBalance = balance[0];
    let available = 0;

    switch (leave_type) {
      case 'casual':
        available = leaveBalance.casual_leave - leaveBalance.casual_used;
        break;
      case 'sick':
        available = leaveBalance.sick_leave - leaveBalance.sick_used;
        break;
      case 'earned':
        available = leaveBalance.earned_leave - leaveBalance.earned_used;
        break;
    }

    if (leave_type !== 'unpaid' && totalDays > available) {
      await connection.rollback();
      return res.status(400).json({ 
        error: `Insufficient leave balance. Available: ${available} days` 
      });
    }

    // Insert leave application
    const [result] = await connection.query(
      `INSERT INTO leave_applications 
       (emp_id, leave_type, from_date, to_date, total_days, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [emp_id, leave_type, from_date, to_date, totalDays, reason]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      leaveId: result.insertId
    });

  } catch (error) {
    await connection.rollback();
    console.error('Apply leave error:', error);
    res.status(500).json({ error: 'Failed to apply leave' });
  } finally {
    connection.release();
  }
};

// Approve leave
exports.approveLeave = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const leaveId = req.params.leaveId;
    const { comments } = req.body;

    // Get leave details
    const [leaves] = await connection.query(
      'SELECT * FROM leave_applications WHERE leave_id = ?',
      [leaveId]
    );

    if (leaves.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Leave application not found' });
    }

    const leave = leaves[0];

    // Update leave status
    await connection.query(
      `UPDATE leave_applications 
       SET status = 'approved', approved_by = ?, approval_date = CURDATE(), comments = ?
       WHERE leave_id = ?`,
      [req.user.userId, comments, leaveId]
    );

    // Update leave balance
    if (leave.leave_type !== 'unpaid') {
      const field = `${leave.leave_type}_used`;
      await connection.query(
        `UPDATE leave_balance 
         SET ${field} = ${field} + ?
         WHERE emp_id = ? AND year = ?`,
        [leave.total_days, leave.emp_id, new Date().getFullYear()]
      );
    }

    // Mark attendance for leave days
    const fromDate = new Date(leave.from_date);
    const toDate = new Date(leave.to_date);

    for (let d = fromDate; d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      await connection.query(
        `INSERT INTO attendance (emp_id, date, status, working_hours, marked_by)
         VALUES (?, ?, 'leave', 0, ?)
         ON DUPLICATE KEY UPDATE status = 'leave', working_hours = 0`,
        [leave.emp_id, dateStr, req.user.userId]
      );
    }

    await connection.commit();

    // Send email notification
    // (Email code here - see emailService.js)

    res.json({ success: true, message: 'Leave approved successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Approve leave error:', error);
    res.status(500).json({ error: 'Failed to approve leave' });
  } finally {
    connection.release();
  }
};

// Reject leave
exports.rejectLeave = async (req, res) => {
  try {
    const leaveId = req.params.leaveId;
    const { comments } = req.body;

    await db.query(
      `UPDATE leave_applications 
       SET status = 'rejected', approved_by = ?, approval_date = CURDATE(), comments = ?
       WHERE leave_id = ?`,
      [req.user.userId, comments, leaveId]
    );

    res.json({ success: true, message: 'Leave rejected successfully' });

  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ error: 'Failed to reject leave' });
  }
};