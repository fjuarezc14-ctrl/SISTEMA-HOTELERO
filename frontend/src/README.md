# Estructura del frontend

```
src/
├── App.jsx / main.jsx   Arranque, proveedores de contexto y navegación entre módulos
├── api/                 Cliente HTTP (apiClient.js)
├── context/             Estado global: sesión, turno, configuración del hotel, tickets
├── hooks/               Hooks reutilizables (useCart)
├── utils/               Formateadores, validadores, horarios, tickets, Excel
├── pages/               Una pantalla por módulo del menú lateral
└── components/          Piezas de UI agrupadas por dominio
```

## pages/

| Carpeta | Archivo | Qué es |
|---|---|---|
| `auth/` | `LoginPage` | Inicio de sesión |
| `operations/` | `ReceptionPage` | Recepción: tablero de habitaciones, check-in/out, consumos, horas extra |
| | `ReservationsPage` | Reservaciones: lista y línea de tiempo por habitación |
| | `CustomersPage` | Clientes / DNI |
| | `IncidentsPage` | Incidentes reportados |
| | `TextilesPage` | Gestión de textiles (sábanas, toallas, etc.) |
| `sales/` | `StorePage` | Tienda: venta de productos, inventario y proveedores |
| | `CashPage` | Caja: movimientos del turno, emitir comprobantes, anular |
| `admin/` | `ReportsPage` | Reportes y KPIs (incluye la sección de turnos) |
| | `ShiftsPage` | Historial de turnos; se muestra dentro de `ReportsPage` |
| | `UsersPage` | Usuarios y permisos por módulo |
| | `SettingsPage` | Configuración del hotel, tarifas, horarios, etc. |

## components/

| Carpeta | Archivo | Qué es |
|---|---|---|
| `common/` | `Modal` | Ventana modal base que usan casi todos los formularios |
| | `Badge` | Etiqueta de estado de color |
| | `Pagination` | Paginación de tablas (`Pagination` + hook `usePagination`) |
| | `AdminAuthFields` | Usuario/contraseña de un admin para autorizar acciones de personal |
| `layout/` | `Sidebar` | Menú lateral de módulos |
| | `Navbar` | Barra superior con el estado del turno |
| `reception/` | `CheckInModal` | Registrar ingreso de huésped |
| | `CheckOutModal` | Registrar salida y cobro final |
| | `ConsumptionModal` | Cargar productos de tienda a una habitación |
| | `ExtraHoursModal` | Cobrar horas extra de una estadía |
| | `RoomFormModal` | Crear/editar habitación |
| | `StayDurationPicker` | Selector de duración (por noche, días u horas); lo usan check-in y reservas |
| `reservations/` | `ReservationModal` | Crear/editar reserva y su ticket |
| | `ReservationTimeline` | Línea de tiempo de reservas por habitación |
| `customers/` | `CustomerFields` | Campos de datos del cliente en formularios |
| | `CustomerSearchAutocomplete` | Buscador de clientes por documento/nombre |
| `payments/` | `PaymentSelector` | Elegir método(s) de pago |
| | `VoucherSelector` | Elegir comprobante (sin comprobante, boleta o factura con RUC) |
| | `VoucherCell` | Celda de comprobante y acciones de un movimiento en tablas |
| | `EmitVoucherModal` | Emitir boleta/factura de un movimiento existente |
| | `ReceiptDocument` | Plantilla imprimible de tickets |
| `cash/` | `CashMovementModal` | Registrar ingreso/egreso manual de caja |
| | `CancelTransactionModal` | Anular un movimiento |
| `shifts/` | `OpenShiftModal` | Abrir turno |
| | `CloseShiftModal` | Cerrar turno y cuadrar caja |
| | `CashCounter` | Calculadora de billetes y monedas |
| `store/` | `ProductCardGrid` | Grilla de productos para vender |
| | `CartItemList` | Lista del carrito |
| `users/` | `ModulePermissions` | Casillas de módulos permitidos por usuario |
