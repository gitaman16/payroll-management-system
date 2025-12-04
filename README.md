# Payroll Management System

A full-stack web application designed to automate payroll activities including employee management, attendance tracking, salary calculation, payroll processing, and payslip generation. It provides secure, role-based access for Admin, HR Managers, and Employees.

---

## Table of Contents

* [Overview](#overview)
* [Features](#features)
* [Technology Stack](#technology-stack)
* [Architecture](#architecture)
* [Installation](#installation)
* [Running the Application](#running-the-application)
* [Default Credentials](#default-credentials)
* [Project Modules](#project-modules)
* [Screenshots](#screenshots)

---

## Overview

The system streamlines payroll operations by automating salary calculations with allowances and deductions, integrating attendance records, processing taxes, and generating downloadable PDF payslips. It reduces manual effort and improves accuracy, transparency, and operational efficiency.

---

## Features

* Secure user login and JWT authentication
* Role-based access (Admin / HR / Employee)
* Employee creation, editing, deletion, and search
* Salary structure configuration with allowances and deductions
* Attendance and leave management workflow
* Automated payroll processing with tax calculation
* PDF payslip generation and email delivery
* Interactive dashboards and analytical reports

---

## Technology Stack

| Category       | Technology                                          |
| -------------- | --------------------------------------------------- |
| Frontend       | HTML5, CSS3, JavaScript, Chart.js                   |
| Backend        | Node.js, Express.js                                 |
| Processing     | Python (Tax Engine), C++ (Batch Salary Calculation) |
| Database       | MySQL / PostgreSQL                                  |
| Authentication | JWT, bcrypt                                         |
| Tools          | Git, VS Code, Postman, MySQL Workbench              |

---

## Architecture

Layered MVC architecture with modular service components supporting scalability and maintainability.

---

## Installation

Clone the repository:

```bash
git clone https://github.com/gitaman16/payroll-management-system.git
cd payroll-management-system
```

Install dependencies:

```bash
npm install
pip install -r requirements.txt
```

Database Setup:

```sql
CREATE DATABASE payroll_db;
USE payroll_db;
SOURCE database/schema.sql;
```

Create the `.env` file in the root directory with the following content:

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=payroll_db
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
```

---

## Running the Application

```bash
npm start
```

Open in your browser:

```
http://localhost:3000
```

---

## Default Credentials

| Role       | Username | Password |
| ---------- | -------- | -------- |
| Admin      | admin    | admin123 |
| HR Manager | hr001    | hr123    |
| Employee   | emp001   | emp123   |

---

## Project Modules

* **Authentication and Authorization**
* **Employee Management**
* **Salary Structure and Calculation Engine**
* **Attendance and Leave Tracking**
* **Payroll Processing and Batch Computation**
* **Payslip Generation (PDF + Email)**
* **Dashboard and Financial Reporting**

---

## Screenshots

![Dashboard](screenshots/dashboard.png)

![Employee List](screenshots/employee_lists.png)



---

