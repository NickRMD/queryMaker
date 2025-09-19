
/**
  * This function extracts parameter names from a function definition.
  * Useful for comparing function signatures.
  * @param func - The function from which to extract parameter names.
  * @returns An array of parameter names.
  */
function getFunctionParameters(func: Function) {
    const funcStr = func.toString();
    const match = funcStr.match(/\(([^)]*)\)/);
    if (!match) return [];
    
    return match[1]
        ?.split(',')
        .map(param => param?.trim()?.split('=')?.[0]?.trim())
        .filter(param => param !== '') || [];
}

/**
  * Compares the parameters of two functions to see if they match.
  * @param fn1 - The first function to compare.
  * @param fn2 - The second function to compare.
  * @returns True if the functions have the same parameters, false otherwise.
  */
function compareParameters(fn1: Function, fn2: Function): boolean {
    const params1 = getFunctionParameters(fn1);
    const params2 = getFunctionParameters(fn2);
    
    return JSON.stringify(params1) === JSON.stringify(params2);
}

/**
  * Deeply compares two values for equality.
  * Handles primitives, arrays, objects, and functions (by comparing their string representations and parameters).
  * @param a - The first value to compare.
  * @param b - The second value to compare.
  * @returns True if the values are deeply equal, false otherwise.
  */
export default function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a === null || b === null) {
    return false;
  }

  if (typeof a !== typeof b) return false;

  if (typeof a === 'function' && typeof b === 'function') {
    const funcA = a.toString().replace(/,line:\d+/g, '');
    const funcB = b.toString().replace(/,line:\d+/g, '');
    return funcA === funcB && compareParameters(a, b);
  }

  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}
