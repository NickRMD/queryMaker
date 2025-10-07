import { describe, expect, it } from "vitest";
import AlterTableQuery from "./Alter.js";
import Column from "../../../queryUtils/Column.js";


describe('Alter Table Query', () => {
  it('should create a basic ALTER TABLE query to add a column', () => {
    const query = new AlterTableQuery('users')
      .addColumnsToAdd(Column('id', 'INT').primaryKey().notNull())
      .build();

    expect(query).toEqual([
      'ALTER TABLE "users" ADD COLUMN id INT;',
      'ALTER TABLE "users" ALTER COLUMN id SET NOT NULL;',
      'ALTER TABLE "users" ADD CONSTRAINT id_pkey PRIMARY KEY (id);',
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
      'ALTER TABLE "products" ADD CONSTRAINT product_id_pkey PRIMARY KEY (product_id);',
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
      'ALTER TABLE "orders" ADD CONSTRAINT order_id_pkey PRIMARY KEY (order_id);',
      'ALTER TABLE "orders" ADD COLUMN order_date DATE;',
      'ALTER TABLE "orders" ALTER COLUMN order_date SET NOT NULL;',
    ]);
  });
});
