import type { ColumnTypes } from "../types";
import type ForeignKey from "../types/ForeignKey.js";
import type { Actions } from "../types";

/**
 * Class representing a column type.
 * It allows setting the type and adding properties, and can build a string representation of the column type.
 */
export class ColumnType {
  /** The name of the column type. */
  private typeName: ColumnTypes | null;
  /** The properties associated with the column type. */
  private properties: string[] = [];

  constructor(
    /** The name of the column type. */
    typeName: ColumnTypes | null = null,
    /** The properties associated with the column type. */
    properties: (string | { toString(): string })[] = [],
  ) {
    this.typeName = typeName;
    this.properties = properties.map((prop) => prop.toString());
  }

  /**
   * Sets the type of the column.
   * @param typeName - The name of the column type.
   * @returns The current instance for method chaining.
   */
  public setType(typeName: ColumnTypes): this {
    this.typeName = typeName;
    return this;
  }

  /**
   * Adds a property to the column type.
   * @param property - The property to add.
   * @returns The current instance for method chaining.
   */
  public addProperty(
    property: string | { toString(): string },
  ): this {
    this.properties.push(property.toString());
    return this;
  }

  /**
   * Builds the string representation of the column type.
   * @returns The string representation of the column type.
   * @throws Error if the type name is not set.
   */
  public build(): string {
    if (!this.typeName) {
      throw new Error("Type name is not set.");
    }

    if (this.properties.length > 0) {
      return `${this.typeName}(${this.properties.join(", ")})`;
    }
    return this.typeName;
  }

  /**
   * Returns the string representation of the column type.
   * @returns The string representation of the column type.
   * @throws Error if the type name is not set.
   */
  public toString(): string {
    return this.build();
  }
}

/**
 * Class representing a database column with various attributes and constraints.
 * It allows setting the column name, type, nullability, primary key status, uniqueness,
 * default value, and check conditions. The class can build a string representation of the column definition.
 */
export class ColumnDefinition {
  /** The name of the column. */
  private name: string | null = null;
  /** The type of the column. */
  private type: ColumnType | null = null;
  /** Indicates if the column is nullable. */
  private isNullable: boolean = true;
  /** Indicates if the column is a primary key. */
  private isPrimaryKey: boolean = false;
  /** Indicates if the column has a unique constraint. */
  private isUnique: boolean = false;
  /** The default value for the column, if any. */
  private defaultValue?: string;
  /** The check condition for the column, if any. */
  private checkCondition?: string;
  /** Foreign key constraint details, if any. */
  private foreignKey: ForeignKey | null = null;
  /** Drop default value flag */
  private dropDefault: boolean = false;

  constructor(
    name: string | null = null,
    type: ColumnType | string | null = null,
  ) {
    this.name = name ?? null;
    if (type) {
      if (typeof type === "string") {
        this.type = new ColumnType(type as ColumnTypes);
      } else {
        this.type = type;
      }
    } else {
      this.type = null;
    }
  }

  /**
   * Marks the column to drop its default value.
   * @returns The current instance for method chaining.
   */
  public dropDefaultValue(): this {
    this.dropDefault = true;
    return this;
  }

  /**
   * Sets the name of the column.
   * @param name - The name of the column.
   * @returns The current instance for method chaining.
   */
  public setName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Sets the type of the column.
   * @param type - The type of the column, either as a ColumnType instance or a string.
   * @returns The current instance for method chaining.
   */
  public setType(type: ColumnType | string): this {
    if (typeof type === "string") {
      this.type = new ColumnType(type as ColumnTypes);
    } else {
      this.type = type;
    }
    return this;
  }

  /**
   * Marks the column as nullable.
   * @returns The current instance for method chaining.
   */
  public null(): this {
    this.isNullable = true;
    return this;
  }

  /**
   * Marks the column as not nullable.
   * @returns The current instance for method chaining.
   */
  public notNull(): this {
    this.isNullable = false;
    return this;
  }

  /**
   * Marks the column as a primary key.
   * This also sets the column as not nullable.
   * @returns The current instance for method chaining.
   */
  public primaryKey(): this {
    this.isPrimaryKey = true;
    this.isNullable = false; // Primary key columns cannot be null
    return this;
  }

  /**
   * Marks the column as unique.
   * @returns The current instance for method chaining.
   */
  public unique(): this {
    this.isUnique = true;
    return this;
  }

