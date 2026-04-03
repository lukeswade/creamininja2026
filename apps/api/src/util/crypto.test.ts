import { describe, it, expect } from "vitest";
import { sha256Base64url } from "./crypto";

describe("crypto utils", () => {
  describe("sha256Base64url", () => {
    it("should compute the correct SHA-256 base64url hash for an empty string", async () => {
      // SHA-256 of "" is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      // Base64url of this hash is 47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU
      const result = await sha256Base64url("");
      expect(result).toBe("47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU");
    });

    it("should compute the correct SHA-256 base64url hash for 'hello world'", async () => {
      // SHA-256 of "hello world" is b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
      // Base64url of this hash is uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvzek
      const result = await sha256Base64url("hello world");
      expect(result).toBe("uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvzek");
    });

    it("should consistently produce the same hash for the same input", async () => {
      const input = "testing consistently";
      const hash1 = await sha256Base64url(input);
      const hash2 = await sha256Base64url(input);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", async () => {
      const hash1 = await sha256Base64url("input 1");
      const hash2 = await sha256Base64url("input 2");
      expect(hash1).not.toBe(hash2);
    });

    it("should handle unicode characters", async () => {
      const result1 = await sha256Base64url("hello 👋");
      const result2 = await sha256Base64url("hello 👋");
      expect(result1).toBe(result2);
      expect(result1.length).toBeGreaterThan(0);
    });
  });
});
