CREATE TABLE audit_logs
(
    id          BIGINT AUTO_INCREMENT,
    user_id     BIGINT,
    username    VARCHAR(100),
    ip_address  VARCHAR(45),
    request_id  VARCHAR(36),
    action      VARCHAR(100)  NOT NULL,
    entity_name VARCHAR(100)  NOT NULL,
    entity_id   VARCHAR(100),
    old_value   JSON,
    new_value   JSON,
    status      VARCHAR(20)   NOT NULL DEFAULT 'SUCCESS',
    error_msg   TEXT,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_audit_logs PRIMARY KEY (id),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id),

    INDEX idx_audit_created_at (created_at),
    INDEX idx_audit_entity (entity_name, entity_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action, created_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
