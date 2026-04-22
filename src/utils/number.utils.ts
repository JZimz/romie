export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const bytesPerUnit = 1024;
  const precision = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(bytesPerUnit));
  return (
    parseFloat((bytes / Math.pow(bytesPerUnit, unitIndex)).toFixed(precision)) +
    ' ' +
    sizes[unitIndex]
  );
}

/**
 * Format an integer with locale-aware grouping (e.g., 12,345).
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Format a number into a compact form for constrained spaces (e.g., 2.4k, 1.2m).
 */
export function formatCompactNumber(value: number): string {
  if (value < 1000) return String(value);

  const units = ['k', 'm', 'b', 't'];
  let current = value;
  let unitIndex = -1;

  while (current >= 1000 && unitIndex < units.length - 1) {
    current /= 1000;
    unitIndex += 1;
  }

  const decimals = current >= 10 || current % 1 === 0 ? 0 : 1;
  return `${current.toFixed(decimals)}${units[unitIndex]}`;
}
