-- V4: Purchase orders & import receipts

-- ============= PURCHASE ORDERS =============

-- Purchase order to supplier: place first, import later
CREATE TABLE purchase_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    po_code VARCHAR(32) NOT NULL UNIQUE,
    supplier_id BIGINT NOT NULL,
    total_amount DECIMAL(15,2),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    expected_date DATE,
    note TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_po_status (status),
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Purchase order line items
CREATE TABLE purchase_order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    po_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    unit_price DECIMAL(15,2),
    received_quantity DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_poi_po (po_id),
    CONSTRAINT fk_poi_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
    CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============= IMPORT =============

-- Import receipt: supplier delivers goods
CREATE TABLE import_receipts (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_code      VARCHAR(32)   NOT NULL UNIQUE,
    supplier_id       BIGINT        NOT NULL,
    purchase_order_id BIGINT,                             -- source PO (optional)
    total_amount      DECIMAL(15,2),
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    note              TEXT,
    created_by        BIGINT        NOT NULL,
    approved_by       BIGINT,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_import_receipts_status (status),
    INDEX idx_import_receipts_created_at (created_at),
    INDEX idx_import_supplier (supplier_id),
    INDEX idx_import_po (purchase_order_id),
    CONSTRAINT fk_import_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT fk_import_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_import_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT fk_ir_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
);

-- Import receipt line items
CREATE TABLE import_receipt_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_id        BIGINT        NOT NULL,
    product_id        BIGINT        NOT NULL,
    quantity          DECIMAL(15,2) NOT NULL,
    unit_price        DECIMAL(15,2),
    warranty_months   INT,
    supplier_batch_no VARCHAR(100),
    INDEX idx_iri_receipt (receipt_id),
    INDEX idx_iri_product (product_id),
    CONSTRAINT fk_import_item_receipt FOREIGN KEY (receipt_id) REFERENCES import_receipts(id),
    CONSTRAINT fk_import_item_product FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============= PRODUCT UNITS =============

-- tracking_type=SERIALIZED: 1 row = 1 unit (has serial_number)
-- tracking_type=BULK:       1 row = 1 batch (initial + remaining qty)
CREATE TABLE product_units (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    serial_number           VARCHAR(100) UNIQUE,          -- NULL for BULK
    product_id              BIGINT        NOT NULL,
    tracking_type           VARCHAR(20)   NOT NULL,       -- SERIALIZED / BULK
    initial_quantity        DECIMAL(15,2),                -- BULK: total imported
    remaining_quantity      DECIMAL(15,2),                -- BULK: still available
    cost_price              DECIMAL(15,2),
    qc_note                 TEXT,
    reserved_quantity       DECIMAL(15,2) DEFAULT 0,
    import_receipt_item_id  BIGINT,                       -- source import item
    location_id             BIGINT,                       -- storage location
    status                  VARCHAR(30)   NOT NULL DEFAULT 'IN_STOCK',   -- IN_STOCK/EXPORTED/DEFECTIVE/...
    imported_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    warranty_months         INT,
    warranty_seal_code      VARCHAR(50),
    is_warranty_active      BOOLEAN DEFAULT TRUE,
    warranty_start_date     TIMESTAMP,                    -- set at export (warranty begins)
    warranty_expires_at     TIMESTAMP,
    version                 BIGINT DEFAULT 0,             -- optimistic locking
    created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_unit_status (status),
    INDEX idx_unit_serial (serial_number),
    INDEX idx_unit_imported_at (imported_at),
    INDEX idx_product_units_product_status (product_id, status),
    INDEX idx_pu_import_item (import_receipt_item_id),
    INDEX idx_pu_location (location_id),
    CONSTRAINT fk_unit_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_unit_import_item FOREIGN KEY (import_receipt_item_id) REFERENCES import_receipt_items(id),
    CONSTRAINT fk_unit_location FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Unit status change history (IN_STOCK→EXPORTED→DEFECTIVE→...)
CREATE TABLE product_unit_status_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_unit_id BIGINT      NOT NULL,
    from_status     VARCHAR(30),
    to_status       VARCHAR(30) NOT NULL,
    source_type     VARCHAR(30) NOT NULL,     -- EXPORT_RECEIPT / RETURN_RECEIPT / STOCK_ADJUSTMENT
    source_id       BIGINT,
    changed_by      BIGINT      NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status_log_unit (product_unit_id),
    INDEX idx_status_log_source (source_type, source_id),
    CONSTRAINT fk_status_log_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id),
    CONSTRAINT fk_status_log_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)
);
