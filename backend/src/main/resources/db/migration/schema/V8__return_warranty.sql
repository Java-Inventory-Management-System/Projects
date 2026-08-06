-- V8: Return domain hardening + warranty flow fields
-- 1) Optimistic locking on return receipts
ALTER TABLE return_receipts ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- 2) Evidence (defective returns: required description + 1 photo) + prevent duplicate unit returns
ALTER TABLE return_receipt_items
    ADD COLUMN description TEXT,
    ADD COLUMN evidence_image VARCHAR(255),
    ADD UNIQUE KEY uk_return_item_unit (return_receipt_id, product_unit_id);

-- 3) Export to supplier (returns / warranty) — target supplier
ALTER TABLE export_receipts ADD COLUMN supplier_id BIGINT;
ALTER TABLE export_receipts
    ADD CONSTRAINT fk_export_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

-- 4) Warranty import: link back to the original warranty-replacement export + per-item result
ALTER TABLE import_receipts ADD COLUMN original_warranty_export_id BIGINT;
ALTER TABLE import_receipts
    ADD CONSTRAINT fk_import_warranty_export FOREIGN KEY (original_warranty_export_id) REFERENCES export_receipts(id);

ALTER TABLE import_receipt_items ADD COLUMN warranty_result_type VARCHAR(20);
