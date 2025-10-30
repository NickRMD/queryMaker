import { describe, expect, it } from "vitest";
import AlterTableQuery from "./Alter.js";
import Column from "../../../queryUtils/Column.js";
import { Varchar } from "../../../types/ColumnTypes.js";


describe('Alter Table Query', () => {
  it('should create a basic ALTER TABLE query to add a column', () => {
    const query = new AlterTableQuery('users')
      .addColumnsToAdd(Column('id', 'INT').primaryKey().notNull())
      .build();

    expect(query).toEqual([
      'ALTER TABLE "users" ADD COLUMN id INT;',
      'ALTER TABLE "users" ALTER COLUMN id SET NOT NULL;',
      'ALTER TABLE "users" ADD CONSTRAINT users_id_pkey PRIMARY KEY (id);',
    ]);

    const query2 = new AlterTableQuery('employees')
      .addColumnsToAdd([
        Column('employee_id', 'INT').primaryKey().notNull(),
        Column('employee_name', Varchar(100)).notNull(),
      ])
      .build();

    expect(query2).toEqual([
      'ALTER TABLE "employees" ADD COLUMN employee_id INT;',
      'ALTER TABLE "employees" ALTER COLUMN employee_id SET NOT NULL;',
      'ALTER TABLE "employees" ADD CONSTRAINT employees_employee_id_pkey PRIMARY KEY (employee_id);',
      'ALTER TABLE "employees" ADD COLUMN employee_name VARCHAR(100);',
      'ALTER TABLE "employees" ALTER COLUMN employee_name SET NOT NULL;',
    ]);
  });

  it('should allow to set table name later', () => {
    const query = new AlterTableQuery()
      .table('products')
      .addColumnsToAdd([
        Column('product_id', 'INT').primaryKey().notNull(),
      ])
      .build();

    expect(query).toEqual([
      'ALTER TABLE "products" ADD COLUMN product_id INT;',
      'ALTER TABLE "products" ALTER COLUMN product_id SET NOT NULL;',
      'ALTER TABLE "products" ADD CONSTRAINT products_product_id_pkey PRIMARY KEY (product_id);',
    ]);
  });

  it('should allow to set columns to add', () => {
    const query = new AlterTableQuery('orders')
      .setColumnsToAdd([
        Column('order_id', 'INT').primaryKey().notNull(),
        Column('order_date', 'DATE').notNull(),
      ])
      .build();

    expect(query).toEqual([
      'ALTER TABLE "orders" ADD COLUMN order_id INT;',
      'ALTER TABLE "orders" ALTER COLUMN order_id SET NOT NULL;',
      'ALTER TABLE "orders" ADD CONSTRAINT orders_order_id_pkey PRIMARY KEY (order_id);',
      'ALTER TABLE "orders" ADD COLUMN order_date DATE;',
      'ALTER TABLE "orders" ALTER COLUMN order_date SET NOT NULL;',
    ]);

    const query2 = new AlterTableQuery('orders')
      .setColumnsToAdd(Column('customer_id', 'INT').notNull())
      .build();

    expect(query2).toEqual([
      'ALTER TABLE "orders" ADD COLUMN customer_id INT;',
      'ALTER TABLE "orders" ALTER COLUMN customer_id SET NOT NULL;',
    ]);
  });

  it('should allow to set columns to alter', () => {
    const query = new AlterTableQuery('customers')
      .setColumnsToAlter([
        { name: 'customer_name', columns: Column('customer_name', Varchar(100)).notNull() },
      ])
      .build();

    expect(query).toEqual([
      'ALTER TABLE "customers" ALTER COLUMN customer_name TYPE VARCHAR(100);',
      'ALTER TABLE "customers" ALTER COLUMN customer_name SET NOT NULL;',
    ]);

    const query2 = new AlterTableQuery('customers')
      .setColumnsToAlter({ name: 'customer_email', columns: Column('customer_email', Varchar(150)).unique() })
      .build();

    expect(query2).toEqual([
      'ALTER TABLE "customers" ALTER COLUMN customer_email TYPE VARCHAR(150);',
      'ALTER TABLE "customers" ALTER COLUMN customer_email DROP NOT NULL;',
      'ALTER TABLE "customers" ADD CONSTRAINT customers_customer_email_unique UNIQUE (customer_email);'
    ]);
  });

  it('should allow to drop columns', () => {
    const query = new AlterTableQuery('inventory')
      .dropColumnsByName(['old_column1', 'old_column2'])
      .build();

    expect(query).toEqual([
      'ALTER TABLE "inventory" DROP COLUMN old_column1;',
      'ALTER TABLE "inventory" DROP COLUMN old_column2;',
    ]);

    const query2 = new AlterTableQuery('inventory')
      .dropColumnsByName('obsolete_column')
      .build();

    expect(query2).toEqual([
      'ALTER TABLE "inventory" DROP COLUMN obsolete_column;',
    ]);

    // set
    const query3 = new AlterTableQuery('inventory')
      .setColumnsToDrop('discontinued_column')
      .build();

    expect(query3).toEqual([
      'ALTER TABLE "inventory" DROP COLUMN discontinued_column;',
    ]);

    const query4 = new AlterTableQuery('inventory')
      .setColumnsToDrop(['temp_column1', 'temp_column2'])
      .build();

    expect(query4).toEqual([
      'ALTER TABLE "inventory" DROP COLUMN temp_column1;',
      'ALTER TABLE "inventory" DROP COLUMN temp_column2;',
    ]);
  });

  it('should give kind as ALTER_TABLE', () => {
    const query = new AlterTableQuery('test_table');
    expect(query.kind).toBe('ALTER_TABLE');
  });

  it('should throw error if table name is not provided', () => {
    const query = new AlterTableQuery();
    expect(() => query.build()).toThrowError(
      'Table name is required to build ALTER TABLE query.'
    );
  });

  it('should throw error if no alterations are specified', () => {
    const query = new AlterTableQuery('test_table');
    expect(() => query.build()).toThrowError(
      'No alterations specified for ALTER TABLE query.'
    );
  });

  it('should be able to convert to sql using toSQL method', () => {
    const query = new AlterTableQuery('employees')
      .addColumnsToAdd(Column('employee_id', 'INT').primaryKey().notNull());

    expect(query.toSQL()).toEqual([
      'ALTER TABLE "employees" ADD COLUMN employee_id INT;',
      'ALTER TABLE "employees" ALTER COLUMN employee_id SET NOT NULL;',
      'ALTER TABLE "employees" ADD CONSTRAINT employees_employee_id_pkey PRIMARY KEY (employee_id);',
    ]);

    const query2 = new AlterTableQuery('employees')
      .dropColumnsByName('old_employee_column');

    query2.toSQL();

    expect(query2.toSQL()).toEqual([
      'ALTER TABLE "employees" DROP COLUMN old_employee_column;',
    ]);
  });

  it('should clone the AlterTableQuery instance', () => {
    const originalQuery = new AlterTableQuery('departments')
      .addColumnsToAdd(Column('department_id', 'INT').primaryKey().notNull());

    const clonedQuery = originalQuery.clone();

    expect(clonedQuery).toEqual(originalQuery);
    expect(clonedQuery).not.toBe(originalQuery);

    // Modify the clone and ensure the original is unaffected
    clonedQuery.table('new_departments');

    expect((clonedQuery as any).tableName).toBe('"new_departments"');
    expect((originalQuery as any).tableName).toBe('"departments"');
  });

  it('should be able to reset the AlterTableQuery instance', () => {
    const query = new AlterTableQuery('projects')
      .addColumnsToAdd(Column('project_id', 'INT').primaryKey().notNull())
      .dropColumnsByName('old_project_column');

    query.reset();

    expect(() => query.build()).toThrowError(
      'Table name is required to build ALTER TABLE query.'
    );

    query.table('new_projects');

    expect(() => query.build()).toThrowError(
      'No alterations specified for ALTER TABLE query.'
    );
  });
});
