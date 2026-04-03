import { describe, it, expect } from "vitest";
import { base64url } from "./crypto.ts";

describe("crypto utils", () => {
  describe("base64url", () => {
    it("should correctly convert ArrayBuffer", () => {
      const arrBuf = new Uint8Array([1, 2, 3]).buffer;
      expect(base64url(arrBuf)).toBe("AQID");
    });

    it("should correctly convert Uint8Array (ArrayBufferView)", () => {
      const uint8Arr = new Uint8Array([255, 0, 127]);
      expect(base64url(uint8Arr)).toBe("_wB_");
    });

    it("should correctly convert SharedArrayBuffer if available", () => {
      if (typeof SharedArrayBuffer !== "undefined") {
        const sab = new SharedArrayBuffer(3);
        const sabView = new Uint8Array(sab);
        sabView.set([10, 20, 30]);
        expect(base64url(sab)).toBe("ChQe");
      }
    });

    it("should correctly handle empty buffer", () => {
      expect(base64url(new Uint8Array([]))).toBe("");
    });
  });
});
