-- V14: Defect catalog (standardized defect classification for returns/warranty)

CREATE TABLE defect_categories (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    code           VARCHAR(32)   NOT NULL UNIQUE,
    name           VARCHAR(100)  NOT NULL,
    description    VARCHAR(500),
    is_repairable  TINYINT(1)    NOT NULL DEFAULT 0,   -- sửa được
    is_replaceable TINYINT(1)    NOT NULL DEFAULT 0,   -- đổi 1:1 theo bảo hành
    is_active      TINYINT(1)    NOT NULL DEFAULT 1,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Standardized defect category per return line (LỖI)
ALTER TABLE return_receipt_items
    ADD COLUMN defect_category_id BIGINT NULL AFTER evidence_image,
    ADD CONSTRAINT fk_return_item_defect_category FOREIGN KEY (defect_category_id) REFERENCES defect_categories(id);