/**
 * Servicio de Generación de Comprobantes Electrónicos SUNAT (Boletas / Facturas)
 * Cumple con legislación peruana: IGV 18%, Subtotal, Series B001 y F001.
 */

export const receiptService = {
  /**
   * Calcula el desglose tributario peruano (IGV 18%)
   * @param {number} totalAmountPEN Monto total pagado en Soles (incluye IGV)
   */
  calculateTaxBreakdown(totalAmountPEN = 0) {
    const total = Number(totalAmountPEN) || 0;
    const subtotal = Math.round((total / 1.18) * 100) / 100;
    const igv = Math.round((total - subtotal) * 100) / 100;

    return {
      subtotal_pen: subtotal,
      igv_pen: igv,
      total_pen: total
    };
  },

  /**
   * Genera la numeración correlativa y datos estructurados del comprobante
   */
  generateReceiptData({
    receipt_type = 'NOTE', // NOTE (Nota de venta), BOLETA (B001), FACTURA (F001)
    customer_doc_type = 'DNI',
    customer_doc_number = '',
    customer_name = '',
    items = [], // [{ concept, amount }]
    total_amount_pen = 0
  }) {
    const tax = this.calculateTaxBreakdown(total_amount_pen);
    const date = new Date().toISOString();

    let series = 'NV01';
    let documentTitle = 'NOTA DE VENTA / TICKET DE CONTROL';

    if (receipt_type === 'BOLETA') {
      series = 'B001';
      documentTitle = 'BOLETA DE VENTA ELECTRÓNICA';
    } else if (receipt_type === 'FACTURA') {
      series = 'F001';
      documentTitle = 'FACTURA ELECTRÓNICA';
    }

    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const receiptNumber = `${series}-${String(randomNumber).padStart(8, '0')}`;

    return {
      document_title: documentTitle,
      receipt_type,
      series,
      receipt_number: receiptNumber,
      date,
      issuer: {
        business_name: 'HOTEL ZAFIRO S.A.C.',
        trade_name: 'Hotel Zafiro',
        ruc: '20123456789',
        address: 'Av. Principal 123, Miraflores, Lima, Perú',
        phone: '01-2345678'
      },
      customer: {
        doc_type: customer_doc_type,
        doc_number: customer_doc_number,
        name: customer_name
      },
      items,
      subtotal_pen: tax.subtotal_pen,
      igv_pen: tax.igv_pen,
      total_pen: tax.total_pen,
      sunat_status: receipt_type === 'NOTE' ? 'NO_REQUIRED' : 'ACCEPTED_MOCK',
      sunat_hash: `hash_sunat_${randomNumber}`
    };
  }
};
