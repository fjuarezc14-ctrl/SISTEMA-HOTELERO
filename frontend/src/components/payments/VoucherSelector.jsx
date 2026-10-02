import React, { useState } from 'react';
import { FileText, Building2, UserCheck, Search, CheckCircle2, ShieldCheck } from 'lucide-react';

export function VoucherSelector({
  voucherType = 'NONE',
  setVoucherType,
  customerDoc = '',
  customerName = '',
  rucNumber,
  setRucNumber,
  businessName,
  setBusinessName,
  businessAddress,
  setBusinessAddress
}) {
  const [searching, setSearching] = useState(false);
  const [searchSuccess, setSearchSuccess] = useState(false);

  // Simulación de Consulta RUC en SUNAT
  const handleSearchRUC = () => {
    if (!rucNumber || rucNumber.length < 11) {
      alert('Ingresa un RUC válido de 11 dígitos.');
      return;
    }
    setSearching(true);
    setSearchSuccess(false);
    setTimeout(() => {
      setSearching(false);
      setSearchSuccess(true);
      if (!businessName) {
        setBusinessName(`EMPRESA DEMO Y SERVICIOS PERÚ S.A.C.`);
      }
      if (!businessAddress) {
        setBusinessAddress(`AV. JAVIER PRADO ESTE 1450, SAN ISIDRO, LIMA`);
      }
    }, 600);
  };

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Comprobante Electrónico (SUNAT)</span>
        </label>
        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-amber-700" />
          MODO DEMO / SIMULACIÓN
        </span>
      </div>

      {/* Selector de Tipo de Comprobante */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setVoucherType('NONE')}
          className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all text-center ${
            voucherType === 'NONE'
              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          🎟️ Ticket Interno
        </button>

        <button
          type="button"
          onClick={() => setVoucherType('BOLETA')}
          className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all text-center flex items-center justify-center gap-1 ${
            voucherType === 'BOLETA'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          📄 Boleta (DNI)
        </button>

        <button
          type="button"
          onClick={() => setVoucherType('FACTURA')}
          className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all text-center flex items-center justify-center gap-1 ${
            voucherType === 'FACTURA'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          🏢 Factura (RUC)
        </button>
      </div>

      {/* Despliegue para BOLETA */}
      {voucherType === 'BOLETA' && (
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
          <div className="flex items-center justify-between font-bold">
            <span>Cliente Registrado:</span>
            <span className="font-mono text-emerald-900">{customerDoc || 'Sin Documento'}</span>
          </div>
          <div className="font-extrabold text-slate-900 truncate">
            {customerName || 'Cliente General / Consumidor Final'}
          </div>
          <p className="text-[10px] text-emerald-700 font-medium">
            Se emitirá la Boleta de Venta Electrónica Serie <strong className="font-mono">B001</strong> a nombre del titular.
          </p>
        </div>
      )}

      {/* Despliegue para FACTURA */}
      {voucherType === 'FACTURA' && (
        <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2.5 text-xs">
          <p className="text-[11px] text-indigo-900 font-bold">
            La Factura Electrónica (Serie <strong className="font-mono">F001</strong>) requiere RUC de 11 dígitos:
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">RUC de la Empresa (11 dígitos)</label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={11}
                value={rucNumber}
                onChange={(e) => setRucNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 20601234567"
                className="flex-1 bg-white border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={handleSearchRUC}
                disabled={searching}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
              >
                {searching ? (
                  <span>Buscando...</span>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>SUNAT</span>
                  </>
                )}
              </button>
            </div>
            {searchSuccess && (
              <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>RUC Activo y Habido en SUNAT (Simulación)</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Razón Social</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: EMPRESA SERVICIOS S.A.C."
                className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Dirección Fiscal</label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Ej: Av. Javier Prado 123, San Isidro, Lima"
                className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
