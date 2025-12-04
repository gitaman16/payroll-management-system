-- Create database
CREATE DATABASE IF NOT EXISTS payroll_db;
USE payroll_db;

-- Users table
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'hr', 'employee') NOT NULL,
  emp_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE employees (
  emp_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(15),
  designation VARCHAR(50),
  department VARCHAR(50),
  join_date DATE,
  bank_account VARCHAR(20),
  ifsc_code VARCHAR(11),
  pan_number VARCHAR(10),
  salary_id INT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Salary structure table
CREATE TABLE salary_structure (
  salary_id INT PRIMARY KEY AUTO_INCREMENT,
  emp_id INT NOT NULL,
  basic_salary DECIMAL(10,2) NOT NULL,
  hra DECIMAL(10,2) DEFAULT 0,
  da DECIMAL(10,2) DEFAULT 0,
  ta DECIMAL(10,2) DEFAULT 0,
  medical_allowance DECIMAL(10,2) DEFAULT 0,
  special_allowance DECIMAL(10,2) DEFAULT 0,
  pf_deduction DECIMAL(10,2) DEFAULT 0,
  professional_tax DECIMAL(10,2) DEFAULT 0,
  esi DECIMAL(10,2) DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE
);

-- Attendance table
CREATE TABLE attendance (
  att_id INT PRIMARY KEY AUTO_INCREMENT,
  emp_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('present', 'absent', 'half_day', 'leave', 'holiday') NOT NULL,
  working_hours DECIMAL(4,2) DEFAULT 8.0,
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  remarks TEXT,
  marked_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(user_id),
  UNIQUE KEY unique_attendance (emp_id, date)
);

-- Leave applications table
CREATE TABLE leave_applications (
  leave_id INT PRIMARY KEY AUTO_INCREMENT,
  emp_id INT NOT NULL,
  leave_type ENUM('casual', 'sick', 'earned', 'unpaid') NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_days INT NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT,
  approval_date DATE,
  comments TEXT,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

-- Leave balance table
CREATE TABLE leave_balance (
  balance_id INT PRIMARY KEY AUTO_INCREMENT,
  emp_id INT NOT NULL,
  year INT NOT NULL,
  casual_leave INT DEFAULT 12,
  sick_leave INT DEFAULT 12,
  earned_leave INT DEFAULT 15,
  casual_used INT DEFAULT 0,
  sick_used INT DEFAULT 0,
  earned_used INT DEFAULT 0,
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE,
  UNIQUE KEY unique_balance (emp_id, year)
);

-- Payroll table
CREATE TABLE payroll (
  payroll_id INT PRIMARY KEY AUTO_INCREMENT,
  emp_id INT NOT NULL,
  month VARCHAR(7) NOT NULL,
  basic_salary DECIMAL(10,2),
  hra DECIMAL(10,2) DEFAULT 0,
  da DECIMAL(10,2) DEFAULT 0,
  ta DECIMAL(10,2) DEFAULT 0,
  medical_allowance DECIMAL(10,2) DEFAULT 0,
  special_allowance DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  total_allowances DECIMAL(10,2),
  gross_salary DECIMAL(10,2),
  pf_deduction DECIMAL(10,2) DEFAULT 0,
  professional_tax DECIMAL(10,2) DEFAULT 0,
  esi DECIMAL(10,2) DEFAULT 0,
  tds DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  total_deductions DECIMAL(10,2),
  net_salary DECIMAL(10,2),
  days_present INT DEFAULT 0,
  days_absent INT DEFAULT 0,
  days_half INT DEFAULT 0,
  days_leave INT DEFAULT 0,
  working_days INT DEFAULT 30,
  processed_by INT,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payslip_path VARCHAR(255),
  payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
  payment_date DATE,
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(user_id),
  UNIQUE KEY unique_payroll (emp_id, month)
);

-- Audit log table
CREATE TABLE audit_log (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id INT,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_emp_status ON employees(status);
CREATE INDEX idx_emp_department ON employees(department);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_emp ON attendance(emp_id, date);
CREATE INDEX idx_leave_status ON leave_applications(status);
CREATE INDEX idx_payroll_month ON payroll(month);
CREATE INDEX idx_payroll_emp ON payroll(emp_id, month);