import SqlEscaper from "../../../sqlEscaper.js";
import QueryKind from "../../../types/QueryKind.js";
import TableQueryDefinition from "./tableColumnDefinition.js";


/**
  * Class representing a DROP TABLE SQL query.
  * This class allows you to define and build a DROP TABLE SQL query
  * with specified table name and options like IF EXISTS.
  */
export default class DropTableQuery extends TableQueryDefinition {

  constructor(tableName: string | null = null) {
    super();
    this.tableName = tableName ? SqlEscaper.escapeTableName(tableName, this.flavor) : '';
  }

  /**
    * Builds the DROP TABLE SQL query string.
    * @param _deepAnalysis - Optional boolean to indicate if deep analysis is required (default is false).
    * @returns The constructed DROP TABLE SQL query string.
    * @throws Error if the table name is not provided.
    */
  public build(_deepAnalysis: boolean = false): string {
    if (!this.tableName) {
      throw new Error('Table name is required to build DROP TABLE query.');
    }
    let query = 'DROP TABLE ';
    if (this.ifNotExistsFlag) {
      query += 'IF EXISTS ';
    }
    query += `${this.tableName};`;
    this.builtQuery = SqlEscaper.appendSchemas(query, this.schemas);
    return this.builtQuery;
  }

  /**
    * Creates a clone of the current DropTableQuery instance.
    * @returns A new DropTableQuery instance with the same properties as the current instance.
    */
  public clone(): DropTableQuery {
    const cloned = new DropTableQuery(this.tableName);
    cloned.flavor = this.flavor;
    cloned.ifNotExistsFlag = this.ifNotExistsFlag;
    return cloned;
  }

  /**
    * Resets the DropTableQuery instance to its initial state.
    * This method clears the table name, built query, and IF NOT EXISTS flag.
    * @returns The current instance for method chaining.
    */
  public reset(): this {
    this.tableName = '';
    this.builtQuery = null;
    this.ifNotExistsFlag = false;
    return this;
  }

  /**
    * Returns the SQL string representation of the DROP TABLE query.
    * @returns The SQL string representation of the DROP TABLE query.
    */
  public toSQL(): string {
    return this.build();
  }

  /** Getter for the kind of query. */
  public get kind() {
    return QueryKind.DROP_TABLE;
  }
}
