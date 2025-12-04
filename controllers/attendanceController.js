const db = require('../config/db');

// Get employee attendance
exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { empId } = req.params;
    const { month, year } = req.query;

    let query = `
      SELECT a.*, e.name 
      FROM attendance a
      JOIN employees e ON a.emp_id = e.emp_id
      WHERE a.emp_id = ?
    `;
    const params = [empId];

    if (month && year) {
      query += ' AND MONTH(a.date) = ? AND YEAR(a.date) = ?';
      params.push(month, year);
    }

    query += ' ORDER BY a.date DESC';

    const [attendance] = await db.query(query, params);

    // Calculate summary
    const summary = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      half_day: attendance.filter(a => a.status === 'half_day').length,
      leave: attendance.filter(a => a.status === 'leave').length,
      totalHours: attendance.reduce((sum, a) => sum + parseFloat(a.working_hours || 0), 0)
    };

    res.json({ success: true, data: attendance, summary });

  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// Get attendance by date
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;

    const [attendance] = await db.query(
      `SELECT a.*, e.name, e.designation, e.department 
       FROM attendance a
       JOIN employees e ON a.emp_id = e.emp_id
       WHERE a.date = ?
       ORDER BY e.name`,
      [date]
    );

    res.json({ success: true, data: attendance });

  } catch (error) {
    console.error('Get attendance by date error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// Mark attendance
exports.markAttendance = async (req, res) => {
  try {
    const { emp_id, date, status, working_hours, overtime_hours, remarks } = req.body;

    // Check if attendance already exists
    const [existing] = await db.query(
      'SELECT att_id FROM attendance WHERE emp_id = ? AND date = ?',
      [emp_id, date]
    );

    if (existing.length > 0) {
      // Update existing attendance
      await db.query(
        `UPDATE attendance 
         SET status = ?, working_hours = ?, overtime_hours = ?, remarks = ?, marked_by = ?
         WHERE emp_id = ? AND date = ?`,
        [status, working_hours || 8.0, overtime_hours || 0, remarks, req.user.userId, emp_id, date]
      );

      return res.json({ success: true, message: 'Attendance updated successfully' });
    }

    // Insert new attendance
    await db.query(
      `INSERT INTO attendance (emp_id, date, status, working_hours, overtime_hours, remarks, marked_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [emp_id, date, status, working_hours || 8.0, overtime_hours || 0, remarks, req.user.userId]
    );

    // Log action
    await db.query(
      'INSERT INTO audit_log (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.userId, 'MARK_ATTENDANCE', 'attendance', emp_id]
    );

    res.status(201).json({ success: true, message: 'Attendance marked successfully' });

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

// Bulk mark attendance
exports.bulkMarkAttendance = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { date, attendanceRecords } = req.body;

    for (const record of attendanceRecords) {
      const { emp_id, status, working_hours, overtime_hours } = record;

      // Check if exists
      const [existing] = await connection.query(
        'SELECT att_id FROM attendance WHERE emp_id = ? AND date = ?',
        [emp_id, date]
      );

      if (existing.length > 0) {
        // Update
        await connection.query(
          `UPDATE attendance 
           SET status = ?, working_hours = ?, overtime_hours = ?, marked_by = ?
           WHERE emp_id = ? AND date = ?`,
          [status, working_hours || 8.0, overtime_hours || 0, req.user.userId, emp_id, date]
        );
      } else {
        // Insert
        await connection.query(
          `INSERT INTO attendance (emp_id, date, status, working_hours, overtime_hours, marked_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [emp_id, date, status, working_hours || 8.0, overtime_hours || 0, req.user.userId]
        );
      }
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: `Attendance marked for ${attendanceRecords.length} employees` 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Bulk attendance error:', error);
    res.status(500).json({ error: 'Failed to mark bulk attendance' });
  } finally {
    connection.release();
  }
};

// Update attendance
exports.updateAttendance = async (req, res) => {
  try {
    const attId = req.params.attId;
    const { status, working_hours, overtime_hours, remarks } = req.body;

    await db.query(
      `UPDATE attendance 
       SET status = ?, working_hours = ?, overtime_hours = ?, remarks = ?
       WHERE att_id = ?`,
      [status, working_hours, overtime_hours, remarks, attId]
    );

    res.json({ success: true, message: 'Attendance updated successfully' });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
};