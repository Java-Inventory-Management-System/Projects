-- Warranty exchange (1:1 đổi bảo hành tại quầy): phiếu xuất thay thế liên kết ngược phiếu trả
ALTER TABLE export_receipts
    ADD COLUMN source_return_receipt_id BIGINT NULL;

CREATE INDEX idx_export_receipts_source_return_receipt
    ON export_receipts (source_return_receipt_id);