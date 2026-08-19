import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS } from '../utils/formatters';
import { BarChart3, Wallet, QrCode, CreditCard, Calendar, TrendingUp } from 'lucide-react';

export function ReportsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await api.get('/cash/transactions?limit=200');
        setTransactions(res.data || []);
      } catch (err) {
        console.error('Error cargando reporte:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  // Totales acumulados por los 3 métodos de pago oficiales en Perú
  const totalIncome = transactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  const netBalance = totalIncome - totalExpense;

  const yapeTotal = transactions
    .filter((t) => t.transaction_type === 'income' && t.payment_method === 'YAPE_PLIN')
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  const cashTotal = transactions
    .filter((t) => t.transaction_type === 'income' && t.payment_method === 'CASH')
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  const cardTotal = transactions
    .filter((t) => t.transaction_type === 'income' && t.payment_method === 'CARD')
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <span>Reportes Financieros y Métodos de Pago (Perú)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Consolidado general de ingresos por Yape/Plin, Efectivo y Tarjeta en Soles (S/).
        </p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-1 shadow-lg">
          <span className="text-xs text-slate-400 font-semibold">Total Ingresos</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{formatPEN(totalIncome)}</p>
          <p className="text-[10px] text-slate-500">Recaudación acumulada</p>
        </div>

        <div className="p-5 bg-slate-900 border border-violet-500/30 rounded-3xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-xs text-violet-400 font-semibold">
            <span>Billeteras Yape / Plin</span>
            <QrCode className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-violet-300 font-mono">{formatPEN(yapeTotal)}</p>
          <p className="text-[10px] text-slate-500">
            {totalIncome > 0 ? `${((yapeTotal / totalIncome) * 100).toFixed(1)}% del total` : '0%'}
          </p>
        </div>

        <div className="p-5 bg-slate-900 border border-emerald-500/30 rounded-3xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Efectivo en Soles (S/)</span>
            <Wallet className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-300 font-mono">{formatPEN(cashTotal)}</p>
          <p className="text-[10px] text-slate-500">
            {totalIncome > 0 ? `${((cashTotal / totalIncome) * 100).toFixed(1)}% del total` : '0%'}
          </p>
        </div>

        <div className="p-5 bg-slate-900 border border-blue-500/30 rounded-3xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
            <span>Tarjetas (POS)</span>
            <CreditCard className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-blue-300 font-mono">{formatPEN(cardTotal)}</p>
          <p className="text-[10px] text-slate-500">
            {totalIncome > 0 ? `${((cardTotal / totalIncome) * 100).toFixed(1)}% del total` : '0%'}
          </p>
        </div>
      </div>

      {/* Transactions Audit Log */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Registro de Cobros Consolidados</h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Cargando datos...</div>
        ) : (
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 bg-slate-900">
                <tr>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3">Medio de Pago</th>
                  <th className="py-2.5 px-3">Registrado por</th>
                  <th className="py-2.5 px-3 text-right">Monto (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{formatDatePeru(t.created_at)}</td>
                    <td className="py-2.5 px-3 text-white font-medium">{t.concept}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {PAYMENT_METHOD_LABELS[t.payment_method] || t.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{t.user_full_name}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        t.transaction_type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.transaction_type === 'income' ? `+${formatPEN(t.amount_pen)}` : `-${formatPEN(t.amount_pen)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
