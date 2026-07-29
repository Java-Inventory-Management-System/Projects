-- V3: Facilities & business partners

-- Warehouses (multi-warehouse ready, single by default)
CREATE TABLE warehouses (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(32)  NOT NULL UNIQUE,
    address     TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_warehouses_name (name),
    INDEX idx_warehouses_is_active (is_active)
);

-- Storage locations: code = zone-shelf-bin (e.g. A-01-01)
CREATE TABLE locations (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    zone_code     VARCHAR(10)   NOT NULL,
    shelf_code    VARCHAR(10)   NOT NULL,
    bin_code      VARCHAR(10)   NOT NULL,
    full_code     VARCHAR(32)   NOT NULL UNIQUE,         -- zone-shelf-bin composite
    description   TEXT,
    max_capacity  DECIMAL(15,2),
    warehouse_id  BIGINT,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (zone_code, shelf_code, bin_code),
    INDEX idx_locations_warehouse (warehouse_id),
    INDEX idx_locations_is_active (is_active),
    CONSTRAINT fk_locations_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Default zone suggestions per category
CREATE TABLE category_zones (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT       NOT NULL UNIQUE,
    zone_code   VARCHAR(10)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cz_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Customers (corporate / individual)
CREATE TABLE customers (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    address     TEXT,
    note        TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_is_active (is_active),
    INDEX idx_customers_name (name)
);
