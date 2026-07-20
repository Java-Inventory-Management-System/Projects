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
    CONSTRAINT fk_poi_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
    CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES products(id)
);

SET @import_receipts_table_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_receipts'
);

SET @purchase_order_column_sql = IF(
    @import_receipts_table_exists > 0,
    'ALTER TABLE import_receipts ADD COLUMN purchase_order_id BIGINT NULL',
    'SELECT 1'
);

PREPARE purchase_order_column_statement FROM @purchase_order_column_sql;
EXECUTE purchase_order_column_statement;
DEALLOCATE PREPARE purchase_order_column_statement;

SET @purchase_order_fk_sql = IF(
    @import_receipts_table_exists > 0,
    'ALTER TABLE import_receipts ADD CONSTRAINT fk_ir_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)',
    'SELECT 1'
);

PREPARE purchase_order_fk_statement FROM @purchase_order_fk_sql;
EXECUTE purchase_order_fk_statement;
DEALLOCATE PREPARE purchase_order_fk_statement;

ALTER TABLE purchase_orders ADD INDEX idx_po_status (status);
ALTER TABLE purchase_order_items ADD INDEX idx_poi_po (po_id);
