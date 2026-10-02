import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/apiClient';
import { formatDatePeru } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { DateTimeInput } from '../../components/common/DateInput';
import { Badge } from '../../components/common/Badge';
import { Pagination, usePagination } from '../../components/common/Pagination';
import { Bed, Bath, Shirt, WashingMachine, Search, Plus, Package, ArrowRightLeft, AlertCircle, PackageCheck } from 'lucide-react';

const CATEGORY_LABELS = { bedding: 'Ropa de Cama', bath: 'Ropa de Baño' };

const MOVE_TYPES = [
  { id: 'assign', label: 'Asignar a habitaciones', help: 'Limpias del almacén → habitaciones', from: 'clean_qty' },
  { id: 'swap', label: 'Recambio (limpia por usada)', help: 'Se lleva una limpia y se retira una usada (queda por lavar)', from: 'clean_qty' },
  { id: 'collect', label: 'Retirar usadas', help: 'Habitaciones → por lavar', from: 'in_use_qty' },
  { id: 'discard_dirty', label: 'Dar de baja usada', help: 'Pieza usada dañada o perdida', from: 'dirty_qty' },
  { id: 'discard_clean', label: 'Dar de baja limpia', help: 'Pieza del almacén dañada o perdida', from: 'clean_qty' }
];

const toInputDate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const inputClass = 'w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600';

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function ModalButtons({ onCancel, submitting, label }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
      <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900">
        Cancelar
      </button>
      <button type="submit" disabled={submitting} className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-md">
        {submitting ? 'Guardando...' : label}
      </button>
    </div>
  );
}

