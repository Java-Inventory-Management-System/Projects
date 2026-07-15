-- Performance indexes for common filtered queries

ALTER TABLE products    ADD INDEX idx_products_is_active (is_active);
ALTER TABLE products    ADD INDEX idx_products_name (name);
ALTER TABLE brands     ADD INDEX idx_brands_is_active (is_active);
ALTER TABLE categories ADD INDEX idx_categories_is_active (is_active);
ALTER TABLE suppliers  ADD INDEX idx_suppliers_is_active (is_active);
ALTER TABLE customers  ADD INDEX idx_customers_is_active (is_active);
ALTER TABLE locations  ADD INDEX idx_locations_is_active (is_active);
ALTER TABLE import_receipts ADD INDEX idx_import_receipts_status (status);
ALTER TABLE export_receipts ADD INDEX idx_export_receipts_status (status);
ALTER TABLE export_receipts ADD INDEX idx_export_receipts_reason (reason);
ALTER TABLE stock_checks ADD INDEX idx_stock_checks_status (status);
ALTER TABLE product_units ADD INDEX idx_product_units_product_status (product_id, status);
