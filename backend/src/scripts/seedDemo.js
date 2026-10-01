/**
 * Carga datos de demostración para pruebas rápidas en la app.
 * Usa la API (mismas reglas de negocio que la app): clientes, reservas, estadías, consumos,
 * ventas de tienda, movimientos de caja e incidentes.
 *
 * Uso (con el backend corriendo):
 *   docker exec hotel_peru_backend npm run seed:demo
 * Variables opcionales: DEMO_API_URL, DEMO_ADMIN_USER, DEMO_ADMIN_PASSWORD
 *
 * No se ejecuta con NODE_ENV=production.
 */
import { query } from '../config/db.js';

if (process.env.NODE_ENV === 'production') {
  console.error('❌ seedDemo no se ejecuta en producción.');
  process.exit(1);
}

const API = process.env.DEMO_API_URL || `http://localhost:${process.env.PORT || 4020}/api/v1`;
const ADMIN_USER = process.env.DEMO_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'admin123';

let token;

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data.message || ''}`);
  return data.data;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const randomDni = () => String(40000000 + Math.floor(Math.random() * 39999999));
const pad = (n) => String(n).padStart(2, '0');

/** Fecha local (Lima) N días desde hoy a la hora indicada, en formato datetime-local */
function limaDate(daysFromToday, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(minute)}`;
}

const CUSTOMERS = [
  'María Fernanda Quispe Huamán',
  'José Luis Mamani Condori',
  'Rosa Elena Flores Torres',
  'Carlos Alberto Rojas Díaz',
  'Ana Lucía Gutiérrez Vargas',
  'Juan Pablo Chávez Ramos',
  'Lucía Valeria Mendoza Paredes',
  'Miguel Ángel Castillo Ríos',
  'Carmen Rosa Sánchez Espinoza',
  'Luis Fernando Herrera Salazar',
  'Patricia Isabel Cruz Medina'
];

