-- V7: Stock checks, adjustments & box confirmations

-- ============= STOCK CHECKS =============

CREATE TABLE stock_checks (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    check_code     VARCHAR(32)   NOT NULL UNIQUE,
    status         VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    scope_type     VARCHAR(20),
    scope_id       BIGINT,
    note           TEXT,
    created_by     BIGINT        NOT NULL,
    approved_by    BIGINT,
    approval_note  TEXT,
    checked_by     BIGINT NULL,
    entered_by     BIGINT NULL,
    bin_from       VARCHAR(10) NULL,
    bin_to         VARCHAR(10) NULL,
    box_status_snapshot TEXT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stock_checks_status (status),
    INDEX idx_stock_checks_scope (scope_type, scope_id),
    INDEX idx_sc_created_by (created_by),
    CONSTRAINT fk_sc_created_by  FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT fk_sc_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT fk_sc_checked_by FOREIGN KEY (checked_by) REFERENCES users(id),
    CONSTRAINT fk_sc_entered_by FOREIGN KEY (entered_by) REFERENCES users(id)
);

CREATE TABLE stock_check_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    stock_check_id    BIGINT        NOT NULL,
    product_unit_id   BIGINT        NOT NULL,
    tracking_type     VARCHAR(20),
    expected_status   VARCHAR(30),
    actual_status     VARCHAR(30),
    counted_quantity  DECIMAL(15,2),
    expected_quantity DECIMAL(15,2) NULL,          -- bulk snapshot at check creation
    photo             TEXT,
    difference        VARCHAR(20),
    note              TEXT,
    auto_filled       BOOLEAN DEFAULT FALSE,
    touched_at        TIMESTAMP NULL,
    suspect_seal      BOOLEAN NOT NULL DEFAULT FALSE,
    damaged_packaging BOOLEAN NOT NULL DEFAULT FALSE,
    INDEX idx_sci_check (stock_check_id),
    CONSTRAINT fk_sci_check FOREIGN KEY (stock_check_id)  REFERENCES stock_checks(id),
    CONSTRAINT fk_sci_unit  FOREIGN KEY (product_unit_id) REFERENCES product_units(id)
);

CREATE TABLE stock_check_item_histories (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    stock_check_id      BIGINT        NOT NULL,
    product_unit_id     BIGINT        NOT NULL,
    old_actual_status   VARCHAR(30),
    new_actual_status   VARCHAR(30),
    old_counted_quantity DECIMAL(15,2),
    new_counted_quantity DECIMAL(15,2),
    note                TEXT,
    changed_by          BIGINT        NOT NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_scih_check (stock_check_id),
    INDEX idx_scih_unit (product_unit_id),
    CONSTRAINT fk_scih_check  FOREIGN KEY (stock_check_id)    REFERENCES stock_checks(id),
    CONSTRAINT fk_scih_unit   FOREIGN KEY (product_unit_id)   REFERENCES product_units(id),
    CONSTRAINT fk_scih_changed_by FOREIGN KEY (changed_by)    REFERENCES users(id)
);

-- ============= STOCK CHECK SCHEDULES =============

CREATE TABLE stock_check_schedules (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    zone_code           VARCHAR(10) NOT NULL,
    bin_from            VARCHAR(10) NULL,
    bin_to              VARCHAR(10) NULL,
    frequency_days      INT         NOT NULL,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    default_assignee_id BIGINT      NULL,
    note                TEXT        NULL,
    created_by          BIGINT      NOT NULL,
    created_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_scs_zone (zone_code),
    CONSTRAINT fk_scs_assignee  FOREIGN KEY (default_assignee_id) REFERENCES users(id),
    CONSTRAINT fk_scs_created_by FOREIGN KEY (created_by)         REFERENCES users(id)
);

-- ============= STOCK ADJUSTMENTS =============

CREATE TABLE stock_adjustments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    adjust_code     VARCHAR(32)   NOT NULL UNIQUE,
    type            VARCHAR(20)   NOT NULL,          -- LOST / DAMAGED / FOUND / EXPIRED
    product_unit_id BIGINT,
    product_id      BIGINT,
    quantity        DECIMAL(15,2) NULL,              -- decimal for bulk (meter/kg) goods
    reason          TEXT          NOT NULL,
    image_url       VARCHAR(500),
    serial_number   VARCHAR(100),
    location_id     BIGINT,
    source_type     VARCHAR(20),                     -- STOCK_CHECK / MANUAL
    source_id       BIGINT,
    status          VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    created_by      BIGINT        NOT NULL,
    approved_by     BIGINT,
    approval_note   TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sa_source (source_type, source_id),
    INDEX idx_sa_location (location_id),
    INDEX idx_sa_status (status),
    INDEX idx_sa_type (type),
    INDEX idx_sa_created_by (created_by),
    CONSTRAINT fk_sa_product_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id),
    CONSTRAINT fk_sa_product      FOREIGN KEY (product_id)      REFERENCES products(id),
    CONSTRAINT fk_sa_created_by   FOREIGN KEY (created_by)      REFERENCES users(id),
    CONSTRAINT fk_sa_approved_by  FOREIGN KEY (approved_by)     REFERENCES users(id)
);

-- ============= PRICE ADJUSTMENTS =============

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
    approved_at         TIMESTAMP NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pa_status (status),
    INDEX idx_pa_created_by (created_by),
    INDEX idx_pa_import_item (import_receipt_item_id),
    CONSTRAINT fk_pa_import_item FOREIGN KEY (import_receipt_item_id) REFERENCES import_receipt_items(id),
    CONSTRAINT fk_pa_created_by  FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT fk_pa_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);
