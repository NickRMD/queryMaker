import { describe, expect, it } from "vitest";
import { Query } from "../../index.js"
import Column from "../../queryUtils/Column.js";

describe('DDL Query Definition', () => {
  it('should create a basic DDL query using Query interface and test if it\'s done', () => {
    const query = Query
      .table.create
      .table('users')
      .setColumns([
        Column('id', 'INT').primaryKey().notNull(),
        Column('username', 'VARCHAR(50)').notNull()
      ]);

    let isDone = query.isDone();
    expect(isDone).toBe(false);

    expect(query.build())
      .toEqual('CREATE TABLE "users" (\n  id INT PRIMARY KEY,\n  username VARCHAR(50) NOT NULL\n);');

    isDone = query.isDone();
    expect(isDone).toBe(true);
  });

  it('should be able to build explain query', () => {
    const query = Query
      .table.create
      .table('products')
      .setColumns([
        Column('product_id', 'INT').primaryKey().notNull(),
        Column('product_name', 'VARCHAR(100)').notNull()
      ]);

    expect(query.buildExplain())
      .toEqual('EXPLAIN CREATE TABLE "products" (\n  product_id INT PRIMARY KEY,\n  product_name VARCHAR(100) NOT NULL\n);');

    // Explain Analyze
    expect(query.buildExplainAnalyze())
      .toEqual('EXPLAIN ANALYZE CREATE TABLE "products" (\n  product_id INT PRIMARY KEY,\n  product_name VARCHAR(100) NOT NULL\n);');
  });

  it('should be able to handle schemas in table names', () => {
    const query = Query
      .table.create
      .schema('client_a')
      .table('$schema.products')
      .setColumns([
        Column('product_id', 'INT').primaryKey().notNull(),
        Column('product_name', 'VARCHAR(100)').notNull()
      ]);

    expect(query.build())
      .toEqual('CREATE TABLE client_a."products" (\n  product_id INT PRIMARY KEY,\n  product_name VARCHAR(100) NOT NULL\n);');
    
    // add schema
    const query2 = Query
      .table.create
      .schema('client_a')
      .table('$schema1.products')
      .setColumns([
        Column('product_id', 'INT').primaryKey().notNull(),
        Column('product_name', 'VARCHAR(100)').notNull()
      ])
      .addSchema('client_b');

    expect(query2.build())
      .toEqual('CREATE TABLE client_b."products" (\n  product_id INT PRIMARY KEY,\n  product_name VARCHAR(100) NOT NULL\n);');
  });


  it('should be able to execute the built query', async () => {
    const executeFunction = async (queryString: string) => {
      // Mock execution function
      expect(queryString).toSatisfy((value: string | string[]) => {
        if (typeof value !== 'string' && !Array.isArray(value)) {
          return false;
        }
        return true;
      });
    };

    const query = Query
      .table.create
      .table('orders')
      .setColumns([
        Column('order_id', 'INT').primaryKey().notNull(),
        Column('order_date', 'DATE').notNull()
      ]);

    const result = await query.execute(executeFunction);
    expect(result).toEqual(undefined);

    const query2 = Query
      .table.alter
      .table('employees')
      .addColumnsToAdd([
        Column('employee_id', 'INT').primaryKey().notNull(),
        Column('employee_name', 'VARCHAR(100)').notNull(),
      ]);

    const result2 = await query2.execute(executeFunction);
    expect(result2).toEqual(undefined);

    let executeObject: {
      [key: string]: any,
      manager?: {
        execute?: (queryString: string) => Promise<void>;
      };
    } = {
      execute: async (queryString: string) => {
        // Mock execution function
        expect(queryString).toSatisfy((value: string | string[]) => {
          if (typeof value !== 'string' && !Array.isArray(value)) {
            return false;
          }
          return true;
        });
      }
    };

    const query3 = Query
      .table.create
      .table('customers')
      .setColumns([
        Column('customer_id', 'INT').primaryKey().notNull(),
        Column('customer_name', 'VARCHAR(100)').notNull()
      ]);

    const result3 = await query3.execute(executeObject);
    expect(result3).toEqual(undefined);

    executeObject.manager = {
      execute: async (queryString: string) => {
        // Mock execution function
        expect(queryString).toSatisfy((value: string | string[]) => {
          if (typeof value !== 'string' && !Array.isArray(value)) {
            return false;
          }
          return true;
        });
      }
    }

    const query4 = Query
      .table.create
      .table('suppliers')
      .setColumns([
        Column('supplier_id', 'INT').primaryKey().notNull(),
        Column('supplier_name', 'VARCHAR(100)').notNull()
      ]);

    const result4 = await query4.execute(executeObject);
    expect(result4).toEqual(undefined);

    const query5 = Query
      .table.drop
      .table('old_table');

    delete executeObject.manager.execute;

    await expect(query5.execute(executeObject)).rejects.toThrowError();

    // Ignore manager
    const query6 = Query
      .table.drop
      .table('another_old_table');

    const result6 = await query6.execute(executeObject, true);
    expect(result6).toEqual(undefined);

    const query7 = Query
      .table.alter
      .table('departments')
      .addColumnsToAdd([
        Column('department_id', 'INT').primaryKey().notNull(),
        Column('department_name', 'VARCHAR(100)').notNull(),
      ]);

    executeObject.manager = {
      execute: async (queryString: string) => {
        // Mock execution function
        expect(queryString).toSatisfy((value: string | string[]) => {
          if (typeof value !== 'string' && !Array.isArray(value)) {
            return false;
          }
          return true;
        });
      }
    };

    const result7 = await query7.execute(executeObject);
    expect(result7).toEqual(undefined);

    delete executeObject.manager;

    expect(await query7.execute(executeObject)).toEqual(undefined);
  });

  it('should test utility spaceLines', () => {
    const query = Query
      .table.create;

    const noSpaces = `CREATE TABLE "test" (\nid INT\n);`;
    expect(query['spaceLines'](noSpaces, 1)).toEqual(" CREATE TABLE \"test\" (\n id INT\n );");


  })
});
