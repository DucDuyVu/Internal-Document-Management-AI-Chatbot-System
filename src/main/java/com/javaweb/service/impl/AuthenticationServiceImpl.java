package com.javaweb.service.impl;

import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.Optional;

import com.javaweb.service.OtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.javaweb.dto.request.ForgotPasswordRequest;
import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.request.LogoutRequest;
import com.javaweb.dto.request.RefreshTokenRequest;
import com.javaweb.dto.request.RegisterRequest;
import com.javaweb.dto.request.ResetPasswordRequest;
import com.javaweb.dto.response.ForgotPasswordResponse;
import com.javaweb.dto.response.LoginResponse;
import com.javaweb.dto.response.LogoutResponse;
import com.javaweb.dto.response.RefreshTokenResponse;
import com.javaweb.entity.UserSessionsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.UserSessionsRepository;
import com.javaweb.dto.response.RegisterResponse;
import com.javaweb.dto.response.ResetPasswordResponse;
import com.javaweb.exception.BadRequestException;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.AuthenticationService;
import com.javaweb.service.JwtService;

/*
 * Xử lí Register, Login, Logout, Refresh Token
 * */
@Service
public class AuthenticationServiceImpl implements AuthenticationService{

	
	@Autowired
	private UserSessionsRepository userSessionsRepo;
	
	@Autowired
	private PasswordEncoder passwordEncoder;
	
	@Autowired
	private JwtService jwtService;
	
	@Autowired
	private UsersRepository usersRepository;

	@Autowired
	OtpService otpService;

	// Xử lý login 
	@Override
	public LoginResponse login(LoginRequest loginRequest) {
	// Check email có trong DB hay không 
		Optional<UsersEntity> optionalEmail = usersRepository.findByEmail(loginRequest.getEmail());
		
		if (optionalEmail.isEmpty()) {
			throw new BadRequestException("Email không tồn tại !");
		}
		
		// Tìm user theo email trong DB
		UsersEntity user = optionalEmail.get();
	
		if (! user.isActive()) {
		    throw new BadRequestException("Tài khoản đã bị khóa !");
		}
		// So sánh password đăng nhập với password đã mã hóa trong DB
		if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
			throw new BadRequestException("Sai mật khẩu !");
		}
		
		
		// Đăng nhập thành công => Sinh JWT
		String accessToken = jwtService.generateAccessToken(user);
		
		// Đăng nhập thành công => Sinh refresh token
		String refreshToken = jwtService.generateRefreshToken(user);
		
		
		
		UserSessionsEntity userSessions = new UserSessionsEntity();
		userSessions.setRefreshToken(refreshToken);
		userSessions.setCreatedAt(LocalDateTime.now());
		userSessions.setUserId(user);
		userSessions.setIsRevoked(false);
		userSessions.setExpiresAt(jwtService.extractExpirations(refreshToken));
		
		userSessionsRepo.save(userSessions); // lưu refresh token + tg tạo + tg hết hạn
		
		// Trả ra client login 
		LoginResponse loginResponse = new LoginResponse();
		
		loginResponse.setMessage("Đăng nhập thành công !");
		loginResponse.setAccessToken(accessToken);
		loginResponse.setRefreshToken(refreshToken);
		loginResponse.setTokenType("Bearer");
		loginResponse.setUserId(user.getId());
		loginResponse.setFullName(user.getFullName());
		loginResponse.setEmail(user.getEmail());
		loginResponse.setRole(user.getRole().name());
		
