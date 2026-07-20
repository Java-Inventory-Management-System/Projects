CREATE TABLE brands (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    contact_person  VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    tax_code        VARCHAR(50),
    note            TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255)  NOT NULL,
    sku             VARCHAR(100)  NOT NULL UNIQUE,
    barcode         VARCHAR(100),
    brand_id        BIGINT,
    category_id     BIGINT,
    description     TEXT,
    unit            VARCHAR(20)   NOT NULL DEFAULT 'PIECE',
    tracking_type   VARCHAR(20)   NOT NULL DEFAULT 'SERIALIZED',
    sell_price      DECIMAL(15,2) NOT NULL DEFAULT 0,
    min_stock       INT           NOT NULL DEFAULT 0,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_brand FOREIGN KEY (brand_id) REFERENCES brands(id),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE product_images (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id  BIGINT        NOT NULL,
    url         VARCHAR(500)  NOT NULL,
    is_primary  BOOLEAN       NOT NULL DEFAULT FALSE,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_image_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

ALTER TABLE products    ADD INDEX idx_products_is_active (is_active);
ALTER TABLE products    ADD INDEX idx_products_name (name);
ALTER TABLE brands     ADD INDEX idx_brands_is_active (is_active);
ALTER TABLE categories ADD INDEX idx_categories_is_active (is_active);
ALTER TABLE suppliers  ADD INDEX idx_suppliers_is_active (is_active);
