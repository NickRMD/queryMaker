import SqlEscaper from "../../sqlEscaper.js";
import type QueryKind from "../../types/QueryKind";
import sqlFlavor from "../../types/sqlFlavor.js";

/**
 * An array of function names that can be used to execute SQL queries.
 * These functions are commonly found in database client libraries.
 */
const functionNames = ["execute", "query", "run", "all", "get"] as const;

/**
 * FunctionDeclaration type defines the signature for functions that execute SQL queries.
 * It takes a query string and an array of parameters, and returns a promise that resolves
 * with any result.
 */
type FunctionDeclaration = (query: string, params?: any[]) => Promise<any>;

/**
 * QueryExecutorObject interface defines the structure for an object that can execute SQL queries.
 * It includes optional methods for executing queries in different ways, as well as an optional manager property.
 */
interface QueryExecutorObject {
  execute?: FunctionDeclaration;
  query?: FunctionDeclaration;
  run?: FunctionDeclaration;
  all?: FunctionDeclaration;
  get?: FunctionDeclaration;
  manager?: QueryExecutor;
}

/**
 * QueryExecutor type can be either a QueryExecutorObject or a function that executes a query.
 */
type QueryExecutor = QueryExecutorObject | FunctionDeclaration;

/**
 * Abstract class DdlQueryDefinition serves as a blueprint for defining DDL (Data Definition Language) query structures.
 * It is intended to be extended by specific DDL query classes such as CreateTableQuery, AlterTableQuery, and DropTableQuery.
 * This class will provide common properties and methods that are shared among all DDL query types and also some abstract methods
 * that must be implemented by the subclasses to ensure they adhere to a consistent interface for building DDL queries.
 */
export default abstract class DdlQueryDefinition {
  /** The name of the table involved in the DDL operation. */
  protected tableName: string = "";

  /** The built DDL query string, initialized to null. */
  protected builtQuery: string | string[] | null = null;

  /**
   * Sets the name of the table for the DDL operation.
   * @param name - The name of the table.
   * @returns The current instance for method chaining.
   */
  public table(name: string | null = null): this {
    this.tableName = name ? SqlEscaper.escapeTableName(name, this.flavor) : "";
    return this;
  }

  /**
   * Checks if the DDL query has been built.
   * @returns True if the query has been built, false otherwise.
   */
  public isDone(): boolean {
    return this.builtQuery !== null;
  }

  /**
   * Abstract method to build the DDL query string.
   * This method must be implemented by subclasses to generate the appropriate SQL statement.
   * @param deepAnalysis - Optional boolean to indicate if deep analysis is required (default is false).
   * @returns The constructed DDL query string.
   */
  public abstract build(deepAnalysis?: boolean): string | string[];

  /**
   * Builds an EXPLAIN query for the DDL operation.
   * This method prefixes the built DDL query with "EXPLAIN".
   * @param deepAnalysis - Optional boolean to indicate if deep analysis is required (default is false).
   * @returns The constructed EXPLAIN query string.
   */
  public buildExplain(deepAnalysis?: boolean): string {
    return `EXPLAIN ${this.build(deepAnalysis)}`;
  }

  /**
   * Builds an EXPLAIN ANALYZE query for the DDL operation.
   * This method prefixes the built DDL query with "EXPLAIN ANALYZE".
   * @param deepAnalysis - Optional boolean to indicate if deep analysis is required (default is false).
   * @returns The constructed EXPLAIN ANALYZE query string.
   */
  public buildExplainAnalyze(deepAnalysis?: boolean): string {
    return `EXPLAIN ANALYZE ${this.build(deepAnalysis)}`;
  }

  /**
   * Utility method to add indentation to each line of a given string.
   * This is useful for formatting multi-line SQL queries for better readability.
   * @param str - The input string to be indented.
   * @param spaces - The number of spaces to indent each line (default is 0).
   * @returns The indented string.
   */
  protected spaceLines(str: string, spaces: number = 0): string {
    const space = " ".repeat(spaces);
    return str
      .split("\n")
      .map((line) => space + line)
      .join("\n");
  }

