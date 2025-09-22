import { describe, expect, it } from 'vitest';
import StatementMaker from './statementMaker.js';

function median(numbers: number[]): number {
  if (numbers.length === 0) {
    throw new Error("Array must not be empty");
  }

  // Sort numbers in ascending order
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  // If odd length, return middle element
  if (sorted.length % 2 !== 0) {
    return sorted[mid]!;
  }

  // If even length, return average of two middle elements
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

describe('StatementMaker Basics', () => {
  it('should pack used values into an array', () => {
    const result = new StatementMaker()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .or('c = ?', 3)
      .build();

    expect(result.values)
      .toEqual([1, 2, 3]);
  });

  it('should build a correct SQL statement', () => {
    const result = new StatementMaker()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .or('c = ?', 3)
      .build();

    expect(result.statement)
      .toBe('WHERE (a = $1)\n AND (b = $2)\n OR (c = $3)');
  });

  it('should build a correct SQL statement with nested groups', () => {
    const result = new StatementMaker()
      .and('a = ?', 1)
      .and(
        new StatementMaker()
          .and('b = ?', 2)
          .or('c = ?', 3)
      )
      .or('d = ?', 4)
      .build();

    expect(result.statement)
      .toBe('WHERE (a = $1)\n AND ((b = $2)\n OR (c = $3))\n OR (d = $4)');
    expect(result.values)
      .toEqual([1, 2, 3, 4]);
  });

  it('should build a correct SQL statement with multiple nested groups', () => {
    const result = new StatementMaker()
      .and(
        new StatementMaker()
          .and('a = ?', 1)
          .or('b = ?', 2)
      )
      .or(
        new StatementMaker()
          .and('c = ?', 3)
          .and(
            new StatementMaker()
              .or('d = ?', 4)
              .or('e = ?', 5)
          )
      )
      .build();

    expect(result.statement)
      .toBe('WHERE ((a = $1)\n OR (b = $2))\n OR ((c = $3)\n AND ((d = $4)\n OR (e = $5)))');
    expect(result.values)
      .toEqual([1, 2, 3, 4, 5]);
  });

  it('should build a correct SQL statement without WHERE prefix', () => {
    const result = new StatementMaker()
      .disableWhere()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .or('c = ?', 3)
      .build();

    expect(result.statement)
      .toBe('(a = $1)\n AND (b = $2)\n OR (c = $3)');
    expect(result.values)
      .toEqual([1, 2, 3]);
  });

  it('should handle no conditions gracefully', () => {
    const result = new StatementMaker()
      .build();

    expect(result.statement)
      .toBe('');
    expect(result.values)
      .toEqual([]);
  });

  it('should handle a single condition without extra parentheses', () => {
    const result = new StatementMaker()
      .and('a = ?', 1)
      .build();

    expect(result.statement)
      .toBe('WHERE (a = $1)');
    expect(result.values)
      .toEqual([1]);
  });

  it('should handle mixed AND/OR conditions correctly', () => {
    const result = new StatementMaker()
      .and('a = ?', 1)
      .or('b = ?', 2)
      .and('c = ?', 3)
      .build();

    expect(result.statement)
      .toBe('WHERE (a = $1)\n OR (b = $2)\n AND (c = $3)');
    expect(result.values)
      .toEqual([1, 2, 3]);
  });

  it('raw queries should just place themselves in the statement', () => {
    const result = new StatementMaker()
      .and('a = ?', 1)
      .raw('', 'b = ?', 2)
      .or('c = ?', 3)
      .build();


    expect(result.statement)
      .toBe('WHERE (a = $1)\n  (b = $2)\n OR (c = $3)');
    expect(result.values)
      .toEqual([1, 2, 3]);
  });

  it('should throw if less values than placeholders', () => {
    expect(() => {
      new StatementMaker()
        .and('a = ? AND b = ?', 1)
        .or('c = ?', 2)
        .build();
    }).toThrowError('Number of placeholders does not match number of values');
  });

  it('should throw if more values than placeholders', () => {
    expect(() => {
      new StatementMaker()
        .and('a = ?', [1, 2])
        .or('c = ?', 3)
        .build();
    }).toThrowError('Number of placeholders does not match number of values');
  });

  it('should throw if more or less values than placeholders in raw', () => {
    expect(() => {
      new StatementMaker()
        .and('a = ?', 1)
        .raw('', 'b = ? AND c = ?', 2)
        .or('d = ?', 3)
        .build();
    }).toThrowError('Number of placeholders does not match number of values');
  });

  let firstStart = 0, firstEnd = 0;

  it('should return faster after first build', () => {
    const maker = new StatementMaker()
      .enableReparseOnChange()
      .disableReparseOnChange()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .and(
        new StatementMaker()
          .and('c = ?', 3)
          .or('d = ?', 4)
          .and(
            new StatementMaker()
              .or('f = ?', 5)
              .or('g = ?', 6)
          )
      )
      .between('e', 5, 10)
      .notBetween('f', 20, 30)
      .or('b = ?', 2)
      .in('h', [1, 2, 3])
      .notIn('i', [4, 5, 6], 'OR')
      .like('j', '%test%')
      .notLike('k', 'test%', 'OR')
      .ilike('l', '%test%')
      .notIlike('m', 'test%', 'OR')
      .isNull('n')
      .isNotNull('o', 'OR')
      .exists('SELECT 1 FROM table WHERE p = ?', [1])
      .notExists('SELECT 1 FROM table WHERE q = ?', [2], 'OR')
      .disableWhere()
      .raw('', 'x = ?', 42);
    
    let result1, result2;
    let secondStart = 0, secondEnd = 0;

    const tries = 5;
    for (let i = 0; i < tries; i++) {
      runBuild();
      if (firstEnd - firstStart > secondEnd - secondStart) {
        break;
      }
    }

    function runBuild() {
      const runs = 5;
      let firstStarts: number[] = [];
      let firstEnds: number[] = [];
      let secondStarts: number[] = [];
      let secondEnds: number[] = [];
      for (let i = 0; i < runs; i++) {
        firstStarts.push(performance.now());
        result1 = maker.build();
        firstEnds.push(performance.now());
        secondStarts.push(performance.now());
        result2 = maker.build();
        secondEnds.push(performance.now());
      }

      firstStart = median(firstStarts);
      firstEnd = median(firstEnds);
      secondStart = median(secondStarts);
      secondEnd = median(secondEnds);
    }

    console.debug(`First build took ${firstEnd - firstStart} ms`);
    console.debug(`Second build took ${secondEnd - secondStart} ms`);

    expect(secondEnd - secondStart).toBeLessThan(firstEnd - firstStart);
    expect(result1).toStrictEqual(result2);
  });

  it('should return faster compared reparseOnChange = false', () => {
    const maker = new StatementMaker()
      .enableReparseOnChange()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .and(
        new StatementMaker()
          .and('c = ?', 3)
          .or('d = ?', 4)
          .and(
            new StatementMaker()
              .or('f = ?', 5)
              .or('g = ?', 6)
          )
      )
      .between('e', 5, 10)
      .notBetween('f', 20, 30)
      .or('b = ?', 2)
      .in('h', [1, 2, 3])
      .notIn('i', [4, 5, 6], 'OR')
      .like('j', '%test%')
      .notLike('k', 'test%', 'OR')
      .ilike('l', '%test%')
      .notIlike('m', 'test%', 'OR')
      .isNull('n')
      .isNotNull('o', 'OR')
      .exists('SELECT 1 FROM table WHERE p = ?', [1])
      .notExists('SELECT 1 FROM table WHERE q = ?', [2], 'OR')
      .disableWhere()
      .raw('', 'x = ?', 42);
    
    let result1, result2;
    let secondStart = 0, secondEnd = 0;

    const tries = 10;
    for (let i = 0; i < tries; i++) {
      runBuild();
      if (firstEnd - firstStart > secondEnd - secondStart) {
        break;
      }
    }

    function runBuild() {
      const runs = 5;
      let firstStarts: number[] = [];
      let firstEnds: number[] = [];
      let secondStarts: number[] = [];
      let secondEnds: number[] = [];
      for (let i = 0; i < runs; i++) {
        firstStarts.push(performance.now());
        result1 = maker.build();
        firstEnds.push(performance.now());
        secondStarts.push(performance.now());
        result2 = maker.build();
        secondEnds.push(performance.now());
      }

      firstStart = median(firstStarts);
      firstEnd = median(firstEnds);
      secondStart = median(secondStarts);
      secondEnd = median(secondEnds);
    }

    console.debug(`First build took ${firstEnd - firstStart} ms`);
    console.debug(`Second build took ${secondEnd - secondStart} ms`);

    expect(secondEnd - secondStart).toBeLessThan(firstEnd - firstStart);
    expect(result1).toStrictEqual(result2);
  });

  it('should clone itself correctly', () => {
    const maker = new StatementMaker()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .or('c = ?', 3);

    const clone = maker.clone();

    const result1 = maker.build();
    const result2 = clone.build();

    // Delete internal properties that are not relevant for equality check
    // These include a lot of anonymous functions created in the process
    delete (maker as any)?.unsubscribeSignals;
    delete (clone as any)?.unsubscribeSignals;
    delete (maker as any)?.index?.subscribers;
    delete (clone as any)?.index?.subscribers;
    delete (maker as any)?.statements?.subscribers;
    delete (clone as any)?.statements?.subscribers;
    delete (maker as any)?.values?.subscribers;
    delete (clone as any)?.values?.subscribers;

    expect(clone).not.toBe(maker);
    expect(clone).toEqual(maker);

    expect(result2).toEqual(result1);
  });

  it('should return params correctly', () => {
    const maker = new StatementMaker()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .or('c = ?', 3);

    expect(maker.params)
      .toEqual([1, 2, 3]);
  });

  it('should handle enable where after disable where', () => {
    const result = new StatementMaker()
      .disableWhere()
      .and('a = ?', 1)
      .enableWhere()
      .and('b = ?', 2)
      .or('c = ?', 3)
      .build();

    expect(result.statement)
      .toBe('WHERE (a = $1)\n AND (b = $2)\n OR (c = $3)');
    expect(result.values)
      .toEqual([1, 2, 3]);
  });

  it('should handle addOffset correctly', () => {
    const result = new StatementMaker()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .or('c = ?', 3);

    expect(result.params)
      .toEqual([1, 2, 3]);

    result.addOffset(2);

    expect(result.params)
      .toEqual([1, 2, 3]);

    const built = result.build();
    expect(built.statement)
      .toBe('WHERE (a = $3)\n AND (b = $4)\n OR (c = $5)');
    expect(built.values)
      .toEqual([1, 2, 3]);
  });

  it('should handle addParams correctly', () => {
    const result = new StatementMaker()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .or('c = ?', 3);

    expect(result.params)
      .toEqual([1, 2, 3]);

    result.addParams([4, 5]);

    expect(result.params)
      .toEqual([4, 5, 1, 2, 3]);
  });

  it('should handle reseting correctly', () => {
    const result = new StatementMaker()
      .and('a = ?', 1)
      .and('b = ?', 2)
      .or('c = ?', 3);

    expect(result.params)
      .toEqual([1, 2, 3]);

    const built1 = result.build();
    expect(built1.statement)
      .toBe('WHERE (a = $1)\n AND (b = $2)\n OR (c = $3)');
    expect(built1.values)
      .toEqual([1, 2, 3]);

    result.reset();

    expect(result.params)
      .toEqual([]);

    const built2 = result.build();
    expect(built2.statement)
      .toBe('');
    expect(built2.values)
      .toEqual([]);
  });

  it('should handle joining another StatementMaker correctly', () => {
    const first = new StatementMaker()
      .and('b = ?', 2)
      .or('c = ?', 3);

    const second = new StatementMaker()
      .and('a = ?', 1)
      .or('d = ?', 4);

    first.joinMultipleStatements([second], 'AND');

    const built = first.build();
    expect(built.statement)
      .toBe('WHERE (b = $1)\n OR (c = $2)\n AND ((a = $3)\n OR (d = $4))');
    expect(built.values)
      .toEqual([2, 3, 1, 4]);
  });

});

describe('StatementMaker Composites', () => {
  it('should handle is null and is not null conditions', () => {
    const result = new StatementMaker()
      .isNull('a')
      .isNotNull('b', 'OR')
      .build();

    expect(result.statement)
      .toBe('WHERE (a IS NULL)\n OR (b IS NOT NULL)');
    expect(result.values)
      .toEqual([]);
  });

  it('should handle in and not in conditions', () => {
    const result = new StatementMaker()
      .in('a', [1, 2, 3])
      .notIn('b', [4, 5, 6], 'OR')
      .build();

    expect(result.statement)
      .toBe('WHERE (a IN ($1, $2, $3))\n OR (b NOT IN ($4, $5, $6))');
    expect(result.values)
      .toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('should handle like and not like conditions', () => {
    const result = new StatementMaker()
      .like('a', '%test%')
      .notLike('b', 'test%', 'OR')
      .build();

    expect(result.statement)
      .toBe('WHERE (a LIKE $1)\n OR (b NOT LIKE $2)');
    expect(result.values)
      .toEqual(['%test%', 'test%']);
  });

  it('should handle ilike and not ilike conditions', () => {
    const result = new StatementMaker()
      .ilike('a', '%test%')
      .notIlike('b', 'test%', 'OR')
      .build();

    expect(result.statement)
      .toBe('WHERE (a ILIKE $1)\n OR (b NOT ILIKE $2)');
    expect(result.values)
      .toEqual(['%test%', 'test%']);
  });

  it('should handle exists and not exists conditions', () => {
    const result = new StatementMaker()
      .exists('SELECT 1 FROM table WHERE a = ?', [1])
      .notExists('SELECT 1 FROM table WHERE b = ?', [2], 'OR')
      .build();

    expect(result.statement)
      .toBe('WHERE (EXISTS (SELECT 1 FROM table WHERE a = $1))\n OR (NOT EXISTS (SELECT 1 FROM table WHERE b = $2))');
    expect(result.values)
      .toEqual([1, 2]);
  });

  it('should handle between and not between conditions', () => {
    const result = new StatementMaker()
      .between('a', 1, 10)
      .notBetween('b', 20, 30)
      .or('b = ?', 2)
      .build();

    expect(result.statement)
      .toBe('WHERE (a BETWEEN $1 AND $2)\n AND (b NOT BETWEEN $3 AND $4)\n OR (b = $5)');
    expect(result.values)
      .toEqual([1, 10, 20, 30, 2]);
  });



})

describe('statementMaker-search', () => {
  
  it('should handle fulltext search conditions', () => {
    const result = new StatementMaker()
      .search()
      .fulltext('a', 'test', true, 'AND')
      .build();

    expect(result.statement)
      .toBe('WHERE (a ILIKE $1)');
    expect(result.values)
      .toEqual(['%test%']);
  });

  it('should handle fulltext ts_vector search conditions', () => {
    const result = new StatementMaker()
      .search()
      .fulltextTsVector('a', 'test search', 'english', 'AND')
      .build();

    expect(result.statement)
      .toBe("WHERE ((to_tsvector($1, a) @@ to_tsquery($2, $3)))");
    expect(result.values)
      .toEqual(['english', 'english', 'test:* & search:*']);
  });

  it('should handle wordByWord search conditions', () => {
    const result = new StatementMaker()
      .search()
      .wordByWord('a', 'test search', true, 'AND')
      .build();

    expect(result.statement)
      .toBe('WHERE (a ILIKE $1)\n AND (a ILIKE $2)');
    expect(result.values)
      .toEqual(['%test%', '%search%']);
  });

  it('should handle fuzzy trigram search conditions', () => {
    const result = new StatementMaker()
      .search()
      .fuzzyTrigram('a', 'test', 0.3, 'AND')
      .build();

    expect(result.statement)
      .toBe('WHERE ((a % $1)\n AND (similarity(a, $2) >= $3))');
    expect(result.values)
      .toEqual(['test', 'test', 0.3]);
  });

  it('should handle combined search conditions', () => {
    const result = new StatementMaker()
      .search()
      .fulltext('a', 'test', false, 'OR')
      .search()
      .wordByWord('b', 'search term', false, 'OR')
      .search()
      .fuzzyTrigram('c', 'fuzzy', 0.4, 'OR')
      .search()
      .fulltextTsVector('c', 'fuzzy', 'english', 'OR')
      .build();

    expect(result.statement)
      .toBe('WHERE (a LIKE $1)\n OR (b LIKE $2)\n OR (b LIKE $3)\n OR ((c % $4)\n AND (similarity(c, $5) >= $6))\n OR ((to_tsvector($7, c) @@ to_tsquery($8, $9)))');
    expect(result.values)
      .toEqual(['%test%', '%search%', '%term%', 'fuzzy', 'fuzzy', 0.4, 'english', 'english', 'fuzzy:*']);
  });
});
