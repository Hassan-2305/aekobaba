import { describe, expect, it } from "vitest";

import { usableSupabaseEnv } from "./env";

describe("usableSupabaseEnv", () => {
  it("accepts a real project URL and key", () => {
    expect(usableSupabaseEnv("https://abcd.supabase.co", "eyJ.key")).toEqual({
      url: "https://abcd.supabase.co",
      anonKey: "eyJ.key",
    });
  });

  it("treats missing values as unset", () => {
    expect(usableSupabaseEnv(undefined, "k")).toBeNull();
    expect(usableSupabaseEnv("https://abcd.supabase.co", "")).toBeNull();
  });

  it("treats .env.example placeholders as unset", () => {
    expect(usableSupabaseEnv("https://<project-ref>.supabase.co", "<anon-key>")).toBeNull();
    expect(usableSupabaseEnv("https://abcd.supabase.co", "<anon-key>")).toBeNull();
  });

  it("treats malformed URLs as unset", () => {
    expect(usableSupabaseEnv("abcd.supabase.co", "k")).toBeNull();
    expect(usableSupabaseEnv("ftp://abcd.supabase.co", "k")).toBeNull();
  });
});
