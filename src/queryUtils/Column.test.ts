import { describe, expect, it } from "vitest";
import { ColumnDefinition, ColumnType } from "./Column.js";
import { Varchar } from "../types/ColumnTypes.js";


describe("Column Definition Class", () => {

  it('should create a column definition instance', () => {
    const columnDef = new ColumnDefinition("id", new ColumnType("INTEGER"));
    expect((columnDef as any).name).toBe("id");
    expect((columnDef as any).type).toBeInstanceOf(ColumnType);
    expect(columnDef.build()).toBe('id INTEGER');
  });

  it('type should be null if not set', () => {
    const columnDef = new ColumnDefinition("name");
    expect((columnDef as any).name).toBe("name");
    expect((columnDef as any).type).toBeNull();
    expect(() => columnDef.build()).toThrow("Column type is not set.");
  });

  it('name should be null if not set', () => {
    const columnDef = new ColumnDefinition(undefined, new ColumnType("TEXT"));
    expect((columnDef as any).name).toBeNull();
    expect((columnDef as any).type).toBeInstanceOf(ColumnType);
    expect(() => columnDef.build()).toThrow("Column name is not set.");
  });

  it('should be able to set name and type after creation', () => {
    const columnDef = new ColumnDefinition();
    columnDef.setName("username");
    columnDef.setType(new ColumnType("VARCHAR", [50]));
    expect((columnDef as any).name).toBe("username");
    expect((columnDef as any).type).toBeInstanceOf(ColumnType);
    expect(columnDef.build()).toBe('username VARCHAR(50)');
  });

  it('should be able to pass type as string', () => {
    const columnDef = new ColumnDefinition("age", "INTEGER");
    expect((columnDef as any).name).toBe("age");
    expect((columnDef as any).type).toBeInstanceOf(ColumnType);
    expect(columnDef.build()).toBe('age INTEGER');

    const columnDef2 = new ColumnDefinition();
    columnDef2.setName("created_at");
    columnDef2.setType("TIMESTAMP");
    expect((columnDef2 as any).name).toBe("created_at");
    expect((columnDef2 as any).type).toBeInstanceOf(ColumnType);
    expect(columnDef2.build()).toBe('created_at TIMESTAMP');
  });

  it('should be able to set null or not null constraint', () => {
    const columnDef = new ColumnDefinition("email", new ColumnType("VARCHAR", [100]));
    columnDef.notNull();
    expect(columnDef.build()).toBe('email VARCHAR(100) NOT NULL');

    const columnDef2 = new ColumnDefinition("bio", new ColumnType("TEXT"));
    columnDef2.null();
    expect(columnDef2.build()).toBe('bio TEXT');
  });

  it('should chain methods correctly', () => {
    const columnDef = new ColumnDefinition()
      .setName("status")
      .setType(Varchar(20))
      .notNull();
    expect((columnDef as any).name).toBe("status");
    expect((columnDef as any).type).toBeInstanceOf(ColumnType);
    expect(columnDef.build()).toBe('status VARCHAR(20) NOT NULL');
  });

  it('should be able to set default value', () => {
    const columnDef = new ColumnDefinition("is_active", new ColumnType("BOOLEAN"));
    columnDef.default(true);
    expect(columnDef.build()).toBe('is_active BOOLEAN DEFAULT true');

    const columnDef2 = new ColumnDefinition("created_at", new ColumnType("TIMESTAMP"));
    columnDef2.default('CURRENT_TIMESTAMP');
    expect(columnDef2.build()).toBe('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  });

  it('should be able to add check constraint', () => {
    const columnDef = new ColumnDefinition("age", new ColumnType("INTEGER"));
    columnDef.check("age >= 0");
    expect(columnDef.build()).toBe('age INTEGER CHECK (age >= 0)');

    const columnDef2 = new ColumnDefinition("score", new ColumnType("INTEGER"));
    columnDef2.check("score BETWEEN 0 AND 100");
    expect(columnDef2.build()).toBe('score INTEGER CHECK (score BETWEEN 0 AND 100)');
  });

  it('should be able to set unique constraint', () => {
    const columnDef = new ColumnDefinition("email", new ColumnType("VARCHAR", [255]));
    columnDef.unique();
    expect(columnDef.build()).toBe('email VARCHAR(255) UNIQUE');
  });

  it('should be able to set primary key constraint', () => {
    const columnDef = new ColumnDefinition("id", new ColumnType("SERIAL"));
    columnDef.primaryKey();
    expect(columnDef.build()).toBe('id SERIAL PRIMARY KEY');
  });

  it('should throw error if name, type or name and type are not set', () => {
    const columnDef1 = new ColumnDefinition();
    expect(() => columnDef1.build()).toThrow("Column name and type are not set.");

    const columnDef2 = new ColumnDefinition("username");
    expect(() => columnDef2.build()).toThrow("Column type is not set.");

    const columnDef3 = new ColumnDefinition(undefined, new ColumnType("TEXT"));
    expect(() => columnDef3.build()).toThrow("Column name is not set.");
  });

  it('should be able to set foreign key constraint', () => {
    const columnDef = new ColumnDefinition("user_id", new ColumnType("INTEGER"));
    columnDef.references("users", "id");
    expect(columnDef.build()).toBe('user_id INTEGER REFERENCES users(id)');

    // With actions
    const columnDef2 = new ColumnDefinition("profile_id", new ColumnType("INTEGER"));
    columnDef2.references("profiles", "id", "CASCADE", "SET NULL");
    expect(columnDef2.build()).toBe('profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE SET NULL');
  });

  it('should be able to build for adding in a table', () => {
    const columnDef = new ColumnDefinition("email", new ColumnType("VARCHAR", [150]));
    expect(columnDef.buildToAdd("users")).toEqual([
      'ALTER TABLE users ADD COLUMN email VARCHAR(150)',
      'ALTER TABLE users ALTER COLUMN email DROP NOT NULL'
    ]);

    // With not null constraint
    const columnDef2 = new ColumnDefinition("id", new ColumnType("SERIAL"));
    columnDef2.notNull();
    expect(columnDef2.buildToAdd("accounts")).toEqual([
      'ALTER TABLE accounts ADD COLUMN id SERIAL',
      'ALTER TABLE accounts ALTER COLUMN id SET NOT NULL'
    ]);

    // With default value
    const columnDef3 = new ColumnDefinition("created_at", new ColumnType("TIMESTAMP"));
    columnDef3.default('CURRENT_TIMESTAMP');
    expect(columnDef3.buildToAdd("logs")).toEqual([
      'ALTER TABLE logs ADD COLUMN created_at TIMESTAMP',
      'ALTER TABLE logs ALTER COLUMN created_at DROP NOT NULL',
      'ALTER TABLE logs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP'
    ]);

    // With check constraint
    const columnDef4 = new ColumnDefinition("age", new ColumnType("INTEGER"));
    columnDef4.check("age >= 0");
    expect(columnDef4.buildToAdd("persons")).toEqual([
      'ALTER TABLE persons ADD COLUMN age INTEGER',
      'ALTER TABLE persons ALTER COLUMN age DROP NOT NULL',
      'ALTER TABLE persons ADD CONSTRAINT persons_age_check CHECK (age >= 0)'
    ]);

    // With foreign key constraint
    const columnDef5 = new ColumnDefinition("user_id", new ColumnType("INTEGER"));
    columnDef5.references("users", "id", "CASCADE", "CASCADE");
    expect(columnDef5.buildToAdd("orders")).toEqual([
      'ALTER TABLE orders ADD COLUMN user_id INTEGER',
      'ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL',
      'ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE'
    ]);

    // With unique constraint
    const columnDef6 = new ColumnDefinition("email", new ColumnType("VARCHAR", [255]));
    columnDef6.unique();
    expect(columnDef6.buildToAdd("subscribers")).toEqual([
      'ALTER TABLE subscribers ADD COLUMN email VARCHAR(255)',
      'ALTER TABLE subscribers ALTER COLUMN email DROP NOT NULL',
      'ALTER TABLE subscribers ADD CONSTRAINT subscribers_email_unique UNIQUE (email)'
    ]);

    // With foreign key with no actions
    const columnDef7 = new ColumnDefinition("category_id", new ColumnType("INTEGER"));
    columnDef7.references("categories", "id");
    expect(columnDef7.buildToAdd("products")).toEqual([
      'ALTER TABLE products ADD COLUMN category_id INTEGER',
      'ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL',
      'ALTER TABLE products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id)'
    ]);

    // With primary key constraint
    const columnDef8 = new ColumnDefinition("id", new ColumnType("INTEGER"));
    columnDef8.primaryKey();
    expect(columnDef8.buildToAdd("employees")).toEqual([
      'ALTER TABLE employees ADD COLUMN id INTEGER',
      'ALTER TABLE employees ALTER COLUMN id SET NOT NULL',
      'ALTER TABLE employees ADD CONSTRAINT employees_id_pkey PRIMARY KEY (id)'
    ]);
  });

  it('should be able to build for altering in a table', () => {

    // Altering name
    const columnDef = new ColumnDefinition("new_name", new ColumnType("VARCHAR", [100]));
    expect(columnDef.buildToAlter("users", "old_name")).toEqual([
      'ALTER TABLE users RENAME COLUMN old_name TO new_name',
      'ALTER TABLE users ALTER COLUMN new_name TYPE VARCHAR(100)',
      'ALTER TABLE users ALTER COLUMN new_name DROP NOT NULL',
    ]);

    // Without constraints
    const columnDef2 = new ColumnDefinition("email", new ColumnType("VARCHAR", [150]));
    expect(columnDef2.buildToAlter("users")).toEqual([
      'ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(150)',
      'ALTER TABLE users ALTER COLUMN email DROP NOT NULL',
    ]);

    // With not null constraint
    const columnDef3 = new ColumnDefinition("id", new ColumnType("SERIAL"));
    columnDef3.notNull();
    expect(columnDef3.buildToAlter("accounts")).toEqual([
      'ALTER TABLE accounts ALTER COLUMN id TYPE SERIAL',
      'ALTER TABLE accounts ALTER COLUMN id SET NOT NULL',
    ]);

    // With default value
    const columnDef4 = new ColumnDefinition("created_at", new ColumnType("TIMESTAMP"));
    columnDef4.default('CURRENT_TIMESTAMP');
    expect(columnDef4.buildToAlter("logs")).toEqual([
      'ALTER TABLE logs ALTER COLUMN created_at TYPE TIMESTAMP',
      'ALTER TABLE logs ALTER COLUMN created_at DROP NOT NULL',
      'ALTER TABLE logs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP'
    ]);

    // With check constraint
    const columnDef5 = new ColumnDefinition("age", new ColumnType("INTEGER"));
    columnDef5.check("age >= 0");
    expect(columnDef5.buildToAlter("persons")).toEqual([
      'ALTER TABLE persons ALTER COLUMN age TYPE INTEGER',
      'ALTER TABLE persons ALTER COLUMN age DROP NOT NULL',
      'ALTER TABLE persons ADD CONSTRAINT persons_age_check CHECK (age >= 0)'
    ]);

    // With unique constraint
    const columnDef6 = new ColumnDefinition("email", new ColumnType("VARCHAR", [255]));
    columnDef6.unique();
    expect(columnDef6.buildToAlter("subscribers")).toEqual([
      'ALTER TABLE subscribers ALTER COLUMN email TYPE VARCHAR(255)',
      'ALTER TABLE subscribers ALTER COLUMN email DROP NOT NULL',
      'ALTER TABLE subscribers ADD CONSTRAINT subscribers_email_unique UNIQUE (email)'
    ]);

    // With primary key constraint
    const columnDef7 = new ColumnDefinition("id", new ColumnType("INTEGER"));
    columnDef7.primaryKey();
    expect(columnDef7.buildToAlter("employees")).toEqual([
      'ALTER TABLE employees ALTER COLUMN id TYPE INTEGER',
      'ALTER TABLE employees ALTER COLUMN id SET NOT NULL',
      'ALTER TABLE employees ADD CONSTRAINT employees_id_pkey PRIMARY KEY (id)'
    ]);

    // With foreign key constraint
    const columnDef8 = new ColumnDefinition("user_id", new ColumnType("INTEGER"));
    columnDef8.references("users", "id", "CASCADE", "SET NULL");
    expect(columnDef8.buildToAlter("orders")).toEqual([
      'ALTER TABLE orders ALTER COLUMN user_id TYPE INTEGER',
      'ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL',
      'ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE SET NULL'
    ]);

    // With foreign key with no actions
    const columnDef9 = new ColumnDefinition("category_id", new ColumnType("INTEGER"));
    columnDef9.references("categories", "id");
    expect(columnDef9.buildToAlter("products")).toEqual([
      'ALTER TABLE products ALTER COLUMN category_id TYPE INTEGER',
      'ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL',
      'ALTER TABLE products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id)'
    ]);

    // To drop default
    const columnDef10 = new ColumnDefinition("is_active", new ColumnType("BOOLEAN"));
    columnDef10.dropDefaultValue();
    expect(columnDef10.buildToAlter("members")).toEqual([
      'ALTER TABLE members ALTER COLUMN is_active TYPE BOOLEAN',
      'ALTER TABLE members ALTER COLUMN is_active DROP NOT NULL',
      'ALTER TABLE members ALTER COLUMN is_active DROP DEFAULT'
    ]);
  });

  it('should use toString method to build normally', () => {
    const columnDef = new ColumnDefinition("username", new ColumnType("VARCHAR", [50]));
    expect(columnDef.toString()).toBe('username VARCHAR(50)');
  });


});

describe("Column Type Class", () => {
  it('should create a column type instance', () => {
    const columnType = new ColumnType("VARCHAR", [255]);
    expect((columnType as any).typeName).toBe("VARCHAR");
    expect((columnType as any).properties).toEqual(['255']);
    expect(columnType.build()).toBe("VARCHAR(255)");
  });

  it('should be able to set type and properties after creation', () => {
    const columnType = new ColumnType("INTEGER");
    columnType.setType("CHAR");
    columnType.addProperty(10);
    expect((columnType as any).typeName).toBe("CHAR");
    expect((columnType as any).properties).toEqual(['10']);
    expect(columnType.build()).toBe("CHAR(10)");
  });

  it('should handle types without properties', () => {
    const columnType = new ColumnType("TEXT");
    expect(columnType.build()).toBe("TEXT");
  });

  it('should throw error if type is not set', () => {
    const columnType = new ColumnType();
    expect(() => columnType.build()).toThrow("Type name is not set.");
  });
})
