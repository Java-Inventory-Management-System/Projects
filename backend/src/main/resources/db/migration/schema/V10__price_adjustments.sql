CREATE TABLE price_adjustments (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    adjust_code         VARCHAR(32)   NOT NULL UNIQUE COMMENT 'PADJ-YYYYMMDD-xxxx',
    import_receipt_item_id BIGINT    NOT NULL,
    old_price           DECIMAL(15,2) NOT NULL,
    new_price           DECIMAL(15,2) NOT NULL,
    reason              TEXT          NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / APPROVED / REJECTED',
    created_by          BIGINT        NOT NULL,
    approved_by         BIGINT,
    approval_note       TEXT,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pa_import_item FOREIGN KEY (import_receipt_item_id) REFERENCES import_receipt_items(id),
    CONSTRAINT fk_pa_created_by  FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT fk_pa_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
