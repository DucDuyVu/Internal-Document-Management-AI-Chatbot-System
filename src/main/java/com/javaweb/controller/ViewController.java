package com.javaweb.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String landingPage() {
        return "landing";
    }

    @GetMapping("/login")
    public String loginPage() {
        return "login"; // tro tới login.html
    }

    @GetMapping("/register")
    public String registerPage() {
        return "register";
    }

    @GetMapping("/forgot-password")
    public String forgotPasswordPage() {
        return "forgot-password";
    }

    @GetMapping("/profile")
    public String profilePage() {
        return "profile";
    }

    @GetMapping("/user/dashboard")
    public String dashboardPage() {
        return "user/dashboard"; // ✅ trỏ tới templates/user/dashboard.html
    }

    @GetMapping("/manager/dashboard")
    public String managerDashboardPage() {
        return "manager/dashboard"; // ✅ trỏ tới templates/manager/dashboard.html
    }

    @GetMapping("/admin/dashboard")
    public String adminDashboardPage() {
        return "admin/dashboard"; // ✅ trỏ tới templates/admin/dashboard.html
    }
}
