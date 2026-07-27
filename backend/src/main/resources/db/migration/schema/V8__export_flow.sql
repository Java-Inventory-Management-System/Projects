CREATE TABLE export_receipt_status_histories (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_id      BIGINT        NOT NULL,
    from_status     VARCHAR(20)   NOT NULL,
    to_status       VARCHAR(20)   NOT NULL,
    reason          TEXT,
    changed_by      BIGINT        NOT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ersh_receipt (receipt_id),
    CONSTRAINT fk_ersh_receipt FOREIGN KEY (receipt_id) REFERENCES export_receipts(id),
    CONSTRAINT fk_ersh_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)
);
