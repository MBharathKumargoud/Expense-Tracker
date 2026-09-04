// expenses.js - Expenses CRUD and Chart.js integration

let pieChart = null;

async function getExpenses(category = null) {
    let endpoint = '/expenses';
    if (category && category !== 'All') {
        endpoint += `?category=${encodeURIComponent(category)}`;
    }
    return await API.request(endpoint, { method: 'GET' });
}

async function addExpense(expense) {
    return await API.request('/expenses', {
        method: 'POST',
        body: JSON.stringify(expense)
    });
}

async function deleteExpense(expenseId) {
    return await API.request(`/expenses/${expenseId}`, {
        method: 'DELETE'
    });
}

async function loadAndDisplayExpenses() {
    try {
        const categorySelect = document.getElementById('filter-category');
        const selectedCategory = categorySelect ? categorySelect.value : 'All';
        const expenses = await getExpenses(selectedCategory);
        
        displayExpensesTable(expenses);
        updatePieChart(expenses);
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

function displayExpensesTable(expenses) {
    const tbody = document.getElementById('expense-list');
    const totalSpan = document.getElementById('total-amount');
    let total = 0;

    if (!tbody) return;

    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }

    if (!expenses || expenses.length === 0) {
        if (totalSpan) totalSpan.textContent = '0.00';
        return;
    }

    expenses.forEach(expense => {
        total += Number(expense.amount || 0);
        const row = document.createElement('tr');
        row.dataset.expenseId = expense.id;
        
        const formattedDate = expense.date ? new Date(expense.date).toLocaleDateString() : '';
        
        row.innerHTML = `
            <td>${escapeHtml(expense.name)}</td>
            <td>$${Number(expense.amount).toFixed(2)}</td>
            <td>${escapeHtml(expense.category)}</td>
            <td>${formattedDate}</td>
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

function updatePieChart(expenses) {
    const ctx = document.getElementById('expense-chart');
    if (!ctx) return;

    if (!expenses || expenses.length === 0) {
        if (pieChart) {
            pieChart.destroy();
            pieChart = null;
        }
        return;
    }

    const categoryTotals = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
        return acc;
    }, {});

    if (pieChart) {
        pieChart.destroy();
    }

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
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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

async function filterExpenses() {
    await loadAndDisplayExpenses();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
