import { describe, expect, it } from "vitest";
import InsertQuery from "./insert.js";
import SelectQuery from "./select.js";
import { Cte } from "../../cteMaker.js";

describe('Insert Query', () => {
  
  it('should generate correct INSERT SQL', () => {
    const query = new InsertQuery('users')
      .values({ name: 'John', age: 30 })
      .build();

    expect(query.text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)');
    expect(query.values).toEqual(['John', 30]);

    const query2 = new InsertQuery()
      .into('users')
      .values([
        { column: 'name', value: 'Jane' },
        { column: 'age', value: 25 }
      ])
      .build();

    expect(query2.text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)');
    expect(query2.values).toEqual(['Jane', 25]);
  });

  it('should generate INSERT SQL with RETURNING clause', () => {
    const query = new InsertQuery('users')
      .values({ name: 'Alice', age: 28 })
      .returning(['id', 'name'])
      .returning('id')
      .addReturning('name')
      .addReturning(['age'])
      .build();

    expect(query.text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)\nRETURNING "id", "name", "age"');
    expect(query.values).toEqual(['Alice', 28]);
  });

  it('should generate INSERT SQL from SELECT query', () => {
    const selectQuery = new SelectQuery('employees')
      .select(['name', 'age'])
      .where('age > ?', 30);

    const query = new InsertQuery('users')
      .columns('name', 'age')
      .fromSelect(selectQuery)
      .build();

    expect(query.text).toBe('INSERT INTO "users" ("name", "age")\nSELECT\n "name",\n "age"\nFROM "employees"\nWHERE (age > $1)');
    expect(query.values).toEqual([30]);
  });

  it('should error when no values or select query provided', () => {
    expect(() => {
      new InsertQuery('users').build();
    }).toThrow('No values or SELECT query specified for INSERT query.');
  });

  it('should error when no table specified', () => {
    expect(() => {
      new InsertQuery().values({ name: 'John' }).build();
    }).toThrow('No table specified for INSERT query.');
  });

  it('should return its kind', () => {
    const query = new InsertQuery('users');
    expect(query.kind).toBe('INSERT');
  });

  it('should reset its state', () => {
    const query = new InsertQuery('users')
      .values({ name: 'John', age: 30 })
      .returning(['id', 'name']);

    const built = query.build();
    expect(built.text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)\nRETURNING "id", "name"');
    expect(built.values).toEqual(['John', 30]);

    query.reset();
    expect(() => {
      query.build();
    }).toThrow('No table specified for INSERT query.');
  });

  it('should invalidate its built query', () => {
    const query = new InsertQuery('users')
      .values({ name: 'John', age: 30 })
      .returning(['id', 'name']);

    const firstBuild = query.build();
    expect(query.isDone).toBe(true);

    expect(firstBuild.text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)\nRETURNING "id", "name"');
    expect(firstBuild.values).toEqual(['John', 30]);

    query.values({ name: 'Jane', age: 25 });
    query.invalidate();
    expect(query.isDone).toBe(false);

    const secondBuild = query.build();
    expect(secondBuild.text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)\nRETURNING "id", "name"');
    expect(secondBuild.values).toEqual(['Jane', 25]);
  });

  it('should return sql and params directly', () => {
    const query = new InsertQuery('users')
      .values({ name: 'John', age: 30 });

    expect(query.toSQL()).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)');
    query.invalidate();
    expect(query.getParams()).toEqual(['John', 30]);

    expect(query.toSQL()).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)');
    expect(query.getParams()).toEqual(['John', 30]);
  });

  it('should support cloning itself', () => {
    const query = new InsertQuery('users')
      .values({ name: 'John', age: 30 })
      .returning(['id', 'name']);

    const clone = query.clone();
    expect(clone).not.toBe(query);
    expect(clone.build()).toEqual(query.build());

    clone.values({ name: 'Jane', age: 25 });
    clone.invalidate();

    expect(clone.build().values).toEqual(['Jane', 25]);
    expect(query.build().values).toEqual(['John', 30]);
  });

  it('should support CTEs', () => {
    const query = new InsertQuery('users')
      .with(new Cte(
        'recent_employees',
        new SelectQuery('employees').where('hired_at > ?', '2023-01-01').select(['name', 'age']),
        false
      ))
      .columns('name', 'age')
      .fromSelect(new SelectQuery('recent_employees').select(['name', 'age']))
      .returning(['id', 'name']);

    const built = query.build();
    expect(built.text).toBe('WITH recent_employees AS (\nSELECT\n "name",\n "age"\nFROM "employees"\nWHERE (hired_at > $1)\n) \nINSERT INTO "users" ("name", "age")\nSELECT\n "name",\n "age"\nFROM "recent_employees"\nRETURNING "id", "name"');
    expect(built.values).toEqual(['2023-01-01']);

    query.invalidate();
    expect((query as any).getInternalParams()).not.toEqual(built.values);

    const clone = query.clone();
    expect(clone.build()).toEqual(built);
  });

  it('should support from select query', () => {
    const selectQuery = new SelectQuery('employees', 'e')
      .select(['e.nome AS name', 'age'])
      .where('age > ?', 30);

    const query = new InsertQuery('users')
      .fromSelect(selectQuery)
      .build();

    expect(query.text).toBe('INSERT INTO "users" ("name", "age")\nSELECT\n "e"."nome" AS "name",\n "age"\nFROM "employees" AS e\nWHERE (age > $1)');
    expect(query.values).toEqual([30]);
  });

  it('should support invalidating with CTEs', () => {
    const query = new InsertQuery('users')
      .with(new Cte(
        'recent_employees',
        new SelectQuery('employees').where('hired_at > ?', '2023-01-01').select(['name', 'age']),
        false
      ))
      .columns('name', 'age')
      .fromSelect(new SelectQuery('recent_employees').select(['name', 'age']))
      .returning(['id', 'name']);

    const firstBuild = query.build();
    expect(query.isDone).toBe(true);

    expect(firstBuild.text).toBe('WITH recent_employees AS (\nSELECT\n "name",\n "age"\nFROM "employees"\nWHERE (hired_at > $1)\n) \nINSERT INTO "users" ("name", "age")\nSELECT\n "name",\n "age"\nFROM "recent_employees"\nRETURNING "id", "name"');
    expect(firstBuild.values).toEqual(['2023-01-01']);

    query.with(new Cte(
      'recent_employees',
      new SelectQuery('employees').where('hired_at > ?', '2024-01-01').select(['name', 'age']),
      false
    ));
    query.invalidate();
    expect(query.isDone).toBe(false);

    const secondBuild = query.build();
    expect(secondBuild.text).toBe('WITH recent_employees AS (\nSELECT\n "name",\n "age"\nFROM "employees"\nWHERE (hired_at > $1)\n) \nINSERT INTO "users" ("name", "age")\nSELECT\n "name",\n "age"\nFROM "recent_employees"\nRETURNING "id", "name"');
    expect(secondBuild.values).toEqual(['2024-01-01']);
  });

  it('should support returning all with returnAllFields', () => {
    const query = new InsertQuery('users')
      .values({ name: 'Alice', age: 28 })
      .returnAllFields()
      .build();

    expect(query.text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)\nRETURNING *');
    expect(query.values).toEqual(['Alice', 28]);
  });

});
