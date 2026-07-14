ALTER TABLE product_units MODIFY status        VARCHAR(30) NOT NULL DEFAULT 'PENDING';
ALTER TABLE import_receipt_items MODIFY quantity DECIMAL(15,2) NOT NULL;
ALTER TABLE export_receipt_items MODIFY quantity DECIMAL(15,2) NOT NULL;
