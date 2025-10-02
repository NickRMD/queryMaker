import SqlEscaper from "../../../sqlEscaper.js";
import { ColumnDefinition } from "../../../types/Column.js";
import QueryKind from "../../../types/QueryKind.js";
import TableQueryDefinition from "./tableColumnDefinition.js";

/**
  * Class representing an ALTER TABLE SQL query.
  * This class allows you to define and build an ALTER TABLE SQL query
  * with specified table name, columns to add, alter, or drop.
  */
export default class AlterTableQuery extends TableQueryDefinition {

  /** The columns to be added to the table. */
  columnsToAdd: ColumnDefinition[] = [];
  /** The columns to be altered in the table, mapped by column name. */
  columnsToAlter: Map<string, ColumnDefinition[]> = new Map();
  /** The names of the columns to be dropped from the table. */
  columnsToDrop: string[] = [];

  constructor(tableName: string | null = null) {
    super();
    this.tableName = tableName ? SqlEscaper.escapeTableName(tableName, this.flavor) : '';
  }

  /**
    * Adds columns to be added to the table.
    * @param columns - A single Column instance or an array of Column instances.
    * @returns The current instance for method chaining.
    */
  public addColumnsToAdd(columns: ColumnDefinition | ColumnDefinition[]): this {
    if (Array.isArray(columns)) {
      this.columnsToAdd.push(...columns);
    } else {
      this.columnsToAdd.push(columns);
    }
    return this;
  }

  /**
    * Sets the columns to be added to the table, replacing any existing ones.
    * @param columns - A single Column instance or an array of Column instances.
    * @returns The current instance for method chaining.
    */
  public setColumnsToAdd(columns: ColumnDefinition | ColumnDefinition[]): this {
    this.columnsToAdd = [];
    return this.addColumnsToAdd(columns);
  }

  /**
    * Adds columns to be altered in the table.
    * @param alteration - An object or array of objects containing the column name and the Column instance with alterations.
    * @returns The current instance for method chaining.
    */
  public addColumnsToAlter(
    alteration: { name: string, columns: ColumnDefinition } 
      | { name: string, columns: ColumnDefinition }[]
  ): this {
    if (Array.isArray(alteration)) {
      alteration.forEach(({ name, columns }) => {
        if (!this.columnsToAlter.has(name)) {
          this.columnsToAlter.set(name, []);
        }
        this.columnsToAlter.get(name)?.push(columns);
      });
    } else {
      const { name, columns } = alteration;
      if (!this.columnsToAlter.has(name)) {
        this.columnsToAlter.set(name, []);
      }
      this.columnsToAlter.get(name)?.push(columns);
    }
    return this;
  }

  /**
    * Sets the columns to be altered in the table, replacing any existing ones.
    * @param alteration - An object or array of objects containing the column name and the Column instance with alterations.
    * @returns The current instance for method chaining.
    */
  public setColumnsToAlter(
    alteration: { name: string, columns: ColumnDefinition } 
      | { name: string, columns: ColumnDefinition }[]
  ): this {
    this.columnsToAlter.clear();
    return this.addColumnsToAlter(alteration);
  }

  /**
    * Adds column names to be dropped from the table.
    * @param columnNames - A single column name or an array of column names.
    * @returns The current instance for method chaining.
    */
  public dropColumnsByName(columnNames: string | string[]): this {
    if (Array.isArray(columnNames)) {
      this.columnsToDrop.push(...columnNames);
    } else {
      this.columnsToDrop.push(columnNames);
    }
    return this;
  }

  /**
    * Sets the column names to be dropped from the table, replacing any existing ones.
    * @param columnNames - A single column name or an array of column names.
    * @returns The current instance for method chaining.
    */
  public setColumnsToDrop(columnNames: string | string[]): this {
    this.columnsToDrop = [];
    return this.dropColumnsByName(columnNames);
  }

  /**
    * Generates the SQL fragment for dropping a column.
    * @param columnName - The name of the column to drop.
    * @returns The SQL fragment for dropping the specified column.
    */
  public static dropColumn(columnName: string): string {
    return `DROP COLUMN ${columnName}`;
  }

  /**
    * Generates the SQL fragments for adding and altering columns.
    * @returns An array of SQL fragments for adding and altering columns.
    */
  private alterColumns(): string[][] {
    const toAdd = this.columnsToAdd.map(col => col.buildToAdd(this.tableName));
    const toAlter = Array.from(this.columnsToAlter.entries()).map(([colName, alterations]) => {
      return alterations.map(alteration => alteration.buildToAlter(this.tableName, colName));
    }).flat();
    return [...toAdd, ...toAlter];
  }

  /**
    * Generates the SQL fragments for dropping columns.
    * @returns An array of SQL fragments for dropping columns.
    */
  private dropColumns(): string[] {
    return this.columnsToDrop.map(colName => AlterTableQuery.dropColumn(colName));
  }

  /**
    * Gets the kind of query.
    * @returns The kind of query, which is 'ALTER_TABLE' for this class.
    */
  public get kind() {
    return QueryKind.ALTER_TABLE
  }

  /**
    * Builds the ALTER TABLE SQL query strings.
    * @param _deepAnalysis - Optional boolean to indicate if deep analysis is required (default is false).
    * @returns An array of constructed ALTER TABLE SQL query strings.
    * @throws Error if the table name is not provided or if no alterations are specified.
    */
  public build(_deepAnalysis?: boolean): string[] {

    if (!this.tableName) {
      throw new Error('Table name is required to build ALTER TABLE query.');
    }

    const queries: string[] = [];
    const alterCols = this.alterColumns();
    const dropCols = this.dropColumns();

    alterCols.forEach(colParts => {
      queries.push(...colParts);
    });

    dropCols.forEach(dropPart => {
      let query = `ALTER TABLE ${this.tableName} ${dropPart}`;
      queries.push(query);
    });

    if (queries.length === 0) {
      throw new Error('No alterations specified for ALTER TABLE query.');
    }

    this.builtQuery = [];
    queries.forEach(query => {
      (this.builtQuery as any as string[])?.push(SqlEscaper.appendSchemas(`${query};`, this.schemas));
    });
    return this.builtQuery;
  }

  /**
    * Returns the SQL string representation of the ALTER TABLE query.
    * @returns The SQL string representation of the ALTER TABLE query.
    * @throws Error if the query has not been built yet.
    */
  public toSQL(): string | string[] {
    if(this.builtQuery) this.build();
    if(!this.builtQuery) throw new Error('No built query available. Please build the query first.');
    return this.builtQuery;
  }

  /**
    * Creates a clone of the current AlterTableQuery instance.
    * @returns A new AlterTableQuery instance with the same properties as the current instance.
    */
  public clone(): AlterTableQuery {
    const cloned = new AlterTableQuery(this.tableName);
    cloned.flavor = this.flavor;
    cloned.columnsToAdd = [...this.columnsToAdd];
    cloned.columnsToAlter = new Map(this.columnsToAlter);
    cloned.columnsToDrop = [...this.columnsToDrop];
    return cloned;
  }

  /**
    * Resets the AlterTableQuery instance to its initial state.
    * This method clears the table name, columns to add, alter, drop, and the built query.
    * @returns The current instance for method chaining.
    */
  public reset(): this {
    this.tableName = '';
    this.builtQuery = null;
    this.columnsToAdd = [];
    this.columnsToAlter.clear();
    this.columnsToDrop = [];
    return this;
  }

}
