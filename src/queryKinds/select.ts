import CteMaker, { Cte } from "../cteMaker.js";
import Statement from "../statementMaker.js";
import Join from "../types/Join.js";
import OrderBy from "../types/OrderBy.js";
import QueryDefinition from "./query.js";

/**
  * SelectQuery class represents a SQL SELECT query.
  * It includes methods to build various parts of the query such as SELECT fields, WHERE conditions, JOINs, ORDER BY, LIMIT, OFFSET, GROUP BY, and CTEs.
  * The class provides functionality to build the final SQL query string and manage query parameters.
  */
export default class SelectQuery extends QueryDefinition {
  /**
    * The table to select from.
    */
  private table: string;
  private tableAlias: string | null = null;

  /**
    * Indicates whether the SELECT is DISTINCT.
    */
  private distinctSelect: boolean = false;

  /**
    * The fields to select.
    */
  private selectFields: string[];

  /**
    * The WHERE clause statement.
    */
  private whereStatement: Statement | null = null;

  /**
    * The HAVING clause statement.
    */
  private havingStatement: Statement | null = null;

  /**
    * The JOIN clauses.
    */
  private joins: Join[] = [];

  /**
    * The ORDER BY clauses.
    */
  private orderBys: OrderBy[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;

  /**
    * The GROUP BY fields.
    */
  private groupBys: string[] = [];

  /**
    * If true, automatically includes all selected fields in the GROUP BY clause.
    */
  private groupBySelectFields: boolean = false;

  /**
    * The built SQL query string.
    */
  private builtQuery: string | null = null;

  /**
    * The CTEs (Common Table Expressions) for the query.
    */
  private ctes: CteMaker | null = null;

  /**
    * If true, disables deep analysis of the query for duplicate parameters.
    */
  private disabledAnalysis: boolean = false;

  constructor(
    from?: string,
    alias: string | null = null,
    groupBySelectFields: boolean = false
  ) {
    super();
    this.table = from || '';
    this.tableAlias = alias;
    this.selectFields = ['*'];
    this.groupBySelectFields = groupBySelectFields;
  }

  /**
    * Add an offset to the WHERE clause parameters.
    * This is useful when combining multiple statements to ensure parameter indices are correct.
    */
  public addWhereOffset(offset: number): this {
    if (this.whereStatement) {
      this.whereStatement.addOffset(offset);
      this.whereStatement.invalidate();
    }
    return this;
  }

  /**
    * Adds CTEs to the query.
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
    * Sets the table to select from, with an optional alias.
    */
  public from(table: string, alias: string | null = null): this {
    this.table = table;
    this.tableAlias = alias;
    return this;
  }

  /**
    * Enables DISTINCT selection.
    */
  public distinct(): this {
    this.distinctSelect = true;
    return this;
  }

  /**
    * Sets the fields to select from.
    */
  public select(fields: string | string[]): this {
    if (Array.isArray(fields)) {
      this.selectFields = fields;
    } else {
      this.selectFields = [fields];
    }
    return this;
  }

  /**
    * Adds fields to the existing selection.
    */
  public addSelect(fields: string | string[]): this {
    if (Array.isArray(fields)) {
      this.selectFields.push(...fields);
    } else {
      this.selectFields.push(fields);
    }
    return this;
  }

  /**
    * Adds a Statement or raw SQL string as the WHERE clause.
    */
  public where(statement: Statement | string, ...values: any[]): this {
    if (typeof statement === 'string') {
      statement = new Statement().raw('', statement, ...values);
    }
    
    this.whereStatement = statement;
    return this;
  }

  /**
    * Uses a callback to build the WHERE clause statement.
    */
  public useStatement(statement: (stmt: Statement) => Statement | void): this {
    const stmt = new Statement();
    const newStmt = statement(stmt) || stmt;
    return this.where(newStmt);
  }

  /**
    * Adds a Statement or raw SQL string as the HAVING clause.
    */
  public having(statement: Statement | string, ...values: any[]): this {
    if (typeof statement === 'string') {
      statement = new Statement().raw('', statement, ...values);
    }
    
    this.havingStatement = statement;
    return this;
  }

  /**
    * Uses a callback to build the HAVING clause statement.
    */
  public useHavingStatement(statement: (stmt: Statement) => Statement | void): this {
    const stmt = new Statement();
    const newStmt = statement(stmt) || stmt;
    return this.having(newStmt);
  }

  /**
    * Adds JOIN clauses to the query,
    * either as a single Join object or an array of Join objects.
    */
  public join(
    join: Join | Join[] 
  ): this {
    if (Array.isArray(join)) {
      this.joins.push(...join);
    } else {
      this.joins.push(join);
    }
    return this;
  }

  /**
    * Adds ORDER BY clauses to the query,
    * either as a single OrderBy object or an array of OrderBy objects.
    */
  public orderBy(
    orderBy: OrderBy | OrderBy[]
  ): this {
    if (Array.isArray(orderBy)) {
      this.orderBys.push(...orderBy);
    } else {
      this.orderBys.push(orderBy);
    }
    return this;
  }

  /**
    * Sets the LIMIT for the query.
    */
  public limit(count: number): this {
    if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
      throw new Error("Limit must be a non-negative integer.");
    }
    this.limitCount = count;
    return this;
  }

