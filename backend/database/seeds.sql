-- =========================================================
-- DATOS INICIALES (SEEDS): SISTEMA HOTELERO PERÚ
-- =========================================================

-- 1. Información Inicial del Hotel
INSERT INTO hotel_info (business_name, trade_name, ruc, address, phone, email, currency_symbol, currency_code)
VALUES (
    'HOTEL ZAFIRO S.A.C.',
    'Hotel Zafiro',
    '20123456789',
    'Av. Principal 123, Miraflores, Lima, Perú',
    '01-2345678',
    'contacto@hotelperu.com',
    'S/',
    'PEN'
)
ON CONFLICT DO NOTHING;

-- 2. Usuario Administrador por Defecto (username: admin / password: admin123)
-- Hash bcrypt para 'admin123': $2a$10$YpW5xTVlTkEqUO6FfKD/IuJYxII.J6JIif456eO61KWFOnRK.yP7m
INSERT INTO users (id, username, password_hash, full_name, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin',
    '$2a$10$YpW5xTVlTkEqUO6FfKD/IuJYxII.J6JIif456eO61KWFOnRK.yP7m',
    'Administrador General',
    'super_admin',
    true
)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Usuario Recepcionista de prueba (username: recepcion / password: admin123)
INSERT INTO users (id, username, password_hash, full_name, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'recepcion',
    '$2a$10$YpW5xTVlTkEqUO6FfKD/IuJYxII.J6JIif456eO61KWFOnRK.yP7m',
    'Recepcionista Turno Día',
    'receptionist',
    true
)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 3. Tipos de Habitación con Tarifas por Defecto en Soles (PEN)
INSERT INTO room_types (id, name, description, hours_quantity_default, price_hours_default, price_overnight_default, price_full_day_default, price_extra_hour_default)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'Simple Estándar',
    'Habitación individual con cama de 1.5 plazas, baño privado y TV cable.',
    3,
    25.00,
    50.00,
    70.00,
    10.00
),
(
    'b0000000-0000-0000-0000-000000000002',
    'Matrimonial',
    'Cama Queen de 2 plazas, baño privado, agua caliente, Smart TV y WiFi.',
    3,
    30.00,
    60.00,
    90.00,
    10.00
),
(
    'b0000000-0000-0000-0000-000000000003',
    'Doble',
    'Dos camas individuales, baño privado y ambiente espacioso.',
    3,
    40.00,
    80.00,
    110.00,
    15.00
),
(
    'b0000000-0000-0000-0000-000000000004',
    'Suite Jacuzzi',
    'Habitación VIP con tina de hidromasajes/jacuzzi, cama King, frigobar y luces LED.',
    3,
    70.00,
    130.00,
    180.00,
    20.00
)
ON CONFLICT (name) DO NOTHING;

-- 4. Habitaciones Iniciales
-- Piso 1
INSERT INTO rooms (room_number, room_type_id, floor, status)
VALUES 
('101', 'b0000000-0000-0000-0000-000000000002', 1, 'available'),
('102', 'b0000000-0000-0000-0000-000000000002', 1, 'available'),
('103', 'b0000000-0000-0000-0000-000000000001', 1, 'available'),
('104', 'b0000000-0000-0000-0000-000000000003', 1, 'available')
ON CONFLICT (room_number) DO NOTHING;

-- Piso 2
INSERT INTO rooms (room_number, room_type_id, floor, status)
VALUES 
('201', 'b0000000-0000-0000-0000-000000000002', 2, 'available'),
('202', 'b0000000-0000-0000-0000-000000000002', 2, 'available'),
('203', 'b0000000-0000-0000-0000-000000000001', 2, 'available'),
('204', 'b0000000-0000-0000-0000-000000000004', 2, 'available')
ON CONFLICT (room_number) DO NOTHING;

-- Piso 3
INSERT INTO rooms (room_number, room_type_id, floor, status)
VALUES 
('301', 'b0000000-0000-0000-0000-000000000002', 3, 'available'),
('302', 'b0000000-0000-0000-0000-000000000004', 3, 'available'),
('303', 'b0000000-0000-0000-0000-000000000003', 3, 'available')
ON CONFLICT (room_number) DO NOTHING;

-- 5. Productos para Tienda / Snack Bar
INSERT INTO products (name, sale_price_pen, stock, is_active)
VALUES
('Agua Mineral San Mateo 600ml', 3.00, 50, true),
('Gaseosa Coca Cola 500ml', 4.00, 40, true),
('Gaseosa Inca Kola 500ml', 4.00, 40, true),
('Cerveza Cusqueña 330ml', 8.00, 30, true),
('Cerveza Pilsen Callao 330ml', 7.00, 35, true),
('Snack Papas Lays 45g', 3.50, 30, true),
('Preservativos Durex (Caja x3)', 15.00, 25, true),
('Kit Dental (Cepillo + Crema)', 5.00, 20, true)
ON CONFLICT (name) DO NOTHING;
