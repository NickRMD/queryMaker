import { describe, expect, it } from "vitest";
import SelectQuery from "./select.js";
import sqlFlavor from "../types/sqlFlavor.js";
import UpdateQuery from "./update.js";
import InsertQuery from "./insert.js";
import DeleteQuery from "./delete.js";
import z from "zod";
import { IsDefined, IsNumber, IsString } from "class-validator";
import { Transform } from "class-transformer";


describe('Query Definition', () => {
  it('should be able to set sql flavor', () => {
    const query = new SelectQuery()
      .from('users')
      .sqlFlavor(sqlFlavor.mysql);

    expect((query as any as { flavor: sqlFlavor }).flavor).toBe(sqlFlavor.mysql);
  });

  it('should build explain', () => {
    const query = new UpdateQuery('users')
      .set({ name: 'John' })
      .where('id = ?', 1)
      .buildExplain();

    expect(query.text).toBe('EXPLAIN UPDATE "users"\nSET "name" = $1\nWHERE (id = $2)');
    expect(query.values).toEqual(['John', 1]);
  });

  it('should build explain analyze', () => {
    const query = new UpdateQuery('users')
      .set({ name: 'John' })
      .where('id = ?', 1)
      .buildExplainAnalyze();

    expect(query.text).toBe('EXPLAIN ANALYZE UPDATE "users"\nSET "name" = $1\nWHERE (id = $2)');
    expect(query.values).toEqual(['John', 1]);
  });

  it('should build reanalyze parsed query', () => {
    const query = new UpdateQuery('users')
      .set({ name: 'John' })
      .where('id = ?', 'John')
      .buildReanalyze();

    expect(query.text).toBe('UPDATE "users"\nSET "name" = $1\nWHERE (id = $1)');
    expect(query.values).toEqual(['John']);
  });

  it('should support executing with function or object', async () => {
    const query = new InsertQuery('users')
      .values({ name: 'John', age: 30 });

    const executorFunction = async (text: string, values: any[]) => {
      expect(text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)');
      expect(values).toEqual(['John', 30]);
      return [{ id: 1, name: 'John', age: 30 }];
    }

    const result = await query.execute(executorFunction);
    expect(result).toEqual([{ id: 1, name: 'John', age: 30 }]);

    const executorObject = {
      query: async (text: string, values: any[]) => {
        expect(text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)');
        expect(values).toEqual(['John', 30]);
        return [{ id: 1, name: 'John', age: 30 }];
      }
    };

    const result2 = await query.execute(executorObject);
    expect(result2).toEqual([{ id: 1, name: 'John', age: 30 }]);

    const executorObjectWithManager = {
      manager: {
        query: async (text: string, values: any[]) => {
          expect(text).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)');
          expect(values).toEqual(['John', 30]);
          return [{ id: 1, name: 'John', age: 30 }];
        }
      }
    };

    const result3 = await query.execute(executorObjectWithManager);
    expect(result3).toEqual([{ id: 1, name: 'John', age: 30 }]);

    await expect(async () => {
      await query.execute(executorObjectWithManager, true);
    }).rejects.toThrowError('Invalid query executor provided.');
  });

  it('should support validating output with zod and class-validator + class-transformer', async () => {
    const queryZod = new DeleteQuery('users')
      .where('id = ?', 1)
      .returning(['id', 'name']);

    const queryClass = queryZod.clone();

    const zodSchema = z.object({
      id: z.string(),
      name: z.string()
    }).transform((obj) => ({
      id: Number.parseInt(obj.id),
      name: String(obj.name)
    }));

    queryZod.validate(zodSchema);

    class User {
      @IsDefined()
      @IsNumber()
      @Transform(({ value }) => Number.parseInt(value))
      id!: number;
      @IsDefined()
      @IsString()
      @Transform(({ value }) => String(value))
      name!: string;
    }

    queryClass.validate(User);

    const executorFunction = async (text: string, values: any[]) => {
      expect(text).toBe('DELETE FROM "users"\n WHERE (id = $1)\n RETURNING "id", "name"');
      expect(values).toEqual([1]);
      return [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }];
    }

    const executorFunctionRows = async (text: string, values: any[]) => {
      expect(text).toBe('DELETE FROM "users"\n WHERE (id = $1)\n RETURNING "id", "name"');
      expect(values).toEqual([1]);
      return { rows: [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }] };
    }

    const executorObject = {
      query: executorFunctionRows
    };

    const executorObjectWithManager = {
      manager: {
        query: executorFunctionRows
      }
    }

    const resultZod = await queryZod.execute(executorFunction);
    expect(resultZod).toEqual([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]);

    const resultClass = await queryClass.execute(executorFunction);
    expect(resultClass).toEqual([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]);

    const resultZod2 = await queryZod.execute(executorFunctionRows);
    expect(resultZod2).toEqual([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]);

    const resultClass2 = await queryClass.execute(executorFunctionRows);
    expect(resultClass2).toEqual([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]);

    const resultZod3 = await queryZod.execute(executorObject);
    expect(resultZod3).toEqual([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]);

    const resultClass3 = await queryClass.execute(executorObject);
    expect(resultClass3).toEqual([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]);

    const resultZod4 = await queryZod.execute(executorObjectWithManager);
    expect(resultZod4).toEqual([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]);

    const resultClass4 = await queryClass.execute(executorObjectWithManager);
    expect(resultClass4).toEqual([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]);

    await expect(async () => {
      await queryZod.execute(executorObjectWithManager, true);
    }).rejects.toThrowError('Invalid query executor provided.');
  });

  it('should change class validator configuration', async () => {
    const queryClass = new DeleteQuery('users')
      .where('id = ?', 1)
      .returning(['id', 'name'])
      .classValidatorConfig({ whitelist: true, forbidNonWhitelisted: true });

    class User {
      @IsDefined()
      @IsNumber()
      @Transform(({ value }) => Number.parseInt(value))
      id!: number;
      @IsDefined()
      @IsString()
      @Transform(({ value }) => String(value))
      name!: string;
    }

    queryClass.validate(User);

    const executorFunction = async (text: string, values: any[]) => {
      expect(text).toBe('DELETE FROM "users"\n WHERE (id = $1)\n RETURNING "id", "name"');
      expect(values).toEqual([1]);
      return [{ id: '1', name: 'John', extra: 'value' }, { id: '2', name: 'Jane' }];
    }

    await expect(async () => {
      await queryClass.execute(executorFunction);
    }).rejects.toThrowError();
  });
});
