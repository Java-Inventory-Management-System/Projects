-- Some existing databases were created without this column even though V3 was
-- recorded as applied. Bring both fresh and drifted schemas to the same state.
SET @import_item_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'product_units'
      AND COLUMN_NAME = 'import_receipt_item_id'
);

SET @import_item_column_sql = IF(
    @import_item_column_exists = 0,
    'ALTER TABLE product_units ADD COLUMN import_receipt_item_id BIGINT NULL',
    'ALTER TABLE product_units MODIFY COLUMN import_receipt_item_id BIGINT NULL'
);

PREPARE import_item_column_statement FROM @import_item_column_sql;
EXECUTE import_item_column_statement;
DEALLOCATE PREPARE import_item_column_statement;

SET @import_item_fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'product_units'
      AND CONSTRAINT_NAME = 'fk_unit_import_item'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @import_items_table_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_receipt_items'
);

SET @import_item_fk_sql = IF(
    @import_item_fk_exists = 0 AND @import_items_table_exists > 0,
    'ALTER TABLE product_units ADD CONSTRAINT fk_unit_import_item FOREIGN KEY (import_receipt_item_id) REFERENCES import_receipt_items(id)',
    'SELECT 1'
);

PREPARE import_item_fk_statement FROM @import_item_fk_sql;
EXECUTE import_item_fk_statement;
DEALLOCATE PREPARE import_item_fk_statement;
