import { describe, expect, it } from "vitest";
import Union from "./union.js";
import Query from "../queryMaker.js";
import Statement from "../statementMaker.js";

describe("Union Query", () => {
  it('should create a UNION query with two SELECT statements', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1", "column2"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1", "column2"])
      .where("column2 = ?", "value2");

    const unionQuery = new Union()
      .addMany([
        {
          query: select1,
          type: 'union'
        }, 
        {
          query: select2,
          type: 'union all'
        }
      ])
      .as('union_table')
      .build();

    expect(unionQuery.text).toBe('SELECT * FROM (\n (SELECT\n  "column1",\n  "column2"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1",\n  "column2"\n FROM "table2"\n WHERE (column2 = $2))\n) AS union_table');
    expect(unionQuery.values).toEqual(['value1', 'value2']);
  });

  it('should create a UNION query with LIMIT and OFFSET', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 IS NOT NULL");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 IS NOT NULL");

    const unionQuery = new Union()
      .add(select1, 'union')
      .add(select2, 'union')
      .as('union_table')
      .limit(15)
      .offset(3)
      .limitAndOffset(10, 5) // This should override the previous limit and offset
      .build();

    expect(unionQuery.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 IS NOT NULL))\n\n UNION\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 IS NOT NULL))\n) AS union_table\nLIMIT 10\nOFFSET 5');
    expect(unionQuery.values).toEqual([]);
  });

  it('should create a UNION query without alias', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    const unionQuery = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .build();

    expect(unionQuery.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_subquery');
    expect(unionQuery.values).toEqual(['value1', 'value2']);
  });

  it('should support adding multiple queries with one union type', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    const select3 = Query.select
      .from("table3")
      .select(["column1"])
      .where("column1 = ?", "value3");

    const unionQuery = new Union()
      .addManyOfType([select1, select2, select3], 'union all')
      .as('union_table')
      .build();

    expect(unionQuery.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table3"\n WHERE (column1 = $3))\n) AS union_table');
    expect(unionQuery.values).toEqual(['value1', 'value2', 'value3']);
  });

  it('should throw if limit or offset is negative', () => {
    const union = new Union();
    expect(() => union.limit(-1)).toThrow('Limit must be a non-negative integer.');
    expect(() => union.offset(-5)).toThrow('Offset must be a non-negative integer.');
    expect(() => union.limitAndOffset(10, -2)).toThrow('Offset must be a non-negative integer.');
    expect(() => union.limitAndOffset(-10, 2)).toThrow('Limit must be a non-negative integer.');
  });

  it('should return raw union query with rawUnion method', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    const union = new Union()
      .add(select1, 'union')
      .add(select2, 'union all');

    const rawUnion = union.rawUnion();

    expect(rawUnion.text).toBe('SELECT\n "column1"\nFROM "table1"\nWHERE (column1 = $1)\n\nUNION ALL\n\nSELECT\n "column1"\nFROM "table2"\nWHERE (column1 = $2)');
    expect(rawUnion.values).toEqual(['value1', 'value2']);
  });

  it('should throw error when no SELECT queries are added', () => {
    const union = new Union();
    expect(() => union.rawUnion()).toThrow('No SELECT queries added to the UNION.');
    expect(() => union.build()).toThrow('No SELECT queries added to the UNION.');
  });

  it('should be able to return sql and params directly', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    const union = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table');

    expect(union.toSQL()).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table');
    union.invalidate();
    expect(union.getParams()).toEqual(['value1', 'value2']);

    expect(union.toSQL()).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table');
    expect(union.getParams()).toEqual(['value1', 'value2']);
  });

  it('should support resetting its state', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    const union = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table');

    const built = union.build();
    expect(built.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table');
    expect(built.values).toEqual(['value1', 'value2']);

    union.reset();
    expect(() => union.build()).toThrow('No SELECT queries added to the UNION.');
  });

  it('should return its kind', () => {
    const union = new Union();
    expect(union.kind).toBe('UNION');
  });

  it('should support adding where clause to the union', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    // Through where
    const union = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table')
      .where(
        new Statement()
          .and("column1 = ?", "finalValue")
      ).build();

    expect(union.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table\nWHERE (column1 = $3)');
    expect(union.values).toEqual(['value1', 'value2', 'finalValue']);

    // Through useStatement
    const union2 = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table')
      .useStatement((stmt) => {
        stmt.and("column1 = ?", "finalValue");
      })
      .build();

    expect(union2.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table\nWHERE (column1 = $3)');
    expect(union2.values).toEqual(['value1', 'value2', 'finalValue']);
  });

  it('should support adding having clause to the union', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    // Through where
    const union = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table')
      .groupBy('column1')
      .having(
        new Statement()
          .and("column1 = ?", "finalValue")
      ).build();

    expect(union.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table\nGROUP BY "column1"\nHAVING (column1 = $3)');
    expect(union.values).toEqual(['value1', 'value2', 'finalValue']);

    // Through useStatement
    const union2 = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table')
      .addGroupBy('column1')
      .useHavingStatement((stmt) => {
        stmt.and("column1 = ?", "finalValue");
      })
      .build();

    expect(union2.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table\nGROUP BY "column1"\nHAVING (column1 = $3)');
    expect(union2.values).toEqual(['value1', 'value2', 'finalValue']);
  });

  it('should support group by and order by clauses', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    // One per time
    const union = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table')
      .groupBy('column1')
      .addGroupBy('column2')
      .orderBy({ field: 'column1', direction: 'DESC' })
      .addOrderBy({ field: 'column2', direction: 'ASC' })
      .build();

    expect(union.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table\nGROUP BY "column1", "column2"\nORDER BY "column1" DESC, "column2" ASC');
    expect(union.values).toEqual(['value1', 'value2']);

    // Multiple at once
    const union2 = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table')
      .groupBy(['column1', 'column2'])
      .addGroupBy(['column3', 'column4'])
      .orderBy([
        { field: 'column1', direction: 'DESC' },
        { field: 'column2', direction: 'ASC' }
      ])
      .addOrderBy([
        { field: 'column3', direction: 'DESC' },
        { field: 'column4', direction: 'ASC' }
      ])
      .build();

    expect(union2.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table\nGROUP BY "column1", "column2", "column3", "column4"\nORDER BY "column1" DESC, "column2" ASC, "column3" DESC, "column4" ASC');
    expect(union2.values).toEqual(['value1', 'value2']);
  });

  it('should support raw where statement and having statement', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    const union = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table')
      .where("column1 = ?", "finalValue")
      .groupBy('column1')
      .having("column1 = ?", "finalValue")
      .build();

    expect(union.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table\nWHERE (column1 = $3)\nGROUP BY "column1"\nHAVING (column1 = $3)');
    expect(union.values).toEqual(['value1', 'value2', 'finalValue']);
  });

  it('should throw if type of union is invalid', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const union = new Union();
    expect(() => union.add(select1, 'invalid' as any)).toThrow('Invalid union type. Only \'UNION\' and \'UNION ALL\' are allowed.');
  });

  it('should support clonning itself', () => {
    const select1 = Query.select
      .from("table1")
      .select(["column1"])
      .where("column1 = ?", "value1");

    const select2 = Query.select
      .from("table2")
      .select(["column1"])
      .where("column1 = ?", "value2");

    const union = new Union()
      .add(select1, 'union')
      .add(select2, 'union all')
      .as('union_table')
      .where("column1 = ?", "finalValue")
      .groupBy('column1')
      .having("column1 = ?", "finalValue")
      .limit(10)
      .offset(5);

    const built = union.build();

    expect(built.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS union_table\nWHERE (column1 = $3)\nGROUP BY "column1"\nHAVING (column1 = $3)\nLIMIT 10\nOFFSET 5');
    expect(built.values).toEqual(['value1', 'value2', 'finalValue']);

    const clone = union.clone().as('cloned_union_table').limit(20).offset(0);
    const builtClone = clone.build();

    expect(builtClone.text).toBe('SELECT * FROM (\n (SELECT\n  "column1"\n FROM "table1"\n WHERE (column1 = $1))\n\n UNION ALL\n\n (SELECT\n  "column1"\n FROM "table2"\n WHERE (column1 = $2))\n) AS cloned_union_table\nWHERE (column1 = $3)\nGROUP BY "column1"\nHAVING (column1 = $3)\nLIMIT 20\nOFFSET 0');
    expect(builtClone.values).toEqual(['value1', 'value2', 'finalValue']);

    // Original should remain unchanged
    const rebuiltOriginal = union.build();
    expect(rebuiltOriginal).toEqual(built);
  });

});
