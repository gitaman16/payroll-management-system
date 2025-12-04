USE payroll_db;

-- Insert admin user (password: admin123)
INSERT INTO users (username, password_hash, role) VALUES 
('admin', '$2b$10$YourBcryptHashHere', 'admin');

-- Insert sample employees
INSERT INTO employees (name, email, phone, designation, department, join_date, bank_account, ifsc_code, pan_number, status) VALUES
('John Doe', 'john.doe@company.com', '9876543210', 'Software Engineer', 'IT', '2023-01-15', '1234567890123456', 'SBIN0001234', 'ABCDE1234F', 'active'),
('Jane Smith', 'jane.smith@company.com', '9876543211', 'HR Manager', 'HR', '2022-06-01', '1234567890123457', 'HDFC0001234', 'ABCDE1235G', 'active'),
('Robert Johnson', 'robert.j@company.com', '9876543212', 'Senior Developer', 'IT', '2021-03-20', '1234567890123458', 'ICIC0001234', 'ABCDE1236H', 'active'),
('Emily Davis', 'emily.d@company.com', '9876543213', 'Marketing Executive', 'Marketing', '2023-08-10', '1234567890123459', 'AXIS0001234', 'ABCDE1237I', 'active'),
('Michael Brown', 'michael.b@company.com', '9876543214', 'Finance Manager', 'Finance', '2020-11-05', '1234567890123460', 'SBIN0001235', 'ABCDE1238J', 'active');

-- Create users for employees (password: emp123)
INSERT INTO users (username, password_hash, role, emp_id) VALUES
('john.doe', '$2b$10$YourBcryptHashHere', 'employee', 1),
('jane.smith', '$2b$10$YourBcryptHashHere', 'hr', 2),
('robert.j', '$2b$10$YourBcryptHashHere', 'employee', 3),
('emily.d', '$2b$10$YourBcryptHashHere', 'employee', 4),
('michael.b', '$2b$10$YourBcryptHashHere', 'employee', 5);

-- Insert salary structures
INSERT INTO salary_structure (emp_id, basic_salary, hra, da, ta, medical_allowance, special_allowance, pf_deduction, professional_tax, esi, effective_from) VALUES
(1, 50000, 15000, 5000, 3000, 2000, 5000, 6000, 200, 750, '2023-01-15'),
(2, 60000, 18000, 6000, 3500, 2500, 6000, 7200, 200, 900, '2022-06-01'),
(3, 70000, 21000, 7000, 4000, 3000, 7000, 8400, 200, 1050, '2021-03-20'),
(4, 45000, 13500, 4500, 2500, 1500, 4500, 5400, 200, 675, '2023-08-10'),
(5, 80000, 24000, 8000, 4500, 3500, 8000, 9600, 200, 1200, '2020-11-05');

-- Update employees with salary_id
UPDATE employees SET salary_id = 1 WHERE emp_id = 1;
UPDATE employees SET salary_id = 2 WHERE emp_id = 2;
UPDATE employees SET salary_id = 3 WHERE emp_id = 3;
UPDATE employees SET salary_id = 4 WHERE emp_id = 4;
UPDATE employees SET salary_id = 5 WHERE emp_id = 5;

-- Insert leave balance for current year
INSERT INTO leave_balance (emp_id, year, casual_leave, sick_leave, earned_leave) VALUES
(1, YEAR(CURDATE()), 12, 12, 15),
(2, YEAR(CURDATE()), 12, 12, 15),
(3, YEAR(CURDATE()), 12, 12, 15),
(4, YEAR(CURDATE()), 12, 12, 15),
(5, YEAR(CURDATE()), 12, 12, 15);

-- Insert sample attendance for current month
INSERT INTO attendance (emp_id, date, status, working_hours) VALUES
(1, CURDATE() - INTERVAL 1 DAY, 'present', 8.0),
(2, CURDATE() - INTERVAL 1 DAY, 'present', 8.0),
(3, CURDATE() - INTERVAL 1 DAY, 'present', 9.0),
(4, CURDATE() - INTERVAL 1 DAY, 'absent', 0),
(5, CURDATE() - INTERVAL 1 DAY, 'present', 8.0);