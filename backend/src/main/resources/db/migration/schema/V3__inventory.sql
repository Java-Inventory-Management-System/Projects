CREATE TABLE warehouses (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(32)  NOT NULL UNIQUE,
    address     TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE locations (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    zone_code     VARCHAR(10)   NOT NULL,
    shelf_code    VARCHAR(10)   NOT NULL,
    bin_code      VARCHAR(10)   NOT NULL,
    full_code     VARCHAR(32)   NOT NULL UNIQUE,
    description   TEXT,
    max_capacity  DECIMAL(15,2),
    warehouse_id  BIGINT,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (zone_code, shelf_code, bin_code),
    INDEX idx_locations_warehouse (warehouse_id),
    INDEX idx_locations_is_active (is_active),
    CONSTRAINT fk_locations_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE category_zones (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT       NOT NULL UNIQUE,
    zone_code   VARCHAR(10)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cz_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE customers (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    address     TEXT,
    note        TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_is_active (is_active)
);

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
    status                  VARCHAR(20)   NOT NULL DEFAULT 'PENDING_APPROVAL',
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

CREATE TABLE stock_checks (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    check_code     VARCHAR(32)   NOT NULL UNIQUE,
    status         VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    note           TEXT,
    created_by     BIGINT        NOT NULL,
    approved_by    BIGINT,
    approval_note  TEXT,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stock_checks_status (status),
    CONSTRAINT fk_sc_created_by  FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT fk_sc_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE stock_check_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    stock_check_id    BIGINT        NOT NULL,
    product_unit_id   BIGINT        NOT NULL,
    expected_status   VARCHAR(30),
    actual_status     VARCHAR(30),
    counted_quantity  DECIMAL(15,2),
    difference        VARCHAR(20),
    note              TEXT,
    CONSTRAINT fk_sci_check FOREIGN KEY (stock_check_id)  REFERENCES stock_checks(id),
    CONSTRAINT fk_sci_unit  FOREIGN KEY (product_unit_id) REFERENCES product_units(id)
);

CREATE TABLE stock_adjustments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    adjust_code     VARCHAR(32)   NOT NULL UNIQUE,
    type            VARCHAR(20)   NOT NULL,
    product_unit_id BIGINT,
    product_id      BIGINT,
    quantity        INT,
    reason          TEXT          NOT NULL,
    image_url       VARCHAR(500),
    status          VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    created_by      BIGINT        NOT NULL,
    approved_by     BIGINT,
    approval_note   TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sa_product_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id),
    CONSTRAINT fk_sa_product      FOREIGN KEY (product_id)      REFERENCES products(id),
    CONSTRAINT fk_sa_created_by   FOREIGN KEY (created_by)      REFERENCES users(id),
    CONSTRAINT fk_sa_approved_by  FOREIGN KEY (approved_by)     REFERENCES users(id)
);

CREATE TABLE price_adjustments (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    adjust_code         VARCHAR(32)   NOT NULL UNIQUE,
    import_receipt_item_id BIGINT    NOT NULL,
    old_price           DECIMAL(15,2) NOT NULL,
    new_price           DECIMAL(15,2) NOT NULL,
    reason              TEXT          NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    created_by          BIGINT        NOT NULL,
    approved_by         BIGINT,
    approval_note       TEXT,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pa_import_item FOREIGN KEY (import_receipt_item_id) REFERENCES import_receipt_items(id),
    CONSTRAINT fk_pa_created_by  FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT fk_pa_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE warranty_requests (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_code        VARCHAR(50)  NOT NULL UNIQUE,
    product_unit_id     BIGINT       NOT NULL,
    customer_id         BIGINT,
    issue_description   TEXT         NOT NULL,
    resolution_type     VARCHAR(30),
    replacement_unit_id BIGINT,
    rma_number          VARCHAR(100),
    sent_to_partner_at  TIMESTAMP NULL,
    expected_return_at  TIMESTAMP NULL,
    partner_note        TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    handled_by          BIGINT,
    completed_at        TIMESTAMP NULL,
    note                TEXT,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wr_product_unit (product_unit_id),
    INDEX idx_wr_replacement_unit (replacement_unit_id),
    INDEX idx_wr_customer (customer_id),
    INDEX idx_wr_status (status),
    INDEX idx_wr_created_at (created_at),
    CONSTRAINT fk_wr_product_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id),
    CONSTRAINT fk_wr_replacement_unit FOREIGN KEY (replacement_unit_id) REFERENCES product_units(id),
    CONSTRAINT fk_wr_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_wr_handled_by FOREIGN KEY (handled_by) REFERENCES users(id)
);
