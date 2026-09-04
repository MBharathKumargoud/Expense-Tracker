package com.expensetracker.dto;

public class AuthResponse {

    private String token;
    private String type = "Bearer";
    private String email;
    private String username;

    public AuthResponse() {
    }

    public AuthResponse(String token, String email, String username) {
        this.token = token;
        this.email = email;
        this.username = username;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
