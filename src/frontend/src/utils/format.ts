export function formatCurrency(cents: bigint | number): string {
  const val = typeof cents === "bigint" ? Number(cents) : cents;
  return `$${(val / 100).toFixed(2)}`;
}

export function formatDate(time: bigint | number): string {
  const ms = typeof time === "bigint" ? Number(time) / 1_000_000 : time;
  return new Date(ms).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(time: bigint | number): string {
  const ms = typeof time === "bigint" ? Number(time) / 1_000_000 : time;
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(time: bigint | number): string {
  const ms = typeof time === "bigint" ? Number(time) / 1_000_000 : time;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function toICPTimestamp(dateMs?: number): bigint {
  return BigInt(dateMs ?? Date.now()) * 1_000_000n;
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

export function formatINR(amount: bigint): string {
  const val = Number(amount) / 100;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `₹${val.toLocaleString("en-IN")}`;
  }
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
