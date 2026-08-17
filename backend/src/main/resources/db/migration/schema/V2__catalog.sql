-- V2: Product catalog

-- Brands (ASUS, Samsung, Corsair, ...)
CREATE TABLE brands (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_brands_is_active (is_active)
);

-- Product categories (CPU, RAM, GPU, ...)
CREATE TABLE categories (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    qc_level    VARCHAR(20)  NOT NULL DEFAULT 'FULL',   -- FULL / NONE: QC requirement level
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_name (name),
    INDEX idx_categories_is_active (is_active)
);

-- Suppliers
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
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_suppliers_is_active (is_active),
    INDEX idx_suppliers_name (name)
);

-- Products: tracking_type = SERIALIZED (each unit tracked) / BULK (loose quantity)
CREATE TABLE products (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255)  NOT NULL,
    sku             VARCHAR(100)  NOT NULL UNIQUE,
    barcode         VARCHAR(100),
    brand_id        BIGINT,
    category_id     BIGINT,
    description     TEXT,
    unit            VARCHAR(20)   NOT NULL DEFAULT 'PIECE',  -- PIECE / KG / METER
    tracking_type   VARCHAR(20)   NOT NULL DEFAULT 'SERIALIZED',
    sell_price      DECIMAL(15,2) NOT NULL DEFAULT 0,
    min_stock       INT           NOT NULL DEFAULT 0,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_products_name (name),
    INDEX idx_products_is_active (is_active),
    CONSTRAINT fk_product_brand FOREIGN KEY (brand_id) REFERENCES brands(id),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Product images
CREATE TABLE product_images (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id  BIGINT        NOT NULL,
    url         VARCHAR(500)  NOT NULL,
    is_primary  BOOLEAN       NOT NULL DEFAULT FALSE,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pi_product (product_id),
    CONSTRAINT fk_image_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product-supplier assignments (N-N: which suppliers can supply each product)
CREATE TABLE product_suppliers (
    product_id  BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    PRIMARY KEY (product_id, supplier_id),
    CONSTRAINT fk_ps_product  FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE CASCADE,
    CONSTRAINT fk_ps_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    INDEX idx_ps_supplier (supplier_id)
);
