CREATE TABLE IF NOT EXISTS warranty_requests (
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
    INDEX idx_wr_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @product_units_table_exists = (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_units'
);
SET @customers_table_exists = (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'
);
SET @users_table_exists = (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
);

SET @wr_product_unit_fk_sql = IF(
    @product_units_table_exists > 0,
    'ALTER TABLE warranty_requests ADD CONSTRAINT fk_wr_product_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id)',
    'SELECT 1'
);
PREPARE wr_product_unit_fk_statement FROM @wr_product_unit_fk_sql;
EXECUTE wr_product_unit_fk_statement;
DEALLOCATE PREPARE wr_product_unit_fk_statement;

SET @wr_replacement_unit_fk_sql = IF(
    @product_units_table_exists > 0,
    'ALTER TABLE warranty_requests ADD CONSTRAINT fk_wr_replacement_unit FOREIGN KEY (replacement_unit_id) REFERENCES product_units(id)',
    'SELECT 1'
);
PREPARE wr_replacement_unit_fk_statement FROM @wr_replacement_unit_fk_sql;
EXECUTE wr_replacement_unit_fk_statement;
DEALLOCATE PREPARE wr_replacement_unit_fk_statement;

SET @wr_customer_fk_sql = IF(
    @customers_table_exists > 0,
    'ALTER TABLE warranty_requests ADD CONSTRAINT fk_wr_customer FOREIGN KEY (customer_id) REFERENCES customers(id)',
    'SELECT 1'
);
PREPARE wr_customer_fk_statement FROM @wr_customer_fk_sql;
EXECUTE wr_customer_fk_statement;
DEALLOCATE PREPARE wr_customer_fk_statement;

SET @wr_handled_by_fk_sql = IF(
    @users_table_exists > 0,
    'ALTER TABLE warranty_requests ADD CONSTRAINT fk_wr_handled_by FOREIGN KEY (handled_by) REFERENCES users(id)',
    'SELECT 1'
);
PREPARE wr_handled_by_fk_statement FROM @wr_handled_by_fk_sql;
EXECUTE wr_handled_by_fk_statement;
DEALLOCATE PREPARE wr_handled_by_fk_statement;