export function TextilesPage() {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bedding'); // bedding | bath | laundry
  const [search, setSearch] = useState('');

  // Modales
  const [modal, setModal] = useState(null); // 'income' | 'move' | 'laundry' | 'return'
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Formularios
  const [incomeMode, setIncomeMode] = useState('existing'); // existing | new
  const [incomeItemId, setIncomeItemId] = useState('');
  const [incomeQty, setIncomeQty] = useState('');
  const [newItem, setNewItem] = useState({ name: '', category: 'bedding', min_stock: '' });
  const [moveType, setMoveType] = useState('assign');
  const [moveQty, setMoveQty] = useState('');
  const [laundryProvider, setLaundryProvider] = useState('');
  const [laundryReturn, setLaundryReturn] = useState('');
  const [laundryQty, setLaundryQty] = useState({});
  const [damaged, setDamaged] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsRes, batchesRes] = await Promise.all([api.get('/textiles/items'), api.get('/textiles/laundry')]);
      setItems(itemsRes.data || []);
      setBatches(batchesRes.data || []);
    } catch (err) {
      console.error('Error cargando textiles:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (name, item = null) => {
    setError('');
    setSelected(item);
    setModal(name);
    if (name === 'income') {
      setIncomeMode(items.length ? 'existing' : 'new');
      setIncomeItemId(items[0]?.id || '');
      setIncomeQty('');
      setNewItem({ name: '', category: activeTab === 'bath' ? 'bath' : 'bedding', min_stock: '' });
    }
    if (name === 'move') {
      setMoveType('assign');
      setMoveQty('');
    }
    if (name === 'laundry') {
      setLaundryProvider(batches[0]?.provider || '');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(16, 0, 0, 0);
      setLaundryReturn(toInputDate(tomorrow));
      setLaundryQty(Object.fromEntries(items.filter((i) => i.dirty_qty > 0).map((i) => [i.id, String(i.dirty_qty)])));
    }
    if (name === 'return') setDamaged({});
  };

  const closeModal = () => setModal(null);

  const submit = async (e, action) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      await action();
      closeModal();
      await fetchData();
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncome = (e) =>
    submit(e, async () => {
      if (incomeMode === 'new') {
        await api.post('/textiles/items', {
          name: newItem.name.trim(),
          category: newItem.category,
          min_stock: Number(newItem.min_stock) || 0,
          initial_qty: Number(incomeQty) || 0
        });
      } else {
        await api.post(`/textiles/items/${incomeItemId}/stock`, { quantity: Number(incomeQty) });
      }
    });

  const handleMove = (e) => submit(e, () => api.post(`/textiles/items/${selected.id}/move`, { type: moveType, quantity: Number(moveQty) }));

  const handleLaundry = (e) =>
    submit(e, () =>
      api.post('/textiles/laundry', {
        provider: laundryProvider.trim(),
        expected_return_at: laundryReturn || null,
        items: Object.entries(laundryQty)
          .filter(([, q]) => Number(q) > 0)
          .map(([item_id, q]) => ({ item_id, quantity: Number(q) }))
      })
    );

  const handleReturn = (e) =>
    submit(e, () =>
      api.post(`/textiles/laundry/${selected.id}/return`, {
        items: selected.items.map((it) => ({ item_id: it.item_id, damaged_qty: Number(damaged[it.item_id]) || 0 }))
      })
    );

  // Indicadores
  const sum = (list, field) => list.reduce((acc, i) => acc + Number(i[field] || 0), 0);
  const bedding = items.filter((i) => i.category === 'bedding');
  const bath = items.filter((i) => i.category === 'bath');
  const dirtyTotal = sum(items, 'dirty_qty');

  const query = search.toLowerCase().trim();
  const tabItems = (activeTab === 'bath' ? bath : bedding).filter((i) => !query || i.name.toLowerCase().includes(query));
  const filteredBatches = batches.filter(
    (b) => !query || b.code.toLowerCase().includes(query) || b.provider.toLowerCase().includes(query)
  );
  const itemsPage = usePagination(tabItems, { resetKey: `${activeTab}|${query}` });
  const batchesPage = usePagination(filteredBatches, { resetKey: query });

  const moveConfig = MOVE_TYPES.find((m) => m.id === moveType);

  return (
    <div className="space-y-6">
      {/* Header del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shirt className="w-5 h-5 text-emerald-600" />
            <span>Gestión de Textiles & Lencería Hotelera</span>
          </h2>
          <p className="text-xs text-slate-500">Control de inventario, ropa de cama, prendas de baño y lotes en lavandería.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openModal('laundry')}
            disabled={dirtyTotal === 0}
            title={dirtyTotal === 0 ? 'No hay prendas por lavar' : ''}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <WashingMachine className="w-4 h-4 text-emerald-400" />
            <span>Enviar a Lavandería ({dirtyTotal})</span>
          </button>
          <button
            onClick={() => openModal('income')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Ingreso</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Ropa de Cama en Uso</span>
            <Bed className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{sum(bedding, 'in_use_qty')} unidades</p>
          <p className="text-[11px] text-slate-500">Repartidas en habitaciones</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Ropa de Baño en Uso</span>
            <Bath className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 font-mono">{sum(bath, 'in_use_qty')} unidades</p>
          <p className="text-[11px] text-slate-500">Toallas y alfombras activas</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>En Lavandería</span>
            <WashingMachine className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-black text-violet-700 font-mono">{sum(items, 'laundry_qty')} unidades</p>
          <p className="text-[11px] text-slate-500">{dirtyTotal} por lavar en recepción</p>
        </div>
        <div className="p-4 bg-emerald-600 text-white rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-100">
            <span>Stock Limpio en Almacén</span>
            <Package className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black font-mono">{sum(items, 'clean_qty')} unidades</p>
          <p className="text-[11px] text-emerald-100/90">
            {items.filter((i) => i.low_stock).length > 0 ? `${items.filter((i) => i.low_stock).length} prenda(s) con stock bajo` : 'Reserva lista para recambio'}
          </p>
        </div>
      </div>

      {/* Pestañas & Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-3xl shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'laundry' ? 'Buscar lote o lavandería...' : 'Buscar sábanas, toallas, colchas...'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto">
          {[
            { id: 'bedding', label: 'Ropa de Cama', icon: Bed, active: 'bg-emerald-600' },
            { id: 'bath', label: 'Ropa de Baño', icon: Bath, active: 'bg-blue-600' },
            { id: 'laundry', label: 'Control Lavandería', icon: WashingMachine, active: 'bg-violet-600' }
          ].map(({ id, label, icon: Icon, active }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === id ? `${active} text-white shadow-sm` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inventario (cama o baño) */}
      {activeTab !== 'laundry' && (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Inventario de {CATEGORY_LABELS[activeTab]}</h3>
            <span className="text-xs text-slate-400">{tabItems.length} prenda(s)</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Cargando inventario...</div>
          ) : tabItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No hay prendas registradas. Usa "Registrar Ingreso" para agregar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Ítem / Descripción</th>
                    <th className="py-3 px-3 text-center">En Habitaciones</th>
                    <th className="py-3 px-3 text-center">Por Lavar</th>
                    <th className="py-3 px-3 text-center">En Lavandería</th>
                    <th className="py-3 px-3 text-center">Almacén Limpio</th>
                    <th className="py-3 px-3 text-center">Total</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemsPage.pageItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">{item.in_use_qty} ud</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">{item.dirty_qty} ud</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-violet-700">{item.laundry_qty} ud</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">{item.clean_qty} ud</td>
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900">{item.total_qty} ud</td>
                      <td className="py-3 px-3 text-center">
                        {item.low_stock ? (
                          <Badge tone="rose" title={`Mínimo: ${item.min_stock}`}>Stock bajo</Badge>
                        ) : (
                          <Badge tone="emerald">Buen estado</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => openModal('move', item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>{activeTab === 'bath' ? 'Asignar' : 'Recambiar'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={itemsPage.page} totalPages={itemsPage.totalPages} totalItems={itemsPage.totalItems} onChange={itemsPage.setPage} label="prendas" />
            </div>
          )}
        </div>
      )}

      {/* Control de lavandería */}
      {activeTab === 'laundry' && (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Lotes Enviados a Lavandería & Retornos</h3>
            <span className="text-xs text-slate-400">Seguimiento de prendas en lavado</span>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Aún no hay lotes enviados a lavandería.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Código Lote</th>
                    <th className="py-3 px-3">Fecha Envío</th>
                    <th className="py-3 px-3 text-center">Prendas</th>
                    <th className="py-3 px-3">Proveedor / Lavandería</th>
                    <th className="py-3 px-3 text-center">Estado Lavado</th>
                    <th className="py-3 px-3 text-right">Entrega</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchesPage.pageItems.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{batch.code}</td>
                      <td className="py-3 px-3 text-slate-600">{formatDatePeru(batch.sent_at)}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800" title={batch.items.map((i) => `${i.name}: ${i.quantity}`).join('\n')}>
                        {batch.items_count} piezas
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{batch.provider}</td>
                      <td className="py-3 px-3 text-center">
                        {batch.status === 'sent' ? <Badge tone="amber">En proceso de lavado</Badge> : <Badge tone="emerald">Lavado completado</Badge>}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {batch.status === 'returned'
                          ? formatDatePeru(batch.returned_at)
                          : batch.expected_return_at
                          ? `Estimada ${formatDatePeru(batch.expected_return_at)}`
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {batch.status === 'sent' && (
                          <button
                            onClick={() => openModal('return', batch)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-lg text-[11px] inline-flex items-center gap-1"
                          >
                            <PackageCheck className="w-3 h-3" />
                            <span>Recibir</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={batchesPage.page} totalPages={batchesPage.totalPages} totalItems={batchesPage.totalItems} onChange={batchesPage.setPage} label="lotes" />
            </div>
          )}
        </div>
      )}

      {/* Modal: Registrar ingreso */}
      <Modal isOpen={modal === 'income'} onClose={closeModal} title="Registrar Ingreso de Prendas" maxWidth="max-w-md">
        <form onSubmit={handleIncome} className="space-y-4">
          <ErrorBox message={error} />
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'existing', label: 'Prenda existente', disabled: items.length === 0 },
              { id: 'new', label: 'Nueva prenda' }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={opt.disabled}
                onClick={() => setIncomeMode(opt.id)}
                className={`py-2 rounded-xl border text-xs font-bold disabled:opacity-40 ${
                  incomeMode === opt.id ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {incomeMode === 'existing' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prenda</label>
              <select value={incomeItemId} onChange={(e) => setIncomeItemId(e.target.value)} className={inputClass}>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({CATEGORY_LABELS[i.category]})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la prenda</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={120}
                  placeholder="Ej: Sábanas blancas 2 plazas (180 hilos)"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                  <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className={inputClass}>
                    <option value="bedding">Ropa de Cama</option>
                    <option value="bath">Ropa de Baño</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock mínimo limpio</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={newItem.min_stock}
                    onChange={(e) => setNewItem({ ...newItem, min_stock: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad que ingresa limpia al almacén</label>
            <input
              type="number"
              min={incomeMode === 'new' ? '0' : '1'}
              step="1"
              required
              value={incomeQty}
              onChange={(e) => setIncomeQty(e.target.value)}
              className={inputClass}
            />
          </div>
          <ModalButtons onCancel={closeModal} submitting={submitting} label="Registrar Ingreso" />
        </form>
      </Modal>

      {/* Modal: Movimiento de una prenda */}
      <Modal isOpen={modal === 'move' && !!selected} onClose={closeModal} title={`Movimiento: ${selected?.name || ''}`} maxWidth="max-w-md">
        {modal === 'move' && selected && (
          <form onSubmit={handleMove} className="space-y-4">
            <ErrorBox message={error} />
            <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
              {[
                ['Almacén', selected.clean_qty, 'text-blue-700'],
                ['Habitaciones', selected.in_use_qty, 'text-emerald-700'],
                ['Por lavar', selected.dirty_qty, 'text-amber-700'],
                ['Lavandería', selected.laundry_qty, 'text-violet-700']
              ].map(([label, qty, color]) => (
                <div key={label} className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-slate-500">{label}</p>
                  <p className={`font-mono font-black text-sm ${color}`}>{qty}</p>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de movimiento</label>
              <select value={moveType} onChange={(e) => setMoveType(e.target.value)} className={inputClass}>
                {MOVE_TYPES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">{moveConfig?.help}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad (máx. {selected[moveConfig?.from] ?? 0})</label>
              <input
                type="number"
                min="1"
                max={selected[moveConfig?.from] ?? 0}
                step="1"
                required
                value={moveQty}
                onChange={(e) => setMoveQty(e.target.value)}
                className={inputClass}
              />
            </div>
            <ModalButtons onCancel={closeModal} submitting={submitting} label="Registrar Movimiento" />
          </form>
        )}
      </Modal>

      {/* Modal: Enviar a lavandería */}
      <Modal isOpen={modal === 'laundry'} onClose={closeModal} title="Enviar Prendas a Lavandería" maxWidth="max-w-lg">
        <form onSubmit={handleLaundry} className="space-y-4">
          <ErrorBox message={error} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lavandería / Proveedor</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={150}
                placeholder="Ej: Lavandería Industrial San Martín"
                value={laundryProvider}
                onChange={(e) => setLaundryProvider(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Retorno estimado</label>
              <DateTimeInput value={laundryReturn} onChange={setLaundryReturn} className={inputClass} />
            </div>
          </div>
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {items.filter((i) => i.dirty_qty > 0).map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 p-2.5 text-xs">
                <span className="font-semibold text-slate-800">
                  {i.name} <span className="text-slate-400 font-normal">({i.dirty_qty} por lavar)</span>
                </span>
                <input
                  type="number"
                  min="0"
                  max={i.dirty_qty}
                  step="1"
                  value={laundryQty[i.id] ?? ''}
                  onChange={(e) => setLaundryQty({ ...laundryQty, [i.id]: e.target.value })}
                  className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-center font-mono font-bold"
                />
              </div>
            ))}
          </div>
          <ModalButtons onCancel={closeModal} submitting={submitting} label="Enviar Lote" />
        </form>
      </Modal>

      {/* Modal: Recibir lote */}
      {/* Prenda (move) y lote (return) comparten "selected": cada modal solo lee sus datos cuando es el abierto */}
      <Modal isOpen={modal === 'return' && !!selected} onClose={closeModal} title={`Recibir Lote ${selected?.code || ''}`} maxWidth="max-w-lg">
        {modal === 'return' && selected?.items && (
          <form onSubmit={handleReturn} className="space-y-4">
            <ErrorBox message={error} />
            <p className="text-xs text-slate-600">
              Las prendas vuelven limpias al almacén. Indica cuántas llegaron dañadas o faltantes: se darán de baja.
            </p>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {selected.items.map((i) => (
                <div key={i.item_id} className="flex items-center justify-between gap-3 p-2.5 text-xs">
                  <span className="font-semibold text-slate-800">
                    {i.name} <span className="text-slate-400 font-normal">({i.quantity} enviadas)</span>
                  </span>
                  <label className="flex items-center gap-2 text-slate-500">
                    Dañadas
                    <input
                      type="number"
                      min="0"
                      max={i.quantity}
                      step="1"
                      placeholder="0"
                      value={damaged[i.item_id] ?? ''}
                      onChange={(e) => setDamaged({ ...damaged, [i.item_id]: e.target.value })}
                      className="w-16 bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-center font-mono font-bold"
                    />
                  </label>
                </div>
              ))}
            </div>
            <ModalButtons onCancel={closeModal} submitting={submitting} label="Confirmar Recepción" />
          </form>
        )}
      </Modal>
    </div>
  );
}
