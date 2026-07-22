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
