import * as XLSX from 'xlsx';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// 将二维数组导出为 Excel（.xlsx）Blob。
export function excelBlob(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([data], { type: XLSX_MIME });
}

export function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 将 CSV 字符串转换为 Excel（.xlsx）Blob。
export function csvToExcelBlob(csv) {
  const wb = XLSX.read(csv, { type: 'string' });
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([data], { type: XLSX_MIME });
}
