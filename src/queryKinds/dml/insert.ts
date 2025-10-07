import CteMaker, { type Cte } from "../../cteMaker.js";
import SqlEscaper from "../../sqlEscaper.js";
import type ColumnValue from "../../types/ColumnValue.js";
import QueryKind from "../../types/QueryKind.js";
import DmlQueryDefinition from "./dmlQueryDefinition.js";
import type SelectQuery from "./select.js";

/**
 * InsertQuery helps in constructing SQL INSERT queries.
 * It supports inserting values directly or from a SELECT query.
 * It also supports Common Table Expressions (CTEs) and RETURNING clauses.
 */
export default class InsertQuery extends DmlQueryDefinition {
  /** The table into which records will be inserted. */
  private table: string;
  /** The column-value pairs to be inserted. */
  private columnValues: ColumnValue[] = [];
  /** An optional SELECT query to insert data from. */
  private selectQuery: SelectQuery | null = null;
  /** The fields to be returned after the insert operation. */
  private returningFields: string[] = [];
  /** Flag indicating whether the query returns all fields. */
  private returnAll: boolean = false;

  /**
   * Creates an instance of InsertQuery.
   * @param table - The name of the table into which records will be inserted.
   */
  constructor(table?: string) {
    super();
    this.table = table ? SqlEscaper.escapeTableName(table, this.flavor) : "";
  }

  /**
   * Adds Common Table Expressions (CTEs) to the query.
   * Accepts a CteMaker instance, a single Cte, or an array of Ctes.
   * @param ctes - The CTEs to be added to the query.
   * @returns The current InsertQuery instance for method chaining.
   */
  public with(ctes: CteMaker | Cte | Cte[]): this {
    if (ctes instanceof CteMaker) {
      this.ctes = ctes;
    } else if (Array.isArray(ctes)) {
      this.ctes = new CteMaker(...ctes);
    } else {
      this.ctes = new CteMaker(ctes);
    }
    return this;
  }

  /**
   * Specifies the table into which records will be inserted.
   * @param table - The name of the table.
   * @returns The current InsertQuery instance for method chaining.
   */
  public into(table: string): this {
    this.table = SqlEscaper.escapeTableName(table, this.flavor);
    return this;
  }

  /**
   * Specifies the column-value pairs to be inserted.
   * Accepts either an array of ColumnValue objects or an object mapping column names to values.
   * @param columnValues - The column-value pairs to be inserted.
   * @returns The current InsertQuery instance for method chaining.
   */
  public values(columnValues: ColumnValue[] | { [column: string]: any }): this {
    if (Array.isArray(columnValues)) {
      this.columnValues = columnValues
        .filter((v) => v.value !== undefined)
        .map((v) => ({
          column: SqlEscaper.escapeIdentifier(v.column, this.flavor),
          value: v.value ?? null,
        }));
    } else {
      this.columnValues = Object.entries(columnValues)
        .filter(([, value]) => value !== undefined)
        .map(([column, value]) => ({
          column: SqlEscaper.escapeIdentifier(column, this.flavor),
          value: value ?? null,
        }));
    }
    return this;
  }

  /**
   * Specifies the columns to be inserted without associated values.
   * This is useful when inserting data from a SELECT query.
   * @param columns - The names of the columns to be inserted.
   * @returns The current InsertQuery instance for method chaining.
   */
  public columns(...columns: string[]): this {
    this.columnValues = columns.map((column) => ({
      column: SqlEscaper.escapeIdentifier(column, this.flavor),
      value: undefined,
    }));
    return this;
  }

  /**
   * Specifies a SELECT query to insert data from.
   * This allows inserting records based on the results of another query.
   * @param query - The SELECT query to insert data from.
   * @returns The current InsertQuery instance for method chaining.
   */
  public fromSelect(query: SelectQuery): this {
    this.selectQuery = query;
    return this;
  }

