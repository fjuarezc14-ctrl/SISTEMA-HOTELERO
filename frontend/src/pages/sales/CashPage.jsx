import React, { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { formatPEN, formatTimePeru, PAYMENT_METHOD_LABELS } from '../../utils/formatters';
import { useShift } from '../../context/ShiftContext';
import { EmitVoucherModal } from '../../components/payments/EmitVoucherModal';
import { CashMovementModal } from '../../components/cash/CashMovementModal';
import { CancelTransactionModal } from '../../components/cash/CancelTransactionModal';
import { VoucherCell, TransactionActions } from '../../components/payments/VoucherCell';
import { useReceipt } from '../../context/ReceiptContext';
import { cashReceipt } from '../../utils/receipts';
import { Pagination } from '../../components/common/Pagination';
import { CategoryBadge } from '../../components/common/Badge';
import {
  Wallet,
  Plus,
  AlertCircle,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BedDouble,
  QrCode,
  CreditCard,
  Banknote,
  Search,
  X,
  RotateCcw
} from 'lucide-react';

const PAGE_SIZE = 15;

const formatDateOnly = (iso) =>
  new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

// Fecha de hoy en Lima como YYYY-MM-DD
const todayLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

export function CashPage({ onOpenShiftModal = () => {}, onCloseShiftModal = () => {} }) {
  const { activeShift, hasActiveShift } = useShift();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de movimiento de caja
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  // Modal para emitir/re-imprimir comprobante
  const [selectedVoucherTx, setSelectedVoucherTx] = useState(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Filtro y paginación del historial
  const [scope, setScope] = useState('shift'); // shift, today, range
  const [dateFrom, setDateFrom] = useState(todayLima());
  const [dateTo, setDateTo] = useState(todayLima());
  const [page, setPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Buscador y filtros avanzados
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, paymentMethodFilter, typeFilter]);

  const hasActiveFilters = searchQuery.trim() !== '' || categoryFilter !== 'all' || paymentMethodFilter !== 'all' || typeFilter !== 'all';
  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setPaymentMethodFilter('all');
    setTypeFilter('all');
    setPage(1);
  };

  const fetchTransactions = async () => {
    if (scope === 'shift' && !activeShift?.id) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({ limit: '2000' });
    if (scope === 'shift') {
      params.set('shiftId', activeShift.id);
    } else {
      const from = scope === 'today' ? todayLima() : dateFrom;
      const to = scope === 'today' ? todayLima() : dateTo;
      params.set('dateFrom', `${from}T00:00:00-05:00`);
      params.set('dateTo', `${to}T23:59:59.999-05:00`);
    }
    try {
      setLoading(true);
      const res = await api.get(`/cash/transactions?${params.toString()}`);
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Error cargando transacciones de caja:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchTransactions();
  }, [scope, dateFrom, dateTo, activeShift?.id]);

  // Reimprimir comprobante / emitir boleta o factura
  const { printReceipt } = useReceipt();
  const handleReprint = (tx) => printReceipt(cashReceipt(tx, transactions));
  const handleEmitVoucher = (tx) => {
    setSelectedVoucherTx(tx);
    setIsVoucherModalOpen(true);
  };

  // Modal de anulación (requiere autorización de administrador)
  const [cancelingTx, setCancelingTx] = useState(null);
  const handleCancelTransaction = (t) => setCancelingTx(t);

  // Totales financieros del turno (Excluyendo movimientos anulados)
  const totalIncome = transactions
    .filter((t) => t.transaction_type === 'income' && !t.is_cancelled)
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.transaction_type === 'expense' && !t.is_cancelled)
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  // Filtrado de transacciones según buscador y filtros interactivos
  const filteredTransactions = transactions.filter((t) => {
    if (categoryFilter !== 'all') {
      const cat = String(t.category || 'other').toLowerCase();
      if (categoryFilter === 'store' && cat !== 'store' && cat !== 'consumption') return false;
      if (categoryFilter === 'stay' && cat !== 'stay') return false;
      if (categoryFilter === 'incident' && cat !== 'incident') return false;
      if (categoryFilter === 'other' && ['stay', 'store', 'consumption', 'incident'].includes(cat)) return false;
    }
    if (paymentMethodFilter !== 'all' && t.payment_method !== paymentMethodFilter) {
      return false;
    }
    if (typeFilter === 'income' && (t.transaction_type !== 'income' || t.is_cancelled)) return false;
    if (typeFilter === 'expense' && (t.transaction_type !== 'expense' || t.is_cancelled)) return false;
    if (typeFilter === 'cancelled' && !t.is_cancelled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchConcept = t.concept?.toLowerCase().includes(q);
      const matchCustomer = t.customer_name?.toLowerCase().includes(q);
      const matchRoom = t.room_number?.toString().toLowerCase().includes(q);
      const matchVoucher = t.voucher_number?.toLowerCase().includes(q);
      const matchUser = t.user_full_name?.toLowerCase().includes(q);
      const matchRef = t.reference_number?.toLowerCase().includes(q);
      const matchItems = Array.isArray(t.sale_items) && t.sale_items.some(i => i.product_name?.toLowerCase().includes(q));
      if (!matchConcept && !matchCustomer && !matchRoom && !matchVoucher && !matchUser && !matchRef && !matchItems) {
        return false;
      }
    }
    return true;
  });

  // Agrupar movimientos de una misma estadía (habitación + cliente) en un solo registro
  const groups = groupByStay(filteredTransactions);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedGroups = groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleGroup = (key) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderTxRow = (t, nested = false) => (
    <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${t.is_cancelled ? 'bg-rose-50/30' : nested ? 'bg-slate-50/60' : ''}`}>
      <td className={`py-3 px-3 whitespace-nowrap ${nested ? 'pl-8' : ''}`}>
        <span className="block font-mono font-bold text-slate-700">{formatTimePeru(t.created_at)}</span>
        <span className="block text-[10px] text-slate-400">{formatDateOnly(t.created_at)}</span>
      </td>
      <td className="py-3 px-3">
        {t.is_cancelled ? (
          <span className="inline-flex items-center justify-center text-center leading-tight align-middle px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 line-through border border-slate-300">
            Anulado
          </span>
        ) : t.transaction_type === 'income' ? (
          <span className="inline-flex items-center justify-center text-center leading-tight align-middle px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Ingreso
          </span>
        ) : (
          <span className="inline-flex items-center justify-center text-center leading-tight align-middle px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Egreso
          </span>
        )}
      </td>

      <td className="py-3 px-3 whitespace-nowrap">
        <CategoryBadge category={t.category} />
      </td>

      <td className="py-3 px-3 font-semibold text-slate-900">
        <span className={t.is_cancelled ? 'line-through text-slate-400' : ''}>
          {t.concept}
        </span>
        {Array.isArray(t.sale_items) && t.sale_items.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {t.sale_items.map((item, idx) => (
              <span key={idx} className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-normal">
                {item.quantity}x {item.product_name}
              </span>
            ))}
          </div>
        )}
        {t.is_cancelled && t.cancellation_reason && (
          <span className="block text-[10px] text-rose-600 font-normal mt-0.5">
            Motivo: {t.cancellation_reason}
          </span>
        )}
      </td>

      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
        {PAYMENT_METHOD_LABELS[t.payment_method] || t.payment_method}
      </td>

      {/* Columna Comprobante SUNAT */}
      <td className="py-3 px-3">
        <VoucherCell tx={t} />
      </td>

      <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${t.is_cancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
        {formatPEN(t.amount_pen)}
      </td>

      <td className="py-3 px-3 text-center">
        <TransactionActions tx={t} onReprint={handleReprint} onEmit={handleEmitVoucher} onCancel={handleCancelTransaction} />
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span>Caja Chica & Movimientos (Perú)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Registro de ingresos por alquileres/tienda, egresos autorizados y anulación de movimientos.
          </p>
        </div>

        {/* Apertura / Cierre de Turno */}
        {hasActiveShift ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsMovementModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Movimiento de Caja</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              <span className="font-semibold">Turno abierto · Fondo inicial:</span>
              <span className="font-mono font-bold text-emerald-800">
                {formatPEN(activeShift.initial_cash_pen || 0)}
              </span>
            </div>
            <button
              onClick={onCloseShiftModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Cerrar Turno</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenShiftModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-600/20 transition-colors flex items-center gap-1.5"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Abrir Turno</span>
          </button>
        )}
      </div>

      {!hasActiveShift && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Debes abrir un turno para registrar movimientos.</span>
        </div>
      )}

      {/* Historial y Tabla */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <TotalCard
            label="Total Ingresos"
            tone="emerald"
            total={totalIncome}
            byMethod={sumByMethod(transactions, 'income')}
            expanded={showBreakdown}
            onToggle={() => setShowBreakdown(!showBreakdown)}
          />
          <TotalCard
            label="Total Egresos"
            tone="rose"
            total={totalExpense}
            byMethod={sumByMethod(transactions, 'expense')}
            expanded={showBreakdown}
            onToggle={() => setShowBreakdown(!showBreakdown)}
          />
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historial de Transacciones de Caja</h3>
              <p className="text-[11px] text-slate-500">
                {scope === 'shift'
                  ? 'Mostrando movimientos del turno de caja activo'
                  : scope === 'today'
                  ? 'Mostrando movimientos registrados hoy'
                  : `Mostrando movimientos del ${dateFrom} al ${dateTo}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-xl">
                {[
                  { id: 'shift', label: 'Turno actual' },
                  { id: 'today', label: 'Hoy' },
                  { id: 'range', label: 'Rango de fechas' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setScope(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      scope === opt.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {scope === 'range' && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900"
                  />
                  <span>al</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Buscador interactivo y filtros avanzados */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 pt-2 border-t border-slate-100">
            {/* Buscador de texto libre */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, hab., concepto, producto o comprobante..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Borrar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por Categoría (Estadía, Tienda, Incidente, Otros) */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todas las categorías</option>
              <option value="stay">🏨 Hospedaje</option>
              <option value="store">🛍️ Tienda / Consumos</option>
              <option value="incident">⚠️ Incidentes / Daños</option>
              <option value="other">Otros movimientos</option>
            </select>

            {/* Filtro por Medio de Pago */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos los medios</option>
              <option value="CASH">💵 Efectivo</option>
              <option value="YAPE_PLIN">📱 Yape / Plin</option>
              <option value="CARD">💳 Tarjeta POS</option>
            </select>

            {/* Filtro por Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Ingresos & Egresos</option>
              <option value="income">Solo Ingresos</option>
              <option value="expense">Solo Egresos</option>
              <option value="cancelled">Solo Anulados</option>
            </select>

            {/* Botón Restablecer Filtros */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                title="Limpiar filtros activos"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar ({filteredTransactions.length})</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Cargando movimientos...</div>
          ) : scope === 'shift' && !hasActiveShift ? (
            <div className="py-8 text-center text-xs text-slate-400">No hay turno abierto. Usa el filtro "Hoy" o "Rango de fechas".</div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No hay movimientos registrados en este periodo.</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <p>No se encontraron movimientos que coincidan con los filtros aplicados.</p>
              <button
                onClick={handleClearFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Hora</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">Concepto</th>
                    <th className="py-3 px-3">Medio Pago</th>
                    <th className="py-3 px-3">Comprobante</th>
                    <th className="py-3 px-3 text-right">Monto</th>
                    <th className="py-3 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedGroups.map((g) =>
                    g.type === 'single' ? (
                      renderTxRow(g.tx)
                    ) : (
                      <React.Fragment key={g.key}>
                        <tr
                          onClick={() => toggleGroup(g.key)}
                          className="cursor-pointer bg-white hover:bg-emerald-50/40 transition-colors"
                        >
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              {expandedGroups[g.key] ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>
                                <span className="block font-mono font-bold text-slate-700">{formatTimePeru(g.lastAt)}</span>
                                <span className="block text-[10px] text-slate-400">{formatDateOnly(g.lastAt)}</span>
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center justify-center text-center leading-tight align-middle px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Estadía
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <CategoryBadge category="stay" />
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <span className="inline-flex items-center gap-1.5">
                              <BedDouble className="w-3.5 h-3.5 text-emerald-600" />
                              Hab. {g.roomNumber || '—'}
                              {g.customerName && <span className="font-normal text-slate-500">· {g.customerName}</span>}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {g.items.length} movimientos{g.cancelledCount > 0 ? ` · ${g.cancelledCount} anulado(s)` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {g.methods.map((m) => PAYMENT_METHOD_LABELS[m] || m).join(' + ')}
                          </td>
                          <td className="py-3 px-3 text-[10px] text-slate-400">Ver detalle</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatPEN(g.total)}</td>
                          <td className="py-3 px-3" />
                        </tr>
                        {expandedGroups[g.key] && g.items.map((t) => renderTxRow(t, true))}
                      </React.Fragment>
                    )
                  )}
                </tbody>
              </table>
              <Pagination page={currentPage} totalPages={totalPages} totalItems={groups.length} onChange={setPage} />
            </div>
          )}
        </div>
      </div>

      {/* Modal para emitir/re-imprimir comprobante electrónico */}
      <EmitVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setSelectedVoucherTx(null);
        }}
        transaction={selectedVoucherTx}
        onSuccess={fetchTransactions}
      />

      <CancelTransactionModal
        isOpen={!!cancelingTx}
        onClose={() => setCancelingTx(null)}
        transaction={cancelingTx}
        onSuccess={fetchTransactions}
      />

      <CashMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}

const PAYMENT_METHODS = [
  { id: 'YAPE_PLIN', icon: QrCode, color: 'text-violet-600' },
  { id: 'CASH', icon: Banknote, color: 'text-emerald-600' },
  { id: 'CARD', icon: CreditCard, color: 'text-blue-600' }
];

function sumByMethod(transactions, type) {
  const totals = { YAPE_PLIN: 0, CASH: 0, CARD: 0 };
  for (const t of transactions) {
    if (t.transaction_type !== type || t.is_cancelled) continue;
    totals[t.payment_method] = (totals[t.payment_method] || 0) + Number(t.amount_pen || 0);
  }
  return totals;
}

const TONES = {
  emerald: { text: 'text-emerald-700', hover: 'hover:bg-emerald-50' },
  rose: { text: 'text-rose-700', hover: 'hover:bg-rose-50' }
};

function TotalCard({ label, tone, total, byMethod, expanded, onToggle }) {
  const c = TONES[tone];
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span className={`text-xs font-semibold uppercase ${c.text}`}>{label}</span>
          <p className={`text-2xl font-black font-mono ${c.text}`}>{formatPEN(total)}</p>
        </div>
        <button
          onClick={onToggle}
          title={expanded ? 'Ocultar desglose' : 'Ver por medio de pago'}
          className={`p-1.5 rounded-lg text-slate-500 border border-slate-200 transition-colors ${c.hover}`}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
          {PAYMENT_METHODS.map(({ id, icon: Icon, color }) => (
            <div key={id} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                {PAYMENT_METHOD_LABELS[id]}
              </span>
              <span className="font-mono font-bold text-slate-900">{formatPEN(byMethod[id] || 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByStay(transactions) {
  const groups = [];
  const byStay = {};
  for (const t of transactions) {
    if (!t.stay_id) {
      groups.push({ type: 'single', key: t.id, tx: t });
      continue;
    }
    let g = byStay[t.stay_id];
    if (!g) {
      g = {
        type: 'stay',
        key: `stay-${t.stay_id}`,
        roomNumber: t.room_number,
        customerName: t.customer_name,
        lastAt: t.created_at,
        items: [],
        methods: [],
        total: 0,
        cancelledCount: 0
      };
      byStay[t.stay_id] = g;
      groups.push(g);
    }
    g.items.push(t);
    if (t.is_cancelled) {
      g.cancelledCount += 1;
    } else {
      g.total += (t.transaction_type === 'expense' ? -1 : 1) * Number(t.amount_pen || 0);
      if (!g.methods.includes(t.payment_method)) g.methods.push(t.payment_method);
    }
  }
  // Una estadía con un solo movimiento se muestra como fila normal
  return groups.map((g) => (g.type === 'stay' && g.items.length === 1 ? { type: 'single', key: g.items[0].id, tx: g.items[0] } : g));
}
