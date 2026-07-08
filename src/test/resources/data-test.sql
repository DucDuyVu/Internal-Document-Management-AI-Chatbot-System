INSERT INTO departments (id, name, description)
VALUES (1, 'IT', 'Phong cong nghe')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, full_name, username, phone, email, password, role, department_id)
VALUES (1, 'Test User', 'testuser', '0900000000', 'test@example.com', 'dummy', 'ADMIN', 1)
ON CONFLICT (id) DO NOTHING;