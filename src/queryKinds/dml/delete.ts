import CteMaker, { Cte } from "../../cteMaker.js";
import SqlEscaper from "../../sqlEscaper.js";
import Statement from "../../statementMaker.js";
import QueryKind from "../../types/QueryKind.js";
import UsingTable from "../../types/UsingTable.js";
import DmlQueryDefinition from "./dmlQueryDefinition.js";

/**
  * DeleteQuery class represents a SQL DELETE query.
  * It provides methods to build and manipulate the query, including specifying the table to delete from,
  * adding USING clauses, WHERE conditions, RETURNING fields, and Common Table Expressions (CTEs).
  * The class supports cloning, resetting, and building the final SQL query string with parameters.
  */
export default class DeleteQuery extends DmlQueryDefinition {
  /** The table from which records will be deleted. */
  private deletingFrom: string;
  /** An optional alias for the table being deleted from. */
  private deletingFromAlias: string | null = null;
  /** Tables to be used in the USING clause. */
  private usingTables: UsingTable[] = [];
  /** The fields to be returned after the delete operation. */
  private returningFields: string[] = [];

  /** 
    * Creates an instance of DeleteQuery.
    * @param from - The name of the table from which records will be deleted.
    * @param alias - An optional alias for the table.
    */
  constructor(from?: string, alias: string | null = null) {
    super();
    this.deletingFrom = from ? SqlEscaper.escapeTableName(from, this.flavor) : '';
    this.deletingFromAlias = alias;
  }

  /** 
    * Adds Common Table Expressions (CTEs) to the query.
    * Accepts a CteMaker instance, a single Cte, or an array of Ctes.
    * @param ctes - The CTEs to be added to the query.
    * @returns The current DeleteQuery instance for method chaining.
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
    * Specifies the table from which records will be deleted, with an optional alias.
    * @param table - The name of the table.
    * @param alias - An optional alias for the table.
    * @returns The current DeleteQuery instance for method chaining.
    */
  public from(table: string, alias: string | null = null): this {
    this.deletingFrom = SqlEscaper.escapeTableName(table, this.flavor);
    this.deletingFromAlias = alias;
    return this;
  }

  /** 
    * Adds tables to the USING clause. Accepts a string, a UsingTable object, or an array of UsingTable objects.
    * @param tables - The table(s) to be added to the USING clause.
    * @returns The current DeleteQuery instance for method chaining.
    * @throws Error if an invalid table name is provided in string format.
    */
  public using(tables: string | UsingTable | UsingTable[]): this {
    if (Array.isArray(tables)) {
      this.usingTables.push(...tables.map(t => ({
        table: SqlEscaper.escapeTableName(t.table, this.flavor),
        alias: t.alias || null
      })));
    } else if (typeof tables === 'string') {
      const tableParts = tables.split(' ');
      if (tableParts[0] && tableParts[0]?.trim() !== '') {
        this.usingTables.push({
          table: SqlEscaper.escapeTableName(tableParts[0], this.flavor),
          alias: tableParts[1] || null 
        });
      } else {
        throw new Error('Invalid table name provided to USING clause.');
      }
    } else {
      this.usingTables.push({
        table: SqlEscaper.escapeTableName(tables.table, this.flavor),
        alias: tables.alias || null
      });
    }
    return this;
  }

  /**
    * Specifies the WHERE clause for the DELETE query.
    * Accepts either a Statement object or a raw SQL string with optional parameters.
    * @param statement - The WHERE clause as a Statement or raw SQL string.
    * @param values - Optional parameters for the raw SQL string.
    * @returns The current DeleteQuery instance for method chaining.
    */
  public where(statement: Statement | string, ...values: any[]): this {
    if (typeof statement === 'string') {
      statement = new Statement().raw('', statement, ...values);
    }
    
    this.whereStatement = statement;
    return this;
  }

  /**
    * Allows building the WHERE clause using a callback function that receives a Statement object.
    * This provides a more fluent interface for constructing complex WHERE conditions.
    * @param statement - A callback function that takes a Statement object and returns a modified Statement.
    * @returns The current DeleteQuery instance for method chaining.
    */
  public useStatement(statement: (stmt: Statement) => Statement | void): this {
    const stmt = new Statement();
    const newStmt = statement(stmt) || stmt;
    return this.where(newStmt);
  }

  /** 
    * Specifies the fields to be returned after the delete operation. 
    * Accepts a string or an array of strings.
    * @param fields - The field(s) to be returned.
    * @returns The current DeleteQuery instance for method chaining.
    */
  public returning(fields: string | string[]): this {
    if (Array.isArray(fields)) {
      this.returningFields = SqlEscaper.escapeSelectIdentifiers(fields, this.flavor);
    } else {
      this.returningFields = SqlEscaper.escapeSelectIdentifiers([fields], this.flavor);
    }
    return this;
  }

