ALTER TABLE stock_adjustments
    ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by;