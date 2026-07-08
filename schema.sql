-- ============================================================
-- IDMS - Intelligent Document Management System
-- Schema PostgreSQL 16 + pgvector 0.8.3
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. departments
-- ============================================================
CREATE TABLE departments (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(250),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. users
-- ============================================================
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(50)  NOT NULL,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    phone           VARCHAR(15)  NOT NULL,
    avatar_url      VARCHAR(255),
    email           VARCHAR(100) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'USER',
    department_id   INT REFERENCES departments(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

-- ============================================================
-- 3. user_sessions
-- ============================================================
CREATE TABLE user_sessions (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id),
    refresh_token  VARCHAR(255) NOT NULL UNIQUE,
    is_revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    user_agent     VARCHAR(255),
    ip_address     VARCHAR(45),
    expires_at     TIMESTAMP NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. document
-- ============================================================
CREATE TYPE document_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE document (
    id                  BIGSERIAL PRIMARY KEY,
    status              document_status NOT NULL DEFAULT 'PENDING',
    error_message       VARCHAR(500),
    retry_count         INT NOT NULL DEFAULT 0,
    file_name           VARCHAR(255) NOT NULL,
    file_path           VARCHAR(500) NOT NULL,
    file_type           VARCHAR(50)  NOT NULL,
    file_size           BIGINT NOT NULL,
    department_id       INT REFERENCES departments(id),
    uploaded_by         BIGINT NOT NULL REFERENCES users(id),
    parent_document_id  BIGINT REFERENCES document(id),
    version             INT NOT NULL DEFAULT 1,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

-- ============================================================
-- 5. document_chunks
-- ============================================================
CREATE TABLE document_chunks (
    id            BIGSERIAL PRIMARY KEY,
    document_id   BIGINT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    chunk_index   INT  NOT NULL,
    page_number   INT,
    content       TEXT NOT NULL,
    embedding     VECTOR(3072),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- 6. chat_sessions
-- ============================================================
CREATE TABLE chat_sessions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    title       VARCHAR(255) NOT NULL DEFAULT 'New chat',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

-- ============================================================
-- 7. chat_message
-- ============================================================
CREATE TYPE message_role AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

CREATE TABLE chat_message (
    id           BIGSERIAL PRIMARY KEY,
    session_id   BIGINT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role         message_role NOT NULL,
    content      TEXT NOT NULL,
    token_count  INT,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. message_file_refs
-- ============================================================
CREATE TABLE message_file_refs (
    id           BIGSERIAL PRIMARY KEY,
    message_id   BIGINT NOT NULL REFERENCES chat_message(id) ON DELETE CASCADE,
    document_id  BIGINT NOT NULL REFERENCES document(id),
    chunk_id     BIGINT NOT NULL REFERENCES document_chunks(id),
    excerpt      TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. activity_logs
-- ============================================================
CREATE TABLE activity_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    target_type VARCHAR(50)  NOT NULL,
    target_id   BIGINT,
    metadata    JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_document_department       ON document(department_id);
CREATE INDEX idx_document_uploaded_by      ON document(uploaded_by);
CREATE INDEX idx_document_deleted_at       ON document(deleted_at);
CREATE INDEX idx_document_chunks_document  ON document_chunks(document_id);
CREATE INDEX idx_chat_message_session      ON chat_message(session_id);
CREATE INDEX idx_user_sessions_user        ON user_sessions(user_id);
CREATE INDEX idx_activity_logs_user        ON activity_logs(user_id);