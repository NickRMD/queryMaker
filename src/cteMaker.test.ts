import { describe, expect, it } from "vitest";
import CteMaker, { Cte } from "./cteMaker.js";
import Query from "./queryMaker.js";

describe('CTE Maker', () => {
  it('should create CTEs correctly', () => {
    const cteMaker = new CteMaker();

    const cte1 = cteMaker.addCte(
      new Cte().as('cte1').withQuery(Query.select.from('users').select('*'))
    );

    const cte2 = cteMaker.addCtes([
      new Cte('cte2', Query.select.from('orders').select('*')).recursive()
    ]);

    const query = Query.select
      .from('test')
      .with(cte1)
      .with(cte2)
      .select(['cte1.*', 'cte2.*'])
      .build();

    expect(query.text)
      .toBe('WITH cte1 AS (\nSELECT\n "*"\nFROM "users"\n), RECURSIVE cte2 AS (\nSELECT\n "*"\nFROM "orders"\n)\nSELECT\n "cte1"."*",\n "cte2"."*"\nFROM "test"');
    expect(query.values).toEqual([]);
  });

  it('should handle no CTEs gracefully', () => {
    const cteMaker = new CteMaker();
    expect(cteMaker.build().text).toBe('');
  });
});
