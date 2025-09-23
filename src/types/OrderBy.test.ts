import { describe, expect, it } from "vitest";
import { isOrderByField } from "./OrderBy.js";


describe('Order By is OrderByField', () => {
  it('should work', () => {
    const isIt1 = isOrderByField({ field: 'name', direction: 'ASC' });
    const isIt2 = isOrderByField({ field: 'name', direction: 'desc' });
    const isIt3 = isOrderByField({ column: 'name', direction: 'ASC' });

    expect(isIt1).toBe(true);
    expect(isIt2).toBe(true);
    expect(isIt3).toBe(false);
  });
});
