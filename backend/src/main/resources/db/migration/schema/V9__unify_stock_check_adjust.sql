ALTER TABLE stock_checks ADD COLUMN scope_type VARCHAR(20)  AFTER status;
ALTER TABLE stock_checks ADD COLUMN scope_id   BIGINT       AFTER scope_type;
CREATE INDEX idx_stock_checks_scope ON stock_checks(scope_type, scope_id);

ALTER TABLE stock_adjustments ADD COLUMN source_type VARCHAR(20) AFTER status;
ALTER TABLE stock_adjustments ADD COLUMN source_id   BIGINT       AFTER source_type;
CREATE INDEX idx_sa_source ON stock_adjustments(source_type, source_id);

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
