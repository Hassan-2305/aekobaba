import { describe, expect, it } from "vitest";

import { hashAccessToken, newAccessToken, tokenMatches } from "./access";

describe("inquiry access tokens", () => {
  it("issues a random token and stores only its hash", () => {
    const a = newAccessToken();
    const b = newAccessToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashAccessToken(a.token));
    expect(a.hash).not.toContain(a.token);
  });

  it("matches only the right token", () => {
    const { token, hash } = newAccessToken();
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches(`${token}x`, hash)).toBe(false);
    expect(tokenMatches(token, null)).toBe(false);
  });
});
