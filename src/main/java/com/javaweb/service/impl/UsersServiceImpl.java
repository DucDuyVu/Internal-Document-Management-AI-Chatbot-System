package com.javaweb.service.impl;

import com.javaweb.dto.request.CreateUserRequest;
import com.javaweb.dto.request.UpdateUserRequest;
import com.javaweb.dto.response.AdminUserResponse;
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.enums.UserRole;
import com.javaweb.repository.DepartmentsRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import com.javaweb.dto.request.ChangePasswordRequest;
import com.javaweb.dto.request.UpdateProfileRequest;
import com.javaweb.dto.response.ChangePasswordResponse;
import com.javaweb.dto.response.LockUserResponse;
import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.dto.response.UnlockResponse;
import com.javaweb.dto.response.user.ActivityInfo;
import com.javaweb.dto.response.user.DocumentInfo;
import com.javaweb.dto.response.user.UserProfileDetailsDto;
import com.javaweb.entity.ActivityLogsEntity;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UserSessionsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.exception.BadRequestException;
import com.javaweb.repository.UserSessionsRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.repository.ChatSessionsRepository;
import com.javaweb.repository.ActivityLogsRepository;
import com.javaweb.service.UsersService;
import com.javaweb.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UsersServiceImpl implements UsersService {

	@Autowired
	UsersRepository usersRepository;

	@Autowired
	UserSessionsRepository userSessionsRepository;

	@Autowired
	DepartmentsRepository departmentsRepository;

	@Autowired
	PasswordEncoder passwordEncoder;

	@Autowired
	NotificationService notificationService;
	
	@Autowired
	private DocumentRepository documentRepository;
	
	@Autowired
	private ChatSessionsRepository chatSessionsRepository;
	
	@Autowired
	private ActivityLogsRepository activityLogsRepository;

	// lấy thông tin người dùng
	@Override
	public ProfileResponse getProfile(UsersEntity user) {

		ProfileResponse profileResponse = new ProfileResponse();

		profileResponse.setFullName(user.getFullName());
		profileResponse.setUserName(user.getUserName());
		profileResponse.setPhone(user.getPhone());
		profileResponse.setEmail(user.getEmail());
		profileResponse.setUserId(user.getId());
		profileResponse.setRole(user.getRole().name());
		profileResponse.setAvatarUrl(user.getAvatarURL());
		profileResponse.setSignatureUrl(user.getSignatureUrl());
		profileResponse.setJobTitle(user.getJobTitle());

		if (user.getDepartment() != null) {
			profileResponse.setDepartmentName(user.getDepartment().getName());
		}

		profileResponse.setCreatedAt(user.getCreatedAt());
		
		userSessionsRepository.findFirstByUserIdOrderByCreatedAtDesc(user)
				.ifPresent(session -> profileResponse.setLastLogin(session.getCreatedAt()));
				
		profileResponse.setDocumentCount(documentRepository.countByUploadedByAndDeletedAtIsNull(user.getId()));
		profileResponse.setChatSessionCount(chatSessionsRepository.countByUserChatId_IdAndDeletedAtIsNull(user.getId()));
		profileResponse.setActivityCount(activityLogsRepository.countByUsersEntityId_Id(user.getId()));

		// Manager fields
		boolean isManager = user.getRole() != null && user.getRole() == UserRole.MANAGER;
		profileResponse.setManager(isManager);
		if (isManager && user.getDepartment() != null) {
			Integer deptId = Math.toIntExact(user.getDepartment().getId());
			profileResponse.setManagedEmployeeCount((int) usersRepository.countByDepartmentIdAndDeletedAtIsNullAndIsActiveTrue(user.getDepartment().getId()));
			profileResponse.setDepartmentDocumentsCount((int) documentRepository.countByDepartmentIdAndDeletedAtIsNull(deptId));
			profileResponse.setPendingDocumentCount((int) documentRepository.countByDepartmentIdAndStatusAndDeletedAtIsNull(deptId, com.javaweb.entity.enums.DocumentStatus.PENDING));
		} else {
			profileResponse.setManagedEmployeeCount(0);
			profileResponse.setDepartmentDocumentsCount(0);
			profileResponse.setPendingDocumentCount(0);
		}
		profileResponse.setPendingRequestCount(0);
		profileResponse.setActiveSessionsCount(userSessionsRepository.countByUserIdAndIsRevokedFalse(user));

		return profileResponse;
	}

	// update thông tin người dùng
	@Override
	public ProfileResponse updateProfile(UsersEntity user, UpdateProfileRequest updateProfileRequest) {

		if (updateProfileRequest.getFullName() != null && !updateProfileRequest.getFullName().trim().isEmpty()) {
			user.setFullName(updateProfileRequest.getFullName());
		}

		if (updateProfileRequest.getUserName() != null && !updateProfileRequest.getUserName().trim().isEmpty()) {
			user.setUserName(updateProfileRequest.getUserName());
		}

		if (updateProfileRequest.getPhone() != null && !updateProfileRequest.getPhone().trim().isEmpty()) {
			user.setPhone(updateProfileRequest.getPhone());
		}

		if (updateProfileRequest.getAvatarUrl() != null && !updateProfileRequest.getAvatarUrl().trim().isEmpty()) {
			user.setAvatarURL(updateProfileRequest.getAvatarUrl());
		}
		
		if (updateProfileRequest.getSignatureUrl() != null && !updateProfileRequest.getSignatureUrl().trim().isEmpty()) {
			user.setSignatureUrl(updateProfileRequest.getSignatureUrl());
		}

		if (updateProfileRequest.getJobTitle() != null && !updateProfileRequest.getJobTitle().trim().isEmpty()) {
			user.setJobTitle(updateProfileRequest.getJobTitle());
		}

		user.setUpdatedAt(LocalDateTime.now());

		UsersEntity updateUser = usersRepository.save(user); // save thông tin update
		notificationService.notifySystemAction(updateUser, null, "Cập nhật thông tin", "vừa cập nhật thông tin hồ sơ cá nhân.", false);

		ProfileResponse profileResponse = new ProfileResponse();
		profileResponse.setFullName(updateUser.getFullName());
		profileResponse.setUserName(updateUser.getUserName());
		profileResponse.setPhone(updateUser.getPhone());
		profileResponse.setUserId(updateUser.getId());
		profileResponse.setEmail(updateUser.getEmail());
		profileResponse.setRole(updateUser.getRole().name());
		profileResponse.setAvatarUrl(updateUser.getAvatarURL());
		profileResponse.setSignatureUrl(updateUser.getSignatureUrl());
		profileResponse.setJobTitle(updateUser.getJobTitle());
		profileResponse.setCreatedAt(updateUser.getCreatedAt());

		userSessionsRepository.findFirstByUserIdOrderByCreatedAtDesc(updateUser)
				.ifPresent(session -> profileResponse.setLastLogin(session.getCreatedAt()));
				
		profileResponse.setDocumentCount(documentRepository.countByUploadedByAndDeletedAtIsNull(updateUser.getId()));
		profileResponse.setChatSessionCount(chatSessionsRepository.countByUserChatId_IdAndDeletedAtIsNull(updateUser.getId()));
		profileResponse.setActivityCount(activityLogsRepository.countByUsersEntityId_Id(updateUser.getId()));

		return profileResponse; // trả về client
	}

	// Đổi mật khẩu
	@Override
	public ChangePasswordResponse changePassword(UsersEntity user, ChangePasswordRequest changePasswordRequest) {

		// Check mật khẩu cũ
		if (!passwordEncoder.matches(changePasswordRequest.getOldPassword(), user.getPassword())) {
			throw new BadRequestException("Mật khẩu không đúng. Vui lòng nhập lại !");
		}

		// Check comfirm mật khẩu
		if (!changePasswordRequest.getNewPassword().equals(changePasswordRequest.getComfirmPassword())) {
			throw new BadRequestException("Mật khẩu xác thực không khớp !");
		}

		String newPassword = passwordEncoder.encode(changePasswordRequest.getNewPassword());

		user.setPassword(newPassword); // cập nhật newPassword

		user.setUpdatedAt(LocalDateTime.now()); // cập nhật tg update pw

		usersRepository.save(user); // Lưu thay đổi pw ở DB

		ChangePasswordResponse changePasswordResponse = new ChangePasswordResponse();
		changePasswordResponse.setMessage("Đổi mật khẩu thành công !");

		return changePasswordResponse;
	}

	// Khóa tài khoản theo id
	@Override
	public LockUserResponse lockUserResponse(Long id) {
		Optional<UsersEntity> optionalUser = usersRepository.findById(id);

		if (optionalUser.isEmpty()) {
			throw new BadRequestException("Người dùng không tồn tại !");
		}

		UsersEntity user = optionalUser.get();

		if (!user.isActive()) {
			throw new BadRequestException("Tài khoản đã bị khóa !");
		}

		user.setActive(false); // khóa tài khoản
		usersRepository.save(user); // lưu DB

		/*
		 * Thu hồi Refresh Token TH tài khoản vẫn còn hiệu lực
		 * của refresh token thì vẫn có thể xin access token truy cập tiếp
		 */

		List<UserSessionsEntity> sessions = userSessionsRepository.findByUserId(user);
		for (UserSessionsEntity item : sessions) {
			item.setIsRevoked(true); // bị thu hồi => khi unlock không cần revoked = true
		}

		userSessionsRepository.saveAll(sessions); // lưu nhiều đối tượng

		LockUserResponse lockUserResponse = new LockUserResponse();
		lockUserResponse.setMessage("Tài khoản đã bị khóa ");
		return lockUserResponse;
	}

	// Mở tài khoản theo id
	@Override
	public UnlockResponse unlockResponse(Long id) {

		Optional<UsersEntity> optionalUser = usersRepository.findById(id);

		if (optionalUser.isEmpty()) {
			throw new BadRequestException("Người dùng không tồn tại !");
		}

		UsersEntity user = optionalUser.get();

		// Kiểm tra tài khoản được mở chưa
		if (user.isActive()) {
			throw new BadRequestException("Tài khoản đã được mở !");
		}

		// Mở tài khoản
		user.setActive(true);

		usersRepository.save(user);

		UnlockResponse response = new UnlockResponse();
		response.setMessage("Tài khoản đã được mở !");
		return response;
	}

	// Xử lý lấy tất cả user
	@Override
	public Page<AdminUserResponse> getAllUsers(int page,
			int size, String search, String role, Long departmentId, String status) {
		// Phân trang và Sắp xếp: User mới nhất (id lớn nhất) lên đầu danh sách
		Pageable pageable = PageRequest.of(page - 1, size, Sort.by("id").descending());

		// Xử lý vai trò
		UserRole enumRole = null;
		if (role != null && !role.isEmpty()) {
			try {
				enumRole = UserRole.valueOf(role.toUpperCase());
			} catch (Exception e) {
			}
		}

		// Xử lý đưa active = true, locked = false
		Boolean isActive = null;
		if ("active".equalsIgnoreCase(status))
			isActive = true;
		else if ("locked".equalsIgnoreCase(status))
			isActive = false;

		String querySearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

		return usersRepository.searchUsers(querySearch, enumRole, departmentId, isActive, pageable).map(user -> {
			AdminUserResponse response = new AdminUserResponse();
			response.setId(user.getId());
			response.setFullName(user.getFullName());
			response.setUsername(user.getUserName());
			response.setEmail(user.getEmail());
			response.setPhone(user.getPhone());
			if (user.getRole() != null) {
				response.setRole(user.getRole().name());
			}
			if (user.getDepartment() != null) {
				response.setDepartmentName(user.getDepartment().getName());
			}
			response.setActive(user.isActive());
			
			// Map document counts
			response.setUploadedFilesCount(documentRepository.countByUploadedByAndDeletedAtIsNull(user.getId()));
			response.setApprovedFilesCount(documentRepository.countApprovedByUserId(user.getId()));
			
			return response;
		});
	}

	// Tạo user (admin tạo)
	@Transactional
	@Override
	public AdminUserResponse createUser(CreateUserRequest request) {

		// Check email tồn tại chưa
		if (usersRepository.existsByEmail(request.getEmail())) {
			throw new BadRequestException("Email đã tồn tại !");
		}

		if (usersRepository.existsByUserName(request.getUserName())) {
			throw new BadRequestException("Username đã tồn tại !");
		}

		UsersEntity user = new UsersEntity();
		user.setFullName(request.getFullName());
		user.setUserName(request.getUserName());
		user.setEmail(request.getEmail());
		user.setPhone(request.getPhone());
		user.setPassword(passwordEncoder.encode(request.getPassword())); // mã hóa password

		if (request.getRole() != null) {
			user.setRole(UserRole.valueOf(request.getRole().toUpperCase()));
		}

		if (request.getDepartmentId() != null) {
			DepartmentsEntity depart = departmentsRepository.findById(request.getDepartmentId())
					.orElseThrow(() -> new RuntimeException("Phòng ban không tồn tại !"));
			user.setDepartment(depart);
		}

		usersRepository.save(user); // Save dữ liệu ở DB

		// Trả dữ liệu ra client
		AdminUserResponse response = new AdminUserResponse();

		response.setId(user.getId());
		response.setFullName(user.getFullName());
		response.setUsername(user.getUserName());
		response.setEmail(user.getEmail());
		response.setPhone(user.getPhone());
		response.setRole(user.getRole().name());
		response.setActive(user.isActive());
		if (user.getDepartment() != null) {
			response.setDepartmentName(user.getDepartment().getName());
		}
		return response;
	}

	// update user (admin update)
	@Transactional
	@Override
	public AdminUserResponse updateUser(Long userId, UpdateUserRequest request) {
		UsersEntity user = usersRepository.findById(userId)
				.orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

		StringBuilder changes = new StringBuilder();

		// Cập nhật thông tin
		if (request.getFullName() != null && !request.getFullName().equals(user.getFullName())) {
			changes.append("- Họ tên: ").append(request.getFullName()).append("\n");
			user.setFullName(request.getFullName());
		}

		if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
			if (usersRepository.existsByEmail(request.getEmail())) {
				throw new BadRequestException("Email đã tồn tại !");
			}
			changes.append("- Email: ").append(request.getEmail()).append("\n");
			user.setEmail(request.getEmail());
			
			// Cập nhật username theo email mới
			String newUserName = request.getEmail().split("@")[0];
			if (!newUserName.equals(user.getUserName())) {
				String finalUserName = newUserName;
				int counter = 1;
				while (usersRepository.existsByUserName(finalUserName)) {
					finalUserName = newUserName + counter;
					counter++;
				}
				user.setUserName(finalUserName);
				changes.append("- Tên người dùng: ").append(finalUserName).append("\n");
			}
		}

		if (request.getPhone() != null && !request.getPhone().equals(user.getPhone())) {
			changes.append("- Số điện thoại: ").append(request.getPhone()).append("\n");
			user.setPhone(request.getPhone());
		}

		if (request.getRole() != null && !request.getRole().equals(user.getRole().name())) {
			changes.append("- Vai trò: ").append(request.getRole()).append("\n");
			user.setRole(UserRole.valueOf(request.getRole()));
		}

		if (request.getDepartmentId() != null) {
			if (user.getDepartment() == null || !request.getDepartmentId().equals(user.getDepartment().getId())) {
				DepartmentsEntity depart = departmentsRepository.findById(request.getDepartmentId())
						.orElseThrow(() -> new RuntimeException("Phòng ban không tồn tại !"));
				changes.append("- Phòng ban: ").append(depart.getName()).append("\n");
				user.setDepartment(depart);
			}
		}

		usersRepository.save(user); // Lưu dưới DB

        String actorRole = "Quản trị viên"; // Mặc định
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.javaweb.security.CustomUserDetails) {
                com.javaweb.security.CustomUserDetails userDetails = (com.javaweb.security.CustomUserDetails) auth.getPrincipal();
                if (userDetails.getUser().getRole() == com.javaweb.enums.UserRole.MANAGER) {
                    actorRole = "Quản lý";
                }
            }
        } catch (Exception e) {}

		if (changes.length() > 0) {
			String message = actorRole + " đã cập nhật thông tin tài khoản của bạn:\n" + changes.toString();
			notificationService.createNotification(user, "Cập nhật thông tin tài khoản", message);
		}

		// Trả về client
		AdminUserResponse response = new AdminUserResponse();
		response.setFullName(user.getFullName());
		response.setUsername(user.getUserName());
		response.setEmail(user.getEmail());
		response.setPhone(user.getPhone());
		response.setRole(user.getRole().name());
		response.setActive(user.isActive());
		if (user.getDepartment() != null) {
			response.setDepartmentName(user.getDepartment().getName());
		}
		return response;
	}

	// xóa mềm (admin delete)
	@Transactional
	@Override
	public void softDeleteUser(Long userId) {
		UsersEntity user = usersRepository.findById(userId)
				.orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

		user.setDeletedAt(LocalDateTime.now());
		user.setActive(false);
		usersRepository.save(user);
	}

	@Override
	public AdminUserResponse getUserById(Long userId) {
		UsersEntity user = usersRepository.findById(userId)
				.orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
		AdminUserResponse response = new AdminUserResponse();
		response.setId(user.getId());
		response.setFullName(user.getFullName());
		response.setUsername(user.getUserName());
		response.setEmail(user.getEmail());
		response.setPhone(user.getPhone());
		response.setRole(user.getRole().name());
		response.setActive(user.isActive());
		if (user.getDepartment() != null) {
			response.setDepartmentName(user.getDepartment().getName());
		}
		return response;
	}

	@Override
	public UserProfileDetailsDto getUserProfileDetails(Long targetUserId, UsersEntity currentUser) {
		UsersEntity targetUser = usersRepository.findById(targetUserId)
				.orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

		// Format date
		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
		String joinedDate = targetUser.getCreatedAt() != null ? targetUser.getCreatedAt().format(formatter) : "Không xác định";

		String departmentName = targetUser.getDepartment() != null ? targetUser.getDepartment().getName() : "Chưa xếp phòng";
		String managerName = "Không có";

		// Permissions logic (Mocked based on Role for now since no detailed permission table)
		List<String> permissions = new ArrayList<>();
		permissions.add("Xem tài liệu");
		if (targetUser.getRole() == UserRole.ADMIN) {
			permissions.add("Toàn quyền hệ thống");
		} else if (targetUser.getRole() == UserRole.MANAGER) {
			permissions.add("Quản lý phòng ban");
			permissions.add("Upload PDF/Word");
		} else {
			permissions.add("Upload PDF");
		}

		// Uploaded documents (Top 3)
		List<DocumentEntity> docEntities = documentRepository.findByUploadedByAndDeletedAtIsNullOrderByCreatedAtDesc(
				targetUserId, PageRequest.of(0, 3));
		List<DocumentInfo> docs = docEntities.stream().map(d -> {
			String timeAgo = d.getCreatedAt() != null ? d.getCreatedAt().format(formatter) : "Gần đây";
			return DocumentInfo.builder()
					.id(d.getId())
					.fileName(d.getFileName())
					.timeAgo(timeAgo)
					.build();
		}).collect(Collectors.toList());

		// Recent activities (Top 10)
		List<ActivityLogsEntity> activityEntities = activityLogsRepository.findByUsersEntityId_IdOrderByCreatedAtDesc(
				targetUserId, PageRequest.of(0, 10));
		DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
		List<ActivityInfo> activities = activityEntities.stream().map(a -> {
			String time = a.getCreatedAt() != null ? a.getCreatedAt().format(timeFormatter) : "00:00";
			String date = a.getCreatedAt() != null ? a.getCreatedAt().format(formatter) : "Hôm nay";
			return ActivityInfo.builder()
					.time(time)
					.date(date)
					.action(a.getAction())
					.build();
		}).collect(Collectors.toList());

		boolean canEdit = currentUser.getRole() == UserRole.ADMIN;

		return UserProfileDetailsDto.builder()
				.id(targetUser.getId())
				.fullName(targetUser.getFullName())
				.avatarUrl(targetUser.getAvatarURL())
				.role(targetUser.getRole() == UserRole.ADMIN ? "Quản trị viên" : targetUser.getRole() == UserRole.MANAGER ? "Quản lý" : "Nhân viên")
				.isActive(targetUser.isActive())
				.email(targetUser.getEmail())
				.departmentName(departmentName)
				.joinedDate(joinedDate)
				.managerName(managerName)
				.canEdit(canEdit)
				.permissions(permissions)
				.uploadedDocuments(docs)
				.recentActivities(activities)
				.build();
	}
}