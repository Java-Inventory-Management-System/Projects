-- V1: Authentication & Authorization

-- User roles: ADMIN, MANAGER, SALES, STOCK
CREATE TABLE roles (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- System users: login, password reset, role-based access
CREATE TABLE users (
    id                BIGINT PRIMARY KEY AUTO_INCREMENT,
    username          VARCHAR(100) NOT NULL UNIQUE,
    full_name         VARCHAR(255),
    password          VARCHAR(255) NOT NULL,
    gender            SMALLINT,                         -- 0=male 1=female 2=other
    date_of_birth     DATE,
    phone_number      VARCHAR(20) UNIQUE,
    email             VARCHAR(255) UNIQUE,
    status            VARCHAR(20)           DEFAULT 'ACTIVE',
    is_password_reset SMALLINT              DEFAULT 0 NOT NULL,
    role_id           BIGINT       NOT NULL,
    is_deleted        SMALLINT              DEFAULT 0 NOT NULL,
    last_login        TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id),
    CONSTRAINT ck_users_is_deleted CHECK ( is_deleted IN (0, 1)),
    CONSTRAINT ck_users_gender CHECK ( gender IN (0, 1, 2))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- JWT refresh tokens (persistent login)
CREATE TABLE refresh_tokens (
    id          BIGINT AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    token       VARCHAR(500) NOT NULL,
    expiry_date TIMESTAMP    NOT NULL,
    CONSTRAINT pk_refresh_token PRIMARY KEY (id),
    INDEX idx_rt_token (token),
    INDEX idx_rt_user (user_id),
    CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Password reset tokens (email-based)
CREATE TABLE password_reset_tokens (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP    NOT NULL,
    used        SMALLINT              DEFAULT 0 NOT NULL,
    INDEX idx_prt_user (user_id),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Audit trail: logs every action (create/update/delete/approve/login/...)
CREATE TABLE audit_logs (
    id          BIGINT AUTO_INCREMENT,
    user_id     BIGINT,
    username    VARCHAR(100),
    ip_address  VARCHAR(45),
    request_id  VARCHAR(36),
    action      VARCHAR(100)  NOT NULL,                      -- CREATE/UPDATE/APPROVE/LOGIN/...
    entity_name VARCHAR(100)  NOT NULL,                      -- PRODUCT/IMPORT_RECEIPT/...
    entity_id   VARCHAR(100),                                -- target entity's ID
    old_value   JSON,                                        -- before snapshot
    new_value   JSON,                                        -- after snapshot
    status      VARCHAR(20)   NOT NULL DEFAULT 'SUCCESS',    -- SUCCESS / FAILED
    error_msg   TEXT,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_audit_logs PRIMARY KEY (id),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id),
    INDEX idx_audit_created_at (created_at),
    INDEX idx_audit_entity (entity_name, entity_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action, created_at),
    INDEX idx_audit_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO roles (name, description)
VALUES ('ADMIN', 'System Administrator'),
       ('MANAGER', 'Warehouse Manager'),
       ('SALES', 'Sales Person'),
       ('STOCK', 'Stock Keeper');

INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
VALUES ('admin', 'Administrator',
        '$2a$10$eK.JsUViqKjM9drfhi4dlu/XiLY0E4JO3Ccd2IzmhbNfdZEDeFnay',
        'admin@system.com', 'ACTIVE', (SELECT id FROM roles WHERE name = 'ADMIN'), 0);
INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
VALUES ('manager', 'Manager',
        '$2a$10$yDJg1GQnTrIAtljWPaI9f.E3sgcmD4MrBntLhMJd2B8VtP30ZcprC',
        'manager@system.com', 'ACTIVE', (SELECT id FROM roles WHERE name = 'MANAGER'), 0);
INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
VALUES ('sales', 'Sales',
        '$2a$10$ho16i2KPpfklD3a49hichOmUL0K06xmKQedGBZsidecteOWDmofbG',
        'sales@system.com', 'ACTIVE', (SELECT id FROM roles WHERE name = 'SALES'), 0);
INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
VALUES ('stock', 'Stock',
        '$2a$10$j1r5z1n5sIeyVAzsEjv6ieg6Zi6aLIJDRQ9bTtonaDocyfsYAlDdS',
        'stock@system.com', 'ACTIVE', (SELECT id FROM roles WHERE name = 'STOCK'), 0);
