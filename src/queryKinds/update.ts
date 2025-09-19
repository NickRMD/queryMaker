import CteMaker, { Cte } from "../cteMaker.js";
import Statement from "../statementMaker.js";
import Join from "../types/Join.js";
import SetValue from "../types/SetValue";
import QueryDefinition from "./query.js";

/**
  * UpdateQuery class is used to build SQL UPDATE queries.
  * It provides methods to specify the table to update, set values, add joins, and define conditions.
  * The class supports Common Table Expressions (CTEs) and returning clauses.
  * It extends the QueryDefinition class to inherit common query functionalities.
  */
export default class UpdateQuery extends QueryDefinition {
  /** The table to update. */
  private table: string;
  private tableAlias: string | null = null;
  /** Optional USING clause table. */
  private usingTable: string | null = null;
  private usingAlias: string | null = null;

  /** JOIN clauses for the update. */
  private joins: Join[] = [];
  /** SET values for the update. */
  private setValues: SetValue[] = [];
  /** WHERE clause statement. */
  private whereStatement: Statement | null = null;
  /** RETURNING fields. */
  private returningFields: string[] = [];
  /** The final built SQL query string. */
  private builtQuery: string | null = null;
  /** Optional Common Table Expressions (CTEs) for the query. */
  private ctes: CteMaker | null = null;

  /**
    * Creates an instance of UpdateQuery.
    * @param table - The name of the table to update.
    * @param alias - An optional alias for the table.
    */
  constructor(table?: string, alias?: string) {
    super();
    this.table = table || '';
    this.tableAlias = alias || null;
  }

  /**
    * Adds Common Table Expressions (CTEs) to the query.
    * Accepts a CteMaker instance, a single Cte, or an array of Ctes.
    * @param ctes - The CTEs to be added to the query.
    * @returns The current UpdateQuery instance for method chaining.
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
    * Specifies the table to update and an optional alias.
    * @param table - The name of the table.
    * @param alias - An optional alias for the table.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public from(table: string, alias: string | null = null): this {
    this.table = table;
    this.tableAlias = alias;
    return this;
  }

  /**
    * Specifies the USING clause table and an optional alias.
    * @param table - The name of the table for the USING clause.
    * @param alias - An optional alias for the USING table.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public using(table: string, alias: string | null = null): this {
    this.usingTable = table;
    this.usingAlias = alias;
    return this;
  }

  /**
    * Adds JOIN clauses to the update query.
    * Accepts either a single Join object or an array of Join objects.
    * @param join - The JOIN clause(s) to be added.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public join(join: Join | Join[]): this {
    if (Array.isArray(join)) {
      this.joins.push(...join);
    } else {
      this.joins.push(join);
    }
    return this;
  }

  /**
    * Specifies the SET values for the update.
    * Accepts either a single SetValue object or an array of SetValue objects.
    * @param values - The SET value(s) to be added.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public set(values: SetValue | SetValue[]): this {
    if (Array.isArray(values)) {
      this.setValues = values
        .filter(v => v.value !== undefined)
        .map(v => ({ ...v, value: v.value ?? null }));
    } else if (values.value !== undefined) {
      this.setValues = [values ?? null];
    }
    return this;
  }

  /**
    * Adds a SET clause with a value from another column or expression.
    * Example: addSet('column1', 'column2 + 1') results in "SET column1 = column2 + 1".
    * @param column - The column to be set.
    * @param from - The column or expression to set the value from.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public addSet(column: string, from: string): this {
    this.setValues.push({ setColumn: column, from });
    return this;
  }

  /**
    * Adds a SET clause with a direct value.
    * Example: addSetValue('column1', 42) results in "SET column1 = $1" with 42 as a parameter.
    * @param column - The column to be set.
    * @param value - The value to set the column to.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public addSetValue(column: string, value: any): this {
    this.setValues.push({ setColumn: column, value });
    return this;
  }

  /**
    * Specifies the WHERE clause for the update.
    * Accepts either a Statement object or a raw SQL string with optional parameters.
    * @param statement - The WHERE clause as a Statement or raw SQL string.
    * @param values - Optional parameters for the raw SQL string.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public where(statement: Statement | string, ...values: any[]): this {
    if (typeof statement === 'string') {
      statement = new Statement().raw('', statement, ...values);
    }
    
    this.whereStatement = statement;
    return this;
  }

  /**
    * Allows using a callback to build the WHERE clause with a Statement object.
    * Example: useStatement(stmt => stmt.raw('id = $1', 42)) results in "WHERE id = $1" with 42 as a parameter.
    * @param statement - A callback function that receives a Statement object.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public useStatement(statement: (stmt: Statement) => Statement | void): this {
    const stmt = new Statement();
    const newStmt = statement(stmt) || stmt;
    return this.where(newStmt);
  }

  /**
    * Specifies the RETURNING fields for the update.
    * Accepts either a single field name or an array of field names.
    * @param fields - The field(s) to be returned after the update.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public returning(fields: string | string[]): this {
    if (Array.isArray(fields)) {
      this.returningFields.push(...fields);
    } else {
      this.returningFields.push(fields);
    }
    return this;
  }

  /**
    * Builds the final SQL UPDATE query string and collects the parameters.
    * It handles CTEs, SET clauses, JOINs, WHERE conditions, and RETURNING fields.
    * The method ensures proper parameter indexing and returns the query text and values.
    * @param deepAnalysis - If true, performs a deeper analysis for duplicate parameters.
    * @returns An object containing the built query text and its parameters.
    * @throws Error if no table or SET values are specified.
    */
  public build(deepAnalysis: boolean = false): { text: string; values: any[] } {
    if (this.table.trim() === '') {
      throw new Error('No table specified for UPDATE query.');
    }

    if (this.setValues.length === 0) {
      throw new Error('No SET values specified for UPDATE query.');
    }

    this.whereStatement = this.whereStatement || new Statement();

    let ctesClause = '';
    let cteValues: any[] = [];
    let offset = 0;
    if (this.ctes) {
      const ctesBuilt = this.ctes.build();
      ctesClause = ctesBuilt.text;
      cteValues = ctesBuilt.values;
      this.whereStatement?.addOffset(cteValues.length);
      offset += cteValues.length;
    }

    let updateClause = `UPDATE ${this.table}`;
    if (this.tableAlias) {
      updateClause += ` ${this.tableAlias}`;
    }

    let setClause = 'SET ';
    const setParts: string[] = [];
    const setValues: any[] = [];
    this.setValues.forEach((sv) => {
      if (sv.value !== undefined) {
        offset += 1;
        setParts.push(`${sv.setColumn} = $${offset}`);
        this.whereStatement?.addOffset(1);
        setValues.push(sv.value);
      } else if (sv.from !== undefined) {
        setParts.push(`${sv.setColumn} = ${sv.from}`);
      } else {
        throw new Error(`SET value for column ${sv.setColumn} must have either 'value' or 'from' defined.`);
      }
    });
    setClause += setParts.join(', ');

    let usingClause = '';
    if (this.usingTable) {
      usingClause = `FROM ${this.usingTable}`;
      if (this.usingAlias) {
        usingClause += ` ${this.usingAlias}`;
      }
    }

    if(usingClause === '' && this.joins.length > 0) {
      throw new Error('JOINs require a USING clause in UPDATE queries.');
    }

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

    let returningClause = '';
    if (this.returningFields.length > 0) {
      returningClause = `RETURNING ${this.returningFields.join(', ')}`;
    }

    this.builtQuery = [
      ctesClause,
      updateClause,
      setClause,
      usingClause,
      joinClauses,
      whereClause,
      returningClause
    ].filter(part => part !== '')
      .join('\n');

    const allValues = [...cteValues, ...setValues, ...values];
    const analyzed = this.reAnalyzeParsedQueryForDuplicateParams(this.builtQuery, allValues, deepAnalysis);
    this.builtQuery = analyzed.text;
    return { text: this.builtQuery, values: analyzed.values };
  }

