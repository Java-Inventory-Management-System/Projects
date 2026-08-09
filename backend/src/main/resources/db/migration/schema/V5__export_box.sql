-- V5: Export receipts & boxes

-- ============= EXPORT =============

-- Export receipt: sell to customer / transfer / return to supplier / ...
CREATE TABLE export_receipts (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_code            VARCHAR(32)   NOT NULL UNIQUE,
    reason                  VARCHAR(30)   NOT NULL,       -- SALE / TRANSFER / RETURN_SUPPLIER
    customer_id             BIGINT,
    total_amount            DECIMAL(15,2),
    source_import_receipt_id BIGINT,                      -- (unused, reserved)
    total_cogs              DECIMAL(15,2),
    supplier_status         VARCHAR(20),                  -- (unused, reserved for supplier returns)
    supplier_result         VARCHAR(20),
    status                  VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    note                    TEXT,
    created_by              BIGINT        NOT NULL,
    approved_by             BIGINT,
    fulfilled_by            BIGINT,                       -- picker/packer
    fulfilled_at            TIMESTAMP NULL,
    rejected_by             BIGINT,
    rejected_at             TIMESTAMP NULL,
    reject_reason           TEXT,
    external_reference      VARCHAR(100) NULL,            -- external order ref
    created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_export_receipts_status (status),
    INDEX idx_export_receipts_reason (reason),
    INDEX idx_export_receipts_created_at (created_at),
    INDEX idx_export_customer (customer_id),
    CONSTRAINT fk_export_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_export_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_export_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT fk_export_fulfilled_by FOREIGN KEY (fulfilled_by) REFERENCES users(id),
    CONSTRAINT fk_export_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id)
);

-- Export line items
CREATE TABLE export_receipt_items (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_id      BIGINT        NOT NULL,
    product_id      BIGINT        NOT NULL,
    quantity        DECIMAL(15,2) NOT NULL,
    unit_price      DECIMAL(15,2),
    total_price     DECIMAL(15,2),
    INDEX idx_eri_receipt (receipt_id),
    CONSTRAINT fk_export_item_receipt FOREIGN KEY (receipt_id) REFERENCES export_receipts(id),
    CONSTRAINT fk_export_item_product FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Specific units shipped: SERIALIZED (qty=1 each) or BULK (qty>1)
CREATE TABLE export_receipt_item_units (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    export_receipt_item_id  BIGINT        NOT NULL,
    product_unit_id         BIGINT        NOT NULL,
    quantity                DECIMAL(15,2) NOT NULL DEFAULT 1,
    sell_price              DECIMAL(15,2),
    INDEX idx_eriu_item (export_receipt_item_id),
    INDEX idx_eriu_unit (product_unit_id),
    CONSTRAINT fk_export_item_unit_item FOREIGN KEY (export_receipt_item_id) REFERENCES export_receipt_items(id),
    CONSTRAINT fk_export_item_unit_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id)
);

-- Export approval history (PENDING→APPROVED→REJECTED→...)
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

-- ============= PRICE HISTORY =============

-- Product sell price change log
CREATE TABLE sell_price_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id      BIGINT        NOT NULL,
    old_price       DECIMAL(15,2) NOT NULL,
    new_price       DECIMAL(15,2) NOT NULL,
    changed_by      BIGINT        NOT NULL,
    changed_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sph_product (product_id),
    CONSTRAINT fk_sph_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_sph_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- ============= BOXES =============

-- Đóng gói/đóng hộp hàng lẻ (SEALED / UNSEALED), liên kết đơn nhập + loại hộp
CREATE TABLE boxes (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    box_code            VARCHAR(32)   NOT NULL UNIQUE,
    location_id         BIGINT        NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'SEALED',   -- SEALED / UNSEALED
    sealed_quantity     DECIMAL(15,2),                             -- snapshot tổng số lượng lúc đóng hộp
    sealed_by           BIGINT,
    sealed_at           TIMESTAMP     NULL,
    unsealed_by         BIGINT,
    unsealed_at         TIMESTAMP     NULL,
    note                VARCHAR(500),
    import_receipt_id   BIGINT        NULL,                        -- hộp tạo từ đơn nhập
    box_type            VARCHAR(20)   NOT NULL DEFAULT 'MEDIUM',   -- SMALL / MEDIUM / LARGE
    created_by          BIGINT        NOT NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_boxes_location (location_id),
    INDEX idx_boxes_status (status),
    INDEX idx_boxes_import_receipt (import_receipt_id),
    CONSTRAINT fk_boxes_location  FOREIGN KEY (location_id)  REFERENCES locations(id),
    CONSTRAINT fk_boxes_sealed_by FOREIGN KEY (sealed_by)    REFERENCES users(id),
    CONSTRAINT fk_boxes_unsealed_by FOREIGN KEY (unsealed_by) REFERENCES users(id),
    CONSTRAINT fk_boxes_created_by FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT fk_boxes_import_receipt FOREIGN KEY (import_receipt_id) REFERENCES import_receipts(id)
);

ALTER TABLE product_units
    ADD COLUMN box_id BIGINT NULL,
    ADD INDEX idx_product_unit_box (box_id),
    ADD CONSTRAINT fk_product_units_box FOREIGN KEY (box_id) REFERENCES boxes(id);
