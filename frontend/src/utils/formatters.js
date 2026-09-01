/**
 * Formateadores de moneda, fechas y validadores adaptados a Perú
 */

export function formatPEN(amount = 0) {
  const num = Number(amount) || 0;
  return `S/ ${num.toFixed(2)}`;
}

export function formatDatePeru(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

export function formatTimePeru(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

export function getRemainingTime(expectedEndTimeIso) {
  if (!expectedEndTimeIso) return { text: '--', isExpired: false, percent: 0 };
  const target = new Date(expectedEndTimeIso).getTime();
  const now = new Date().getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    const expiredMinutes = Math.abs(Math.floor(diffMs / 60000));
    const expHours = Math.floor(expiredMinutes / 60);
    const expMins = expiredMinutes % 60;
    return {
      text: `Vencido (+${expHours > 0 ? `${expHours}h ` : ''}${expMins}m)`,
      isExpired: true,
      diffMinutes: expiredMinutes
    };
  }

  const remainingMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  return {
    text: `${hours > 0 ? `${hours}h ` : ''}${minutes}m restantes`,
    isExpired: false,
    diffMinutes: remainingMinutes
  };
}

export const PAYMENT_METHOD_LABELS = {
  YAPE_PLIN: 'Yape / Plin',
  CASH: 'Efectivo',
  CARD: 'Tarjeta (POS)'
};

export const STAY_TYPE_LABELS = {
  hours: 'Por Horas',
  overnight: 'Por Noche',
  full_day: 'Día Completo'
};

export const ROOM_STATUS_CONFIG = {
  available: {
    label: 'Disponible',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    cardBg: 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50'
  },
  occupied: {
    label: 'Ocupada',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    dotColor: 'bg-rose-500',
    cardBg: 'bg-rose-950/20 border-rose-900/40 hover:border-rose-500/50'
  },
  cleaning: {
    label: 'Limpieza',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dotColor: 'bg-amber-500 animate-pulse',
    cardBg: 'bg-amber-950/20 border-amber-900/40 hover:border-amber-500/50'
  },
  maintenance: {
    label: 'Mantenimiento',
    color: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    dotColor: 'bg-slate-500',
    cardBg: 'bg-slate-900/40 border-slate-800 opacity-70'
  }
};

/**
 * Impresión de Representación Impresa 80mm de Comprobante Electrónico (Boleta / Factura SUNAT)
 */
export function printElectronicVoucherTicket({
  hotelName = 'HOTEL ZAFIRO',
  hotelRuc = '20600000001',
  hotelAddress = 'AV. PRINCIPAL 123 - LIMA, PERÚ',
  voucherType = 'BOLETA', // BOLETA | FACTURA
  voucherSeries = '',
  voucherNumber = '',
  customerDocType = 'DNI',
  customerDocNumber = '',
  customerName = '',
  customerAddress = '',
  items = [],
  paymentMethod = 'EFECTIVO',
  totalAmount = 0
}) {
  const isFactura = voucherType === 'FACTURA';
  const title = isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
  const series = voucherSeries || (isFactura ? 'F001' : 'B001');
  const number = voucherNumber || String(Math.floor(Math.random() * 899999 + 100000));
  const fullVoucherNum = `${series}-${number}`;

  // Desglose IGV 18%
  const total = Number(totalAmount) || 0;
  const opGravada = total / 1.18;
  const igv = total - opGravada;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="text-align:left; padding: 3px 0;">${item.qty || 1}x ${item.description}</td>
      <td style="text-align:right; padding: 3px 0; font-family: monospace;">S/ ${(Number(item.price) || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const ticketWindow = window.open('', '_blank', 'width=400,height=600');
  if (!ticketWindow) {
    alert('Permite ventanas emergentes para imprimir el comprobante.');
    return;
  }

  ticketWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Comprobante ${fullVoucherNum}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            width: 72mm;
            margin: 0 auto;
            padding: 5px;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .qr-box {
            width: 100px;
            height: 100px;
            margin: 8px auto;
            border: 2px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="bold" style="font-size: 14px;">${hotelName.toUpperCase()}</div>
          <div>RUC: ${hotelRuc}</div>
          <div>${hotelAddress}</div>
          <div class="divider"></div>
          <div class="bold" style="font-size: 12px;">${title}</div>
          <div class="bold" style="font-size: 13px; margin: 3px 0;">${fullVoucherNum}</div>
          <div class="divider"></div>
        </div>

        <div>
          <div><span class="bold">Fecha/Hora:</span> ${new Date().toLocaleString('es-PE')}</div>
          <div><span class="bold">Cliente:</span> ${customerName || 'CONSUMIDOR FINAL'}</div>
          <div><span class="bold">${isFactura ? 'RUC' : customerDocType}:</span> ${customerDocNumber || '--'}</div>
          ${customerAddress ? `<div><span class="bold">Dir:</span> ${customerAddress}</div>` : ''}
          <div><span class="bold">Medio Pago:</span> ${paymentMethod}</div>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align:left;">DESCRIPCIÓN</th>
              <th style="text-align:right;">IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table>
          <tr>
            <td>OP. GRAVADA:</td>
            <td class="text-right font-mono">S/ ${opGravada.toFixed(2)}</td>
          </tr>
          <tr>
            <td>I.G.V. (18%):</td>
            <td class="text-right font-mono">S/ ${igv.toFixed(2)}</td>
          </tr>
          <tr class="bold" style="font-size: 12px;">
            <td>TOTAL A PAGAR:</td>
            <td class="text-right font-mono">S/ ${total.toFixed(2)}</td>
          </tr>
        </table>

        <div class="divider"></div>

        <div class="qr-box text-center">
          [ QR SUNAT ]<br/>${fullVoucherNum}
        </div>

        <div class="text-center" style="font-size: 9px; margin-top: 4px;">
          Representación Impresa de la ${title}<br/>
          Consulte su comprobante en SUNAT<br/>
          *** MODO DEMO / SIMULACIÓN ***
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  ticketWindow.document.close();
}