  /**
    * Sets the OFFSET for the query.
    */
  public offset(count: number): this {
    if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
      throw new Error("Offset must be a non-negative integer.");
    }
    this.offsetCount = count;
    return this;
  }

  /**
    * Sets both LIMIT and OFFSET for the query.
    */
  public limitAndOffset(limit: number, offset: number): this {
    if (typeof limit !== 'number' || limit < 0 || !Number.isInteger(limit)) {
      throw new Error("Limit must be a non-negative integer.");
    }

    if (typeof offset !== 'number' || offset < 0 || !Number.isInteger(offset)) {
      throw new Error("Offset must be a non-negative integer.");
    }

    this.limitCount = limit;
    this.offsetCount = offset;
    return this;
  }

  /**
    * Resets both LIMIT and OFFSET to null.
    */
  public resetLimitOffset(): this {
    this.limitCount = null;
    this.offsetCount = null;
    return this;
  }

  /**
    * Resets the entire query to its initial state.
    */
  public reset(): void {
    this.table = '';
    this.tableAlias = null;
    this.distinctSelect = false;
    this.selectFields = ['*'];
    this.whereStatement = null;
    this.joins = [];
    this.orderBys = [];
    this.limitCount = null;
    this.offsetCount = null;
    this.groupBys = [];
    this.groupBySelectFields = false;
    this.builtQuery = null;
    this.ctes = null;
    this.havingStatement = null;
    this.disabledAnalysis = false;
  }

  /**
    * Adds fields to the GROUP BY clause,
    * either as a single field or an array of fields.
    */
  public groupBy(fields: string | string[]): this {
    if (Array.isArray(fields)) {
      this.groupBys.push(...fields);
    } else {
      this.groupBys.push(fields);
    }
    return this;
  }

  /**
    * Enable grouping by all selected fields.
    * This automatically adds all selected fields to the GROUP BY clause.
    */
  public enableGroupBySelectFields(): this {
    this.groupBySelectFields = true;
    return this;
  }

  /**
    * Gets whether the query has been built.
    */
  public get isDone(): boolean {
    return this.builtQuery !== null;
  }

  /**
    * This is a SELECT query.
    */
  public get kind(): 'SELECT' {
    return 'SELECT';
  }

  /**
    * Get params for the built query.
    * If the query is not built yet, it will build it first.
    */
  public getParams(): any[] {
    return this.build().values;
  }

  /**
    * Invalidates the current built query, forcing a rebuild on the next operation.
    * Also invalidates any nested statements or CTE queries.
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
    * Creates a deep clone of the current SelectQuery instance.
    * This is useful for creating variations of a query without modifying the original.
    */
  public clone(): SelectQuery {
    const cloned = new SelectQuery(this.table, this.tableAlias, this.groupBySelectFields);
    cloned.distinctSelect = this.distinctSelect;
    cloned.selectFields = [...this.selectFields];
    cloned.whereStatement = this.whereStatement ? this.whereStatement.clone() : null;
    cloned.joins = this.joins.map(j => ({
      type: j.type,
      table: j.table,
      on: typeof j.on === "string" ? `${j.on}` : j.on.clone()
    }));
    cloned.orderBys = [...this.orderBys];
    cloned.limitCount = this.limitCount;
    cloned.offsetCount = this.offsetCount;
    cloned.groupBys = [...this.groupBys];
    cloned.ctes = this.ctes ? new CteMaker(...this.ctes['ctes']) : null;
    return cloned;
  }

  /**
    * Makes a UNION ALL of the current query with another SelectQuery.
    * The resulting query will select all fields from both queries.
    * Note: The resulting query cannot be cloned.
    */
  public unionAll(query: SelectQuery): SelectQuery {
    let firstQuery;
    try {
      firstQuery = this.clone().build();
    } catch(e) {
      if (e instanceof Error && e.message.includes("UNION")) {
        firstQuery = this.build();
      } else throw e;
    }

    const secondQuery = query
      .clone()
      .build();

    const texts = [firstQuery.text, secondQuery.text];
    const values = [...firstQuery.values, ...secondQuery.values];

    let paramIndex = 1;
    let resultTexts: string[] = [];
    for (const text of texts) {
      resultTexts.push(text.replace(/\$(\d+)/g, () =>
        `$${paramIndex++}`
      ));
    }
    const text = resultTexts.join('\nUNION ALL\n'); 

    const unionQuery = new SelectQuery();
    unionQuery.builtQuery = text;
    unionQuery.ctes = null;
    unionQuery.selectFields = ['*'];
    unionQuery.whereStatement = null;
    unionQuery.table = '';
    unionQuery.tableAlias = null;
    unionQuery.distinctSelect = false;
    unionQuery.joins = [];
    unionQuery.orderBys = [];
    unionQuery.limitCount = null;
    unionQuery.offsetCount = null;
    unionQuery.groupBys = [];
    unionQuery.groupBySelectFields = false;
    unionQuery.clone = () => {
      throw new Error("Cannot clone a UNION ALL query.");
    }
    unionQuery.build = () => ({ text: text, values: values })

    return unionQuery;
  }

  /**
    * Makes a UNION of the current query with another SelectQuery.
    * The resulting query will select all fields from both queries, removing duplicates.
    * Note: The resulting query cannot be cloned.
    */
  public union(query: SelectQuery): SelectQuery {
    let firstQuery;
    try {
      firstQuery = this.clone().build();
    } catch(e) {
      if (e instanceof Error && e.message.includes("UNION")) {
        firstQuery = this.build();
      } else throw e;
    }

    const secondQuery = query
      .clone()
      .build();

    const texts = [firstQuery.text, secondQuery.text];
    const values = [...firstQuery.values, ...secondQuery.values];

    let paramIndex = 1;
    let resultTexts: string[] = [];
    for (const text of texts) {
      resultTexts.push(text.replace(/\$(\d+)/g, () =>
        `$${paramIndex++}`
      ));
    }
    const text = resultTexts.join('\nUNION\n'); 

    const unionQuery = new SelectQuery();
    unionQuery.builtQuery = text;
    unionQuery.ctes = null;
    unionQuery.selectFields = ['*'];
    unionQuery.whereStatement = null;
    unionQuery.table = '';
    unionQuery.tableAlias = null;
    unionQuery.distinctSelect = false;
    unionQuery.joins = [];
    unionQuery.orderBys = [];
    unionQuery.limitCount = null;
    unionQuery.offsetCount = null;
    unionQuery.groupBys = [];
    unionQuery.groupBySelectFields = false;
    unionQuery.clone = () => {
      throw new Error("Cannot clone a UNION query.");
    }
    unionQuery.build = () => ({ text: text, values: values })

    return unionQuery;
  }

  /**
    * Builds the final SQL SELECT query string and returns it along with the associated parameter values.
    * If deepAnalysis is true, it will perform a deep analysis to identify and consolidate duplicate parameters.
    * Throws an error if the table name is not set.
    */
  public build(deepAnalysis: boolean = false): { text: string; values: any[]; } {
    if (!this.table) {
      throw new Error("Table name is required for SELECT query.");
    }

    this.whereStatement = this.whereStatement || new Statement();

    let ctesClause = '';
    if (this.ctes) {
      const ctesBuilt = this.ctes.build();
      ctesClause = ctesBuilt.text;
      this.whereStatement.addParams(ctesBuilt.values);
    }

    let selectClause = this.selectFields.length > 0 ? this.selectFields.join(',\n ') : '*';
    if (this.groupBySelectFields && this.selectFields[0] !== '*') {
      this.groupBys = Array.from(new Set([...this.groupBys, ...this.selectFields]));
    }
    
    if(this.distinctSelect) 
      selectClause = ` DISTINCT ${selectClause}`
    else selectClause = ` ${selectClause}`;

    let fromClause = `FROM ${this.table}`;
    if (this.tableAlias) fromClause += ` AS ${this.tableAlias}`;

    let joinClauses = '';
    let currentOffset = 0;
    let parametersToAdd: any = [];
    for (const join of this.joins) {
      const onClause = 
        typeof join.on === 'string' ? join.on
        : (() => {
            join.on.enableWhere();
            join.on.addOffset(currentOffset);
            const stmt = join.on.build(false);
            currentOffset += stmt.values.length;
            parametersToAdd.push(...stmt.values);
            return stmt.statement;
          })();
      joinClauses += `${joinClauses ? '\n' : ''}${join.type} JOIN ${join.table} ${join.alias}\n ON ${onClause}`;
    }

    this.whereStatement.addParams(parametersToAdd);

    this.whereStatement.enableWhere();
    const stmt = this.whereStatement.build();
    const whereClause = stmt.statement;
    const values = stmt.values;

    let groupByClause = '';
    if (
      this.groupBys.length > 0 && 
      !this.groupBySelectFields
    ) {
      groupByClause = `GROUP BY ${this.groupBys.join(', ')}`;
    } else if (this.groupBySelectFields) {
      groupByClause = `GROUP BY ${this.selectFields.join(', ')}`;
    }

    let havingClause = '';
    if (this.havingStatement) {
      this.havingStatement.disableWhere();
      this.havingStatement.addOffset(values.length);
      const havingStmt = this.havingStatement.build();
      havingClause = `HAVING ${havingStmt.statement}`;
      values.push(...havingStmt.values);
    }

    let orderByClause = '';
    if (this.orderBys.length > 0) {
      const orders = this.orderBys.map(ob => `${ob.field} ${ob.direction}`);
      orderByClause = `ORDER BY ${orders.join(', ')}`;
    }

    let limitClause = '';
    if (this.limitCount !== null) limitClause = `LIMIT ${this.limitCount}`;

    let offsetClause = '';
    if (this.offsetCount !== null) offsetClause = `OFFSET ${this.offsetCount}`;

    const query = [
      ctesClause,
      'SELECT',
      selectClause,
      fromClause,
      joinClauses,
      whereClause,
      groupByClause,
      havingClause,
      orderByClause,
      `${limitClause} ${offsetClause}`
    ].map(q => q.trim() ? q : null)
      .filter(Boolean)
      .join('\n');

    this.builtQuery = query.trim();

    if (this.disabledAnalysis) {
      return { text: this.builtQuery, values };
    } else {
      const analyzed = this.reAnalyzeParsedQueryForDuplicateParams(
        this.builtQuery,
        values,
        deepAnalysis
      );
      this.builtQuery = analyzed.text;
      return { text: this.builtQuery, values: analyzed.values };
    }
  }

  /**
    * Returns the built SQL query string.
    * If the query is not built yet, it will build it first.
    */
  public toSQL(): string {
    return this.build().text;
  }

  /**
    * Gets the query definition itself.
    */
  public get query(): QueryDefinition {
    return this;
  }
}