  /**
   * Sets the default value for the column.
   * @param value - The default value for the column.
   * @returns The current instance for method chaining.
   */
  public default(value: string | { toString(): string }): this {
    this.defaultValue = value.toString();
    return this;
  }

  /**
   * Sets a check condition for the column.
   * @param condition - The check condition for the column.
   * @returns The current instance for method chaining.
   */
  public check(condition: string): this {
    this.checkCondition = condition;
    return this;
  }

  /**
   * Sets a foreign key constraint for the column.
   * @param foreignTable - The name of the foreign table.
   * @param foreignColumn - The name of the foreign column.
   * @param onDeleteAction - Optional action to take on delete (e.g., CASCADE, SET NULL).
   * @param onUpdateAction - Optional action to take on update (e.g., CASCADE, SET NULL).
   * @returns The current instance for method chaining.
   */
  public references(
    foreignTable: string,
    foreignColumn: string,
    onDeleteAction?: Actions,
    onUpdateAction?: Actions,
  ): this {
    this.foreignKey = {
      table: foreignTable,
      column: foreignColumn,
      onDelete: onDeleteAction,
      onUpdate: onUpdateAction,
    };
    return this;
  }

  /**
   * Builds the string representation of the column definition.
   * @returns The string representation of the column definition.
   * @throws Error if the column name or type is not set.
   */
  public build(forAdding: boolean = false): string {
    if (!this.name || !this.type) {
      const errorMsg =
        !this.name && !this.type
          ? "Column name and type"
          : !this.name
            ? "Column name"
            : "Column type";
      throw new Error(
        `${errorMsg} ${!this.name && !this.type ? "are" : "is"} not set.`,
      );
    }

    const parts: string[] = [];
    parts.push(this.name);
    parts.push(this.type.toString());

    if (this.isPrimaryKey && !forAdding) {
      parts.push("PRIMARY KEY");
    } else {
      if (this.isUnique && !forAdding) {
        parts.push("UNIQUE");
      }
      if (!this.isNullable && !forAdding) {
        parts.push("NOT NULL");
      }
    }

    if (this.defaultValue !== undefined && !forAdding) {
      parts.push(`DEFAULT ${this.defaultValue}`);
    }

    if (this.checkCondition !== undefined && !forAdding) {
      parts.push(`CHECK (${this.checkCondition})`);
    }

    if (this.foreignKey && !forAdding) {
      let fkPart = `REFERENCES ${this.foreignKey.table}(${this.foreignKey.column})`;
      if (this.foreignKey.onDelete) {
        fkPart += ` ON DELETE ${this.foreignKey.onDelete}`;
      }
      if (this.foreignKey.onUpdate) {
        fkPart += ` ON UPDATE ${this.foreignKey.onUpdate}`;
      }
      parts.push(fkPart);
    }

    return parts.join(" ");
  }

  public buildToAdd(tableNameEntry: string): string[] {
    let tableName = tableNameEntry.trim();
    if (tableName.startsWith('"') && tableName.endsWith('"')) {
      tableName = tableName.slice(1, -1);
    }
    const addColumn = `ALTER TABLE ${tableNameEntry} ADD COLUMN ${this.build(true)}`;
    const addColumnNullability = this.isNullable
      ? `ALTER TABLE ${tableNameEntry} ALTER COLUMN ${this.name} DROP NOT NULL`
      : `ALTER TABLE ${tableNameEntry} ALTER COLUMN ${this.name} SET NOT NULL`;
    const addColumnDefault =
      this.defaultValue !== undefined
        ? `ALTER TABLE ${tableNameEntry} ALTER COLUMN ${this.name} SET DEFAULT ${this.defaultValue}`
        : "";
    const addColumnCheck =
      this.checkCondition !== undefined
        ? `ALTER TABLE ${tableNameEntry} ADD CONSTRAINT ${tableName}_${this.name}_check CHECK (${this.checkCondition})`
        : "";
    const addColumnPrimaryKey = this.isPrimaryKey
      ? `ALTER TABLE ${tableNameEntry} ADD CONSTRAINT ${tableName}_${this.name}_pkey PRIMARY KEY (${this.name})`
      : "";
    const addColumnUnique = this.isUnique
      ? `ALTER TABLE ${tableNameEntry} ADD CONSTRAINT ${tableName}_${this.name}_unique UNIQUE (${this.name})`
      : "";
    const addForeignKey = this.foreignKey
      ? `ALTER TABLE ${tableNameEntry} ADD CONSTRAINT ${tableName}_${this.name}_fkey FOREIGN KEY (${this.name}) REFERENCES ${this.foreignKey.table}(${this.foreignKey.column})` +
        (this.foreignKey.onDelete
          ? ` ON DELETE ${this.foreignKey.onDelete}`
          : "") +
        (this.foreignKey.onUpdate
          ? ` ON UPDATE ${this.foreignKey.onUpdate}`
          : "")
      : "";

    const additions = [
      addColumn,
      addColumnNullability,
      addColumnDefault,
      addColumnCheck,
      addColumnPrimaryKey,
      addColumnUnique,
      addForeignKey,
    ].filter((part) => part !== "");

    return additions;
  }

