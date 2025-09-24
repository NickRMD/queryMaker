import { describe, expect, it } from "vitest";
import Query from "./queryMaker.js";


describe('Query Class', () => {
  it('should create simple select queries', () => {
    const selectQuery = Query.select
      .from('users', 'u')
      .select(['u.id', 'u.name'])
      .where('u.active = ?', true)
      .orderBy({ field: 'u.name', direction: 'ASC' })
      .limit(10)
      .offset(5)
      .build();

    expect(selectQuery.text).toBe('SELECT\n "u"."id",\n "u"."name"\nFROM "users" AS u\nWHERE (u.active = $1)\nORDER BY "u"."name" ASC\nLIMIT 10 OFFSET 5');
    expect(selectQuery.values).toEqual([true]);

    const insertQuery = Query.create
      .into('users')
      .values({ name: 'John', age: 30 })
      .returning(['id', 'name'])
      .build();

    expect(insertQuery.text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)\nRETURNING "id", "name"');
    expect(insertQuery.values).toEqual(['John', 30]);

    const updateQuery = Query.update
      .from('users')
      .set({ name: 'Jane' })
      .where('id = ?', 1)
      .returning('id')
      .build();

    expect(updateQuery.text).toBe('UPDATE "users"\nSET "name" = $1\nWHERE (id = $2)\nRETURNING "id"');
    expect(updateQuery.values).toEqual(['Jane', 1]);

    const deleteQuery = Query.delete.from('users', 'u')
      .where('u.id = ?', 1)
      .build();

    expect(deleteQuery.text).toBe('DELETE FROM "users" AS u\n WHERE (u.id = $1)');
    expect(deleteQuery.values).toEqual([1]);

    const cteQuery = Query.cte
      .withQuery(Query.select.from('users').select('*'))
      .as('all_users')
      .build();

    expect(cteQuery.text).toBe('all_users AS (\nSELECT\n "*"\nFROM "users"\n)');
    expect(cteQuery.values).toEqual([]);


    const selectQuery2 = Query.select
      .from('orders', 'o')
      .select(['o.id', 'o.total'])
      .where('o.completed = ?', true)
      .orderBy({ field: 'o.created_at', direction: 'DESC' })
      .limit(15)
      .offset(0);

    const selectQuery3 = Query.select
      .from('customers', 'c')
      .select(['c.id', 'c.name'])
      .where('c.active = ?', true)
      .orderBy({ field: 'c.name', direction: 'ASC' })
      .limit(10)
      .offset(0);

    const unionQuery = Query.union
      .add(selectQuery2)
      .add(selectQuery3, 'union all')
      .orderBy({ field: 'id', direction: 'ASC' })
      .as('union_subquery')
      .limit(30)
      .offset(0)
      .build();

    expect(unionQuery.text).toBe('SELECT * FROM (\n (SELECT\n  "o"."id",\n  "o"."total"\n FROM "orders" AS o\n WHERE (o.completed = $1)\n ORDER BY "o"."created_at" DESC\n LIMIT 15 OFFSET 0)\n\n UNION ALL\n\n (SELECT\n  "c"."id",\n  "c"."name"\n FROM "customers" AS c\n WHERE (c.active = $1)\n ORDER BY "c"."name" ASC\n LIMIT 10 OFFSET 0)\n) AS union_subquery\nORDER BY "id" ASC\nLIMIT 30\nOFFSET 0');
    expect(unionQuery.values).toEqual([true]);
  });

  it('should be constructable', () => {
    const query = new Query();

    const selectQuery = query.select
      .from('products', 'p')
      .select(['p.id', 'p.name'])
      .where('p.in_stock = ?', true)
      .orderBy({ field: 'p.name', direction: 'DESC' })
      .limit(20)
      .offset(0);

    const builtQuery = selectQuery.build();

    expect(builtQuery.text).toBe('SELECT\n "p"."id",\n "p"."name"\nFROM "products" AS p\nWHERE (p.in_stock = $1)\nORDER BY "p"."name" DESC\nLIMIT 20 OFFSET 0');
    expect(builtQuery.values).toEqual([true]);

    const insertQuery = query.create
      .into('products')
      .values({ name: 'Laptop', price: 999.99 })
      .returning(['id', 'name']);

    const builtInsert = insertQuery.build();

    expect(builtInsert.text).toBe('INSERT INTO "products" ("name", "price") VALUES ($1, $2)\nRETURNING "id", "name"');
    expect(builtInsert.values).toEqual(['Laptop', 999.99]);

    const updateQuery = query.update
      .from('products')
      .set({ price: 899.99 })
      .where('id = ?', 1)
      .returning('id');

    const builtUpdate = updateQuery.build();

    expect(builtUpdate.text).toBe('UPDATE "products"\nSET "price" = $1\nWHERE (id = $2)\nRETURNING "id"');
    expect(builtUpdate.values).toEqual([899.99, 1]);

    const deleteQuery = query.delete.from('products', 'p')
      .where('p.id = ?', 1);

    const builtDelete = deleteQuery.build();

    expect(builtDelete.text).toBe('DELETE FROM "products" AS p\n WHERE (p.id = $1)');
    expect(builtDelete.values).toEqual([1]);

    const cteQuery = query.cte
      .withQuery(query.select.from('products').select('*'))
      .as('all_products');

    const builtCte = cteQuery.build();

    expect(builtCte.text).toBe('all_products AS (\nSELECT\n "*"\nFROM "products"\n)');
    expect(builtCte.values).toEqual([]);

    const selectQuery2 = query.select
      .from('orders', 'o')
      .select(['o.id', 'o.total'])
      .where('o.completed = ?', true)
      .orderBy({ field: 'o.created_at', direction: 'DESC' })
      .limit(15)
      .offset(0);

    const selectQuery3 = query.select
      .from('customers', 'c')
      .select(['c.id', 'c.name'])
      .where('c.active = ?', true)
      .orderBy({ field: 'c.name', direction: 'ASC' })
      .limit(10)
      .offset(0);

    const unionQuery = query.union
      .add(selectQuery2)
      .add(selectQuery3, 'union all')
      .orderBy({ field: 'id', direction: 'ASC' })
      .as('union_subquery')
      .limit(30)
      .offset(0);

    const builtUnion = unionQuery.build();

    expect(builtUnion.text).toBe('SELECT * FROM (\n (SELECT\n  "o"."id",\n  "o"."total"\n FROM "orders" AS o\n WHERE (o.completed = $1)\n ORDER BY "o"."created_at" DESC\n LIMIT 15 OFFSET 0)\n\n UNION ALL\n\n (SELECT\n  "c"."id",\n  "c"."name"\n FROM "customers" AS c\n WHERE (c.active = $1)\n ORDER BY "c"."name" ASC\n LIMIT 10 OFFSET 0)\n) AS union_subquery\nORDER BY "id" ASC\nLIMIT 30\nOFFSET 0');
    expect(builtUnion.values).toEqual([true]);
  });
});
