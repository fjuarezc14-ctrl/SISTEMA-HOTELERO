/**
 * Exporta una lista de objetos a un archivo Excel (.xlsx) y lo descarga.
 *
 * @param {Array<Object>} rows - Filas a exportar
 * @param {Array<{ header: string, value: (row) => any, width?: number, money?: boolean }>} columns
 * @param {string} fileName - Nombre del archivo (con o sin .xlsx)
 * @param {string} [sheetName] - Nombre de la hoja
 */
export async function exportToExcel(rows, columns, fileName, sheetName = 'Reporte') {
  // Carga diferida: la librería solo se descarga al exportar
  const { default: writeExcelFile } = await import('write-excel-file/browser');

  const excelColumns = columns.map((col) => ({
    header: { value: col.header, fontWeight: 'bold', backgroundColor: '#E2E8F0' },
    cell: (row) => {
      const value = col.value(row);
      if (col.money) {
        return { value: Number(value || 0), type: Number, format: '"S/ "#,##0.00' };
      }
      return { value: value === null || value === undefined ? '' : String(value) };
    },
    width: col.width || 18
  }));

  const name = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  await writeExcelFile(rows, { columns: excelColumns, sheet: sheetName.slice(0, 31) }).toFile(name);
}
