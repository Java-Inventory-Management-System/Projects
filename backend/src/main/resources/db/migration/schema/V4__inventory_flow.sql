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

CREATE TABLE import_receipts (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_code      VARCHAR(32)   NOT NULL UNIQUE,
    supplier_id       BIGINT        NOT NULL,
    purchase_order_id BIGINT,
    total_amount      DECIMAL(15,2),
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    note              TEXT,
    created_by        BIGINT        NOT NULL,
    approved_by       BIGINT,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_import_receipts_status (status),
    CONSTRAINT fk_import_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT fk_import_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_import_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT fk_ir_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
);

CREATE TABLE import_receipt_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_id        BIGINT        NOT NULL,
    product_id        BIGINT        NOT NULL,
    quantity          DECIMAL(15,2) NOT NULL,
    unit_price        DECIMAL(15,2),
    warranty_months   INT,
    supplier_batch_no VARCHAR(100),
    CONSTRAINT fk_import_item_receipt FOREIGN KEY (receipt_id) REFERENCES import_receipts(id),
    CONSTRAINT fk_import_item_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE product_units (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    serial_number           VARCHAR(100) UNIQUE,
    product_id              BIGINT        NOT NULL,
    tracking_type           VARCHAR(20)   NOT NULL,
    initial_quantity        DECIMAL(15,2),
    remaining_quantity      DECIMAL(15,2),
    cost_price              DECIMAL(15,2),
    qc_note                 TEXT,
    reserved_quantity       DECIMAL(15,2) DEFAULT 0,
    import_receipt_item_id  BIGINT,
    location_id             BIGINT,
    status                  VARCHAR(30)   NOT NULL DEFAULT 'IN_STOCK',
    imported_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    warranty_months         INT,
    warranty_seal_code      VARCHAR(50),
    is_warranty_active      BOOLEAN DEFAULT TRUE,
    warranty_start_date     TIMESTAMP,
    warranty_expires_at     TIMESTAMP,
    version                 BIGINT DEFAULT 0,
    created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_unit_status (status),
    INDEX idx_unit_serial (serial_number),
    INDEX idx_unit_imported_at (imported_at),
    INDEX idx_product_units_product_status (product_id, status),
    CONSTRAINT fk_unit_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_unit_import_item FOREIGN KEY (import_receipt_item_id) REFERENCES import_receipt_items(id),
    CONSTRAINT fk_unit_location FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE product_unit_status_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_unit_id BIGINT      NOT NULL,
    from_status     VARCHAR(30),
    to_status       VARCHAR(30) NOT NULL,
    source_type     VARCHAR(30) NOT NULL,
    source_id       BIGINT,
    changed_by      BIGINT      NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status_log_unit (product_unit_id),
    INDEX idx_status_log_source (source_type, source_id),
    CONSTRAINT fk_status_log_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id),
    CONSTRAINT fk_status_log_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE export_receipts (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_code            VARCHAR(32)   NOT NULL UNIQUE,
    reason                  VARCHAR(30)   NOT NULL,
    customer_id             BIGINT,
    total_amount            DECIMAL(15,2),
    source_import_receipt_id BIGINT,
    total_cogs              DECIMAL(15,2),
    supplier_status         VARCHAR(20),
    supplier_result         VARCHAR(20),
    status                  VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    note                    TEXT,
    created_by              BIGINT        NOT NULL,
    approved_by             BIGINT,
    created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_export_receipts_status (status),
    INDEX idx_export_receipts_reason (reason),
    CONSTRAINT fk_export_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_export_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_export_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE export_receipt_items (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_id      BIGINT        NOT NULL,
    product_id      BIGINT        NOT NULL,
    quantity        DECIMAL(15,2) NOT NULL,
    unit_price      DECIMAL(15,2),
    total_price     DECIMAL(15,2),
    CONSTRAINT fk_export_item_receipt FOREIGN KEY (receipt_id) REFERENCES export_receipts(id),
    CONSTRAINT fk_export_item_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE export_receipt_item_units (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    export_receipt_item_id  BIGINT        NOT NULL,
    product_unit_id         BIGINT        NOT NULL,
    quantity                DECIMAL(15,2) NOT NULL DEFAULT 1,
    sell_price              DECIMAL(15,2),
    CONSTRAINT fk_export_item_unit_item FOREIGN KEY (export_receipt_item_id) REFERENCES export_receipt_items(id),
    CONSTRAINT fk_export_item_unit_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id)
);

CREATE TABLE return_receipts (
    id                          BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_code                VARCHAR(32)   NOT NULL UNIQUE,
    customer_id                 BIGINT        NOT NULL,
    original_export_receipt_id  BIGINT        NOT NULL,
    reason                      VARCHAR(20)   NOT NULL,
    status                      VARCHAR(20)   NOT NULL DEFAULT 'PENDING_APPROVAL',
    note                        TEXT,
    created_by                  BIGINT        NOT NULL,
    approved_by                 BIGINT,
    approved_at                 TIMESTAMP NULL,
    created_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_return_status (status),
    CONSTRAINT fk_return_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_return_original_export FOREIGN KEY (original_export_receipt_id) REFERENCES export_receipts(id),
    CONSTRAINT fk_return_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_return_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE return_receipt_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_receipt_id BIGINT        NOT NULL,
    product_unit_id   BIGINT,
    product_id        BIGINT,
    quantity          DECIMAL(15,2),
    `condition`       VARCHAR(20)   NOT NULL,
    resulting_action  VARCHAR(20)   NOT NULL,
    CONSTRAINT fk_return_item_receipt FOREIGN KEY (return_receipt_id) REFERENCES return_receipts(id)
);

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
