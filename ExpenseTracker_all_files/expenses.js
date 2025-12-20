// Load Chart.js
document.head.appendChild(Object.assign(document.createElement('script'), {
    src: 'https://cdn.jsdelivr.net/npm/chart.js'
}));

let expensesTable;
let pieChart;

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Remove any existing event listeners first
    const form = document.getElementById('expense-form');
    if (form) {
        form.removeEventListener('submit', handleExpenseSubmission);
        form.addEventListener('submit', handleExpenseSubmission);
    }

    // Remove any existing event listeners for filter
    const filterSelect = document.getElementById('filter-category');
    if (filterSelect) {
        filterSelect.removeEventListener('change', filterExpenses);
        filterSelect.addEventListener('change', filterExpenses);
    }

    // Load expenses only once
    if (document.getElementById('expense-list')) {
        await loadAndDisplayExpenses();
    }
});

// Handle expense form submission
async function handleExpenseSubmission(e) {
    e.preventDefault();

    const expense = {
        name: document.getElementById('expense-name').value.trim(),
        amount: parseFloat(document.getElementById('expense-amount').value),
        category: document.getElementById('expense-category').value,
        date: document.getElementById('expense-date').value
    };

    try {
        // Check if a similar expense already exists
        const existingExpenses = await getExpenses();
        const isDuplicate = existingExpenses.some(existing => 
            existing.name === expense.name 
            
        );

        if (isDuplicate) {
            alert('This expense has  been added!');
            return;
        }

        await addExpense(expense);
        await loadAndDisplayExpenses(); // Refresh the display
        e.target.reset();
        
        // Reset date to today
        if (document.getElementById('expense-date')) {
            document.getElementById('expense-date').valueAsDate = new Date();
        }
        
    } catch (error) {
        alert('Error adding expense: ' + error);
    }
}

// Load and display expenses
async function loadAndDisplayExpenses() {
    try {
        const expenses = await getExpenses();
        displayExpensesTable(expenses);
        updatePieChart(expenses);
    } catch (error) {
        alert('Error loading expenses: ' + error);
    }
}

// Display expenses in table
function displayExpensesTable(expenses) {
    const tbody = document.getElementById('expense-list');
    const totalSpan = document.getElementById('total-amount');
    let total = 0;

    // Ensure tbody exists
    if (!tbody) return;

    // Clear existing content
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }

    // Sort expenses by date (newest first) and ensure no duplicates
    const uniqueExpenses = expenses.reduce((acc, current) => {
        const exists = acc.find(item => item.id === current.id);
        if (!exists) {
            acc.push(current);
        }
        return acc;
    }, []).sort((a, b) => new Date(b.date) - new Date(a.date));

    uniqueExpenses.forEach(expense => {
        total += expense.amount;
        const row = document.createElement('tr');
        row.dataset.expenseId = expense.id; // Add data attribute for easier reference
        row.innerHTML = `
            <td>${expense.name}</td>
            <td>$${expense.amount.toFixed(2)}</td>
            <td>${expense.category}</td>
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td>
                <button class="delete-btn" onclick="handleDelete(${expense.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (totalSpan) {
        totalSpan.textContent = total.toFixed(2);
    }
}

// Handle delete button click
async function handleDelete(expenseId) {
    if (confirm('Are you sure you want to delete this expense?')) {
        try {
            await deleteExpense(expenseId);
            await loadAndDisplayExpenses(); // Reload the expenses after deletion
        } catch (error) {
            alert('Error deleting expense: ' + error);
        }
    }
}

// Update pie chart
function updatePieChart(expenses) {
    const ctx = document.getElementById('expense-chart');
    if (!ctx) return;

    // Group expenses by category
    const categoryTotals = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
    }, {});

    // Destroy existing chart if it exists
    if (pieChart) {
        pieChart.destroy();
    }

    // Create new chart
    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: 'Expenses by Category'
                }
            }
        }
    });
}

// Filter expenses by category
async function filterExpenses() {
    const category = document.getElementById('filter-category').value;
    try {
        let expenses = await getExpenses();
        if (category !== 'All') {
            expenses = expenses.filter(expense => expense.category === category);
        }
        displayExpensesTable(expenses);
        updatePieChart(expenses);
    } catch (error) {
        alert('Error filtering expenses: ' + error);
    }
}
