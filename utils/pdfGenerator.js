const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generatePayslip(data) {
  return new Promise((resolve, reject) => {
    try {
      // Create payslips directory if it doesn't exist
      const payslipsDir = path.join(__dirname, '../payslips');
      if (!fs.existsSync(payslipsDir)) {
        fs.mkdirSync(payslipsDir, { recursive: true });
      }

      const filename = `payslip_${data.emp_id}_${data.month}.pdf`;
      const filepath = path.join(payslipsDir, filename);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('PAYSLIP', { align: 'center' })
         .moveDown();

      // Company info
      doc.fontSize(10)
         .font('Helvetica')
         .text('ABC Corporation Pvt. Ltd.', { align: 'center' })
         .text('123 Business Park, City - 400001', { align: 'center' })
         .moveDown(2);

      // Employee info
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Employee Information', { underline: true })
         .moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Employee ID: ${data.emp_id}`)
         .text(`Name: ${data.name}`)
         .text(`Designation: ${data.designation || 'N/A'}`)
         .text(`Department: ${data.department || 'N/A'}`)
         .text(`Month: ${data.month}`)
         .text(`Bank Account: ${data.bank_account || 'N/A'}`)
         .text(`PAN: ${data.pan_number || 'N/A'}`)
         .moveDown(2);

      // Attendance summary
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Attendance Summary', { underline: true })
         .moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Working Days: ${data.working_days || 30}`)
         .text(`Days Present: ${data.days_present || 0}`)
         .text(`Days Absent: ${data.days_absent || 0}`)
         .text(`Half Days: ${data.days_half || 0}`)
         .text(`Leave Days: ${data.days_leave || 0}`)
         .moveDown(2);

      // Earnings
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Earnings', { underline: true })
         .moveDown(0.5);

      const earnings = [
        ['Basic Salary', parseFloat(data.basicSalary || 0).toFixed(2)],
        ['HRA', parseFloat(data.hra || 0).toFixed(2)],
        ['DA', parseFloat(data.da || 0).toFixed(2)],
        ['TA', parseFloat(data.ta || 0).toFixed(2)],
        ['Medical Allowance', parseFloat(data.medicalAllowance || 0).toFixed(2)],
        ['Special Allowance', parseFloat(data.specialAllowance || 0).toFixed(2)],
        ['Overtime Pay', parseFloat(data.overtimePay || 0).toFixed(2)]
      ];

      doc.fontSize(10).font('Helvetica');
      earnings.forEach(([label, amount]) => {
        doc.text(`${label}:`, 50, doc.y, { continued: true })
           .text(`₹${amount}`, { align: 'right' });
      });

      doc.moveDown()
         .font('Helvetica-Bold')
         .text('Total Earnings:', 50, doc.y, { continued: true })
         .text(`₹${parseFloat(data.grossSalary || 0).toFixed(2)}`, { align: 'right' })
         .moveDown(2);

      // Deductions
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Deductions', { underline: true })
         .moveDown(0.5);

      const deductions = [
        ['PF Deduction', parseFloat(data.pfDeduction || 0).toFixed(2)],
        ['Professional Tax', parseFloat(data.professionalTax || 0).toFixed(2)],
        ['ESI', parseFloat(data.esi || 0).toFixed(2)],
        ['TDS', parseFloat(data.tds || 0).toFixed(2)]
      ];

      doc.fontSize(10).font('Helvetica');
      deductions.forEach(([label, amount]) => {
        doc.text(`${label}:`, 50, doc.y, { continued: true })
           .text(`₹${amount}`, { align: 'right' });
      });

      doc.moveDown()
         .font('Helvetica-Bold')
         .text('Total Deductions:', 50, doc.y, { continued: true })
         .text(`₹${parseFloat(data.totalDeductions || 0).toFixed(2)}`, { align: 'right' })
         .moveDown(2);

      // Net Salary
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('green')
         .text('NET SALARY:', 50, doc.y, { continued: true })
         .text(`₹${parseFloat(data.netSalary || 0).toFixed(2)}`, { align: 'right' })
         .fillColor('black')
         .moveDown(3);

      // Footer
      doc.fontSize(8)
         .font('Helvetica')
         .text('This is a computer-generated payslip and does not require a signature.', { align: 'center' })
         .moveDown()
         .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generatePayslip };