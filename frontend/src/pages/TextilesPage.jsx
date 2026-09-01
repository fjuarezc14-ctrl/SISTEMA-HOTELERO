import React, { useState } from 'react';
import {
  Sparkles,
  Bed,
  Bath,
  Shirt,
  WashingMachine,
  ShieldAlert,
  Search,
  Plus,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  Construction
} from 'lucide-react';

export function TextilesPage() {
  const [activeTab, setActiveTab] = useState('bedding'); // 'bedding' | 'bath' | 'laundry'
  const [search, setSearch] = useState('');

  // Datos simulados únicamente visuales
  const beddingItems = [
    { id: 1, name: 'Sábanas Blancas 2 Plazas (180 Hilos)', inUse: 24, inLaundry: 8, inStock: 16, total: 48, status: 'Buen Estado' },
    { id: 2, name: 'Sábanas King Size Matrimonial', inUse: 12, inLaundry: 4, inStock: 8, total: 24, status: 'Buen Estado' },
    { id: 3, name: 'Fundas de Almohada Estándar', inUse: 48, inLaundry: 16, inStock: 32, total: 96, status: 'Buen Estado' },
    { id: 4, name: 'Protectores de Colchón Impermeables', inUse: 20, inLaundry: 2, inStock: 6, total: 28, status: 'Revisión Necesaria' },
    { id: 5, name: 'Colchas / Edredones Térmicos', inUse: 18, inLaundry: 4, inStock: 10, total: 32, status: 'Buen Estado' },
    { id: 6, name: 'Almohadas Anatómicas de Microfibra', inUse: 40, inLaundry: 0, inStock: 12, total: 52, status: 'Buen Estado' },
  ];

  const bathItems = [
    { id: 101, name: 'Toallas de Baño Extra Grandes (70x140cm)', inUse: 36, inLaundry: 12, inStock: 24, total: 72, status: 'Excelente' },
    { id: 102, name: 'Toallas de Mano 100% Algodón', inUse: 30, inLaundry: 10, inStock: 20, total: 60, status: 'Excelente' },
    { id: 103, name: 'Toallas de Rostro Suaves', inUse: 25, inLaundry: 5, inStock: 15, total: 45, status: 'Excelente' },
    { id: 104, name: 'Alfombras de Baño Antideslizantes', inUse: 18, inLaundry: 6, inStock: 8, total: 32, status: 'Buen Estado' },
  ];

  const laundryBatches = [
    { id: 'LAV-2026-008', date: '01/09/2026', itemsCount: 45, provider: 'Lavandería Industrial San Martín', status: 'En Proceso de Lavado', estimatedReturn: 'Hoy 04:00 PM' },
    { id: 'LAV-2026-007', date: '30/08/2026', itemsCount: 60, provider: 'Lavandería Interna Hotel Zafiro', status: 'Lavado Completado', estimatedReturn: 'Entregado' },
  ];

  const filterItems = (items) =>
    items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* MODO DE PRUEBA BANNER SUPERIOR */}
      <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-2xl shrink-0 shadow-sm">
            <Construction className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-600 text-white text-[10px] font-black uppercase rounded-lg tracking-wider">
                MODO DE PRUEBA
              </span>
              <h3 className="text-sm font-bold text-amber-950">Módulo en Proceso de Producción & Prototipo Visual</h3>
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Demostración interactiva de la arquitectura y flujo para administrar ropa de cama, baño y lavandería.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('🚧 Módulo en Proceso de Producción: Esta interfaz es un prototipo visual para revisión de requisitos antes del desarrollo backend.')}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition-all shrink-0 self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>🚧 MODO DE PRUEBA</span>
        </button>
      </div>

      {/* Header del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shirt className="w-5 h-5 text-emerald-600" />
            <span>Gestión de Textiles & Lencería Hotelera</span>
          </h2>
          <p className="text-xs text-slate-500">
            Control de inventario, ropa de cama, prendas de baño y lotes en lavandería.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Demo visual: Acción simulada de envío a lavandería.')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <WashingMachine className="w-4 h-4 text-emerald-400" />
            <span>+ Enviar a Lavandería</span>
          </button>
          <button
            onClick={() => alert('Demo visual: Acción simulada de registro de textiles.')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Ingreso</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI Resumen de Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Ropa de Cama en Uso</span>
            <Bed className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">154 unidades</p>
          <p className="text-[11px] text-slate-500">Repartidas en habitaciones</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Ropa de Baño en Uso</span>
            <Bath className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 font-mono">109 unidades</p>
          <p className="text-[11px] text-slate-500">Toallas y alfombras activas</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>En Lavandería</span>
            <WashingMachine className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-black text-violet-700 font-mono">45 unidades</p>
          <p className="text-[11px] text-slate-500">Lote en proceso de lavado</p>
        </div>

        <div className="p-4 bg-emerald-600 text-white rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-100">
            <span>Stock Limpio en Almacén</span>
            <Package className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black font-mono">141 unidades</p>
          <p className="text-[11px] text-emerald-100/90">Reserva lista para recambio</p>
        </div>
      </div>

      {/* Selector de Pestañas & Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-3xl shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar sábanas, toallas, colchas..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('bedding')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'bedding' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bed className="w-4 h-4" />
            <span>🛌 Ropa de Cama</span>
          </button>

          <button
            onClick={() => setActiveTab('bath')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'bath' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bath className="w-4 h-4" />
            <span>🚿 Ropa de Baño</span>
          </button>

          <button
            onClick={() => setActiveTab('laundry')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'laundry' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <WashingMachine className="w-4 h-4" />
            <span>🧺 Control Lavandería</span>
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: ROPA DE CAMA */}
      {activeTab === 'bedding' && (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Inventario de Ropa de Cama & Lencería</h3>
            <span className="text-xs text-slate-400">Sábanas, Fundas, Protectores y Colchas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Ítem / Descripción</th>
                  <th className="py-3 px-3 text-center">En Habitaciones</th>
                  <th className="py-3 px-3 text-center">En Lavandería</th>
                  <th className="py-3 px-3 text-center">Almacén Limpio</th>
                  <th className="py-3 px-3 text-center">Total Stock</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Acción Demo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filterItems(beddingItems).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">{item.inUse} ud</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-violet-700">{item.inLaundry} ud</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">{item.inStock} ud</td>
                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900">{item.total} ud</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => alert(`Simulación: Recambio de ${item.name}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors"
                      >
                        Recambiar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ROPA DE BAÑO */}
      {activeTab === 'bath' && (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Inventario de Ropa de Baño</h3>
            <span className="text-xs text-slate-400">Toallas de Baño, Mano, Rostro y Alfombras</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Ítem / Descripción</th>
                  <th className="py-3 px-3 text-center">En Habitaciones</th>
                  <th className="py-3 px-3 text-center">En Lavandería</th>
                  <th className="py-3 px-3 text-center">Almacén Limpio</th>
                  <th className="py-3 px-3 text-center">Total Stock</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Acción Demo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filterItems(bathItems).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">{item.inUse} ud</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-violet-700">{item.inLaundry} ud</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">{item.inStock} ud</td>
                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900">{item.total} ud</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => alert(`Simulación: Asignación a habitación de ${item.name}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors"
                      >
                        Asignar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: CONTROL DE LAVANDERÍA */}
      {activeTab === 'laundry' && (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Lotes Enviados a Lavandería & Retornos</h3>
            <span className="text-xs text-slate-400">Seguimiento de prendas en lavado exterior/interno</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Código Lote</th>
                  <th className="py-3 px-3">Fecha Envío</th>
                  <th className="py-3 px-3 text-center">Prendas</th>
                  <th className="py-3 px-3">Proveedor / Lavandería</th>
                  <th className="py-3 px-3 text-center">Estado Lavado</th>
                  <th className="py-3 px-3 text-right">Entrega Estimada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {laundryBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{batch.id}</td>
                    <td className="py-3 px-3 text-slate-600">{batch.date}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">{batch.itemsCount} piezas</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{batch.provider}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        batch.status === 'En Proceso de Lavado'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">{batch.estimatedReturn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
