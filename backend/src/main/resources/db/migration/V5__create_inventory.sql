CREATE TABLE locations (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    zone_code   VARCHAR(10)  NOT NULL,
    shelf_code  VARCHAR(10)  NOT NULL,
    bin_code    VARCHAR(10)  NOT NULL,
    full_code   VARCHAR(32)  NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (zone_code, shelf_code, bin_code)
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
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE import_receipts (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_code  VARCHAR(32)   NOT NULL UNIQUE,
    supplier_id   BIGINT        NOT NULL,
    total_amount  DECIMAL(15,2),
    status        VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    note          TEXT,
    created_by    BIGINT        NOT NULL,
    approved_by   BIGINT,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_import_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT fk_import_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_import_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE import_receipt_items (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_id      BIGINT        NOT NULL,
    product_id      BIGINT        NOT NULL,
    quantity        INT           NOT NULL,
    unit_price      DECIMAL(15,2),
    warranty_months INT,
    CONSTRAINT fk_import_item_receipt FOREIGN KEY (receipt_id) REFERENCES import_receipts(id),
    CONSTRAINT fk_import_item_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE product_units (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    serial_number       VARCHAR(100) UNIQUE,
    product_id          BIGINT        NOT NULL,
    tracking_type       VARCHAR(20)   NOT NULL,
    initial_quantity    DECIMAL(15,2),
    remaining_quantity  DECIMAL(15,2),
    import_receipt_item_id BIGINT    NOT NULL,
    location_id         BIGINT,
    status              VARCHAR(20)   NOT NULL DEFAULT 'IN_STOCK',
    imported_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    warranty_months     INT,
    warranty_start_date TIMESTAMP,
    warranty_expires_at TIMESTAMP,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_unit_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_unit_import_item FOREIGN KEY (import_receipt_item_id) REFERENCES import_receipt_items(id),
    CONSTRAINT fk_unit_location FOREIGN KEY (location_id) REFERENCES locations(id),
    INDEX idx_unit_status (status),
    INDEX idx_unit_serial (serial_number),
    INDEX idx_unit_imported_at (imported_at)
);

CREATE TABLE product_unit_status_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_unit_id BIGINT      NOT NULL,
    from_status     VARCHAR(20),
    to_status       VARCHAR(20) NOT NULL,
    source_type     VARCHAR(30) NOT NULL,
    source_id       BIGINT,
    changed_by      BIGINT      NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_status_log_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id),
    CONSTRAINT fk_status_log_changed_by FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_status_log_unit (product_unit_id),
    INDEX idx_status_log_source (source_type, source_id)
);