  public buildToAlter(tableNameEntry: string, previousName?: string): string[] {
    
    let tableName = tableNameEntry.trim();

    if (tableName.startsWith('"') && tableName.endsWith('"')) {
      tableName = tableName.slice(1, -1);
    }

    const alterColumnName =
      (previousName !== this.name && previousName)
        ? `ALTER TABLE ${tableNameEntry} RENAME COLUMN ${previousName} TO ${this.name}`
        : "";
    const alterColumnType = `ALTER TABLE ${tableNameEntry} ALTER COLUMN ${this.name} TYPE ${this.type?.toString()}`;
    const alterColumnNullability = this.isNullable
      ? `ALTER TABLE ${tableNameEntry} ALTER COLUMN ${this.name} DROP NOT NULL`
      : `ALTER TABLE ${tableNameEntry} ALTER COLUMN ${this.name} SET NOT NULL`;
    const alterColumnDefault =
      this.defaultValue !== undefined
        ? `ALTER TABLE ${tableNameEntry} ALTER COLUMN ${this.name} SET DEFAULT ${this.defaultValue}`
        : this.dropDefault
          ? `ALTER TABLE ${tableNameEntry} ALTER COLUMN ${this.name} DROP DEFAULT`
          : "";
    const alterColumnCheck =
      this.checkCondition !== undefined
        ? `ALTER TABLE ${tableNameEntry} ADD CONSTRAINT ${tableName}_${this.name}_check CHECK (${this.checkCondition})`
        : "";
    const alterColumnPrimaryKey = this.isPrimaryKey
      ? `ALTER TABLE ${tableNameEntry} ADD CONSTRAINT ${tableName}_${this.name}_pkey PRIMARY KEY (${this.name})`
      : "";
    const alterColumnUnique = this.isUnique
      ? `ALTER TABLE ${tableNameEntry} ADD CONSTRAINT ${tableName}_${this.name}_unique UNIQUE (${this.name})`
      : "";
    const alterForeignKey = this.foreignKey
      ? `ALTER TABLE ${tableNameEntry} ADD CONSTRAINT ${tableName}_${this.name}_fkey FOREIGN KEY (${this.name}) REFERENCES ${this.foreignKey.table}(${this.foreignKey.column})` +
        (this.foreignKey.onDelete
          ? ` ON DELETE ${this.foreignKey.onDelete}`
          : "") +
        (this.foreignKey.onUpdate
          ? ` ON UPDATE ${this.foreignKey.onUpdate}`
          : "")
      : "";

    const alterations = [
      alterColumnName,
      alterColumnType,
      alterColumnNullability,
      alterColumnDefault,
      alterColumnCheck,
      alterColumnPrimaryKey,
      alterColumnUnique,
      alterForeignKey,
    ].filter((part) => part !== "");

    return alterations;
  }

  /**
   * Returns the string representation of the column definition.
   * @returns The string representation of the column definition.
   * @throws Error if the column name or type is not set.
   */
  public toString(): string {
    return this.build();
  }
}

/**
 * Factory function to create a new ColumnDefinition instance.
 * @param name - The name of the column (optional).
 * @param type - The type of the column, either as a ColumnType instance or a string (optional).
 * @returns A new ColumnDefinition instance.
 */
export default function Column(
  name: string | null = null,
  type: ColumnType | string | null = null,
): ColumnDefinition {
  return new ColumnDefinition(name, type);
}
