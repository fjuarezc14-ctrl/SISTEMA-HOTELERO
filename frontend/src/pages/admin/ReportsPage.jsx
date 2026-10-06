import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/apiClient';
import { useGlobalStore } from '../../context/GlobalStoreContext';
import { escapeHtml } from '../../utils/escapeHtml';
import { Pagination, usePagination } from '../../components/common/Pagination';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS } from '../../utils/formatters';
import { VoucherCell, TransactionActions } from '../../components/payments/VoucherCell';
import { useReceipt } from '../../context/ReceiptContext';
import { cashReceipt } from '../../utils/receipts';
import { EmitVoucherModal } from '../../components/payments/EmitVoucherModal';
import { ShiftsPage } from './ShiftsPage';
import { exportToExcel } from '../../utils/exportExcel';
import { CategoryBadge } from '../../components/common/Badge';
import { DateInput } from '../../components/common/DateInput';
import {
  BarChart3,
  Wallet,
  QrCode,
  CreditCard,
  Calendar,
  TrendingUp,
  Download,
  PieChart,
  FileCheck,
  ShieldAlert,
  Share2,
  Percent,
  BedDouble,
  Receipt,
  Bed,
  ShoppingBag,
  ArrowDownCircle,
  Building2,
  Clock
} from 'lucide-react';

const REPORT_SECTIONS = [
  { id: 'kpis', label: 'KPIs y Movimientos', icon: BarChart3 },
  { id: 'shifts', label: 'Turnos de Caja', icon: Clock }
];

