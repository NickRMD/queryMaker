import { describe, expect, it } from "vitest";
import DeleteQuery from "./delete.js";
import Statement from "../../statementMaker.js";
import { Cte } from "../../cteMaker.js";
import SelectQuery from "./select.js";

describe('Delete Query', () => {
  it('should generate correct DELETE SQL', () => {
    const query = new DeleteQuery('users')
      .where(
        new Statement()
          .and('id = ?', [1])
      )
      .build();

    expect(query.text).toBe('DELETE FROM "users"\n WHERE (id = $1)');
    expect(query.values).toEqual([1]);

    const query2 = new DeleteQuery('users', 'u')
      .where('u.id = ?', 2)
      .build();

    expect(query2.text).toBe('DELETE FROM "users" AS u\n WHERE (u.id = $1)');
    expect(query2.values).toEqual([2]);
  });

  it('should handle using other tables', () => {
    const query = new DeleteQuery('users', 'u')
      .using({
        table: 'teams',
        alias: 't'
      })
      .where(
        new Statement()
          .and('u.team_id = t.id')
          .and('t.active = ?', [true])
      )
      .build();

    expect(query.text).toBe('DELETE FROM "users" AS u\n USING "teams" AS t\n WHERE (u.team_id = t.id) AND (t.active = $1)');
    expect(query.values).toEqual([true]);

    const query2 = new DeleteQuery('users', 'u')
      .using('teams t')
      .where(
        new Statement()
          .and('u.team_id = t.id')
          .and('t.active = ?', [true])
      )
      .build();

    expect(query2.text).toBe('DELETE FROM "users" AS u\n USING "teams" AS t\n WHERE (u.team_id = t.id) AND (t.active = $1)');
    expect(query2.values).toEqual([true]);

    const query3 = new DeleteQuery('users', 'u')
      .using([
        { table: 'teams', alias: 't' },
        { table: 'departments', alias: 'd' }
      ])
      .where(
        new Statement()
          .and('u.team_id = t.id')
          .and('t.department_id = d.id')
          .and('d.active = ?', [true])
      )
      .build();

    expect(query3.text).toBe('DELETE FROM "users" AS u\n USING "teams" AS t,\n "departments" AS d\n WHERE (u.team_id = t.id) AND (t.department_id = d.id) AND (d.active = $1)');
    expect(query3.values).toEqual([true]);

    expect(() => {
      new DeleteQuery('users', 'u')
        .using('');
    }).toThrow('Invalid table name provided to USING clause.');
  });

  it('should handle setting from after', () => {
    const query = new DeleteQuery()
      .from('users', 'u')
      .build();

    expect(query.text).toBe('DELETE FROM "users" AS u');
  });

  it('should support useStatement', () => {
    const query = new DeleteQuery()
      .from('test')
      .useStatement(stmt =>
        stmt.and('id = ?', 1)
          .or('email = ?', 2)
      ).build();

    expect(query.text).toBe('DELETE FROM "test"\n WHERE (id = $1) OR (email = $2)');
    expect(query.values).toEqual([1, 2]);

    let someCondition = false;

    const query2 = new DeleteQuery()
      .from('test')
      .useStatement(stmt => {
        stmt.and('id = ?', 1);
        if (someCondition) {
          stmt.or('email = ?', 2);
        }
      }).build();

    expect(query2.text).toBe('DELETE FROM "test"\n WHERE (id = $1)');
    expect(query2.values).toEqual([1]);
  });

  it('should throw error if no table is specified', () => {
    expect(() => {
      new DeleteQuery().build();
    }).toThrow('No table specified for DELETE query.');
  });

  it('should support schemas', () => {
    const query = new DeleteQuery('$schema.users')
      .addSchema('public')
      .build();

    expect(query.text).toBe('DELETE FROM public."users"');
    expect(query.values).toEqual([]);
  });

  it('should support multiple schemas', () => {
    const query = new DeleteQuery('$schema.users')
      .using('$schema1.teams t')
      .schema('public', 'audit')
      .build();

    expect(query.text).toBe('DELETE FROM public."users"\n USING audit."teams" AS t');
    expect(query.values).toEqual([]);
  });

  it('should remove duplicate params when re-analyzing', () => {
    const query = new DeleteQuery('users')
      .where(
        new Statement()
          .and('id = ?', [1])
          .or('email = ?', [1])
          .and('status = ?', 'active')
      )
      .build();

    expect(query.text).toBe('DELETE FROM "users"\n WHERE (id = $1) OR (email = $1) AND (status = $2)');
    expect(query.values).toEqual([1, 'active']);
  });

  it('should support returning clause', () => {
    const query = new DeleteQuery('users')
      .where('id = ?', 1)
      .returning(['id', 'email'])
      .build();

    expect(query.text).toBe('DELETE FROM "users"\n WHERE (id = $1)\n RETURNING "id", "email"');
    expect(query.values).toEqual([1]);
  });

  it('should support cloning', () => {
    const original = new DeleteQuery('users')
      .where('id = ?', 1)
      .returning(['id', 'email'])
      .addReturning('biscuit');

    const clone = original.clone();
    clone.where('email = ?', 'some@email.com').returning('biscuit').addReturning(['id', 'email']);

    const originalBuilt = original.build();
    expect(originalBuilt.text).toBe('DELETE FROM "users"\n WHERE (id = $1)\n RETURNING "id", "email", "biscuit"');
    expect(originalBuilt.values).toEqual([1]);

    const cloneBuilt = clone.build();
    expect(cloneBuilt.text).toBe('DELETE FROM "users"\n WHERE (email = $1)\n RETURNING "biscuit", "id", "email"');
    expect(cloneBuilt.values).toEqual(['some@email.com']);
  });

  it('should support deep analysis for re-analyzing', () => {
    const query = new DeleteQuery('users')
      .where(
        new Statement()
          .and('id = ?', [1])
          .or('email = ?', [1])
          .and('status = ?', 'active')
      )
      .build(true);

    expect(query.text).toBe('DELETE FROM "users"\n WHERE (id = $1) OR (email = $1) AND (status = $2)');
    expect(query.values).toEqual([1, 'active']);
  });

  it('should support CTEs', () => {
    const query = new DeleteQuery('users', 'u')
      .with(new Cte(
        'active_teams', 
        new SelectQuery('teams')
          .where('active = ?', true)
          .select(['id', 'name']), false
      )).using('active_teams at')
      .where('u.team_id = at.id')
      .build();

    expect(query.text).toBe('WITH active_teams AS (\nSELECT\n "id",\n "name"\nFROM "teams"\nWHERE (active = $1)\n)\n DELETE FROM "users" AS u\n USING "active_teams" AS at\n WHERE (u.team_id = at.id)');
    expect(query.values).toEqual([true]);
  });

  it('should support returning it\'s queryDefinition', () => {
    const query = new DeleteQuery('users', 'u')
      .with(new Cte(
        'active_teams', 
        new SelectQuery('teams')
          .where('active = ?', true)
          .select(['id', 'name']), false
      )).using('active_teams at')
      .where('u.team_id = at.id');

    expect(query.query).toEqual(query);
  });

  it('should support invalidating its built query', () => {
    const query = new DeleteQuery('users', 'u')
      .where('u.id = ?', 1);

    const firstBuild = query.build();
    expect(firstBuild.text).toBe('DELETE FROM "users" AS u\n WHERE (u.id = $1)');
    expect(firstBuild.values).toEqual([1]);

    query.where('u.name = ?', 'test');
    query.invalidate();
    const secondBuild = query.build();
    expect(secondBuild.text).toBe('DELETE FROM "users" AS u\n WHERE (u.name = $1)');
    expect(secondBuild.values).toEqual(['test']);
  });

  it('should support invalidating with CTEs', () => {
    const query = new DeleteQuery('users', 'u')
      .with(new Cte(
        'active_teams', 
        new SelectQuery('teams')
          .where('active = ?', true)
          .select(['id', 'name']), false
      )).using('active_teams at')
      .where('u.team_id = at.id');

    const firstBuild = query.build();
    expect(query.isDone).toBe(true);

    expect(firstBuild.text).toBe('WITH active_teams AS (\nSELECT\n "id",\n "name"\nFROM "teams"\nWHERE (active = $1)\n)\n DELETE FROM "users" AS u\n USING "active_teams" AS at\n WHERE (u.team_id = at.id)');
    expect(firstBuild.values).toEqual([true]);

    query.where('u.name = ?', 'test');
    query.invalidate();
    expect(query.isDone).toBe(false);

    const secondBuild = query.build();
    expect(secondBuild.text).toBe('WITH active_teams AS (\nSELECT\n "id",\n "name"\nFROM "teams"\nWHERE (active = $1)\n)\n DELETE FROM "users" AS u\n USING "active_teams" AS at\n WHERE (u.name = $2)');
    expect(secondBuild.values).toEqual([true, 'test']);
  });

  it('should support returning it\'s kind', () => {
    const query = new DeleteQuery('users', 'u');
    expect(query.kind).toBe('DELETE');
  });

  it('should support resetting its state', () => {
    const query = new DeleteQuery('users', 'u')
      .where('u.id = ?', 1)
      .returning(['id', 'email'])
      .addReturning('biscuit');

    const built = query.build();
    expect(built.text).toBe('DELETE FROM "users" AS u\n WHERE (u.id = $1)\n RETURNING "id", "email", "biscuit"');
    expect(built.values).toEqual([1]);

    query.reset();
    expect(() => {
      query.build();
    }).toThrow('No table specified for DELETE query.');
  });

  it('should support getting params and getting sql directly', () => {
    const query = new DeleteQuery('users', 'u')
      .where('u.id = ?', 1)
      .returning(['id', 'email'])
      .addReturning('biscuit');

    expect(query.getParams()).toEqual([1]);
    query.invalidate();
    expect(query.toSQL()).toBe('DELETE FROM "users" AS u\n WHERE (u.id = $1)\n RETURNING "id", "email", "biscuit"');

    expect(query.getParams()).toEqual([1]);
    expect(query.toSQL()).toBe('DELETE FROM "users" AS u\n WHERE (u.id = $1)\n RETURNING "id", "email", "biscuit"');
  });
});
