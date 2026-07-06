INSERT INTO roles (name, description)
VALUES ('ADMIN', 'System Administrator'),
       ('MANAGER', 'Warehouse Manager'),
       ('SALES', 'Sales Person'),
       ('STOCK', 'Stock Keeper');

INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
SELECT 'admin', 'Administrator',
       '$2a$10$Y.MqpXYpShMzLiCoF8uPDOh8ej23vjRwnt7cHFINpbMWLaM5ha8KO',
       'admin@system.com',
       'ACTIVE',
       (SELECT id FROM roles WHERE name = 'ADMIN'),
       0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
SELECT 'manager', 'Manager',
       '$2a$10$Ayt9bBLMH56jjpH5brykfuCt2.uIWpwvtoWlx6sbMmtm7uqLO0BAW',
       'manager@system.com',
       'ACTIVE',
       (SELECT id FROM roles WHERE name = 'MANAGER'),
       0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'manager');

INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
SELECT 'sales', 'Sales',
       '$2a$10$XvCJ7ryrnvR4h5ghDWHQK.2LzDzWZ/19zfpvkH8jypxWLAQ.6LYO6',
       'sales@system.com',
       'ACTIVE',
       (SELECT id FROM roles WHERE name = 'SALES'),
       0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'sales');

INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
SELECT 'stock', 'Stock',
       '$2a$10$alkViCYXFJfHDbpiw16t4utUjMHTh3HJbbV9qYjcRqMyWUy2erct2',
       'stock@system.com',
       'ACTIVE',
       (SELECT id FROM roles WHERE name = 'STOCK'),
       0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'stock');
