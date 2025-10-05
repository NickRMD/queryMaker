import SqlEscaper from "../../../sqlEscaper.js";
import { ColumnDefinition } from "../../../queryUtils/Column.js";
import QueryKind from "../../../types/QueryKind.js";
import TableQueryDefinition from "./tableColumnDefinition.js";


/**
  * Class representing a CREATE TABLE SQL query.
  * This class allows you to define and build a CREATE TABLE SQL query
  * with specified table name and columns.
  */
export default class CreateTableQuery extends TableQueryDefinition {

  /** The name of the table to be created. */
  private tableColumns: ColumnDefinition[] = [];

  constructor(
    tableName?: string,
    ...columns: ColumnDefinition[]
  ) {
    super();
    this.tableName = tableName ? SqlEscaper.escapeTableName(tableName, this.flavor) : '';
    this.tableColumns = columns ?? [];
  }

  /**
    * Gets the columns defined for the table.
    * @returns An array of Column instances representing the table's columns.
    */
  public get columns(): ColumnDefinition[] {
    return this.tableColumns;
  }

  /**
    * Sets the columns for the table.
    * @param columns - A single Column instance or an array of Column instances.
    * @returns The current instance for method chaining.
    */
  public setColumns(columns: ColumnDefinition | ColumnDefinition[]): this {
    this.tableColumns = [];
    return this.addColumns(columns);
  }

  /**
    * Adds columns to the table.
    * @param columns - A single Column instance or an array of Column instances.
    * @returns The current instance for method chaining.
    */
  public addColumns(columns: ColumnDefinition | ColumnDefinition[]): this {
    if (Array.isArray(columns)) {
      this.tableColumns.push(...columns);
    } else {
      this.tableColumns.push(columns);
    }
    return this;
  }

  /**
    * Builds the CREATE TABLE SQL query string.
    * @param _deepAnalysis - Optional boolean to indicate if deep analysis is required (default is false).
    * @returns The constructed CREATE TABLE SQL query string.
    * @throws Error if the table name is not set or if no columns are defined.
    */
  public build(_deepAnalysis?: boolean): string {
    if (!this.tableName) {
      throw new Error('Table name is not set.');
    }

    if (this.tableColumns.length === 0) {
      throw new Error('No columns defined for the table.');
    }

    const columnsDef = this.tableColumns.map(col => `  ${col.build()}`).join(',\n');
    const ifNotExists = this.ifNotExistsFlag ? 'IF NOT EXISTS ' : '';
    this.builtQuery = `CREATE TABLE ${ifNotExists}${this.tableName} (\n${columnsDef}\n);`;
    this.builtQuery = SqlEscaper.appendSchemas(this.builtQuery, this.schemas);
    return this.builtQuery;
  }

  /**
    * Creates a clone of the current CreateTableQuery instance.
    * @returns A new instance of CreateTableQuery with the same properties as the current instance.
    */
  public clone(): CreateTableQuery {
    const cloned = new CreateTableQuery();
    cloned.tableName = this.tableName;
    cloned.tableColumns = [...this.tableColumns];
    cloned.flavor = this.flavor;
    cloned.ifNotExistsFlag = this.ifNotExistsFlag;
    return cloned;
  }

  /**
    * Resets the state of the CreateTableQuery instance.
    * This method clears the table name, columns, and built query.
    * @returns The current instance for method chaining.
    */
  public reset(): this {
    this.tableName = '';
    this.tableColumns = [];
    this.builtQuery = null;
    this.ifNotExistsFlag = false;
    return this;
  }

  /**
    * Returns the SQL string representation of the CREATE TABLE query.
    * @returns The SQL string representation of the CREATE TABLE query.
    */
  public toSQL(): string {
    return this.build();
  }

  /**
    * Gets the kind of the query.
    * @returns The kind of the query, which is QueryKind.CREATE_TABLE.
    */
  public get kind() {
    return QueryKind.CREATE_TABLE;
  }

}
