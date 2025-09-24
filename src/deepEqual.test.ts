import { describe, expect, it } from "vitest";
import deepEqual from "./deepEqual.js";


describe('Deep Equal', () => {
  it('should be able to compare deep equality of numbers', () => {
    const isEqual = deepEqual(1, 1);
    const isNotEqual = deepEqual(1, 2);

    expect(isEqual).toBe(true);
    expect(isNotEqual).toBe(false);
  });

  it('should be able to compare deep equality of strings', () => {
    const isEqual = deepEqual('hello', 'hello');
    const isNotEqual = deepEqual('hello', 'world');

    expect(isEqual).toBe(true);
    expect(isNotEqual).toBe(false);
  });

  it('should be able to compare deep equality of booleans', () => {
    const isEqual = deepEqual(true, true);
    const isNotEqual = deepEqual(true, false);

    expect(isEqual).toBe(true);
    expect(isNotEqual).toBe(false);
  });

  it('should be able to compare deep equality of arrays', () => {
    const isEqual = deepEqual([1, 2, 3], [1, 2, 3]);
    const isNotEqual = deepEqual([1, 2, 3], [1, 2, 4]);

    expect(isEqual).toBe(true);
    expect(isNotEqual).toBe(false);
  });

  it('should be able to compare length of arrays', () => {
    const isNotEqual = deepEqual([1, 2, 3], [1, 2, 3, 4]);
    expect(isNotEqual).toBe(false);
  });

  it('should be able to compare deep equality of objects', () => {
    const isEqual = deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 });
    const isNotEqual = deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 });

    expect(isEqual).toBe(true);
    expect(isNotEqual).toBe(false);
  });

  it('should be able to compare nested objects', () => {
    const isEqual = deepEqual({ a: { b: 2 } }, { a: { b: 2 } });
    const isNotEqual = deepEqual({ a: { b: 2 } }, { a: { b: 3 } });

    expect(isEqual).toBe(true);
    expect(isNotEqual).toBe(false);
  });

  it('should be able to compare null and undefined', () => {
    const isEqualNull = deepEqual(null, null);
    const isEqualUndefined = deepEqual(undefined, undefined);
    const isNotEqual = deepEqual(null, undefined);

    expect(isEqualNull).toBe(true);
    expect(isEqualUndefined).toBe(true);
    expect(isNotEqual).toBe(false);
  });

  it('should be able to compare different types', () => {
    const isNotEqual1 = deepEqual(1, '1');
    const isNotEqual2 = deepEqual(true, 1);
    const isNotEqual3 = deepEqual({}, []);

    expect(isNotEqual1).toBe(false);
    expect(isNotEqual2).toBe(false);
    expect(isNotEqual3).toBe(false);
  });

  it('should be able to compare complex nested structures', () => {
    const obj1 = {
      a: 1,
      b: [1, 2, { c: 3 }],
      d: { e: { f: 4 } }
    };
    const obj2 = {
      a: 1,
      b: [1, 2, { c: 3 }],
      d: { e: { f: 4 } }
    };
    const obj3 = {
      a: 1,
      b: [1, 2, { c: 4 }],
      d: { e: { f: 4 } }
    };

    const isEqual = deepEqual(obj1, obj2);
    const isNotEqual = deepEqual(obj1, obj3);

    expect(isEqual).toBe(true);
    expect(isNotEqual).toBe(false);
  });

  it('should be able to compare functions by signature', () => {
    const func1 = function (a: number, b: string): number { return a - +b };
    const func2 = function (a: number, b: string): number { return a - +b };
    const func3 = function (a: number): number { return a };

    const isEqual = deepEqual(func1, func2);
    const isNotEqual = deepEqual(func1, func3);

    expect(isEqual).toBe(true);
    expect(isNotEqual).toBe(false);
  });
});
