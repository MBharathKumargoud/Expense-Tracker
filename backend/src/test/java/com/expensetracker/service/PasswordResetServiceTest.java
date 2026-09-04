package com.expensetracker.service;

import com.expensetracker.dto.AuthResponse;
import com.expensetracker.dto.LoginRequest;
import com.expensetracker.dto.RegisterRequest;
import com.expensetracker.entity.PasswordResetToken;
import com.expensetracker.entity.User;
import com.expensetracker.exception.BadRequestException;
import com.expensetracker.repository.PasswordResetTokenRepository;
import com.expensetracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.properties")
@Transactional
public class PasswordResetServiceTest {

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        userRepository.deleteAll();
        testUser = userService.registerUser(new RegisterRequest("resettest@example.com", "ResetTester", "OldPass123#"));
    }

    @Test
    void testFullPasswordResetLifecycle() throws Exception {
        // 1. Process forgot password request
        passwordResetService.processForgotPassword("resettest@example.com");

        // 2. Retrieve created token from DB
        List<PasswordResetToken> tokens = tokenRepository.findAll();
        assertEquals(1, tokens.size());
        PasswordResetToken tokenEntity = tokens.get(0);

        // Verify SHA-256 hashing in database (token is not stored in plaintext)
        assertNotNull(tokenEntity.getTokenHash());
        assertEquals(64, tokenEntity.getTokenHash().length());
        assertFalse(tokenEntity.isUsed());
        assertTrue(tokenEntity.getExpiryDate().isAfter(LocalDateTime.now()));

        // Simulate recovering raw token hash match
        String storedHash = tokenEntity.getTokenHash();

        // 3. Perform password reset with invalid token -> expect failure
        assertThrows(BadRequestException.class, () -> {
            passwordResetService.resetPassword("invalid-raw-token", "NewPass123#");
        });

        // 4. Perform password reset with valid token match
        // We find the raw token by testing against the saved hash or matching known generated raw token
        // In actual usage, the raw token is in the reset URL.
        // Let's create a known raw token directly to test exact reset mechanics
        String knownRawToken = "123e4567-e89b-12d3-a456-426614174000";
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String knownHash = HexFormat.of().formatHex(digest.digest(knownRawToken.getBytes(StandardCharsets.UTF_8)));

        PasswordResetToken customToken = new PasswordResetToken(knownHash, testUser, LocalDateTime.now().plusMinutes(15));
        tokenRepository.save(customToken);

        // Reset password using known raw token
        assertDoesNotThrow(() -> {
            passwordResetService.resetPassword(knownRawToken, "BrandNewPass123#");
        });

        // 5. Verify old password fails login and new password succeeds
        assertThrows(Exception.class, () -> {
            userService.authenticateUser(new LoginRequest("resettest@example.com", "OldPass123#"));
        });

        AuthResponse authResponse = userService.authenticateUser(new LoginRequest("resettest@example.com", "BrandNewPass123#"));
        assertNotNull(authResponse.getToken());

        // 6. Verify single-use enforcement: token cannot be reused
        assertThrows(BadRequestException.class, () -> {
            passwordResetService.resetPassword(knownRawToken, "AnotherNewPass123#");
        });
    }

    @Test
    void testExpiredTokenRejection() throws Exception {
        String expiredRawToken = "expired-token-uuid-12345";
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String expiredHash = HexFormat.of().formatHex(digest.digest(expiredRawToken.getBytes(StandardCharsets.UTF_8)));

        PasswordResetToken expiredToken = new PasswordResetToken(expiredHash, testUser, LocalDateTime.now().minusMinutes(5));
        tokenRepository.save(expiredToken);

        assertThrows(BadRequestException.class, () -> {
            passwordResetService.resetPassword(expiredRawToken, "NewPass123#");
        });
    }
}
