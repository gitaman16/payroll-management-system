const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
  window.location.href = 'login.html';
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
});

// Modal handling
const modal = document.getElementById('employeeModal');
const addBtn = document.getElementById('addEmployeeBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');

addBtn.addEventListener('click', () => {
  document.getElementById('modalTitle').textContent = 'Add New Employee';
  document.getElementById('employeeForm').reset();
  modal.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

cancelBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Fetch and display employees
async function fetchEmployees() {
  try {
    const search = document.getElementById('searchInput').value;
    const department = document.getElementById('departmentFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    let url = '/api/employees?';
    if (search) url += `search=${search}&`;
    if (department) url += `department=${department}&`;
    if (status) url += `status=${status}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    const tbody = document.querySelector('#employeeTable tbody');
    tbody.innerHTML = '';
    
    if (data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employees found</td></tr>';
      return;
    }
    
    data.data.forEach(emp => {
      const row = `
        <tr>
          <td>${emp.emp_id}</td>
          <td>${emp.name}</td>
          <td>${emp.email}</td>
          <td>${emp.designation || 'N/A'}</td>
          <td>${emp.department || 'N/A'}</td>
          <td>${emp.join_date ? new Date(emp.join_date).toLocaleDateString() : 'N/A'}</td>
          <td><span class="status-${emp.status}">${emp.status}</span></td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-warning" onclick="viewEmployee(${emp.emp_id})">View</button>
              <button class="btn btn-danger" onclick="deleteEmployee(${emp.emp_id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
    
  } catch (error) {
    console.error('Error fetching employees:', error);
  }
}

// Add employee
document.getElementById('employeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    designation: document.getElementById('designation').value,
    department: document.getElementById('department').value,
    join_date: document.getElementById('join_date').value,
    bank_account: document.getElementById('bank_account').value,
    ifsc_code: document.getElementById('ifsc_code').value,
    pan_number: document.getElementById('pan_number').value
  };
  
  try {
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Employee added successfully!\n\nLogin Credentials:\nUsername: ' + data.credentials.username + '\nPassword: ' + data.credentials.password);
      modal.style.display = 'none';
      fetchEmployees();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error adding employee:', error);
    alert('Failed to add employee');
  }
});

// View employee
function viewEmployee(empId) {
  window.location.href = `salary.html?empId=${empId}`;
}

// Delete employee
async function deleteEmployee(empId) {
  if (!confirm('Are you sure you want to delete this employee?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/employees/${empId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      alert('Employee deleted successfully');
      fetchEmployees();
    } else {
      alert('Failed to delete employee');
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
  }
}

// Filters
document.getElementById('searchInput').addEventListener('input', fetchEmployees);
document.getElementById('departmentFilter').addEventListener('change', fetchEmployees);
document.getElementById('statusFilter').addEventListener('change', fetchEmployees);

// Initial load
fetchEmployees();