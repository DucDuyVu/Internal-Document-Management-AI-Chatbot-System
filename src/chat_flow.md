# Chat Flow - IDMS (Authentication + RAG + Citation)

```mermaid
flowchart TD

%% ==========================
%% AUTHENTICATION
%% ==========================

A[👤 User Login]
B[🛡 Spring Security<br/>JWT Authentication]
C[🔐 SecurityContext<br/>Store User / Role / Department]

A --> B
B --> C

%% ==========================
%% CHAT
%% ==========================

D[💬 Create Chat Session]
E[✉️ User Send Question]

C --> D
D --> E

%% ==========================
%% RAG
%% ==========================

F[🧠 RetrievalService<br/>Get Department from SecurityContext]

G[🔎 Vector Search<br/>Filter by Department]

H[✨ Gemini Generate Answer]

I[📚 Return<br/>Answer + Sources + Citation]

E --> F
F --> G
G --> H
H --> I

%% ==========================
%% FRONTEND
%% ==========================

J[🖥 Frontend Render]

K[📄 Document Viewer]

I --> J
J --> K

%% ==========================
%% NOTE
%% ==========================

style A fill:#E3F2FD,stroke:#1565C0
style B fill:#E8F5E9,stroke:#2E7D32
style C fill:#E8F5E9,stroke:#2E7D32

style D fill:#F3E5F5,stroke:#6A1B9A
style E fill:#F3E5F5,stroke:#6A1B9A

style F fill:#FFF3E0,stroke:#EF6C00
style G fill:#FFF3E0,stroke:#EF6C00
style H fill:#FFF3E0,stroke:#EF6C00
style I fill:#E3F2FD,stroke:#1565C0

style J fill:#E8F5E9,stroke:#2E7D32
style K fill:#E8F5E9,stroke:#2E7D32
```

---

# Luồng xử lý

```
User Login
      │
      ▼
Spring Security
      │
      ▼
SecurityContext
      │
      ▼
Create Chat Session
      │
      ▼
User Send Question
      │
      ▼
RetrievalService
(Get Department from SecurityContext)
      │
      ▼
Vector Search
(Filter by Department)
      │
      ▼
Gemini Generate Answer
      │
      ▼
Answer + Sources + Citation
      │
      ▼
Frontend Render
      │
      ▼
Document Viewer
```

---

# Ý nghĩa từng bước

| Bước                        | Chức năng                                  |
| --------------------------- | ------------------------------------------ |
| User Login                  | Người dùng đăng nhập                       |
| Spring Security             | Xác thực JWT                               |
| SecurityContext             | Lưu User, Role, Department                 |
| Create Chat Session         | Tạo hoặc lấy cuộc hội thoại                |
| User Send Question          | Người dùng gửi câu hỏi                     |
| RetrievalService            | Lấy Department từ SecurityContext          |
| Vector Search               | Chỉ tìm tài liệu thuộc Department của User |
| Gemini Generate Answer      | Sinh câu trả lời từ Context                |
| Answer + Sources + Citation | Trả lời kèm nguồn trích dẫn                |
| Frontend Render             | Hiển thị kết quả                           |
| Document Viewer             | Click citation để mở tài liệu              |

---

# Điểm quan trọng của hệ thống

- SecurityContext là nguồn dữ liệu xác thực duy nhất.
- Department **không lấy từ Request**.
- Vector Search luôn lọc theo Department trước khi tính Similarity.
- Gemini chỉ nhận Context sau khi đã phân quyền.
- Citation được lưu trong `message_file_refs`.
- Người dùng chỉ xem được tài liệu thuộc phòng ban của mình.
