import { describe, it, expect } from "vitest";
import { serializeCookie } from "./cookies.js";

describe("serializeCookie", () => {
  it("should serialize a simple cookie with default options", () => {
    const cookie = serializeCookie("testName", "testValue");
    expect(cookie).toBe("testName=testValue; Path=/; SameSite=Lax");
  });

  it("should url-encode the value", () => {
    const cookie = serializeCookie("testName", "test Value with spaces & special chars! =");
    // encodeURIComponent('test Value with spaces & special chars! =') is 'test%20Value%20with%20spaces%20%26%20special%20chars!%20%3D'
    expect(cookie).toContain(`testName=test%20Value%20with%20spaces%20%26%20special%20chars!%20%3D`);
  });

  it("should support the path option", () => {
    const cookie = serializeCookie("name", "value", { path: "/app" });
    expect(cookie).toBe("name=value; Path=/app; SameSite=Lax");
  });

  it("should support the domain option", () => {
    const cookie = serializeCookie("name", "value", { domain: "example.com" });
    expect(cookie).toBe("name=value; Path=/; Domain=example.com; SameSite=Lax");
  });

  it("should support the httpOnly option", () => {
    const cookie = serializeCookie("name", "value", { httpOnly: true });
    expect(cookie).toBe("name=value; Path=/; HttpOnly; SameSite=Lax");
  });

  it("should support the secure option", () => {
    const cookie = serializeCookie("name", "value", { secure: true });
    expect(cookie).toBe("name=value; Path=/; Secure; SameSite=Lax");
  });

  it("should support the sameSite option (Strict, None, Lax)", () => {
    expect(serializeCookie("name", "value", { sameSite: "Strict" }))
      .toBe("name=value; Path=/; SameSite=Strict");

    expect(serializeCookie("name", "value", { sameSite: "None" }))
      .toBe("name=value; Path=/; SameSite=None");

    expect(serializeCookie("name", "value", { sameSite: "Lax" }))
      .toBe("name=value; Path=/; SameSite=Lax");
  });

  it("should support the maxAge option", () => {
    const cookie = serializeCookie("name", "value", { maxAge: 3600 });
    expect(cookie).toBe("name=value; Path=/; SameSite=Lax; Max-Age=3600");
  });

  it("should correctly handle maxAge of 0", () => {
    const cookie = serializeCookie("name", "value", { maxAge: 0 });
    expect(cookie).toBe("name=value; Path=/; SameSite=Lax; Max-Age=0");
  });

  it("should serialize all options combined", () => {
    const cookie = serializeCookie("session", "xyz123", {
      path: "/admin",
      domain: ".creamininja.com",
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 7200,
    });

    expect(cookie).toBe("session=xyz123; Path=/admin; Domain=.creamininja.com; HttpOnly; Secure; SameSite=Strict; Max-Age=7200");
  });
});
