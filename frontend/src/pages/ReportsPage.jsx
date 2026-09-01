import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS, printElectronicVoucherTicket } from '../utils/formatters';
import { EmitVoucherModal } from '../components/EmitVoucherModal';
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
  Printer,
  FileText
} from 'lucide-react';

export function ReportsPage() {
  const [period, setPeriod] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

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

  const exportToCSV = () => {
    if (!kpis || !kpis.transactions || kpis.transactions.length === 0) {
      alert('No hay transacciones en el periodo seleccionado para exportar.');
      return;
    }
    const headers = ['Fecha', 'Tipo', 'Concepto', 'Categoria', 'Medio de Pago', 'Registrado Por', 'Monto PEN'];
    const rows = kpis.transactions.map((t) => [
      `"${formatDatePeru(t.created_at)}"`,
      `"${t.transaction_type}"`,
      `"${(t.concept || '').replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${PAYMENT_METHOD_LABELS[t.payment_method] || t.payment_method}"`,
      `"${t.user_full_name || 'Sistema'}"`,
      t.amount_pen
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_hotel_zafiro_${startDate}_al_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportación Ficha PNP / MINCETUR con Datos Reales
  const exportMinceturPoliceReport = () => {
    const printWindow = window.open('', '_blank');
    const nowStr = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    const periodStr = `${startDate} al ${endDate}`;

    const rowsHtml = minceturStays.map((s, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${formatDatePeru(s.start_time)}</td>
        <td>${s.actual_end_time ? formatDatePeru(s.actual_end_time) : 'En estadía'}</td>
        <td><strong>${s.customer_name}</strong></td>
        <td>${s.document_type}: ${s.document_number}</td>
        <td>${s.phone || 'Sin teléfono'}</td>
        <td style="text-align: center; font-weight: bold;">Hab. ${s.room_number}</td>
        <td style="text-align: uppercase;">${s.stay_type === 'hours' ? 'Por Horas' : s.stay_type === 'overnight' ? 'Pernocte' : 'Día Completo'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Libro Registral Oficial PNP / MINCETUR - Hotel Zafiro</title>
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
            <h1>HOTEL ZAFIRO S.A.C.</h1>
            <h2>LIBRO REGISTRAL OFICIAL DE HUÉSPEDES (POLICÍA NACIONAL DEL PERÚ & MINCETUR)</h2>
          </div>
          <div class="box-info">
            <div>
              <strong>RUC:</strong> 20123456789 | <strong>Establecimiento:</strong> Hotel Zafiro Lima<br/>
              <strong>Dirección:</strong> Av. Principal 123, Lima, Perú
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
            onClick={exportToCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel (CSV)</span>
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
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl p-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
                <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Bed className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Hospedajes / Check-ins</span>
                      <span className="text-[11px] text-slate-500">Alquiler por horas, pernocte y día completo</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-black text-emerald-700">{formatPEN(kpis.stayRevenue)}</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Tienda / Frigobar</span>
                      <span className="text-[11px] text-slate-500">Ventas de mostrador y consumos a habitación</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-black text-blue-700">{formatPEN(kpis.storeRevenue)}</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Incidentes / Penalidad</span>
                      <span className="text-[11px] text-slate-500">Cobro de daños y sobrestadía</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-black text-violet-700">{formatPEN(kpis.incidentRevenue)}</span>
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

          {/* Tabla de Movimientos Financieros */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Transacciones de Caja en el Periodo</h3>

            {kpis.transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No hay movimientos registrados en el periodo.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Fecha / Hora</th>
                      <th className="py-3 px-3">Concepto</th>
                      <th className="py-3 px-3">Categoría</th>
                      <th className="py-3 px-3">Medio Pago</th>
                      <th className="py-3 px-3">Comprobante SUNAT</th>
                      <th className="py-3 px-3">Registrado Por</th>
                      <th className="py-3 px-3 text-right">Monto (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kpis.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500">{formatDatePeru(t.created_at)}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{t.concept}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize border border-slate-200">
                            {t.category}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.payment_method === 'YAPE_PLIN' ? 'bg-violet-100 text-violet-800' :
                            t.payment_method === 'CARD' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {PAYMENT_METHOD_LABELS[t.payment_method] || t.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {t.voucher_type && t.voucher_type !== 'NONE' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const isFactura = t.voucher_type === 'FACTURA';
                                printElectronicVoucherTicket({
                                  voucherType: t.voucher_type,
                                  voucherSeries: (t.voucher_number || '').split('-')[0] || (isFactura ? 'F001' : 'B001'),
                                  voucherNumber: (t.voucher_number || '').split('-')[1] || '000001',
                                  customerDocType: isFactura ? 'RUC' : 'DNI',
                                  customerDocNumber: isFactura ? t.customer_ruc : '',
                                  customerName: isFactura ? t.customer_business_name : t.concept,
                                  paymentMethod: t.payment_method,
                                  totalAmount: t.amount_pen,
                                  items: [{ qty: 1, description: t.concept, price: t.amount_pen }]
                                });
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 transition-colors"
                              title="Re-imprimir comprobante electrónico 80mm"
                            >
                              <Printer className="w-3 h-3 text-indigo-600" />
                              <span>{t.voucher_type === 'FACTURA' ? '🏢 FACTURA' : '📄 BOLETA'} {t.voucher_number || 'E-001'}</span>
                            </button>
                          ) : t.transaction_type === 'income' && !t.is_cancelled ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVoucherTx(t);
                                setIsVoucherModalOpen(true);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 transition-colors"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span>+ Emitir Comprobante</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Ticket Interno</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{t.user_full_name || 'Sistema'}</td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${t.transaction_type === 'expense' ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {t.transaction_type === 'expense' ? `-` : `+`}{formatPEN(t.amount_pen)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