  /**
   * Indicates that all fields should be returned after the insert operation.
   * This is equivalent to using RETURNING * in SQL.
   * @returns The current InsertQuery instance for method chaining.
   */
  public returnAllFields(): this {
    this.returnAll = true;
    this.returningFields = [];
    return this;
  }

  /**
   * Specifies the fields to be returned after the insert operation.
   * @param fields - A single field or an array of fields to be returned.
   * @returns The current InsertQuery instance for method chaining.
   */
  public returning(fields: string | string[]): this {
    this.returningRaw(
      SqlEscaper.escapeSelectIdentifiers(
        Array.isArray(fields) ? fields : [fields],
        this.flavor,
      ),
    );
    return this;
  }

  /**
   * Adds fields to the existing RETURNING clause.
   * @param fields - A single field or an array of fields to be added to the RETURNING clause.
   * @returns The current InsertQuery instance for method chaining.
   */
  public addReturning(fields: string | string[]): this {
    this.addReturningRaw(
      SqlEscaper.escapeSelectIdentifiers(
        Array.isArray(fields) ? fields : [fields],
        this.flavor,
      ),
    );
    return this;
  }

  /**
   * Specifies raw fields to be returned after the insert operation without escaping.
   * @param fields - A single field or an array of fields to be returned.
   * @returns The current InsertQuery instance for method chaining.
   */
  public returningRaw(fields: string | string[]): this {
    this.returnAll = false;
    if (Array.isArray(fields)) {
      this.returningFields = fields;
    } else {
      this.returningFields = [fields];
    }
    return this;
  }

  /**
   * Adds raw fields to the existing RETURNING clause without escaping.
   * @param field - A single field or an array of fields to be added to the RETURNING clause.
   * @returns The current InsertQuery instance for method chaining.
   */
  public addReturningRaw(field: string | string[]): this {
    this.returnAll = false;
    if (Array.isArray(field)) {
      this.returningFields.push(...field);
    } else {
      this.returningFields.push(field);
    }
    return this;
  }

  /**
   * Creates a deep clone of the current InsertQuery instance.
   * @returns A new InsertQuery instance with the same properties as the original.
   */
  public clone(): InsertQuery {
    const cloned = new InsertQuery();
    cloned.table = this.table;
    cloned.schemas = [...this.schemas];
    cloned.columnValues = JSON.parse(JSON.stringify(this.columnValues));
    cloned.selectQuery = this.selectQuery ? this.selectQuery.clone() : null;
    cloned.returningFields = [...this.returningFields];
    cloned.ctes = this.ctes ? new CteMaker(...this.ctes["ctes"]) : null;
    cloned.returnAll = this.returnAll;
    return cloned;
  }

  /**
   * This an INSERT query.
   * @returns The kind of SQL operation, which is 'INSERT' for this class.
   */
  public get kind() {
    return QueryKind.INSERT;
  }

  /**
   * Invalidates the current state of the query, forcing a rebuild on the next operation.
   * @returns void
   */
  public override invalidate(): void {
    this.builtQuery = null;
    this.selectQuery?.invalidate();
    if (this.ctes) {
      for (const cte of this.ctes["ctes"]) {
        cte["query"].invalidate();
      }
    }
  }

  /**
   * Resets the query to its initial state.
   * @returns void
   */
  public reset(): void {
    this.table = "";
    this.schemas = [];
    this.columnValues = [];
    this.selectQuery = null;
    this.returningFields = [];
    this.builtQuery = null;
    this.ctes = null;
    this.returnAll = false;
  }

  /**
   * Retrieves the parameters associated with the query.
   * @returns An array of parameters for the query.
   */
  private getInternalParams(): any[] {
    if (!this.builtQuery) this.build();
    let params: any[] = [];
    if (this.columnValues.length > 0) {
      params = this.columnValues.map((cv) => cv.value);
    } else if (this.selectQuery) {
      params = this.selectQuery.getParams();
    }
    if (this.ctes) {
      params = [...this.ctes.build().values, ...params];
    }
    return params;
  }

