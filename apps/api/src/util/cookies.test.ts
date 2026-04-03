import { describe, it, expect } from 'vitest';
import { parseCookies, serializeCookie } from './cookies';

describe('cookies util', () => {
  describe('parseCookies', () => {
    it('returns empty object for null header', () => {
      expect(parseCookies(null)).toEqual({});
    });

    it('returns empty object for empty string', () => {
      expect(parseCookies('')).toEqual({});
    });

    it('parses basic cookie', () => {
      expect(parseCookies('foo=bar')).toEqual({ foo: 'bar' });
    });

    it('parses multiple cookies', () => {
      expect(parseCookies('foo=bar; baz=qux')).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('handles extra whitespace', () => {
      expect(parseCookies('  foo=bar  ;  baz=qux  ')).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('ignores empty parts', () => {
      expect(parseCookies('foo=bar;;baz=qux')).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('ignores parts without key', () => {
      expect(parseCookies('=bar;foo=baz')).toEqual({ foo: 'baz' });
    });

    it('decodes url encoded values', () => {
      expect(parseCookies('foo=bar%20baz')).toEqual({ foo: 'bar baz' });
    });

    it('handles values with multiple equal signs', () => {
      expect(parseCookies('foo=bar=baz=qux')).toEqual({ foo: 'bar=baz=qux' });
    });

    it('handles keys with empty values', () => {
      expect(parseCookies('foo=; baz=qux')).toEqual({ foo: '', baz: 'qux' });
    });
  });

  describe('serializeCookie', () => {
    it('serializes basic cookie', () => {
      expect(serializeCookie('foo', 'bar')).toBe('foo=bar; Path=/; SameSite=Lax');
    });

    it('url encodes value', () => {
      expect(serializeCookie('foo', 'bar baz')).toBe('foo=bar%20baz; Path=/; SameSite=Lax');
    });

    it('includes httpOnly', () => {
      expect(serializeCookie('foo', 'bar', { httpOnly: true })).toBe('foo=bar; Path=/; HttpOnly; SameSite=Lax');
    });

    it('includes secure', () => {
      expect(serializeCookie('foo', 'bar', { secure: true })).toBe('foo=bar; Path=/; Secure; SameSite=Lax');
    });

    it('includes sameSite', () => {
      expect(serializeCookie('foo', 'bar', { sameSite: 'Strict' })).toBe('foo=bar; Path=/; SameSite=Strict');
    });

    it('includes path', () => {
      expect(serializeCookie('foo', 'bar', { path: '/api' })).toBe('foo=bar; Path=/api; SameSite=Lax');
    });

    it('includes domain', () => {
      expect(serializeCookie('foo', 'bar', { domain: 'example.com' })).toBe('foo=bar; Path=/; Domain=example.com; SameSite=Lax');
    });

    it('includes maxAge', () => {
      expect(serializeCookie('foo', 'bar', { maxAge: 3600 })).toBe('foo=bar; Path=/; SameSite=Lax; Max-Age=3600');
    });

    it('includes maxAge 0', () => {
      expect(serializeCookie('foo', 'bar', { maxAge: 0 })).toBe('foo=bar; Path=/; SameSite=Lax; Max-Age=0');
    });

    it('combines multiple options', () => {
      expect(serializeCookie('foo', 'bar', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/api',
        domain: 'example.com',
        maxAge: 3600
      })).toBe('foo=bar; Path=/api; Domain=example.com; HttpOnly; Secure; SameSite=None; Max-Age=3600');
    });
  });
});
