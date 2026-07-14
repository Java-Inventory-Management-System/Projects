CREATE TABLE export_receipts (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_code  VARCHAR(32)   NOT NULL UNIQUE,
    reason        VARCHAR(30)   NOT NULL,
    customer_id   BIGINT,
    total_amount  DECIMAL(15,2),
    status        VARCHAR(20)   NOT NULL DEFAULT 'PENDING_APPROVAL',
    note          TEXT,
    created_by    BIGINT        NOT NULL,
    approved_by   BIGINT,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_export_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_export_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_export_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE export_receipt_items (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_id      BIGINT        NOT NULL,
    product_id      BIGINT        NOT NULL,
    quantity        INT           NOT NULL,
    unit_price      DECIMAL(15,2),
    total_price     DECIMAL(15,2),
    CONSTRAINT fk_export_item_receipt FOREIGN KEY (receipt_id) REFERENCES export_receipts(id),
    CONSTRAINT fk_export_item_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE export_receipt_item_units (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    export_receipt_item_id  BIGINT        NOT NULL,
    product_unit_id         BIGINT        NOT NULL,
    quantity                DECIMAL(15,2) NOT NULL DEFAULT 1,
    sell_price              DECIMAL(15,2),
    CONSTRAINT fk_export_item_unit_item FOREIGN KEY (export_receipt_item_id) REFERENCES export_receipt_items(id),
    CONSTRAINT fk_export_item_unit_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id)
);
