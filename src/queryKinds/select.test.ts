import { describe, expect, it } from "vitest";
import SelectQuery from "./select.js";
import Statement from "../statementMaker.js";
import { Cte } from "../cteMaker.js";

describe('Select Query', () => {
  it('should generate correct SELECT SQL', () => {
    const query = new SelectQuery('users', 'u')
      .select(['u.id', 'u.name'])
      .where('u.age > ?', 18)
      .orderBy({ field: 'u.name', direction: 'ASC' })
      .limit(10)
      .offset(5)
      .build();

    expect(query.text).toBe('SELECT\n "u"."id",\n "u"."name"\nFROM "users" AS u\nWHERE (u.age > $1)\nORDER BY "u"."name" ASC\nLIMIT 10 OFFSET 5');
    expect(query.values).toEqual([18]);
  });

  // Raw in the sense of not escaped
  it('should support selecting raw', () => {
    const query = new SelectQuery('users', 'u')
      .rawSelect('u.id')
      .rawSelect(['u.id', 'COUNT(o.id) AS order_count'])
      .addRawSelect('u.name')
      .addRawSelect(['u.email', 'u.age'])
      .where('u.age > ?', 18)
      .groupBy(['u.id', 'u.name'])
      .orderBy({ field: 'order_count', direction: 'DESC' })
      .limit(10)
      .offset(5)
      .build();

    expect(query.text).toBe('SELECT\n u.id,\n COUNT(o.id) AS order_count,\n u.name,\n u.email,\n u.age\nFROM "users" AS u\nWHERE (u.age > $1)\nGROUP BY "u"."id", "u"."name"\nORDER BY "order_count" DESC\nLIMIT 10 OFFSET 5');
    expect(query.values).toEqual([18]);
  })

  it('should handle joins correctly', () => {
    const query = new SelectQuery('orders', 'o')
      .select(['o.id', 'o.total', 'c.name'])
      .join({
        type: 'INNER',
        table: 'customers',
        alias: 'c',
        on: 'o.customer_id = c.id'
      })
      .where('o.total > ?', 100)
      .build();

    expect(query.text).toBe('SELECT\n "o"."id",\n "o"."total",\n "c"."name"\nFROM "orders" AS o\nINNER JOIN "customers" c\n ON o.customer_id = c.id\nWHERE (o.total > $1)');
    expect(query.values).toEqual([100]);
  });

  it('should handle multiple joins and complex where clauses', () => {
    const query = new SelectQuery('products', 'p')
      .select(['p.id', 'p.name', 'c.name AS category_name', 's.name AS supplier_name'])
      .join([
        {
          type: 'LEFT',
          table: 'categories',
          alias: 'c',
          on: 'p.category_id = c.id'
        },
        {
          type: 'INNER',
          table: 'suppliers',
          alias: 's',
          on: 'p.supplier_id = s.id'
        }
      ])
      .where(
        new Statement()
          .and('p.price > ?', [20])
          .and('c.active = ?', [true])
          .or('s.reliable = ?', [true])
      )
      .orderBy([
        { field: 'p.name', direction: 'ASC' },
        { column: 'p.price', direction: 'DESC' }
      ])
      .limitAndOffset(15, 0)
      .build();

    expect(query.text).toBe('SELECT\n "p"."id",\n "p"."name",\n "c"."name" AS "category_name",\n "s"."name" AS "supplier_name"\nFROM "products" AS p\nLEFT JOIN "categories" c\n ON p.category_id = c.id\nINNER JOIN "suppliers" s\n ON p.supplier_id = s.id\nWHERE (p.price > $1)\n AND (c.active = $2)\n OR (s.reliable = $2)\nORDER BY "p"."name" ASC, "p"."price" DESC\nLIMIT 15 OFFSET 0');
    expect(query.values).toEqual([20, true]);
  });

  it('should handle no selections (select all)', () => {
    const query = new SelectQuery('employees')
      .where('department = ?', 'Sales')
      .orderBy({ column: 'id', direction: 'DESC' })
      .build();

    expect(query.text).toBe('SELECT\n *\nFROM "employees"\nWHERE (department = $1)\nORDER BY "id" DESC');
    expect(query.values).toEqual(['Sales']);
  });

  it('should handle no where clause', () => {
    const query = new SelectQuery('departments')
      .select(['id', 'name'])
      .build();

    expect(query.text).toBe('SELECT\n "id",\n "name"\nFROM "departments"');
    expect(query.values).toEqual([]);
  });

  it('should handle distinct selection', () => {
    const query = new SelectQuery('cities')
      .select(['name'])
      .distinct()
      .build();

    expect(query.text).toBe('SELECT\n DISTINCT "name"\nFROM "cities"');
    expect(query.values).toEqual([]);
  });

  it('should return its kind', () => {
    const query = new SelectQuery('users');
    expect(query.kind).toBe('SELECT');
  });

  it('should be able to select just one field', () => {
    const query = new SelectQuery('users')
      .select('email')
      .build();

    expect(query.text).toBe('SELECT\n "email"\nFROM "users"');
    expect(query.values).toEqual([]);
  });

  it('should be able to set from after', () => {
    const query = new SelectQuery()
      .from('users', 'u')
      .build();

    expect(query.text).toBe('SELECT\n *\nFROM "users" AS u');
    expect(query.values).toEqual([]);
  });

  it('should be able to add selections', () => {
    const query = new SelectQuery('users')
      .select('id')
      .addSelect('name')
      .addSelect(['email', 'age'])
      .build();

    expect(query.text).toBe('SELECT\n "id",\n "name",\n "email",\n "age"\nFROM "users"');
    expect(query.values).toEqual([]);
  });

  it('should support useStatement for where clause', () => {
    const query = new SelectQuery()
      .from('test')
      .useStatement(stmt =>
        stmt.and('id = ?', 1)
          .or('email = ?', 2)
      )
      .build();

    expect(query.text).toBe('SELECT\n *\nFROM "test"\nWHERE (id = $1)\n OR (email = $2)');
    expect(query.values).toEqual([1, 2]);

    let someCondition = false;

    const query2 = new SelectQuery()
      .from('test')
      .useStatement(stmt => {
        stmt.and('id = ?', 1);
        if (someCondition) {
          stmt.or('email = ?', 2);
        }
      })
      .build();

    expect(query2.text).toBe('SELECT\n *\nFROM "test"\nWHERE (id = $1)');
    expect(query2.values).toEqual([1]);
  });

  it('should be set HAVING clause', () => {
    const query = new SelectQuery('sales')
      .select(['product_id', 'SUM(amount) AS total_sales'])
      .groupBy('product_id')
      .having('SUM(amount) > ?', 1000)
      .build();

    expect(query.text).toBe('SELECT\n "product_id",\n "SUM(amount)" AS "total_sales"\nFROM "sales"\nGROUP BY "product_id"\nHAVING (SUM(amount) > $1)');
    expect(query.values).toEqual([1000]);
  });

  it('should support useHavingStatement', () => {
    const query = new SelectQuery('sales')
      .select(['product_id', 'SUM(amount) AS total_sales'])
      .groupBy('product_id')
      .useHavingStatement(stmt =>
        stmt.and('SUM(amount) > ?', 1000)
          .or('COUNT(id) > ?', 10)
      )
      .build();

    expect(query.text).toBe('SELECT\n "product_id",\n "SUM(amount)" AS "total_sales"\nFROM "sales"\nGROUP BY "product_id"\nHAVING (SUM(amount) > $1)\n OR (COUNT(id) > $2)');
    expect(query.values).toEqual([1000, 10]);

    let someCondition = false;

    const query2 = new SelectQuery('sales')
      .select(['product_id', 'SUM(amount) AS total_sales'])
      .groupBy('product_id')
      .useHavingStatement(stmt => {
        stmt.and('SUM(amount) > ?', 1000);
        if (someCondition) {
          stmt.or('COUNT(id) > ?', 10);
        }
      })
      .build();

    expect(query2.text).toBe('SELECT\n "product_id",\n "SUM(amount)" AS "total_sales"\nFROM "sales"\nGROUP BY "product_id"\nHAVING (SUM(amount) > $1)');
    expect(query2.values).toEqual([1000]);
  });

  it('should throw if limit or offset is negative', () => {
    expect(() => {
      new SelectQuery('users').limit(-5);
    }).toThrow('Limit must be a non-negative integer.');

    expect(() => {
      new SelectQuery('users').offset(-10);
    }).toThrow('Offset must be a non-negative integer.');

    expect(() => {
      new SelectQuery('users').limitAndOffset(-1, 5);
    }).toThrow('Limit must be a non-negative integer.');

    expect(() => {
      new SelectQuery('users').limitAndOffset(5, -2);
    }).toThrow('Offset must be a non-negative integer.');
  });

  it('should be able to reset limit and offset', () => {
    const query = new SelectQuery('users')
      .limit(10)
      .offset(5)
      .resetLimitOffset()
      .build();

    expect(query.text).toBe('SELECT\n *\nFROM "users"');
    expect(query.values).toEqual([]);
  });

  it('should be able to group by select fields', () => {
    const query = new SelectQuery('employees')
      .select(['department'])
      .enableGroupBySelectFields()
      .build();

    expect(query.text).toBe('SELECT\n "department"\nFROM "employees"\nGROUP BY "department"');
    expect(query.values).toEqual([]);
  });

  it('should throw error if no table is specified', () => {
    expect(() => {
      new SelectQuery().build();
    }).toThrow('Table name is required for SELECT query.');
  });

  it('should be able to union and union all', () => {
    const query1 = new SelectQuery('table1')
      .select(['id', 'name'])
      .where('active = ?', true);

    const query2 = new SelectQuery('table2')
      .select(['id', 'name'])
      .where('active = ?', true);

    const unionQuery = query1.union(query2).build();

    expect(unionQuery.text).toBe('SELECT * FROM (\n (SELECT\n  "id",\n  "name"\n FROM "table1"\n WHERE (active = $1))\n\n UNION\n\n (SELECT\n  "id",\n  "name"\n FROM "table2"\n WHERE (active = $1))\n) AS union_subquery');
    expect(unionQuery.values).toEqual([true]);

    const unionAllQuery = query1.unionAll(query2).build();

    expect(unionAllQuery.text).toBe('SELECT * FROM (\n (SELECT\n  "id",\n  "name"\n FROM "table1"\n WHERE (active = $1))\n\n UNION ALL\n\n (SELECT\n  "id",\n  "name"\n FROM "table2"\n WHERE (active = $1))\n) AS union_subquery');
    expect(unionAllQuery.values).toEqual([true]);


  });

  it('should be able to reset its state', () => {
    const query = new SelectQuery('users', 'u')
      .select(['u.id', 'u.name'])
      .where('u.age > ?', 18)
      .orderBy({ field: 'u.name', direction: 'ASC' })
      .limit(10)
      .offset(5);

    const built = query.build();
    expect(built.text).toBe('SELECT\n "u"."id",\n "u"."name"\nFROM "users" AS u\nWHERE (u.age > $1)\nORDER BY "u"."name" ASC\nLIMIT 10 OFFSET 5');
    expect(built.values).toEqual([18]);

    query.reset();
    expect(() => {
      query.build();
    }).toThrow('Table name is required for SELECT query.');
  });

  it('should be able to return it\'s query definition', () => {
    const query = new SelectQuery('users', 'u')
      .select(['u.id', 'u.name'])
      .where('u.age > ?', 18)
      .orderBy({ field: 'u.name', direction: 'ASC' })
      .limit(10)
      .offset(5);

    expect(query.query).toEqual(query);
  });

  it('should be able to invalidate its built query', () => {
    const query = new SelectQuery('users', 'u')
      .select(['u.id', 'u.name'])
      .where('u.age > ?', 18)
      .having('COUNT(u.id) > ?', 1)
      .orderBy({ field: 'u.name', direction: 'ASC' })
      .limit(10)
      .offset(5);

    const firstBuild = query.build();
    expect(query.isDone).toBe(true);

    expect(firstBuild.text).toBe('SELECT\n "u"."id",\n "u"."name"\nFROM "users" AS u\nWHERE (u.age > $1)\nHAVING (COUNT(u.id) > $2)\nORDER BY "u"."name" ASC\nLIMIT 10 OFFSET 5');
    expect(firstBuild.values).toEqual([18, 1]);

    query.where('u.active = ?', true);
    query.having('SUM(u.score) > ?', 50);
    query.invalidate();
    expect(query.isDone).toBe(false);

    const secondBuild = query.build();
    expect(secondBuild.text).toBe('SELECT\n "u"."id",\n "u"."name"\nFROM "users" AS u\nWHERE (u.active = $1)\nHAVING (SUM(u.score) > $2)\nORDER BY "u"."name" ASC\nLIMIT 10 OFFSET 5');
    expect(secondBuild.values).toEqual([true, 50]);
  });

  it('should be able to return the sql and params directly', () => {
    const query = new SelectQuery('users', 'u')
      .select(['u.id', 'u.name'])
      .where('u.age > ?', 18)
      .orderBy({ field: 'u.name', direction: 'ASC' })
      .limit(10)
      .offset(5);

    expect(query.toSQL()).toBe('SELECT\n "u"."id",\n "u"."name"\nFROM "users" AS u\nWHERE (u.age > $1)\nORDER BY "u"."name" ASC\nLIMIT 10 OFFSET 5');
    query.invalidate();
    expect(query.getParams()).toEqual([18]);

    expect(query.toSQL()).toBe('SELECT\n "u"."id",\n "u"."name"\nFROM "users" AS u\nWHERE (u.age > $1)\nORDER BY "u"."name" ASC\nLIMIT 10 OFFSET 5');
    expect(query.getParams()).toEqual([18]);
  });


  it('should support CTEs', () => {
    const query = new SelectQuery('users', 'u')
      .with(new Cte(
        'active_users',
        new SelectQuery('users').where('active = ?', true).select(['id', 'name']),
        false
      ))
      .join({
        type: 'INNER',
        table: 'active_users',
        alias: 'au',
        on: 'u.id = au.id'
      })
      .select(['u.id', 'u.name', 'au.name AS active_name'])
      .where('u.created_at > ?', '2023-01-01')
      .orderBy({ field: 'u.name', direction: 'ASC' })
      .limit(20)
      .offset(0)
      .build();

    expect(query.text).toBe('WITH active_users AS (\nSELECT\n "id",\n "name"\nFROM "users"\nWHERE (active = $1)\n)\nSELECT\n "u"."id",\n "u"."name",\n "au"."name" AS "active_name"\nFROM "users" AS u\nINNER JOIN "active_users" au\n ON u.id = au.id\nWHERE (u.created_at > $2)\nORDER BY "u"."name" ASC\nLIMIT 20 OFFSET 0');
    expect(query.values).toEqual([true, '2023-01-01']);
  });

  it('should support invalidating with CTEs', () => {
    const query = new SelectQuery('users', 'u')
      .with(new Cte(
        'active_teams', 
        new SelectQuery('teams')
          .where('active = ?', true)
          .select(['id', 'name']), false
      ))
      .join({
        type: 'INNER',
        table: 'active_teams',
        alias: 'at',
        on: 'u.team_id = at.id'
      })
      .select(['u.id', 'u.name', 'at.name AS team_name'])
      .where('u.created_at > ?', '2023-01-01')
      .orderBy({ field: 'u.name', direction: 'ASC' })
      .limit(20)
      .offset(0);

    const firstBuild = query.build();
    expect(query.isDone).toBe(true);

    expect(firstBuild.text).toBe('WITH active_teams AS (\nSELECT\n "id",\n "name"\nFROM "teams"\nWHERE (active = $1)\n)\nSELECT\n "u"."id",\n "u"."name",\n "at"."name" AS "team_name"\nFROM "users" AS u\nINNER JOIN "active_teams" at\n ON u.team_id = at.id\nWHERE (u.created_at > $2)\nORDER BY "u"."name" ASC\nLIMIT 20 OFFSET 0');
    expect(firstBuild.values).toEqual([true, '2023-01-01']);

    query.where('u.active = ?', true);
    query.invalidate();
    expect(query.isDone).toBe(false);

    const secondBuild = query.build();
    expect(secondBuild.text).toBe('WITH active_teams AS (\nSELECT\n "id",\n "name"\nFROM "teams"\nWHERE (active = $1)\n)\nSELECT\n "u"."id",\n "u"."name",\n "at"."name" AS "team_name"\nFROM "users" AS u\nINNER JOIN "active_teams" at\n ON u.team_id = at.id\nWHERE (u.active = $1)\nORDER BY "u"."name" ASC\nLIMIT 20 OFFSET 0');
    expect(secondBuild.values).toEqual([true]);
  });

  it('should support cloning', () => {
    const query = new SelectQuery('users', 'u')
      .select(['u.id', 'u.name'])
      .where('u.age > ?', 18)
      .orderBy({ field: 'u.name', direction: 'ASC' })
      .limit(10)
      .offset(5);

    const clone = query.clone();
    expect(clone).not.toBe(query);
    expect(clone.build()).toEqual(query.build());

    clone.where('u.active = ?', true);
    clone.invalidate();

    expect(clone.build().text).toBe('SELECT\n "u"."id",\n "u"."name"\nFROM "users" AS u\nWHERE (u.active = $1)\nORDER BY "u"."name" ASC\nLIMIT 10 OFFSET 5');
    expect(clone.build().values).toEqual([true]);
    expect(query.build().text).toBe('SELECT\n "u"."id",\n "u"."name"\nFROM "users" AS u\nWHERE (u.age > $1)\nORDER BY "u"."name" ASC\nLIMIT 10 OFFSET 5');
    expect(query.build().values).toEqual([18]);
  });

});
