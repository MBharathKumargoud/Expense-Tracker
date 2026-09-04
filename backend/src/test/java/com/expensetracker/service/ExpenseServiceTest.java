package com.expensetracker.service;

import com.expensetracker.dto.ExpenseDto;
import com.expensetracker.dto.RegisterRequest;
import com.expensetracker.entity.User;
import com.expensetracker.exception.UnauthorizedAccessException;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.properties")
@Transactional
public class ExpenseServiceTest {

    @Autowired
    private ExpenseService expenseService;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    private User user1;
    private User user2;
    private UserPrincipal principal1;
    private UserPrincipal principal2;

    @BeforeEach
    void setUp() {
        expenseRepository.deleteAll();
        userRepository.deleteAll();

        user1 = userService.registerUser(new RegisterRequest("user1@example.com", "UserOne", "Pass1234#"));
        user2 = userService.registerUser(new RegisterRequest("user2@example.com", "UserTwo", "Pass1234#"));

        principal1 = UserPrincipal.create(user1);
        principal2 = UserPrincipal.create(user2);
    }

    @Test
    void testCreateAndGetExpenses() {
        ExpenseDto dto1 = new ExpenseDto(null, "Lunch", new BigDecimal("15.50"), "Food", LocalDate.now());
        ExpenseDto dto2 = new ExpenseDto(null, "Bus Pass", new BigDecimal("50.00"), "Transport", LocalDate.now());

        expenseService.createExpense(principal1, dto1);
        expenseService.createExpense(principal1, dto2);

        List<ExpenseDto> user1Expenses = expenseService.getUserExpenses(principal1, null);
        assertEquals(2, user1Expenses.size());

        List<ExpenseDto> foodExpenses = expenseService.getUserExpenses(principal1, "Food");
        assertEquals(1, foodExpenses.size());
        assertEquals("Lunch", foodExpenses.get(0).getName());
    }

    @Test
    void testAllowIdenticalExpenses() {
        ExpenseDto dto1 = new ExpenseDto(null, "Coffee", new BigDecimal("4.50"), "Food", LocalDate.now());
        ExpenseDto dto2 = new ExpenseDto(null, "Coffee", new BigDecimal("4.50"), "Food", LocalDate.now());

        expenseService.createExpense(principal1, dto1);
        expenseService.createExpense(principal1, dto2);

        List<ExpenseDto> user1Expenses = expenseService.getUserExpenses(principal1, null);
        assertEquals(2, user1Expenses.size(), "Identical expenses must be allowed");
    }

    @Test
    void testExpenseOwnershipAndUnauthorizedDeletion() {
        ExpenseDto dto = new ExpenseDto(null, "Book", new BigDecimal("25.00"), "Other", LocalDate.now());
        ExpenseDto created = expenseService.createExpense(principal1, dto);

        assertThrows(UnauthorizedAccessException.class, () -> {
            expenseService.deleteExpense(principal2, created.getId());
        }, "User2 should not be allowed to delete User1's expense");

        assertDoesNotThrow(() -> {
            expenseService.deleteExpense(principal1, created.getId());
        });
    }
}
