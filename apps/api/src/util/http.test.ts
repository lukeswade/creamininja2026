import { describe, it, expect } from "vitest";
import {
  jsonOk,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
} from "./http";

describe("http utils", () => {
  describe("jsonOk", () => {
    it("should return the data exactly as passed", () => {
      const data = { id: 1, name: "Test" };
      expect(jsonOk(data)).toEqual(data);
    });

    it("should work with primitive types", () => {
      expect(jsonOk("string")).toBe("string");
      expect(jsonOk(123)).toBe(123);
      expect(jsonOk(true)).toBe(true);
    });
  });

  describe("badRequest", () => {
    it("should return ok: false and error with message", () => {
      const result = badRequest("Invalid input");
      expect(result).toEqual({
        ok: false,
        error: { message: "Invalid input", details: undefined },
      });
    });

    it("should include details if provided", () => {
      const details = { field: "email", error: "Required" };
      const result = badRequest("Validation failed", details);
      expect(result).toEqual({
        ok: false,
        error: { message: "Validation failed", details },
      });
    });
  });

  describe("unauthorized", () => {
    it("should use default message if none provided", () => {
      const result = unauthorized();
      expect(result).toEqual({
        ok: false,
        error: { message: "Unauthorized" },
      });
    });

    it("should use provided message", () => {
      const result = unauthorized("Custom unauthorized message");
      expect(result).toEqual({
        ok: false,
        error: { message: "Custom unauthorized message" },
      });
    });
  });

  describe("forbidden", () => {
    it("should use default message if none provided", () => {
      const result = forbidden();
      expect(result).toEqual({
        ok: false,
        error: { message: "Forbidden" },
      });
    });

    it("should use provided message", () => {
      const result = forbidden("Custom forbidden message");
      expect(result).toEqual({
        ok: false,
        error: { message: "Custom forbidden message" },
      });
    });
  });

  describe("notFound", () => {
    it("should use default message if none provided", () => {
      const result = notFound();
      expect(result).toEqual({
        ok: false,
        error: { message: "Not Found" },
      });
    });

    it("should use provided message", () => {
      const result = notFound("Custom not found message");
      expect(result).toEqual({
        ok: false,
        error: { message: "Custom not found message" },
      });
    });
  });
});
