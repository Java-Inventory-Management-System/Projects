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

ALTER TABLE export_receipts ADD COLUMN fulfilled_by BIGINT AFTER approved_by;
ALTER TABLE export_receipts ADD COLUMN fulfilled_at TIMESTAMP NULL AFTER fulfilled_by;
ALTER TABLE export_receipts ADD COLUMN rejected_by BIGINT AFTER fulfilled_at;
ALTER TABLE export_receipts ADD COLUMN rejected_at TIMESTAMP NULL AFTER rejected_by;
ALTER TABLE export_receipts ADD COLUMN reject_reason TEXT AFTER rejected_at;

ALTER TABLE export_receipts ADD CONSTRAINT fk_export_fulfilled_by FOREIGN KEY (fulfilled_by) REFERENCES users(id);
ALTER TABLE export_receipts ADD CONSTRAINT fk_export_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id);
