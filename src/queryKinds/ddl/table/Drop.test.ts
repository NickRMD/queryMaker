import { describe, expect, it } from "vitest";
import DropTableQuery from "./Drop.js";
import QueryKind from "../../../types/QueryKind.js";

describe('Drop Table Query', () => {
  it('should create a basic DROP TABLE query', () => {
    const query = new DropTableQuery('users').build();
    expect(query).toBe('DROP TABLE "users";');
  });

  it('should be able to set table name later', () => {
    const query = new DropTableQuery().table('products').build();
    expect(query).toBe('DROP TABLE "products";');
  });

  it('should throw if table name is not provided', () => {
    const query = new DropTableQuery();
    expect(() => query.build()).toThrow('Table name is required to build DROP TABLE query.');
  });

  it('should create a DROP TABLE query with IF EXISTS', () => {
    const query = new DropTableQuery('users').ifExists().build();
    expect(query).toBe('DROP TABLE IF EXISTS "users";');
  });

  it('should clone the DropTableQuery instance', () => {
    const original = new DropTableQuery('orders').ifExists();
    const cloned = original.clone();
    expect(cloned).not.toBe(original);
    expect(cloned.build()).toBe(original.build());
  });

  it('should reset the DropTableQuery instance', () => {
    const query = new DropTableQuery('customers').ifExists();
    query.reset();
    expect(() => query.build()).toThrow('Table name is required to build DROP TABLE query.');
  });

  it('should return the correct SQL string representation', () => {
    const query = new DropTableQuery('employees').ifExists();
    expect(query.toSQL()).toBe('DROP TABLE IF EXISTS "employees";');
  });

  it('should return kind as DROP_TABLE', () => {
    const query = new DropTableQuery('departments');
    expect(query.kind).toBe(QueryKind.DROP_TABLE);
  });
});
