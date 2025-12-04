// Check authentication
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
  window.location.href = 'login.html';
}

// Set user info
document.getElementById('userName').textContent = user.name || user.username;
document.getElementById('userRole').textContent = `(${user.role})`;

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
});

// Fetch dashboard data
async function fetchDashboardData() {
  try {
    // Fetch employees count
    const empResponse = await fetch('/api/employees', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const empData = await empResponse.json();
    document.getElementById('totalEmployees').textContent = empData.data.length;
    
    // Fetch current month payroll
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payrollResponse = await fetch(`/api/payroll/month/${currentMonth}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (payrollResponse.ok) {
      const payrollData = await payrollResponse.json();
      document.getElementById('monthlyPayroll').textContent = 
        `₹${payrollData.summary.totalNetSalary.toLocaleString()}`;
    }
    
    // Fetch pending leaves
    const leaveResponse = await fetch('/api/leave/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (leaveResponse.ok) {
      const leaveData = await leaveResponse.json();
      document.getElementById('pendingLeaves').textContent = leaveData.data.length;
    }
    
    // Fetch today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attResponse = await fetch(`/api/attendance/date/${today}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (attResponse.ok) {
      const attData = await attResponse.json();
      const presentCount = attData.data.filter(a => a.status === 'present').length;
      document.getElementById('presentToday').textContent = presentCount;
    }
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  }
}

// Initialize charts
function initializeCharts() {
  // Payroll Trend Chart
  const payrollCtx = document.getElementById('payrollChart').getContext('2d');
  new Chart(payrollCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Monthly Payroll',
        data: [450000, 480000, 470000, 500000, 520000, 510000],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
  
  // Department Chart
  const deptCtx = document.getElementById('departmentChart').getContext('2d');
  new Chart(deptCtx, {
    type: 'pie',
    data: {
      labels: ['IT', 'HR', 'Finance', 'Marketing', 'Sales'],
      datasets: [{
        data: [30, 10, 15, 20, 25],
        backgroundColor: [
          '#667eea',
          '#764ba2',
          '#f093fb',
          '#4facfe',
          '#43e97b'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Load dashboard
fetchDashboardData();
initializeCharts();