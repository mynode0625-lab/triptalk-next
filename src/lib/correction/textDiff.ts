/** 텍스트 비교 유틸 — practice.js §4 */
import type { AlignOp } from "@/types/practice";

export const norm = (s: string): string =>
  s.toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ").trim();

export const words = (s: string): string[] => norm(s).split(" ").filter(Boolean);

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export const similar = (a: string, b: string): number =>
  1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

/** 단어 배열 정렬 → [{op:'match'|'sub'|'del'|'ins', a, b}] */
export function alignWords(A: string[], B: string[]): AlignOp[] {
  const m = A.length, n = B.length;
  const d = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));

  const ops: AlignOp[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)) {
      ops.push({ op: A[i - 1] === B[j - 1] ? "match" : "sub", a: A[i - 1], b: B[j - 1] }); i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ op: "del", a: A[i - 1], b: null }); i--;
    } else {
      ops.push({ op: "ins", a: null, b: B[j - 1] }); j--;
    }
  }
  return ops.reverse();
}