async function main() {
  console.log(`🌱 Cargando datos de demostración en ${API} ...`);
  token = (await api('POST', '/auth/login', { username: ADMIN_USER, password: ADMIN_PASSWORD })).token;

  // Turno abierto (lo abre el admin si no hay)
  let shift = await api('GET', '/shifts/active');
  if (!shift) {
    await api('POST', '/shifts/open', { initial_cash_pen: 150, shift_notes: 'Turno de demostración' });
    shift = await api('GET', '/shifts/active');
    console.log('   ✔ Turno abierto con S/ 150.00');
  }

  // Clientes
  const customers = [];
  for (const full_name of CUSTOMERS) {
    customers.push(
      await api('POST', '/customers', {
        document_type: 'DNI',
        document_number: randomDni(),
        full_name,
        phone: `9${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')}`
      })
    );
  }
  const vetoed = await api('POST', '/customers', {
    document_type: 'DNI',
    document_number: randomDni(),
    full_name: 'Ricardo Vetado Pruebas',
    phone: '999888777'
  });
  await api('PATCH', `/customers/${vetoed.id}/toggle-blacklist`, { is_blacklisted: true, blacklist_reason: 'Daños en habitación (demo)' });
  console.log(`   ✔ ${customers.length + 1} clientes (1 vetado)`);

  const asCustomerData = (c) => ({ document_type: c.document_type, document_number: c.document_number, full_name: c.full_name, phone: c.phone });

  // Habitaciones libres
  const rooms = (await api('GET', '/rooms')).filter((r) => r.status === 'available');
  if (rooms.length < 8) {
    console.log(`⚠️ Solo hay ${rooms.length} habitaciones disponibles; se cargarán menos datos.`);
  }
  const takeRoom = () => rooms.shift();

  // Reservas: llegadas en 0-3 días (aparecen en avisos) y una para la próxima semana (no debe avisar)
  const reservationPlan = [
    { days: 0, hour: Math.min(new Date().getHours() + 3, 22), nights: 1, deposit: 40, method: 'YAPE_PLIN' },
    { days: 1, hour: 15, nights: 2, deposit: 60, method: 'CASH' },
    { days: 2, hour: 14, nights: 1, deposit: 0, method: 'YAPE_PLIN' },
    { days: 3, hour: 18, nights: 3, deposit: 100, method: 'CARD' },
    { days: 7, hour: 14, nights: 2, deposit: 50, method: 'YAPE_PLIN' }
  ];
  let reservationsCreated = 0;
  for (const plan of reservationPlan) {
    const room = takeRoom();
    if (!room) break;
    const customer = customers.shift();
    await api('POST', '/reservations', {
      room_id: room.id,
      customer_data: asCustomerData(customer),
      start_date: limaDate(plan.days, plan.hour),
      end_date: limaDate(plan.days + plan.nights, 12),
      deposit_amount_pen: plan.deposit,
      payment_method: plan.method,
      reference_number: plan.method === 'CASH' ? '' : `OP${Math.floor(Math.random() * 900000 + 100000)}`,
      notes: plan.days === 7 ? 'Reserva de la próxima semana (no debe aparecer en avisos)' : 'Reserva de demostración'
    });
    reservationsCreated++;
  }
  console.log(`   ✔ ${reservationsCreated} reservas`);

  // Estadías activas: por noche, por horas y una pasada de su hora de salida
  const products = (await api('GET', '/products')).filter((p) => p.stock > 5);
  const stays = [];
  const stayPlan = [
    { stay_type: 'overnight', pay: true, method: 'CASH' },
    { stay_type: 'hours', hours: 4, pay: true, method: 'YAPE_PLIN' },
    { stay_type: 'hours', pay: false, overdueMinutes: 50 }
  ];
  for (const plan of stayPlan) {
    const room = takeRoom();
    if (!room) break;
    const customer = customers.shift();
    const quoteParams = new URLSearchParams({ room_id: room.id, stay_type: plan.stay_type });
    if (plan.hours) quoteParams.set('hours_count', String(plan.hours));
    const quote = await api('GET', `/stays/quote?${quoteParams}`);
    const stay = await api('POST', '/stays/checkin', {
      room_id: room.id,
      customer_data: asCustomerData(customer),
      stay_type: plan.stay_type,
      hours_count: plan.hours,
      initial_payment: plan.pay
        ? { amount: quote.amount_due, payment_method: plan.method, reference_number: plan.method === 'CASH' ? '' : 'OP' + Date.now().toString().slice(-6) }
        : null
    });
    if (plan.overdueMinutes) {
      // Simula una estadía que ya superó su hora de salida (para ver alertas de tiempo)
      await query(`UPDATE stays SET start_time = NOW() - interval '4 hours', expected_end_time = NOW() - ($2 || ' minutes')::interval WHERE id = $1`, [
        stay.id,
        String(plan.overdueMinutes)
      ]);
    }
    stays.push(stay);
  }
  console.log(`   ✔ ${stays.length} estadías activas (1 pasada de su hora)`);

  // Consumos cargados a la habitación
  if (stays[0] && products.length >= 2) {
    await api('POST', '/products/charge-room', {
      stay_id: stays[0].id,
      items: [
        { product_id: products[0].id, quantity: 2 },
        { product_id: products[1].id, quantity: 1 }
      ]
    });
    console.log('   ✔ Consumos cargados a una habitación');
  }

  // Ventas de tienda (mostrador)
  let sales = 0;
  for (const method of ['CASH', 'YAPE_PLIN', 'CARD', 'CASH']) {
    const product = pick(products);
    const quantity = 1 + Math.floor(Math.random() * 2);
    await api('POST', '/products/direct-sale', {
      items: [{ product_id: product.id, quantity }],
      payment_method: method,
      reference_number: method === 'CASH' ? '' : 'OP' + Math.floor(Math.random() * 900000 + 100000)
    });
    sales++;
  }
  console.log(`   ✔ ${sales} ventas de tienda`);

  // Movimientos manuales de caja
  await api('POST', '/cash/transaction', {
    transaction_type: 'expense',
    concept: 'Compra de bidones de agua para recepción',
    category: 'other',
    amount_pen: 24,
    payment_method: 'CASH'
  });
  await api('POST', '/cash/transaction', {
    transaction_type: 'income',
    concept: 'Alquiler de cochera por noche',
    category: 'other',
    amount_pen: 10,
    payment_method: 'CASH'
  });
  console.log('   ✔ 2 movimientos de caja (1 egreso)');

  // Incidente reportado (pendiente de cobro)
  if (stays[1]) {
    await api('POST', '/incidents', {
      room_id: stays[1].room_id,
      stay_id: stays[1].id,
      customer_id: stays[1].customer_id,
      incident_type: 'loss',
      description: 'Falta control remoto del TV (demo)',
      penalty_amount_pen: 35
    }).then(() => console.log('   ✔ 1 incidente reportado')).catch((e) => console.log(`   ⚠️ Incidente no creado: ${e.message}`));
  }

  console.log('✅ Datos de demostración cargados.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error cargando datos de demostración:', err.message);
    process.exit(1);
  });
