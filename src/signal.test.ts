import { describe, expect, it } from 'vitest';
import Signal from './signal.js';


describe('Synchronous Signals', () => {
  
  it('should handle basic signal operations', () => {
    let value = 0;
    const signal = new Signal<number>(0);
    signal.subscribe((val) => {
      value = val;
    });

    expect(signal.value).toBe(0);
    expect(value).toBe(0);

    signal.value = 5;
    expect(signal.value).toBe(5);
    expect(value).toBe(5);

    signal.value = 10;
    expect(signal.value).toBe(10);
    expect(value).toBe(10);
  });

  it('should handle multiple subscribers', () => {
    let value1 = 0;
    let value2 = 0;
    const signal = new Signal<number>(0);
    
    signal.subscribe((val) => {
      value1 = val;
    });

    signal.subscribe((val) => {
      value2 = val;
    });

    expect(signal.value).toBe(0);
    expect(value1).toBe(0);
    expect(value2).toBe(0);

    signal.value = 7;
    expect(signal.value).toBe(7);
    expect(value1).toBe(7);
    expect(value2).toBe(7);
  });

  it('should allow unsubscribing', () => {
    let value = 0;
    const signal = new Signal<number>(0);
    
    const unsubscribe = signal.subscribe((val) => {
      value = val;
    });

    expect(signal.value).toBe(0);
    expect(value).toBe(0);

    signal.value = 3;
    expect(signal.value).toBe(3);
    expect(value).toBe(3);

    unsubscribe();

    signal.value = 8;
    expect(signal.value).toBe(8);
    expect(value).toBe(3); // value should not change after unsubscribe
  });

  it('should handle complex types', () => {
    let objValue: { a: number; b: string } = { a: 0, b: '' };
    const signal = new Signal<{ a: number; b: string }>({ a: 0, b: '' });
    
    signal.subscribe((val) => {
      objValue = val;
    });

    expect(signal.value).toEqual({ a: 0, b: '' });
    expect(objValue).toEqual({ a: 0, b: '' });

    signal.value = { a: 1, b: 'test' };
    expect(signal.value).toEqual({ a: 1, b: 'test' });
    expect(objValue).toEqual({ a: 1, b: 'test' });
  });

  it('should support subscribing once', () => {
    let callCount = 0;
    const signal = new Signal<number>(0);
    
    signal.subscribeOnce(() => {
      callCount++;
    });

    expect(callCount).toBe(0);

    signal.value = 1;
    expect(callCount).toBe(1);

    signal.value = 2;
    expect(callCount).toBe(1); // callCount should not increase after the first call
  });

  it('should handle nested signals', () => {
    let innerValue = 0;
    const innerSignal = new Signal<number>(0);
    const outerSignal = new Signal<Signal<number>>(innerSignal);
    
    outerSignal.value.subscribe((val) => {
      innerValue = val;
    });

    expect(innerValue).toBe(0);

    innerSignal.value = 4;
    expect(innerValue).toBe(4);

    const newInnerSignal = new Signal<number>(10, true);

    newInnerSignal.subscribe((val) => {
      innerValue = val;
    });

    outerSignal.value = newInnerSignal;
    expect(innerValue).toBe(10);

    newInnerSignal.value = 20;
    expect(innerValue).toBe(20);
  });

  it('should handle immediate flag', () => {
    let value = 0;
    const signal = new Signal<number>(6, true);
    
    signal.subscribe((val) => {
      value = val;
    });

    expect(value).toBe(6);

    signal.value = 3;
    expect(value).toBe(3);
  });

  it('should notify subscribers even if value is unchanged', () => {
    let callCount = 0;
    const signal = new Signal<number>(5);
    
    signal.subscribe(() => {
      callCount++;
    });

    expect(callCount).toBe(0);

    signal.value = 5; // same value
    expect(callCount).toBe(1); // should notify

    signal.value = 10; // different value
    expect(callCount).toBe(2); // should also notify
  });

  it('should handle destroying itself', () => {
    let value = 0;
    const signal = new Signal<number>(0);
    
    signal.subscribe((val) => {
      value = val;
    });

    expect(signal.value).toBe(0);
    expect(value).toBe(0);

    signal.value = 9;
    expect(signal.value).toBe(9);
    expect(value).toBe(9);

    signal.destroy();

    signal.value = 15;
    expect(signal.value).toBe(15);
    expect(value).toBe(9); // value should not change after destroy
  });

  it('should support unsubscribing all subscribers', () => {
    let value1 = 0;
    let value2 = 0;
    const signal = new Signal<number>(0);
    
    signal.subscribe((val) => {
      value1 = val;
    });

    signal.subscribe((val) => {
      value2 = val;
    });

    expect(signal.value).toBe(0);
    expect(value1).toBe(0);
    expect(value2).toBe(0);

    signal.value = 11;
    expect(signal.value).toBe(11);
    expect(value1).toBe(11);
    expect(value2).toBe(11);

    signal.clearSubscribers();

    signal.value = 20;
    expect(signal.value).toBe(20);
    expect(value1).toBe(11); // value1 should not change after unsubscribeAll
    expect(value2).toBe(11); // value2 should not change after unsubscribeAll
  });

  it('should support unsubscribing once subscribers', () => {
    let callCount = 0;
    const signal = new Signal<number>(1, true);
    
    const unsubscribe = signal.subscribeOnce(() => {
      callCount++;
    });

    expect(callCount).toBe(1);

    unsubscribe();

    signal.value = 1;
    expect(callCount).toBe(1); // callCount should not increase after unsubscribe
  });

});
