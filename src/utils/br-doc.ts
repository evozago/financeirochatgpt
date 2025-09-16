// Utilidades de documento BR (CPF/CNPJ): normalizar, validar e formatar

export function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export function formatCpf(digits: string): string {
  const v = onlyDigits(digits).slice(0, 11);
  return v
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
}

export function formatCnpj(digits: string): string {
  const v = onlyDigits(digits).slice(0, 14);
  return v
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{1,2})$/, "$1.$2.$3/$4-$5");
}

export function cpfIsValid(input: string): boolean {
  const s = onlyDigits(input);
  if (s.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(s)) return false;
  const d = s.split("").map((c) => parseInt(c, 10));
  let sum1 = 0, sum2 = 0;
  for (let i = 0; i < 9; i++) sum1 += d[i] * (10 - i);
  let dv1 = (sum1 * 10) % 11; if (dv1 === 10) dv1 = 0;
  for (let i = 0; i < 10; i++) sum2 += d[i] * (11 - i);
  let dv2 = (sum2 * 10) % 11; if (dv2 === 10) dv2 = 0;
  return dv1 === d[9] && dv2 === d[10];
}

export function cnpjIsValid(input: string): boolean {
  const s = onlyDigits(input);
  if (s.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(s)) return false;
  const d = s.split("").map((c) => parseInt(c, 10));
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  let sum1 = 0, sum2 = 0;
  for (let i = 0; i < 12; i++) sum1 += d[i] * w1[i];
  let dv1 = 11 - (sum1 % 11); if (dv1 >= 10) dv1 = 0;
  for (let i = 0; i < 13; i++) sum2 += d[i] * w2[i];
  let dv2 = 11 - (sum2 % 11); if (dv2 >= 10) dv2 = 0;
  return dv1 === d[12] && dv2 === d[13];
}

export function smartFormatCpfCnpj(raw: string): string {
  const digits = onlyDigits(raw);
  if (digits.length <= 11) return formatCpf(digits);
  return formatCnpj(digits);
}

export function validateCpfCnpjOrEmpty(value: string): { ok: boolean; type: "CPF" | "CNPJ" | "EMPTY" | "INVALID"; digits: string } {
  const digits = onlyDigits(value);
  if (!digits) return { ok: true, type: "EMPTY", digits };
  if (digits.length <= 11) return { ok: cpfIsValid(digits), type: "CPF", digits };
  if (digits.length === 14) return { ok: cnpjIsValid(digits), type: "CNPJ", digits };
  return { ok: false, type: "INVALID", digits };
}