  /** 
    * Adds fields to the existing RETURNING clause.
    * Accepts a string or an array of strings.
    * @param fields - The field(s) to be returned.
    * @returns The current DeleteQuery instance for method chaining.
    */
  public addReturning(fields: string | string[]): this {
    if (Array.isArray(fields)) {
      this.returningFields.push(...SqlEscaper.escapeSelectIdentifiers(fields, this.flavor));
    } else {
      this.returningFields.push(...SqlEscaper.escapeSelectIdentifiers([fields], this.flavor));
    }
    return this;
  }

  /**
    * Creates a deep clone of the current DeleteQuery instance.
    * This is useful for creating variations of the query without modifying the original.
    * @returns A new DeleteQuery instance with the same properties as the original.
    */
  public clone(): DeleteQuery {
    const cloned = new DeleteQuery();
    cloned.schemas = [...this.schemas];
    cloned.deletingFrom = this.deletingFrom;
    cloned.deletingFromAlias = this.deletingFromAlias;
    cloned.usingTables = JSON.parse(JSON.stringify(this.usingTables));
    cloned.whereStatement = this.whereStatement ? this.whereStatement.clone() : null;
    cloned.returningFields = [...this.returningFields];
    cloned.ctes = this.ctes ? new CteMaker(...this.ctes['ctes']) : null;
    return cloned;
  }

  /**
    * Resets the state of the DeleteQuery instance, clearing all configurations.
    * This allows reusing the instance for building a new query from scratch.
    * @returns void
    */
  public reset(): void {
    this.deletingFrom = '';
    this.schemas = [];
    this.deletingFromAlias = null;
    this.usingTables = [];
    this.whereStatement = null;
    this.returningFields = [];
    this.ctes = null;
    this.builtQuery = null;
  }

  /**
    * This a DELETE query.
    * @returns The kind of SQL operation, which is 'DELETE' for this class.
    */
  public get kind() {
    return QueryKind.DELETE;
  }

  /**
    * Invalidates the current state of the query, forcing a rebuild on the next operation.
    * @returns void
    */
  public invalidate(): void {
    this.builtQuery = null;
    if (this.whereStatement) this.whereStatement.invalidate();
    if (this.ctes) {
      for (const cte of this.ctes['ctes']) {
        cte['query'].invalidate();
      }
    }
  }

  /**
    * Builds the SQL DELETE query and returns an object containing the query text and its parameters.
    * The optional deepAnalysis parameter can be used to control the depth of analysis during the build process.
    * @param deepAnalysis - If true, performs a deeper analysis for duplicate parameters.
    * @returns An object containing the query text and its parameters.
    * @throws Error if no table is specified for the DELETE query.
    */
  public build(deepAnalysis: boolean = false): { text: string; values: any[] } {
    if (!this.deletingFrom.trim()) {
      throw new Error('No table specified for DELETE query.');
    }

    this.whereStatement = this.whereStatement || new Statement();
    this.whereStatement.enableWhere();

    let ctesClause = '';
    if (this.ctes) {
      const ctesBuilt = this.ctes.build();
      ctesClause = ctesBuilt.text;
      this.whereStatement.addParams(ctesBuilt.values);
    }

    let deleteClause = `DELETE FROM ${this.deletingFrom}`;
    if (this.deletingFromAlias) {
      deleteClause += ` AS ${this.deletingFromAlias}`;
    }

    let usingClause = '';
    if (this.usingTables.length > 0) {
      const usingParts = this.usingTables.map(t => t.alias ? `${t.table} AS ${t.alias}` : t.table);
      usingClause = `USING ${usingParts.join(',\n ')}`;
    }

    let whereClause = '';
    let values: any[] = [];
    if (this.whereStatement) {
      const stmt = this.whereStatement.build(false);
      whereClause = stmt.statement;
      values = stmt.values;
    }

    let returningClause = '';
    if (this.returningFields.length > 0) {
      returningClause = `RETURNING ${this.returningFields.join(', ')}`;
    }

    this.builtQuery = [
      ctesClause,
      deleteClause,
      usingClause,
      whereClause,
      returningClause
    ].filter(part => part !== '')
      .join('\n ');

    this.builtQuery = SqlEscaper.appendSchemas(
      this.builtQuery, this.schemas
    );

    const analyzed = this.reAnalyzeParsedQueryForDuplicateParams(this.builtQuery, values, deepAnalysis);
    this.builtQuery = analyzed.text;
    this.builtParams = analyzed.values;
    return { text: this.builtQuery, values: this.builtParams };
  }

  /**
    * Builds the SQL DELETE query and returns the query text as a string.
    * This method is useful for obtaining the raw SQL query without parameters.
    * @returns The SQL DELETE query as a string.
    */
  public toSQL(): string {
    if(!this.builtQuery) this.build();
    if(!this.builtQuery) throw new Error('Failed to build query.');
    return this.builtQuery;
  }

  /**
    * Builds the SQL DELETE query and returns the parameters as an array.
    * This method is useful for obtaining the parameters to be used with the SQL query.
    * @returns An array of parameters for the SQL DELETE query.
    */
  public getParams(): any[] {
    if(!this.builtQuery) this.build();
    if(!this.builtQuery) throw new Error('Failed to build query.');
    return this.builtParams || [];
  }
}
