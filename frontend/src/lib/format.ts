const STROOPS_PER_UNIT = 10_000_000;

export function toStroops(display: number): bigint {
  return BigInt(Math.round(display * STROOPS_PER_UNIT));
}

export function fromStroops(stroops: string | bigint | number): number {
  const n = typeof stroops === "bigint" ? stroops : BigInt(Math.round(Number(stroops)));
  return Number(n) / STROOPS_PER_UNIT;
}

export function formatUsd(stroops: string | bigint | number): string {
  return `$${fromStroops(stroops).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function truncateAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}
