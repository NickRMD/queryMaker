import { describe, expect, it } from "vitest";
import UpdateQuery from "./update.js";
import Statement from "../statementMaker.js";
import CteMaker, { Cte } from "../cteMaker.js";
import SelectQuery from "./select.js";

describe('Update Query', () => {
  it('should generate correct UPDATE SQL', () => {
    const query = new UpdateQuery()
      .from('users', 'u')
      .set({ name: 'John', age: 30 })
      .where('u.id = ?', 1)
      .build();

    expect(query.text).toBe('UPDATE "users" u\nSET "name" = $1, "age" = $2\nWHERE (u.id = $3)');
    expect(query.values).toEqual(['John', 30, 1]);

    const query2 = new UpdateQuery('users')
      .set([
        { setColumn: 'name', value: 'Jane' },
        { setColumn: 'age', value: 25 }
      ])
      .where('id = ?', 2)
      .build();

    expect(query2.text).toBe('UPDATE "users"\nSET "name" = $1, "age" = $2\nWHERE (id = $3)');
    expect(query2.values).toEqual(['Jane', 25, 2]);

    const query3 = new UpdateQuery('users', 'u')
      .set({
        setColumn: 'name', value: 'Jane'
      })
      .addSetValue('age', 25)
      .where('u.id = ?', 2)
      .build();

    expect(query3.text).toBe('UPDATE "users" u\nSET "name" = $1, "age" = $2\nWHERE (u.id = $3)');
    expect(query3.values).toEqual(['Jane', 25, 2]);
  });

  it('should support useStatement', () => {
    const query = new UpdateQuery('users', 'u')
      .set({
        setColumn: 'name', value: 'Jane'
      })
      .useStatement(stmt => stmt.and('age = ?', 25))
      .build();

    expect(query.text).toBe('UPDATE "users" u\nSET "name" = $1\nWHERE (age = $2)');
    expect(query.values).toEqual(['Jane', 25]);

    const query2 = new UpdateQuery('users', 'u')
      .set({
        setColumn: 'name', value: 'Jane'
      })
      .useStatement(stmt => {
        stmt.and('age = ?', 25);
      })
      .build();

    expect(query2.text).toBe('UPDATE "users" u\nSET "name" = $1\nWHERE (age = $2)');
    expect(query2.values).toEqual(['Jane', 25]);
  });

  it('should generate UPDATE SQL with RETURNING clause', () => {
    const query = new UpdateQuery('users')
      .set({ name: 'Alice', age: 28 })
      .returning(['id', 'name'])
      .returning('id')
      .addReturning('name')
      .addReturning(['age'])
      .where('id = ?', 3)
      .build();

    expect(query.text).toBe('UPDATE "users"\nSET "name" = $1, "age" = $2\nWHERE (id = $3)\nRETURNING "id", "name", "age"');
    expect(query.values).toEqual(['Alice', 28, 3]);
  });

  it('should error when no set values provided', () => {
    expect(() => {
      new UpdateQuery('users').where('id = ?', 1).build();
    }).toThrow('No SET values specified for UPDATE query.');
  });

  it('should support using other table', () => {
    const query = new UpdateQuery('users', 'u')
      .using('teams', 't')
      .set({ 'u.status': 'inactive' })
      .where(
        new Statement()
          .and('u.team_id = t.id')
          .and('t.active = ?', [false])
      )
      .build();

    expect(query.text).toBe('UPDATE "users" u\nSET "u"."status" = $1\nFROM "teams" t\nWHERE (u.team_id = t.id)\n AND (t.active = $2)');
    expect(query.values).toEqual(['inactive', false]);
  });

  it('should support joining other tables while using other table', () => {
    const query = new UpdateQuery('users', 'u')
      .using('teams', 't')
      .join({
        table: 'departments',
        alias: 'd',
        type: 'INNER',
        on: 't.department_id = d.id'
      })
      .set({ 'u.status': 'inactive' })
      .where(
        new Statement()
          .and('u.team_id = t.id')
          .and('d.active = ?', [false])
      )
      .build();

    expect(query.text).toBe('UPDATE "users" u\nSET "u"."status" = $1\nFROM "teams" t\nINNER JOIN "departments" d\n ON t.department_id = d.id\nWHERE (u.team_id = t.id)\n AND (d.active = $2)');
    expect(query.values).toEqual(['inactive', false]);
  });

  it('should throw error if no table is specified', () => {
    expect(() => {
      new UpdateQuery().set({ name: 'John' }).build();
    }).toThrow('No table specified for UPDATE query.');
  });

  it('should support joining multiple tables', () => {
    // Cannot use conditios for joins using table being updated
    const query = new UpdateQuery('orders', 'o')
      .join([
        {
          table: 'customers',
          alias: 'c',
          type: 'LEFT',
          on: 'r.id = c.region_id'
        },
        {
          table: 'products',
          alias: 'p',
          type: 'INNER',
          on: 'r.id = p.region_id'
        }
      ])
      .using('regions', 'r')
      .set({ 'o.status': 'shipped' })
      .addSet('o.date_shipped', 'NOW()')
      .where(
        new Statement()
          .and('o.region_id = r.id')
          .and('r.name = ?', ['North'])
          .and('p.stock > ?', [0])
      )
      .build();

    expect(query.text).toBe('UPDATE "orders" o\nSET "o"."status" = $1, "o"."date_shipped" = "NOW()"\nFROM "regions" r\nLEFT JOIN "customers" c\n ON r.id = c.region_id\nINNER JOIN "products" p\n ON r.id = p.region_id\nWHERE (o.region_id = r.id)\n AND (r.name = $2)\n AND (p.stock > $3)');
    expect(query.values).toEqual(['shipped', 'North', 0]);
  });

  it('should return its kind', () => {
    const query = new UpdateQuery('users');
    expect(query.kind).toBe('UPDATE');
  });

  it('should reset its state', () => {
    const query = new UpdateQuery('users')
      .set({ name: 'John', age: 30 })
      .returning(['id', 'name']);

    const built = query.build();
    expect(built.text).toBe('UPDATE "users"\nSET "name" = $1, "age" = $2\nRETURNING "id", "name"');
    expect(built.values).toEqual(['John', 30]);

    query.reset();

    expect(() => {
      query.build();
    }).toThrow('No table specified for UPDATE query.');
  });

  it('should invalidate its built query', () => {
    const query = new UpdateQuery('users', 'u')
      .where('u.id = ?', 1)
      .set({ name: 'John' })
      .returning(['id', 'email'])
      .addReturning('biscuit');

    const firstBuild = query.build();
    expect(firstBuild.text).toBe('UPDATE "users" u\nSET "name" = $1\nWHERE (u.id = $2)\nRETURNING "id", "email", "biscuit"');
    expect(firstBuild.values).toEqual(['John', 1]);
    expect(query.isDone).toBe(true);

    query.set({ age: 25 });
    query.invalidate();
    expect(query.isDone).toBe(false);

    const secondBuild = query.build();
    expect(secondBuild.text).toBe('UPDATE "users" u\nSET "age" = $1\nWHERE (u.id = $2)\nRETURNING "id", "email", "biscuit"');
    expect(secondBuild.values).toEqual([25, 1]);
  });

  it('should be able to get query definition', () => {
    const query = new UpdateQuery('users', 'u')
      .where('u.id = ?', 1)
      .set({ name: 'John' })
      .returning(['id', 'email'])
      .addReturning('biscuit');

    expect(query.query).toEqual(query);
  });

  it('should be able to get params and sql directly', () => {
    const query = new UpdateQuery('users', 'u')
      .where('u.id = ?', 1)
      .set({ name: 'John' })
      .returning(['id', 'email'])
      .addReturning('biscuit');

    expect(query.toSQL()).toBe('UPDATE "users" u\nSET "name" = $1\nWHERE (u.id = $2)\nRETURNING "id", "email", "biscuit"');
    query.invalidate();
    expect(query.getParams()).toEqual(['John', 1]);

    expect(query.toSQL()).toBe('UPDATE "users" u\nSET "name" = $1\nWHERE (u.id = $2)\nRETURNING "id", "email", "biscuit"');
    expect(query.getParams()).toEqual(['John', 1]);
  });

  it('should be able to clone itself', () => {
    const query = new UpdateQuery('users', 'u')
      .where('u.id = ?', 1)
      .set({ name: 'John' })
      .returning(['id', 'email'])
      .addReturning('biscuit');

    const clone = query.clone();
    expect(clone).not.toBe(query);
    expect(clone.build()).toEqual(query.build());

    clone.set({ name: 'Jane' });
    clone.invalidate();

    expect(clone.build().values).toEqual(['Jane', 1]);
    expect(query.build().values).toEqual(['John', 1]);
  });

  it('should be able to use statements on conditions for joins', () => {
    const query = new UpdateQuery('orders', 'o')
      .using('customers', 'c')
      .join({
        table: 'regions',
        alias: 'r',
        type: 'INNER',
        on: new Statement().and('o.customer_id = c.id').and('c.active = ?', true)
      })
      .set({ 'o.status': 'shipped' })
      .where(
        new Statement()
          .and('o.id = ?', 1)
          .and('o.region_id = r.id')
      )
      .build();

    expect(query.text).toBe('UPDATE "orders" o\nSET "o"."status" = $1\nFROM "customers" c\nINNER JOIN "regions" r\n ON (o.customer_id = c.id) AND (c.active = $2)\nWHERE (o.id = $3)\n AND (o.region_id = r.id)');
    expect(query.values).toEqual(['shipped', true, 1]);
  });

  it('should support CTEs', () => {
    const query = new UpdateQuery('users', 'u')
      .with(
        new Cte(
          'active_teams',
          new SelectQuery('teams')
            .where('active = ?', true)
            .select(['id', 'name']),
          false
        )
      )
      .using('active_teams', 'at')
      .set({ 'u.status': 'inactive' })
      .where('u.team_id = at.id')
      .build();

    expect(query.text).toBe('WITH active_teams AS (\nSELECT\n "id",\n "name"\nFROM "teams"\nWHERE (active = $1)\n)\nUPDATE "users" u\nSET "u"."status" = $2\nFROM "active_teams" at\nWHERE (u.team_id = at.id)');
    expect(query.values).toEqual([true, 'inactive']);
  });

  it('should support invalidating with CTEs', () => {
    const query = new UpdateQuery('users', 'u')
      .with(
        new Cte(
          'active_teams',
          new SelectQuery('teams')
            .where('active = ?', true)
            .select(['id', 'name']),
          false
        )
      )
      .using('active_teams', 'at')
      .set({ 'u.status': 'inactive' })
      .where('u.team_id = at.id');

    const firstBuild = query.build();
    expect(query.isDone).toBe(true);

    expect(firstBuild.text).toBe('WITH active_teams AS (\nSELECT\n "id",\n "name"\nFROM "teams"\nWHERE (active = $1)\n)\nUPDATE "users" u\nSET "u"."status" = $2\nFROM "active_teams" at\nWHERE (u.team_id = at.id)');
    expect(firstBuild.values).toEqual([true, 'inactive']);

    query.with(
      new Cte(
        'active_teams',
        new SelectQuery('teams')
          .where('active = ?', false)
          .select(['id', 'name']),
        false
      )
    );
    query.invalidate();
    expect(query.isDone).toBe(false);

    const secondBuild = query.build();
    expect(secondBuild.text).toBe('WITH active_teams AS (\nSELECT\n "id",\n "name"\nFROM "teams"\nWHERE (active = $1)\n)\nUPDATE "users" u\nSET "u"."status" = $2\nFROM "active_teams" at\nWHERE (u.team_id = at.id)');
    expect(secondBuild.values).toEqual([false, 'inactive']);
  });

  it('should support subQuery in joins', () => {
    const subQuery = new SelectQuery('departments', 'd')
      .select(['d.id', 'd.name'])
      .where('d.active = ?', true);

    const query = new UpdateQuery('employees', 'e')
      .using('companies', 'c')
      .join({
        subQuery,
        alias: 'dept',
        type: 'INNER',
        on: 'e.department_id = dept.id'
      })
      .set({ 'e.status': 'active' })
      .where(
        new Statement()
          .and('e.company_id = c.id')
          .and('c.active = ?', true)
          .and('dept.name = ?', 'Engineering')
      )
      .build();

    expect(query.text).toBe('UPDATE "employees" e\nSET "e"."status" = $1\nFROM "companies" c\nINNER JOIN (\n SELECT\n  "d"."id",\n  "d"."name"\n FROM "departments" AS d\n WHERE (d.active = $2)\n) dept\n ON e.department_id = dept.id\nWHERE (e.company_id = c.id)\n AND (c.active = $2)\n AND (dept.name = $3)');
    expect(query.values).toEqual(['active', true, 'Engineering']);

    const subQuery2 = new SelectQuery('departments', 'd')
      .select(['d.id', 'd.name'])
      .where('d.active = ?', true);

    const query2 = new UpdateQuery('employees', 'e')
      .using('companies', 'c')
      .join({
        subQuery: subQuery2,
        alias: 'dept',
        type: 'INNER',
        on: new Statement()
          .and('e.department_id = dept.id')
          .and('dept.name = ?', 'Engineering')
      })
      .set({ 'e.status': 'active' })
      .where(
        new Statement()
          .and('e.company_id = c.id')
          .and('c.active = ?', true)
      )
      .build();

    expect(query2.text).toBe('UPDATE "employees" e\nSET "e"."status" = $1\nFROM "companies" c\nINNER JOIN (\n SELECT\n  "d"."id",\n  "d"."name"\n FROM "departments" AS d\n WHERE (d.active = $2)\n) dept\n ON (e.department_id = dept.id) AND (dept.name = $3)\nWHERE (e.company_id = c.id)\n AND (c.active = $2)');
    expect(query2.values).toEqual(['active', true, 'Engineering']);
  });

  it('should support multiple joins with subQueries', () => {
    const regionSubQuery = new SelectQuery('regions', 'r')
      .select(['r.id', 'r.name'])
      .where('r.active = ?', true);

    const departmentSubQuery = new SelectQuery('departments', 'd')
      .select(['d.id', 'd.name'])
      .where('d.active = ?', true);

    const query = new UpdateQuery('employees', 'e')
      .using('companies', 'c')
      .join([
        {
          subQuery: regionSubQuery,
          alias: 'reg',
          type: 'INNER',
          on: 'e.region_id = reg.id'
        },
        {
          subQuery: departmentSubQuery,
          alias: 'dept',
          type: 'LEFT',
          on: new Statement()
            .and('e.department_id = dept.id')
            .and('dept.name = ?', 'Engineering')
        }
      ])
      .set({ 'e.status': 'active' })
      .where(
        new Statement()
          .and('e.company_id = c.id')
          .and('c.active = ?', true)
          .and('reg.name = ?', 'North')
      )
      .build();

    expect(query.text).toBe('UPDATE "employees" e\nSET "e"."status" = $1\nFROM "companies" c\nINNER JOIN (\n SELECT\n  "r"."id",\n  "r"."name"\n FROM "regions" AS r\n WHERE (r.active = $2)\n) reg\n ON e.region_id = reg.id\nLEFT JOIN (\n SELECT\n  "d"."id",\n  "d"."name"\n FROM "departments" AS d\n WHERE (d.active = $2)\n) dept\n ON (e.department_id = dept.id) AND (dept.name = $3)\nWHERE (e.company_id = c.id)\n AND (c.active = $2)\n AND (reg.name = $4)');
    expect(query.values).toEqual(['active', true, 'Engineering', 'North']);
  });

  it('should support multiple CTEs', () => {
    const query = new UpdateQuery('employees', 'e')
      .with([
        new Cte(
          'active_companies',
          new SelectQuery('companies', 'c')
            .select(['c.id', 'c.name'])
            .where('c.active = ?', true),
          false
        ),
        new Cte(
          'active_departments',
          new SelectQuery('departments', 'd')
            .select(['d.id', 'd.name'])
            .where('d.active = ?', true),
          false
        )
      ])
      .using('active_companies', 'ac')
      .join({
        table: 'active_departments',
        alias: 'ad',
        type: 'INNER',
        on: new Statement()
          .and('e.department_id = ad.id')
          .and('ad.name = ?', 'Engineering')
      })
      .set({ 'e.status': 'active' })
      .where(
        new Statement()
          .and('e.company_id = ac.id')
          .and('ac.name = ?', 'TechCorp')
      )
      .build();

    expect(query.text).toBe('WITH active_companies AS (\nSELECT\n "c"."id",\n "c"."name"\nFROM "companies" AS c\nWHERE (c.active = $1)\n), active_departments AS (\nSELECT\n "d"."id",\n "d"."name"\nFROM "departments" AS d\nWHERE (d.active = $1)\n)\nUPDATE "employees" e\nSET "e"."status" = $2\nFROM "active_companies" ac\nINNER JOIN "active_departments" ad\n ON (e.department_id = ad.id) AND (ad.name = $3)\nWHERE (e.company_id = ac.id)\n AND (ac.name = $4)');
    expect(query.values).toEqual([true, 'active', 'Engineering', 'TechCorp']);
  });

  it('should support CTEs with CTEMaker directly', () => {
    const cteMaker = new CteMaker(
      new Cte(
        'active_companies',
        new SelectQuery('companies', 'c')
          .select(['c.id', 'c.name'])
          .where('c.active = ?', true),
        false
      ),
      new Cte(
        'active_departments',
        new SelectQuery('departments', 'd')
          .select(['d.id', 'd.name'])
          .where('d.active = ?', true),
        false
      )
    );

    const query = new UpdateQuery('employees', 'e')
      .with(cteMaker)
      .using('active_companies', 'ac')
      .join({
        table: 'active_departments',
        alias: 'ad',
        type: 'INNER',
        on: new Statement()
          .and('e.department_id = ad.id')
          .and('ad.name = ?', 'Engineering')
      })
      .set({ 'e.status': 'active' })
      .where(
        new Statement()
          .and('e.company_id = ac.id')
          .and('ac.name = ?', 'TechCorp')
      )
      .build();

    expect(query.text).toBe('WITH active_companies AS (\nSELECT\n "c"."id",\n "c"."name"\nFROM "companies" AS c\nWHERE (c.active = $1)\n), active_departments AS (\nSELECT\n "d"."id",\n "d"."name"\nFROM "departments" AS d\nWHERE (d.active = $1)\n)\nUPDATE "employees" e\nSET "e"."status" = $2\nFROM "active_companies" ac\nINNER JOIN "active_departments" ad\n ON (e.department_id = ad.id) AND (ad.name = $3)\nWHERE (e.company_id = ac.id)\n AND (ac.name = $4)');
    expect(query.values).toEqual([true, 'active', 'Engineering', 'TechCorp']);
  });

});
