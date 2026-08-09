-- V6: Return & warranty domain

-- ============= RETURN =============

-- Return receipt: customer returns purchased goods
CREATE TABLE return_receipts (
    id                          BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_code                VARCHAR(32)   NOT NULL UNIQUE,
    customer_id                 BIGINT        NOT NULL,
    original_export_receipt_id  BIGINT        NOT NULL,   -- original export
    reason                      VARCHAR(20)   NOT NULL,   -- DEFECTIVE / CHANGE_MIND
    status                      VARCHAR(20)   NOT NULL DEFAULT 'PENDING_APPROVAL',
    note                        TEXT,
    created_by                  BIGINT        NOT NULL,
    approved_by                 BIGINT,
    approved_at                 TIMESTAMP NULL,
    created_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_return_status (status),
    INDEX idx_return_reason (reason),
    INDEX idx_return_customer (customer_id),
    INDEX idx_return_original_export (original_export_receipt_id),
    CONSTRAINT fk_return_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_return_original_export FOREIGN KEY (original_export_receipt_id) REFERENCES export_receipts(id),
    CONSTRAINT fk_return_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_return_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Return line items: condition + resulting action (restock/scrap/warranty)
CREATE TABLE return_receipt_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_receipt_id BIGINT        NOT NULL,
    product_unit_id   BIGINT,                             -- NULL for BULK
    product_id        BIGINT,                             -- used for BULK
    quantity          DECIMAL(15,2),
    `condition`       VARCHAR(20)   NOT NULL,             -- GOOD / DEFECTIVE
    resulting_action  VARCHAR(20)   NOT NULL,             -- RESTOCK / SCRAP / WARRANTY
    INDEX idx_rri_return (return_receipt_id),
    CONSTRAINT fk_return_item_receipt FOREIGN KEY (return_receipt_id) REFERENCES return_receipts(id)
);

-- ============= HARDENING + WARRANTY FLOW =============

-- 1) Optimistic locking on return receipts
ALTER TABLE return_receipts ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- 2) Evidence (defective returns: required description + 1 photo) + prevent duplicate unit returns
ALTER TABLE return_receipt_items
    ADD COLUMN description TEXT,
    ADD COLUMN evidence_image VARCHAR(255),
    ADD UNIQUE KEY uk_return_item_unit (return_receipt_id, product_unit_id);

-- 3) Export to supplier (returns / warranty) — target supplier
ALTER TABLE export_receipts ADD COLUMN supplier_id BIGINT;
ALTER TABLE export_receipts
    ADD CONSTRAINT fk_export_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

-- 4) Warranty import: link back to the original warranty-replacement export + per-item result
ALTER TABLE import_receipts ADD COLUMN original_warranty_export_id BIGINT;
ALTER TABLE import_receipts
    ADD CONSTRAINT fk_import_warranty_export FOREIGN KEY (original_warranty_export_id) REFERENCES export_receipts(id);

ALTER TABLE import_receipt_items ADD COLUMN warranty_result_type VARCHAR(20);
