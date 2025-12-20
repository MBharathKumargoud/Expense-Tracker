// Database initialization
const dbName = "expenseTrackerDB";
const dbVersion = 1;

// Initialize the database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = (event) => reject("Database error: " + event.target.error);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create users store
            if (!db.objectStoreNames.contains('users')) {
                const usersStore = db.createObjectStore('users', { keyPath: 'email' });
                usersStore.createIndex('username', 'username', { unique: true });
            }

            // Create expenses store
            if (!db.objectStoreNames.contains('expenses')) {
                const expensesStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                expensesStore.createIndex('userEmail', 'userEmail', { unique: false });
                expensesStore.createIndex('date', 'date', { unique: false });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
    });
}

// User operations
async function registerUser(email, username, password) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');

        const user = {
            email,
            username,
            password: btoa(password), // Basic encryption (not for production use)
        };

        const request = store.add(user);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject("User already exists");
    });
}

async function loginUser(email, password) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.get(email);

        request.onsuccess = () => {
            const user = request.result;
            if (user && btoa(password) === user.password) {
                sessionStorage.setItem('currentUser', email);
                resolve(user);
            } else {
                reject("Invalid credentials");
            }
        };
        request.onerror = () => reject("Error accessing database");
    });
}

// Expense operations
async function addExpense(expense) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['expenses'], 'readwrite');
            const store = transaction.objectStore('expenses');
            
            const userEmail = sessionStorage.getItem('currentUser');
            if (!userEmail) {
                reject("Please login to add expenses");
                return;
            }

            expense.userEmail = userEmail;
            expense.id = Date.now(); // Add a unique ID based on timestamp

            // Validate expense data
            if (!expense.name || !expense.amount || !expense.category || !expense.date) {
                reject("Please fill in all expense details");
                return;
            }

            if (expense.amount <= 0) {
                reject("Amount must be greater than 0");
                return;
            }

            const request = store.add(expense);
            
            transaction.oncomplete = () => {
                resolve(expense);
            };

            transaction.onerror = (event) => {
                reject("Database error: " + event.target.error);
            };

            request.onerror = (event) => {
                reject("Error adding expense: " + event.target.error);
            };
        });
    } catch (error) {
        throw new Error("Database connection error: " + error.message);
    }
}

// Delete expense function
async function deleteExpense(expenseId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.delete(expenseId);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject("Error deleting expense");
    });
}

async function getExpenses() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readonly');
        const store = transaction.objectStore('expenses');
        const userEmail = sessionStorage.getItem('currentUser');
        
        if (!userEmail) {
            reject("User not logged in");
            return;
        }

        const index = store.index('userEmail');
        const request = index.getAll(userEmail);
        
        request.onsuccess = () => {
            // Remove duplicates based on name, amount, category, and date
            const expenses = request.result;
            const uniqueExpenses = expenses.reduce((acc, current) => {
                const isDuplicate = acc.find(item => 
                    item.name === current.name &&
                    item.amount === current.amount &&
                    item.category === current.category &&
                    item.date === current.date
                );
                if (!isDuplicate) {
                    acc.push(current);
                }
                return acc;
            }, []);
            resolve(uniqueExpenses);
        };
        request.onerror = () => reject("Error fetching expenses");
    });
}

// Reset password functionality
async function resetPassword(email, newPassword) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.get(email);

        request.onsuccess = () => {
            const user = request.result;
            if (user) {
                user.password = btoa(newPassword);
                const updateRequest = store.put(user);
                updateRequest.onsuccess = () => resolve(true);
                updateRequest.onerror = () => reject("Error updating password");
            } else {
                reject("User not found");
            }
        };
        request.onerror = () => reject("Error accessing database");
    });
}