  /**
    * Returns the built SQL query string.
    * If the query is not yet built, it triggers the build process.
    * @returns The SQL query string.
    */
  public toSQL(): string {
    return this.build().text;
  }

  /**
    * Indicates whether the query has been built.
    * Returns true if the builtQuery property is not null.
    * @returns A boolean indicating if the query is built.
    */
  public get isDone(): boolean {
    return this.builtQuery !== null;
  }

  /**
    * This an UPDATE query.
    * @returns The string 'UPDATE'.
    */
  public get kind(): 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' {
    return 'UPDATE';
  }

  /**
    * Provides access to the current query definition instance.
    * @returns The current UpdateQuery instance.
    */
  public get query(): QueryDefinition {
    return this;
  }

  /**
    * Invalidates the current state of the query definition, forcing a rebuild on the next operation.
    * It also invalidates any associated WHERE statements and CTE queries.
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
    * Resets the query definition to its initial state.
    * Clears all properties related to the query configuration.
    * @returns void
    */
  public reset(): void {
    this.table = '';
    this.tableAlias = null;
    this.usingTable = null;
    this.usingAlias = null;
    this.joins = [];
    this.setValues = [];
    this.whereStatement = null;
    this.returningFields = [];
    this.builtQuery = null;
    this.ctes = null;
  }

  /**
    * Retrieves the parameters associated with the query.
    * If the query is not yet built, it triggers the build process.
    * @returns An array of parameters for the query.
    */
  public getParams(): any[] {
    return this.build().values;
  }

  /**
    * Creates a deep copy of the current UpdateQuery instance.
    * This is useful for preserving the current state of the query while making modifications to a clone.
    * @returns A new UpdateQuery instance that is a clone of the current instance.
    */
  public clone(): UpdateQuery {
    const cloned = new UpdateQuery(this.table, this.tableAlias || undefined);
    cloned.usingTable = this.usingTable;
    cloned.usingAlias = this.usingAlias;
    cloned.joins = JSON.parse(JSON.stringify(this.joins));
    cloned.setValues = JSON.parse(JSON.stringify(this.setValues));
    cloned.whereStatement = this.whereStatement ? this.whereStatement.clone() : null;
    cloned.returningFields = [...this.returningFields];
    cloned.ctes = this.ctes ? new CteMaker(...this.ctes['ctes']) : null;
    return cloned;
  }

}
