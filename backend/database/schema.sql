-- =========================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA HOTELERO PERÚ (PostgreSQL)
-- Estándar: Nombres en inglés, tipos de datos precisos en Soles (PEN)
-- =========================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Información de la Empresa / Hotel
CREATE TABLE IF NOT EXISTS hotel_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(150) NOT NULL DEFAULT 'HOTEL ZAFIRO S.A.C.',
    trade_name VARCHAR(150) NOT NULL DEFAULT 'Hotel Zafiro',
    ruc VARCHAR(11) NOT NULL DEFAULT '20123456789',
    address TEXT NOT NULL DEFAULT 'Av. Principal 123, Lima, Perú',
    phone VARCHAR(30) NOT NULL DEFAULT '01-2345678',
    email VARCHAR(100) DEFAULT 'contacto@hotelperu.com',
    currency_symbol VARCHAR(5) NOT NULL DEFAULT 'S/',
    currency_code VARCHAR(5) NOT NULL DEFAULT 'PEN',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Usuarios del Sistema
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'receptionist', -- super_admin, admin, receptionist, housekeeper
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Clientes / Huéspedes (Perú)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(20) NOT NULL DEFAULT 'DNI', -- DNI, CE, PASSPORT, RUC
    document_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(100),
    is_blacklisted BOOLEAN NOT NULL DEFAULT false,
    blacklist_reason TEXT,
    total_visits INT NOT NULL DEFAULT 0,
    total_debt_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Categorías de Habitación y Tarifas Editables
CREATE TABLE IF NOT EXISTS room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL, -- Simple, Matrimonial, Doble, Suite Jacuzzi
    description TEXT,
    hours_quantity_default INT NOT NULL DEFAULT 3, -- Horas base (ej: 3h o 4h)
    price_hours_default NUMERIC(10, 2) NOT NULL DEFAULT 30.00, -- Tarifa base por horas en Soles (S/)
    price_overnight_default NUMERIC(10, 2) NOT NULL DEFAULT 60.00, -- Tarifa pernocta en Soles (S/)
    price_full_day_default NUMERIC(10, 2) NOT NULL DEFAULT 90.00, -- Tarifa 24h en Soles (S/)
    price_extra_hour_default NUMERIC(10, 2) NOT NULL DEFAULT 10.00, -- Hora adicional en Soles (S/)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Habitaciones
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(10) UNIQUE NOT NULL,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    floor INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'available', -- available, occupied, cleaning, maintenance
    observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Turnos de Trabajo / Caja (Rediseñado)
CREATE TABLE IF NOT EXISTS work_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    initial_cash_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Fondo base inicial en Soles
    expected_cash_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Monto calculado por el sistema
    actual_cash_pen NUMERIC(10, 2), -- Monto contado físicamente al cierre
    difference_cash_pen NUMERIC(10, 2) DEFAULT 0.00, -- Sobrante (+S/) o Faltante (-S/)
    total_yape_plin_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_card_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_revenue_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, closed
    shift_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Estadías / Hospedajes Activos e Históricos
CREATE TABLE IF NOT EXISTS stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    work_shift_id UUID REFERENCES work_shifts(id) ON DELETE SET NULL,
    stay_type VARCHAR(30) NOT NULL DEFAULT 'hours', -- hours, overnight, full_day
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_end_time TIMESTAMPTZ NOT NULL,
    actual_end_time TIMESTAMPTZ,
    companion_name VARCHAR(150),
    total_stay_price_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_consumptions_price_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_paid_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, completed, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Transacciones de Caja (Pagos y Egresos)
CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_shift_id UUID NOT NULL REFERENCES work_shifts(id) ON DELETE CASCADE,
    stay_id UUID REFERENCES stays(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'income', -- income, expense
    concept VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'stay', -- stay, store, service, other
    amount_pen NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- YAPE_PLIN, CASH, CARD
    reference_number VARCHAR(50), -- Número de operación / voucher
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tienda / Snack Bar (Productos y Stock)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    sale_price_pen NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Consumos en Habitación
CREATE TABLE IF NOT EXISTS room_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price_pen NUMERIC(10, 2) NOT NULL,
    total_price_pen NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Tickets de Mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    user_assigned_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, resolved
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 12. Auditoría del Sistema
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name VARCHAR(100) NOT NULL DEFAULT 'Sistema',
    role VARCHAR(30) NOT NULL DEFAULT 'Sistema',
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Reservaciones Futuras
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    work_shift_id UUID REFERENCES work_shifts(id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    deposit_amount_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'YAPE_PLIN',
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed', -- confirmed, checked_in, cancelled
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Acompañantes y Ficha Registral MINCETUR / PNP
CREATE TABLE IF NOT EXISTS stay_companions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL DEFAULT 'DNI',
    document_number VARCHAR(20) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    age INT,
    nationality VARCHAR(50) DEFAULT 'Peruana',
    origin_city VARCHAR(100) DEFAULT 'Lima',
    destination_city VARCHAR(100) DEFAULT 'Lima',
    travel_reason VARCHAR(100) DEFAULT 'Turismo / Vacaciones',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Compras de Productos (Kardex de Inventario)
CREATE TABLE IF NOT EXISTS product_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_cost_pen NUMERIC(10, 2) NOT NULL,
    total_cost_pen NUMERIC(10, 2) NOT NULL,
    supplier_name VARCHAR(150) DEFAULT 'Proveedor General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_stays_status ON stays(status);
CREATE INDEX IF NOT EXISTS idx_stays_room_id ON stays(room_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_status ON work_shifts(status);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_shift ON cash_transactions(work_shift_id);
CREATE INDEX IF NOT EXISTS idx_customers_document ON customers(document_number);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(start_date, end_date);

