import CteMaker, { Cte } from "../cteMaker.js";
import ColumnValue from "../types/ColumnValue";
import QueryDefinition from "./query.js";
import SelectQuery from "./select.js";

/**
  * InsertQuery helps in constructing SQL INSERT queries.
  * It supports inserting values directly or from a SELECT query.
  * It also supports Common Table Expressions (CTEs) and RETURNING clauses.
  */
export default class InsertQuery extends QueryDefinition {
  /** The table into which records will be inserted. */
  private table: string;
  /** The column-value pairs to be inserted. */
  private columnValues: ColumnValue[] = [];
  /** An optional SELECT query to insert data from. */
  private selectQuery: SelectQuery | null = null;
  /** The fields to be returned after the insert operation. */
  private returningFields: string[] = [];
  /** The final built SQL query string. */
  private builtQuery: string | null = null;
  /** Optional Common Table Expressions (CTEs) for the query. */
  private ctes: CteMaker | null = null;

  constructor(table?: string) {
    super();
    this.table = table || '';
  }

  /**
    * Adds Common Table Expressions (CTEs) to the query.
    * Accepts a CteMaker instance, a single Cte, or an array of Ctes.
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

  /** Specifies the table into which records will be inserted. */
  public into(table: string): this {
    this.table = table;
    return this;
  }

  /**
    * Specifies the column-value pairs to be inserted.
    * Accepts either an array of ColumnValue objects or an object mapping column names to values.
    */
  public values(columnValues: ColumnValue[] | { [column: string]: any }): this {
    if (Array.isArray(columnValues)) {
      this.columnValues = columnValues;
    } else {
      this.columnValues = Object.entries(columnValues).map(([column, value]) => ({
        column,
        value
      }));
    }
    return this;
  }

  /**
    * Specifies a SELECT query to insert data from.
    * This allows inserting records based on the results of another query.
    */
  public fromSelect(query: SelectQuery): this {
    this.selectQuery = query;
    return this;
  }

  /** Specifies the fields to be returned after the insert operation. */
  public returning(fields: string | string[]): this {
    if (Array.isArray(fields)) {
      this.returningFields = fields;
    } else {
      this.returningFields = [fields];
    }
    return this;
  }

  /** Creates a deep clone of the current InsertQuery instance. */
  public clone(): QueryDefinition {
    const cloned = new InsertQuery(this.table);
    cloned.columnValues = JSON.parse(JSON.stringify(this.columnValues));
    cloned.selectQuery = this.selectQuery ? this.selectQuery.clone() : null;
    cloned.returningFields = [...this.returningFields];
    cloned.ctes = this.ctes ? new CteMaker(...this.ctes['ctes']) : null;
    return cloned;
  }

  /**
    * This an INSERT query.
    */
  public get kind(): 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' {
    return 'INSERT';
  }

  /**
    * Indicates whether the query has been built and is ready for execution.
    */
  public get isDone(): boolean {
    return this.builtQuery !== null;
  }

  /** Provides access to the current InsertQuery instance. */
  public get query(): QueryDefinition {
    return this;
  }

  /** Invalidates the current state of the query, forcing a rebuild on the next operation. */
  public invalidate(): void {
    this.builtQuery = null;
    this.selectQuery?.invalidate();
    if (this.ctes) {
      for (const cte of this.ctes['ctes']) {
        cte['query'].invalidate();
      }
    }
  }

  /** Resets the query to its initial state. */
  public reset(): void {
    this.table = '';
    this.columnValues = [];
    this.selectQuery = null;
    this.returningFields = [];
    this.builtQuery = null;
    this.ctes = null;
  }

  /** Retrieves the parameters associated with the query. */
  public getParams(): any[] {
    return this.build().values;
  }

  /** 
    * Builds the SQL INSERT query and returns an object containing the query text and its parameters.
    * The optional deepAnalysis parameter can be used to control the depth of analysis during the build process.
    */
  public build(deepAnalysis: boolean = false): { text: string; values: any[] } {
    if (!this.table) {
      throw new Error('No table specified for INSERT query.');
    }
    if (this.columnValues.length === 0 && !this.selectQuery) {
      throw new Error('No values or SELECT query specified for INSERT query.');
    }

    let ctesClause = '';
    let cteValues: any[] = [];
    if (this.ctes) {
      const ctesBuilt = this.ctes.build();
      ctesClause = ctesBuilt.text;
      cteValues = ctesBuilt.values;
      this.selectQuery?.addWhereOffset(cteValues.length);
    } 
    
    const columns = this.columnValues.map(cv => cv.column);
    let insertClause = `INSERT INTO ${this.table} (${columns.join(', ')})`;
    if (this.columnValues.length > 0) {
      if (this.columnValues.some(cv => cv.value !== undefined)) {
        const valuePlaceholders = this.columnValues.map((_, idx) => `$${idx + 1}`);
        insertClause += ` VALUES (${valuePlaceholders.join(', ')})`;
      }
    } 

    if (this.selectQuery) {
      const selectBuilt = this.selectQuery.build();
      insertClause += `\n${selectBuilt.text}`;
      cteValues = [...cteValues, ...selectBuilt.values];
    }

    let returningClause = '';
    if (this.returningFields.length > 0) {
      returningClause = `RETURNING ${this.returningFields.join(', ')}`;
    }

    const text = [
      ctesClause ? `${ctesClause} ` : '',
      insertClause,
      returningClause
    ].join('\n').trim();
    this.builtQuery = text;

    const analyzed = this.reAnalyzeParsedQueryForDuplicateParams(
      this.builtQuery,
      [...cteValues, ...this.getParams()],
      deepAnalysis
    );
    this.builtQuery = analyzed.text;
    return { text, values: analyzed.values };
  }


  public toSQL(): string {
    return this.build().text;
  }
}