  /**
   * Abstract method to clone the current DDL query definition instance.
   * This method must be implemented by subclasses to return a new instance
   * that is a copy of the current instance.
   * @returns A new instance of the DDL query definition.
   */
  public abstract clone(): DdlQueryDefinition;

  /**
   * Abstract method to reset the state of the DDL query definition.
   * This method must be implemented by subclasses to clear any set properties
   * and return the instance to its initial state.
   * @returns The current instance for method chaining.
   */
  public abstract reset(): this;

  /**
   * Abstract method to convert the DDL query definition to its SQL string representation.
   * This method must be implemented by subclasses to return the SQL string
   * that represents the DDL operation defined by the instance.
   * @returns The SQL string representation of the DDL query.
   */
  public abstract toSQL(): string | string[];

  /**
   * Abstract getter to retrieve the kind of DDL query.
   * This property must be implemented by subclasses to return the specific
   * type of DDL operation (e.g., 'CREATE', 'ALTER', 'DROP').
   */
  public abstract get kind(): QueryKind;

  /**
   * The SQL flavor to use for escaping identifiers.
   * Default is PostgreSQL.
   */
  protected flavor: sqlFlavor = sqlFlavor.postgres;

  /**
   * Schemas to be used in the query.
   * This is useful for databases that support multiple schemas.
   * NOTICE: SQL Injection is not checked in schema names. Be sure to use only trusted schema names.
   */
  protected schemas: string[] = [];

  /**
   * Sets the SQL flavor for escaping identifiers.
   * @param flavor The SQL flavor to set.
   * @returns The current DmlQueryDefinition instance for chaining.
   */
  public sqlFlavor(flavor: sqlFlavor) {
    this.flavor = flavor;
    return this;
  }

  /**
   * Set schemas to be used in the query.
   * This is useful for databases that support multiple schemas.
   * NOTICE: SQL Injection is not checked in schema names. Be sure to use only trusted schema names.
   * @param schemas The schemas to set.
   * @returns The current SelectQuery instance for chaining.
   */
  public schema(...schemas: string[]): this {
    this.schemas = schemas;
    return this;
  }

  /**
   * Adds schemas to the existing list of schemas.
   * This is useful for databases that support multiple schemas.
   * NOTICE: SQL Injection is not checked in schema names. Be sure to use only trusted schema names.
   * @param schemas The schemas to add.
   * @returns The current SelectQuery instance for chaining.
   */
  public addSchema(...schemas: string[]): this {
    this.schemas.push(...schemas);
    return this;
  }

  /**
   * Executes the built SQL query using the provided query executor.
   * The query executor can be a function or an object with methods to execute the query.
   * The optional noManager parameter can be used to bypass the manager property if present.
   * @param queryExecutor The executor to run the SQL query.
   * @param noManager If true, bypasses the manager property of the executor object.
   * @returns A promise that resolves when the query execution is complete.
   * @throws An error if the provided query executor is invalid.
   */
  public async execute(
    queryExecutor: QueryExecutor,
    noManager: boolean = false,
  ): Promise<void> {
    if (typeof queryExecutor === "function") {
      const builtQuery = this.build();
      if (Array.isArray(builtQuery)) {
        for (const query of builtQuery) {
          await queryExecutor(query);
        }
      } else {
        await queryExecutor(builtQuery);
      }
      return;
    }

    if (
      !noManager &&
      "manager" in queryExecutor &&
      typeof queryExecutor?.manager === "object"
    ) {
      for (const functionName of functionNames) {
        if (typeof queryExecutor.manager[functionName] === "function") {
          const builtQuery = this.build();
          if (Array.isArray(builtQuery)) {
            for (const query of builtQuery) {
              await queryExecutor.manager[functionName]!(query);
            }
          } else {
            await queryExecutor.manager[functionName]!(builtQuery);
          }
          return;
        }
      }
    } else if (typeof queryExecutor === "object") {
      for (const functionName of functionNames) {
        if (typeof queryExecutor[functionName] === "function") {
          const builtQuery = this.build();
          if (Array.isArray(builtQuery)) {
            for (const query of builtQuery) {
              await queryExecutor[functionName]!(query);
            }
          } else {
            await queryExecutor[functionName]!(builtQuery);
          }
          return;
        }
      }
    }

    throw new Error("Invalid query executor provided.");
  }
}
