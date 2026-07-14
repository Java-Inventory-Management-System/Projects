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
