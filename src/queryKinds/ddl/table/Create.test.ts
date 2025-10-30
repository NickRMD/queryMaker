import { describe, expect, it } from "vitest";
import CreateTableQuery from "./Create.js";
import Column from "../../../queryUtils/Column.js";
import { Decimal, Varchar } from "../../../types/ColumnTypes.js";
import QueryKind from "../../../types/QueryKind.js";


describe('Create Table Query', () => {
  it('should create a basic CREATE TABLE query', () => {
    const query = new CreateTableQuery('users')
      .addColumns([
        Column('id', 'INT').primaryKey().notNull(),
        Column('name', Varchar(100)).notNull(),
        Column('email', Varchar(100)).unique()
      ])
      .build();

    expect(query).toBe(
      'CREATE TABLE "users" (\n  id INT PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  email VARCHAR(100) UNIQUE\n);'
    );
  });

  it('should create a CREATE TABLE query with IF NOT EXISTS', () => {
    const query = new CreateTableQuery('users')
      .ifNotExists()
      .addColumns([
        Column('id', 'INT').primaryKey().notNull(),
        Column('name', Varchar(100)).notNull(),
        Column('email', Varchar(100)).unique()
      ])
      .build();

    expect(query).toBe(
      'CREATE TABLE IF NOT EXISTS "users" (\n  id INT PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  email VARCHAR(100) UNIQUE\n);'
    );
  });

  it('should throw an error if table name is not set', () => {
    const query = new CreateTableQuery()
      .addColumns([
        Column('id', 'INT').primaryKey().notNull(),
        Column('name', Varchar(100)).notNull()
      ]);
    
    expect(() => query.build()).toThrow('Table name is not set.');
  });

  it('should work with foreign keys', () => {
    const query = new CreateTableQuery('orders')
      .addColumns([
        Column('id', 'INT').primaryKey().notNull(),
        Column('user_id', 'INT').notNull().references('users', 'id'),
        Column('total', Decimal(10, 2)).notNull()
      ])
      .build();

    expect(query).toBe(
      'CREATE TABLE "orders" (\n  id INT PRIMARY KEY,\n  user_id INT NOT NULL REFERENCES users(id),\n  total DECIMAL(10, 2) NOT NULL\n);'
    );
  });

  it('should clone the query correctly', () => {
    const original = new CreateTableQuery('products')
      .ifNotExists()
      .addColumns([
        Column('id', 'INT').primaryKey().notNull(),
        Column('name', Varchar(100)).notNull()
      ]);

    const cloned = original.clone();
    cloned.addColumns([
      Column('price', Decimal(10, 2)).notNull()
    ]);

    const originalQuery = original.build();
    const clonedQuery = cloned.build();

    expect(originalQuery).toBe(
      'CREATE TABLE IF NOT EXISTS "products" (\n  id INT PRIMARY KEY,\n  name VARCHAR(100) NOT NULL\n);'
    );

    expect(clonedQuery).toBe(
      'CREATE TABLE IF NOT EXISTS "products" (\n  id INT PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  price DECIMAL(10, 2) NOT NULL\n);'
    );
  });

  it('should support schemas', () => {
    const query = new CreateTableQuery('$schema.users')
      .schema('public')
      .addColumns([
        Column('id', 'INT').primaryKey().notNull(),
        Column('name', Varchar(100)).notNull()
      ])
      .build();

    expect(query).toBe(
      'CREATE TABLE public."users" (\n  id INT PRIMARY KEY,\n  name VARCHAR(100) NOT NULL\n);'
    );
  });

  it('should throw an error if no columns are defined', () => {
    const query = new CreateTableQuery('empty_table');
    expect(() => query.build()).toThrow('No columns defined for the table.');
  });

  it('should reset the query state', () => {
    const query = new CreateTableQuery('temp_table')
      .ifNotExists()
      .addColumns([
        Column('id', 'INT').primaryKey().notNull()
      ]);

    query.reset();

    expect(() => query.build()).toThrow('Table name is not set.');
  });

  it('should return toSQL correctly', () => {
    const query = new CreateTableQuery('logs')
      .addColumns(Column('id', 'INT').primaryKey().notNull())
      .addColumns(Column('message', Varchar(255)).notNull());

    expect(query.toSQL()).toBe(
      'CREATE TABLE "logs" (\n  id INT PRIMARY KEY,\n  message VARCHAR(255) NOT NULL\n);'
    );
  });

  it('should be able to handle setting columns', () => {
    const query = new CreateTableQuery('employees')
      .setColumns([
        Column('id', 'INT').primaryKey().notNull(),
        Column('first_name', Varchar(50)).notNull(),
        Column('last_name', Varchar(50)).notNull()
      ]);

    expect(query.build()).toBe(
      'CREATE TABLE "employees" (\n  id INT PRIMARY KEY,\n  first_name VARCHAR(50) NOT NULL,\n  last_name VARCHAR(50) NOT NULL\n);'
    );
  });

  it('should be able to return its columns array', () => {
    const columns = [
      Column('id', 'INT').primaryKey().notNull(),
      Column('username', Varchar(50)).notNull()
    ];
    const query = new CreateTableQuery('accounts')
      .setColumns(columns);

    expect(query.columns).toEqual(columns);
  });

  it('should be able to set the table name later', () => {
    const query = new CreateTableQuery()
      .table('departments')
      .addColumns([
        Column('id', 'INT').primaryKey().notNull(),
        Column('dept_name', Varchar(100)).notNull()
      ]);

    expect(query.build()).toBe(
      'CREATE TABLE "departments" (\n  id INT PRIMARY KEY,\n  dept_name VARCHAR(100) NOT NULL\n);'
    );
  });

  it('should return its kind', () => {
    const query = new CreateTableQuery('audit');
    expect(query.kind).toBe(QueryKind.CREATE_TABLE);
  });
});
