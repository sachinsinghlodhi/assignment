import { describe, expect, it } from "vitest";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return true;
  if (q.length < 2) return false;

  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  if (qi === q.length) return true;

  if (q.length >= 3) {
    const maxDist = q.length <= 4 ? 1 : 2;
    return (
      levenshtein(lower, q) <= maxDist ||
      levenshtein(lower.slice(0, q.length + maxDist), q) <= maxDist
    );
  }
  return false;
}

describe("fuzzyMatch", () => {
  it("matches exact substring", () => {
    expect(fuzzyMatch("jQuery (68)", "jquery")).toBe(true);
  });

  it("matches partial prefix", () => {
    expect(fuzzyMatch("jQuery (68)", "jQu")).toBe(true);
  });

  it("matches with misspelling (1 char off)", () => {
    expect(fuzzyMatch("jQuery", "jQueri")).toBe(true);
  });

  it("matches with misspelling (transposition)", () => {
    expect(fuzzyMatch("Shopify", "Shpoify")).toBe(true);
  });

  it("matches subsequence", () => {
    expect(fuzzyMatch("Google Analytics", "goanl")).toBe(true);
  });

  it("rejects completely unrelated strings", () => {
    expect(fuzzyMatch("jQuery", "Python")).toBe(false);
  });

  it("single char matches substring", () => {
    expect(fuzzyMatch("Apache", "a")).toBe(true);
  });

  it("handles empty query", () => {
    expect(fuzzyMatch("jQuery", "")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(fuzzyMatch("CloudFlare", "cloudflare")).toBe(true);
  });
});
