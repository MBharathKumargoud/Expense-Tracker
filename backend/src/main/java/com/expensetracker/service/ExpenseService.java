package com.expensetracker.service;

import com.expensetracker.dto.ExpenseDto;
import com.expensetracker.entity.Expense;
import com.expensetracker.entity.User;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.exception.UnauthorizedAccessException;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    public ExpenseService(ExpenseRepository expenseRepository, UserRepository userRepository) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ExpenseDto> getUserExpenses(UserPrincipal userPrincipal, String category) {
        List<Expense> expenses;
        if (category != null && !category.trim().isEmpty() && !"All".equalsIgnoreCase(category)) {
            expenses = expenseRepository.findByUserIdAndCategoryOrderByDateDesc(userPrincipal.getId(), category);
        } else {
            expenses = expenseRepository.findByUserIdOrderByDateDesc(userPrincipal.getId());
        }

        return expenses.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExpenseDto createExpense(UserPrincipal userPrincipal, ExpenseDto expenseDto) {
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Expense expense = new Expense();
        expense.setName(expenseDto.getName());
        expense.setAmount(expenseDto.getAmount());
        expense.setCategory(expenseDto.getCategory());
        expense.setDate(expenseDto.getDate());
        expense.setUser(user);

        Expense savedExpense = expenseRepository.save(expense);
        return convertToDto(savedExpense);
    }

    @Transactional
    public void deleteExpense(UserPrincipal userPrincipal, Long expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + expenseId));

        if (!expense.getUser().getId().equals(userPrincipal.getId())) {
            throw new UnauthorizedAccessException("You are not authorized to delete this expense");
        }

        expenseRepository.delete(expense);
    }

    private ExpenseDto convertToDto(Expense expense) {
        return new ExpenseDto(
                expense.getId(),
                expense.getName(),
                expense.getAmount(),
                expense.getCategory(),
                expense.getDate()
        );
    }
}