export function ReportsPage() {
  const [section, setSection] = useState('kpis');

  return (
    <div className="space-y-6">
      {/* Selector de sección */}
      <div className="inline-flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm gap-1">
        {REPORT_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              section === id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {section === 'shifts' ? <ShiftsPage /> : <KpiReports />}
    </div>
  );
}

function KpiReports() {
  const { printReceipt } = useReceipt();
  const { hotelInfo } = useGlobalStore();
  const [period, setPeriod] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'store' | 'stay' | 'expense' | 'incident'

  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minceturStays, setMinceturStays] = useState([]);
  const [loadingMincetur, setLoadingMincetur] = useState(false);

  // Modal para emitir/re-imprimir comprobante
  const [selectedVoucherTx, setSelectedVoucherTx] = useState(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Calcular fechas al cambiar period
  useEffect(() => {
    const now = new Date();
    if (period === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (period === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().slice(0, 10);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setStartDate(weekAgo.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (period === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  }, [period]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const startIso = `${startDate}T00:00:00.000Z`;
      const endIso = `${endDate}T23:59:59.999Z`;

      const [kpiRes, minceturRes] = await Promise.all([
        api.get(`/reports/kpis?startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`),
        api.get(`/reports/mincetur?startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`)
      ]);

      setKpis(kpiRes.data || null);
      setMinceturStays(minceturRes.data || []);
    } catch (err) {
      console.error('Error cargando reportes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [startDate, endDate]);

  // Transacciones filtradas según categoría seleccionada
  const filteredTransactions = useMemo(() => {
    if (!kpis?.transactions) return [];
    if (categoryFilter === 'all') return kpis.transactions;
    if (categoryFilter === 'store') {
      return kpis.transactions.filter((t) => t.category === 'store' || t.category === 'consumption');
    }
    if (categoryFilter === 'stay') {
      return kpis.transactions.filter((t) => t.category === 'stay');
    }
    if (categoryFilter === 'expense') {
      return kpis.transactions.filter((t) => t.transaction_type === 'expense');
    }
    if (categoryFilter === 'incident') {
      return kpis.transactions.filter((t) => t.category === 'incident');
    }
    return kpis.transactions;
  }, [kpis?.transactions, categoryFilter]);

  // Subtotal consolidado del filtro activo
  const filteredTotal = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => {
      const val = Number(t.amount_pen || 0);
      return t.transaction_type === 'expense' ? sum - val : sum + val;
    }, 0);
  }, [filteredTransactions]);

  const exportToXlsx = async () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      alert('No hay transacciones en el periodo o categoría seleccionada para exportar.');
      return;
    }
    try {
      const hotelNameClean = (hotelInfo?.trade_name || hotelInfo?.business_name || 'Hotel')
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
      const catLabel = categoryFilter === 'store' ? 'Ventas_Tienda' :
                       categoryFilter === 'stay' ? 'Hospedajes' :
                       categoryFilter === 'expense' ? 'Gastos_Egresos' :
                       categoryFilter === 'incident' ? 'Incidentes' : 'General';

      await exportToExcel(
        filteredTransactions,
        [
          { header: 'Fecha / Hora', value: (t) => formatDatePeru(t.created_at), width: 20 },
          { header: 'Tipo', value: (t) => (t.transaction_type === 'expense' ? 'Egreso' : 'Ingreso'), width: 12 },
          { header: 'Concepto', value: (t) => t.concept, width: 40 },
          { header: 'Categoría', value: (t) => (t.category === 'store' || t.category === 'consumption' ? 'Tienda / Minibar' : t.category === 'stay' ? 'Hospedaje' : t.category === 'incident' ? 'Incidente' : t.category), width: 18 },
          { header: 'Medio de Pago', value: (t) => PAYMENT_METHOD_LABELS[t.payment_method] || t.payment_method, width: 18 },
          { header: 'Registrado Por', value: (t) => t.user_full_name || 'Sistema', width: 22 },
          { header: 'Monto (S/)', value: (t) => t.amount_pen, width: 14, money: true }
        ],
        `reporte_${catLabel}_${hotelNameClean}_${startDate}_al_${endDate}`,
        `Reporte ${catLabel}`
      );
    } catch (err) {
      alert('Error al generar el archivo Excel.');
      console.error(err);
    }
  };

  const exportMinceturPoliceReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite las ventanas emergentes (pop-ups) para generar el Libro Oficial PNP / MINCETUR.');
      return;
    }

    const nowStr = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    const periodStr = `${startDate} al ${endDate}`;

    // Membrete legal dinámico: se adapta automáticamente si el hotel cambia de nombre o RUC en Configuración
    const businessName = escapeHtml(hotelInfo?.business_name || 'ESTABLECIMIENTO DE HOSPEDAJE');
    const tradeName = escapeHtml(hotelInfo?.trade_name || hotelInfo?.business_name || 'Hotel');
    const ruc = escapeHtml(hotelInfo?.ruc || '-');
    const address = escapeHtml(hotelInfo?.address || '-');
    const phone = escapeHtml(hotelInfo?.phone || '-');

    const rowsHtml = minceturStays.map((s, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${formatDatePeru(s.start_time)}</td>
        <td>${s.actual_end_time ? formatDatePeru(s.actual_end_time) : 'En estadía'}</td>
        <td><strong>${escapeHtml(s.customer_name)}</strong></td>
        <td>${escapeHtml(s.document_type)}: ${escapeHtml(s.document_number)}</td>
        <td>${escapeHtml(s.phone || 'Sin teléfono')}</td>
        <td style="text-align: center; font-weight: bold;">Hab. ${escapeHtml(s.room_number)}</td>
        <td style="text-align: uppercase;">${s.stay_type === 'hours' ? 'Por Horas' : s.stay_type === 'overnight' ? 'Pernocte' : 'Por Días'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Libro Registral Oficial PNP / MINCETUR - ${tradeName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #0f172a; line-height: 1.4; }
            .header-title { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 15px; }
            h1 { font-size: 20px; margin: 0; color: #0f172a; text-transform: uppercase; }
            h2 { font-size: 14px; margin: 5px 0 0 0; color: #059669; font-weight: normal; }
            .box-info { border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; font-size: 11px; background: #f8fafc; margin-bottom: 15px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #94a3b8; padding: 7px 9px; text-align: left; }
            th { background-color: #0f172a; color: white; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
            tr:nth-child(even) { background-color: #f1f5f9; }
            .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header-title">
            <h1>${businessName}</h1>
            <h2>LIBRO REGISTRAL OFICIAL DE HUÉSPEDES (POLICÍA NACIONAL DEL PERÚ & MINCETUR)</h2>
          </div>
          <div class="box-info">
            <div>
              <strong>RUC:</strong> ${ruc} | <strong>Establecimiento:</strong> ${tradeName}<br/>
              <strong>Dirección:</strong> ${address} | <strong>Teléfono:</strong> ${phone}
            </div>
            <div style="text-align: right;">
              <strong>Rango Consultado:</strong> ${periodStr}<br/>
              <strong>Emisión:</strong> ${nowStr}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha Ingreso</th>
                <th>Fecha Salida</th>
                <th>Huésped Registrado</th>
                <th>Documento ID</th>
                <th>Teléfono</th>
                <th>Hab.</th>
                <th>Modalidad</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding: 20px;">No hay hospedajes en el rango seleccionado.</td></tr>'}
            </tbody>
          </table>
          <div class="footer">
            Documento Oficial generado para fiscalizaciones de la Policía Nacional del Perú (División de Turismo) y MINCETUR.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const counts = useMemo(() => {
    if (!kpis?.transactions) return { all: 0, store: 0, stay: 0, expense: 0, incident: 0 };
    return {
      all: kpis.transactions.length,
      store: kpis.transactions.filter((t) => t.category === 'store' || t.category === 'consumption').length,
      stay: kpis.transactions.filter((t) => t.category === 'stay').length,
      expense: kpis.transactions.filter((t) => t.transaction_type === 'expense').length,
      incident: kpis.transactions.filter((t) => t.category === 'incident').length
    };
  }, [kpis?.transactions]);

  const reportTxPage = usePagination(filteredTransactions, { resetKey: `${startDate}|${endDate}|${categoryFilter}` });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Reportes, KPIs Hoteleros & Ficha PNP / MINCETUR</span>
          </h2>
          <p className="text-xs text-slate-500">
            Análisis de ocupación, tarifas promedio (ADR, RevPAR), arqueo de ingresos por origen y exportación policial.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportMinceturPoliceReport}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            title="Emitir libro registral para fiscalizaciones de PNP y MINCETUR"
          >
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Libro Oficial PNP / MINCETUR</span>
          </button>

          <button
            onClick={exportToXlsx}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            title="Exportar a Excel según el periodo y categoría filtrada"
          >
            <Download className="w-4 h-4" />
            <span>
              Exportar Excel {categoryFilter === 'store' ? '(Solo Tienda)' : categoryFilter === 'stay' ? '(Solo Hospedaje)' : categoryFilter === 'expense' ? '(Solo Gastos)' : categoryFilter === 'incident' ? '(Solo Incidentes)' : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Selector de Periodo Dinámico */}
      <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">Filtrar por Rango de Fechas:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'today' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setPeriod('yesterday')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'yesterday' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ayer
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'week' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Últimos 7 Días
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'month' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'custom' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Personalizado
            </button>
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Desde:</label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                className="bg-slate-50 border border-slate-300 rounded-xl p-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Hasta:</label>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                className="bg-slate-50 border border-slate-300 rounded-xl p-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Calculando indicadores y KPIs hoteleros...</div>
      ) : kpis ? (
        <div className="space-y-6">
          {/* Tarjetas KPIs Internacionales de Gestión Hotelera */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: % Ocupación Promedio */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>Ocupación del Hotel</span>
                <Percent className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {kpis.occupancyRate}%
              </p>
              <p className="text-[11px] text-slate-500">
                {kpis.totalStaysCount} estadía(s) en {kpis.totalRooms} hab.
              </p>
            </div>

            {/* KPI 2: ADR (Tarifa Promedio Diaria) */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>ADR (Tarifa Promedio)</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-700 font-mono">
                {formatPEN(kpis.adr)}
              </p>
              <p className="text-[11px] text-slate-500">Ingreso Hospedaje / Estadías</p>
            </div>

            {/* KPI 3: RevPAR (Ingreso por Hab. Disponible) */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>RevPAR (Ingreso por Hab.)</span>
                <Building2 className="w-4 h-4 text-violet-600" />
              </div>
              <p className="text-2xl font-black text-violet-700 font-mono">
                {formatPEN(kpis.revpar)}
              </p>
              <p className="text-[11px] text-slate-500">Ingreso Hospedaje / Total Hab.</p>
            </div>

            {/* KPI 4: Balance Neto Recaudado */}
            <div className="p-5 bg-emerald-600 text-white rounded-3xl shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-100">
                <span>Balance Neto (Ingresos - Gastos)</span>
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black font-mono">
                {formatPEN(kpis.netBalance)}
              </p>
              <p className="text-[11px] text-emerald-100/90">
                Ingresos {formatPEN(kpis.totalIncome)} | Egresos -{formatPEN(kpis.totalExpense)}
              </p>
            </div>
          </div>

          {/* Desglose por Origen e Ingresos por Métodos de Pago */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel Izquierdo: Origen de Ingresos */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                <span>Desglose de Ingresos por Origen</span>
              </h3>

              <div className="space-y-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setCategoryFilter(categoryFilter === 'stay' ? 'all' : 'stay')}
                  className={`p-3.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                    categoryFilter === 'stay'
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  title="Hacer clic para filtrar solo hospedajes en la tabla"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Bed className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Hospedajes / Check-ins</span>
                      <span className="text-[11px] text-slate-500">Alquiler por horas, pernocte y día completo</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-black text-emerald-700 block">{formatPEN(kpis.stayRevenue)}</span>
                    <span className="text-[10px] font-semibold text-emerald-600">{categoryFilter === 'stay' ? '● Filtrado activo' : 'Clic para filtrar'}</span>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setCategoryFilter(categoryFilter === 'store' ? 'all' : 'store')}
                  className={`p-3.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                    categoryFilter === 'store'
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  title="Hacer clic para filtrar solo ventas de tienda y frigobar"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Tienda / Frigobar</span>
                      <span className="text-[11px] text-slate-500">Ventas de mostrador y consumos a habitación</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-black text-blue-700 block">{formatPEN(kpis.storeRevenue)}</span>
                    <span className="text-[10px] font-semibold text-blue-600">{categoryFilter === 'store' ? '● Filtrado activo' : 'Clic para filtrar'}</span>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setCategoryFilter(categoryFilter === 'incident' ? 'all' : 'incident')}
                  className={`p-3.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                    categoryFilter === 'incident'
                      ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-500 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  title="Hacer clic para filtrar solo incidentes y penalidades"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Incidentes / Penalidad</span>
                      <span className="text-[11px] text-slate-500">Cobro de daños y sobrestadía</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-black text-violet-700 block">{formatPEN(kpis.incidentRevenue)}</span>
                    <span className="text-[10px] font-semibold text-violet-600">{categoryFilter === 'incident' ? '● Filtrado activo' : 'Clic para filtrar'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Derecho: Medios de Pago */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Desglose por Medios de Pago</span>
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Efectivo en Gaveta</span>
                      <span className="text-[11px] text-slate-500">Monedas y billetes en Soles</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-black text-emerald-700">{formatPEN(kpis.cashIncome)}</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Yape / Plin (Billeteras)</span>
                      <span className="text-[11px] text-slate-500">Pagos vía QR móvil</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-black text-violet-700">{formatPEN(kpis.yapeIncome)}</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Tarjetas POS</span>
                      <span className="text-[11px] text-slate-500">Débito y Crédito en terminal</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-black text-blue-700">{formatPEN(kpis.cardIncome)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Movimientos Financieros con Filtros por Categoría */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {categoryFilter === 'store' ? 'Ventas de Tienda & Minibar' :
                   categoryFilter === 'stay' ? 'Ingresos por Hospedaje / Check-ins' :
                   categoryFilter === 'expense' ? 'Gastos & Egresos de Caja' :
                   categoryFilter === 'incident' ? 'Cobros por Incidentes / Daños' :
                   'Transacciones de Caja en el Periodo'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mostrando {filteredTransactions.length} movimiento(s) • Total filtrado: <span className="font-mono font-bold text-emerald-700">{formatPEN(filteredTotal)}</span>
                </p>
              </div>

              {/* Botones de Filtro por Categoría */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold p-1 bg-slate-100 rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    categoryFilter === 'all'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({counts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('store')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                    categoryFilter === 'store'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                  title="Ver solo ventas de productos y frigobar"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Solo Tienda ({counts.store})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('stay')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                    categoryFilter === 'stay'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                  title="Ver solo alquiler de habitaciones"
                >
                  <Bed className="w-3.5 h-3.5" />
                  <span>Solo Hospedaje ({counts.stay})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('expense')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                    categoryFilter === 'expense'
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                  title="Ver solo gastos y salidas de caja"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5" />
                  <span>Gastos ({counts.expense})</span>
                </button>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No hay movimientos registrados en la categoría seleccionada para este periodo.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Fecha / Hora</th>
                      <th className="py-3 px-3">Concepto</th>
                      <th className="py-3 px-3">Categoría</th>
                      <th className="py-3 px-3">Medio Pago</th>
                      <th className="py-3 px-3">Comprobante</th>
                      <th className="py-3 px-3">Registrado Por</th>
                      <th className="py-3 px-3 text-right">Monto (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportTxPage.pageItems.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500">{formatDatePeru(t.created_at)}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{t.concept}</td>
                        <td className="py-3 px-3">
                          <CategoryBadge category={t.category} />
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center justify-center text-center leading-tight align-middle px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.payment_method === 'YAPE_PLIN' ? 'bg-violet-100 text-violet-800' :
                            t.payment_method === 'CARD' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {PAYMENT_METHOD_LABELS[t.payment_method] || t.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <VoucherCell tx={t} />
                            <TransactionActions
                              tx={t}
                              onReprint={(tx) => printReceipt(cashReceipt(tx, kpis.transactions))}
                              onEmit={(tx) => {
                                setSelectedVoucherTx(tx);
                                setIsVoucherModalOpen(true);
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{t.user_full_name || 'Sistema'}</td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${t.transaction_type === 'expense' ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {t.transaction_type === 'expense' ? `-` : `+`}{formatPEN(t.amount_pen)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={reportTxPage.page} totalPages={reportTxPage.totalPages} totalItems={reportTxPage.totalItems} onChange={reportTxPage.setPage} label="movimientos" />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal para emitir o re-imprimir comprobante electrónico */}
      <EmitVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setSelectedVoucherTx(null);
        }}
        transaction={selectedVoucherTx}
        onSuccess={fetchReportsData}
      />
    </div>
  );
}