		return loginResponse;
	}

	@Override
	public RefreshTokenResponse refreshToken(RefreshTokenRequest refreshTokenRequest) {
		// Lấy refresh token 
		String refreshToken = refreshTokenRequest.getRefreshToken();
		Optional<UserSessionsEntity> optinalSession = userSessionsRepo.findByRefreshToken(refreshToken);
		// check refresh token trong DB có tồn tại không
		if (optinalSession.isEmpty()) {
			throw new RuntimeException("Refresh Token không tồn tại !");
		}
		
		// check refresh token còn hạn hay không
		UserSessionsEntity session = optinalSession.get();
		if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new RuntimeException("Refresh Token đã hết hạn");
		}
		
		// check trạng thái (thu hồi)
		if (session.getIsRevoked()) {
			throw new RuntimeException("Refresh Token đã bị thu hồi");
		}
		
		// Xác thực email
		String email = jwtService.extractEmail(refreshToken);
		
		// Tìm email trong DB
		Optional<UsersEntity> optionalUser = usersRepository.findByEmail(email);
		
		if (optionalUser.isEmpty()) {
			throw new RuntimeException("Không có user !");
		}
		
		UsersEntity user = optionalUser.get();
		
		String accessToken = jwtService.generateAccessToken(user); // Sinh access token mới
		
		
		
		// Trả ra client
		RefreshTokenResponse refreshTokenResponse = new RefreshTokenResponse();
		refreshTokenResponse.setAccessToken(accessToken);
		refreshTokenResponse.setTokenType("Bearer");
		
		return refreshTokenResponse; // trả ra client
	}



	// Xử lý đăng ký
	@Override
	public RegisterResponse register(RegisterRequest registerRequest) {
		UsersEntity user = new UsersEntity();

		if (usersRepository.existsByEmail(registerRequest.getEmail())) {
			throw new BadRequestException("Email đã tồn tại");
		}

		if (!registerRequest.getPassword()
				.equals(registerRequest.getConfirmPassword())){

			throw new BadRequestException("Mật khẩu xác nhận không khớp!");
		}
		user.setFullName(registerRequest.getFullName());
		user.setEmail(registerRequest.getEmail());
		user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
		user.setCreatedAt(LocalDateTime.now());
		user.setUserName(
				registerRequest.getEmail().split("@")[0]
		);

		usersRepository.save(user); // Save DB
		
		RegisterResponse registerResponse = new RegisterResponse();
		registerResponse.setFullName(registerRequest.getFullName());
		registerResponse.setEmail(registerRequest.getEmail());
		registerResponse.setMessage("Đăng ký thành công !");
		
	
		
		return registerResponse;
	}

	// Xử lý logout
	@Override
	public LogoutResponse logout(LogoutRequest logoutRequest) {
		Optional<UserSessionsEntity> optionalUser = userSessionsRepo.findByRefreshToken(logoutRequest.getRefreshToken());
		
		
		if (optionalUser.isEmpty()) {
			throw new BadRequestException("Không tồn tại đăng nhập !");
		}
		
		UserSessionsEntity user = optionalUser.get();
		
		if (user.getIsRevoked()) {
			throw new BadRequestException("Người dùng đã đăng xuất");
		}
		
		// so sánh với tg thực xem hết hạn chưa
		if (user.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new BadRequestException("Refresh Token đã hết hạn");
		}
		
		user.setIsRevoked(true); // đổi trạng thái thu hồi = true
		user.setRevokedAt(LocalDateTime.now());
		userSessionsRepo.save(user); // lưu ở DB 
		
		// Trả ra client 
		LogoutResponse logoutResponse = new LogoutResponse();
		
		logoutResponse.setMessage("Đã đăng xuất !");
		return logoutResponse;
	}


	// Xử lý quên mật khẩu
	@Override
	public ForgotPasswordResponse forgotPassowrd(ForgotPasswordRequest forgotPasswordRequest) {
		
		Optional<UsersEntity> optionalUser = usersRepository.findByEmail(forgotPasswordRequest.getEmail());
		
		// Check người dùng có trong DB không
		if (optionalUser.isEmpty()) {
			throw new BadRequestException("Không tìm thấy người dùng");
		}
		
		UsersEntity user = optionalUser.get();
		
		// check trạng thái tài khoản 
		if (! user.isActive()) {
			throw new BadRequestException("Tài khoản bị khóa !");
		}

		
		// Sinh OTP và lưu DB
		String otp = otpService.createOrUpdateOtp(user);

		/*
		* Sau khi sinh OTP
		* Gửi OTP qua email
		* */

		

		ForgotPasswordResponse forgotPasswordResponse = new ForgotPasswordResponse();
		forgotPasswordResponse.setMessage("Mã OTP đã được gửi tới email của bạn !");
		forgotPasswordResponse.setOtp(otp);

		return forgotPasswordResponse;
	}

	
	// Xử lý đổi mật khẩu
	@Override
	public ResetPasswordResponse resetPassword(ResetPasswordRequest request) {
		// check token
		if (! jwtService.validateToken(request.getResetToken())) {
			throw new BadRequestException("Token không hợp lệ hoặc hết hạn");
		}
		
		// Lấy email từ token
		String email = jwtService.extractEmail(request.getResetToken());
		
		// Tìm user
		Optional<UsersEntity> optionalUser = usersRepository.findByEmail(email);
		
		if (optionalUser.isEmpty()) {
			throw new BadRequestException("Không tìm thấy người dùng !");
		}
		
		UsersEntity user = optionalUser.get();
		
		if (! user.isActive()) {
			throw new BadRequestException("Tài khoản đã bị khóa ! ");
		}
		
		if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
			throw new BadRequestException("Mật khẩu mới không được trùng mật khẩu cũ !");
		}
		
		// Mã hóa mật khẩu mới
		user.setPassword(passwordEncoder.encode(request.getNewPassword()));
		
		usersRepository.save(user); // lưu ở DB
		
		ResetPasswordResponse response = new ResetPasswordResponse();
		response.setMessage("Đã đặt lại mật khẩu !");
		return response;
	}
}
