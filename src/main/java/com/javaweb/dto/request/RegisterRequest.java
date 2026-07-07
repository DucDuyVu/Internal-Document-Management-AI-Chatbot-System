package com.javaweb.dto.request;

import jakarta.validation.constraints.NotBlank;

public class RegisterRequest {

	@NotBlank(message = "Họ và tên không được để trống")
	private String fullName;
	
	@NotBlank(message = "Tên đăng nhập không được để trống")
	private String userName;
	
	@NotBlank(message = "Email không được để trống")
	private String email;
	
	@NotBlank(message = "Password không được để trống")
	private String password;
	
	@NotBlank(message = "Phone không được để trống")
	private String phone;

	public String getFullName() {
		return fullName;
	}

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}

	public String getUserName() {
		return userName;
	}

	public void setUserName(String userName) {
		this.userName = userName;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getPhone() {
		return phone;
	}

	public void setPhone(String phone) {
		this.phone = phone;
	}
}