  /**
   * Retrieves the parameters associated with the query, building the query if necessary.
   * @returns An array of parameters for the query.
   */
  public getParams(): any[] {
    if (!this.builtQuery) this.build();
    if (!this.builtParams) throw new Error("Failed to build query parameters.");
    return this.builtParams;
  }

  /**
   * Builds the SQL INSERT query and returns an object containing the query text and its parameters.
   * The optional deepAnalysis parameter can be used to control the depth of analysis during the build process.
   * @param deepAnalysis - Whether to perform deep analysis during the build process.
   * @returns An object containing the query text and its parameters.
   * @throws Error if no table is specified or if neither values nor a SELECT query is provided.
   */
  public build(deepAnalysis: boolean = false): { text: string; values: any[] } {
    if (!this.table) {
      throw new Error("No table specified for INSERT query.");
    }
    if (this.columnValues.length === 0 && !this.selectQuery) {
      throw new Error("No values or SELECT query specified for INSERT query.");
    }

    let ctesClause = "";
    let cteValues: any[] = [];
    if (this.ctes) {
      const ctesBuilt = this.ctes.build();
      ctesClause = ctesBuilt.text;
      cteValues = ctesBuilt.values;
      this.selectQuery?.addWhereOffset(cteValues.length);
    }

    const columns = this.columnValues.map((cv) => cv.column);
    let insertClause = `INSERT INTO ${this.table} (${columns.join(", ")})`;
    if (this.columnValues.length > 0) {
      if (this.columnValues.some((cv) => cv.value !== undefined)) {
        const valuePlaceholders = this.columnValues.map(
          (_, idx) => `$${idx + 1}`,
        );
        insertClause += ` VALUES (${valuePlaceholders.join(", ")})`;
      }
    } else if (this.selectQuery) {
      // Use columns from select query if not specified
      const selectColumns = this.selectQuery.columns;
      if (selectColumns.length > 0 && columns.length === 0) {
        const parsedColumns = selectColumns.map((col) => {
          const regex =
            /^(?:(?:"?[\w$]+"?\.)?"?([\w$]+)"?(?:\s+AS\s+"?([\w$]+)"?)?)$/i;
          const match = col.match(regex);
          if (match) {
            return SqlEscaper.escapeIdentifier(
              match[2]! || match[1]!,
              this.flavor,
            );
          }
          return SqlEscaper.escapeIdentifier(col, this.flavor);
        });
        insertClause = `INSERT INTO ${this.table} (${parsedColumns.join(", ")})`;
      }
    }

    if (this.selectQuery) {
      const selectBuilt = this.selectQuery.build();
      insertClause += `\n${selectBuilt.text}`;
      cteValues = [...cteValues, ...selectBuilt.values];
    }

    let returningClause = "";
    if (this.returningFields.length > 0) {
      returningClause = `RETURNING ${this.returningFields.join(", ")}`;
    }

    const text = [
      ctesClause ? `${ctesClause} ` : "",
      insertClause,
      returningClause || (this.returnAll ? "RETURNING *" : ""),
    ]
      .join("\n")
      .trim();
    this.builtQuery = text;

    this.builtQuery = SqlEscaper.appendSchemas(this.builtQuery, this.schemas);

    const analyzed = this.reAnalyzeParsedQueryForDuplicateParams(
      this.builtQuery,
      [...cteValues, ...this.getInternalParams()],
      deepAnalysis,
    );

    this.builtQuery = analyzed.text;
    this.builtParams = analyzed.values;
    return { text: this.builtQuery, values: this.builtParams };
  }

  /**
   * Converts the built SQL query to a string.
   * @returns The SQL query string.
   */
  public toSQL(): string {
    if (!this.builtQuery) this.build();
    if (!this.builtQuery) throw new Error("Failed to build query.");

    return this.builtQuery;
  }
}
