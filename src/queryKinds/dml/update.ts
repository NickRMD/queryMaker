import CteMaker, { Cte } from "../../cteMaker.js";
import SqlEscaper from "../../sqlEscaper.js";
import Statement from "../../statementMaker.js";
import Join, { isJoinTable } from "../../types/Join.js";
import QueryKind from "../../types/QueryKind.js";
import SetValue from "../../types/SetValue.js";
import DmlQueryDefinition from "./query.js";

/**
  * UpdateQuery class is used to build SQL UPDATE queries.
  * It provides methods to specify the table to update, set values, add joins, and define conditions.
  * The class supports Common Table Expressions (CTEs) and returning clauses.
  * It extends the DmlQueryDefinition class to inherit common query functionalities.
  */
export default class UpdateQuery extends DmlQueryDefinition {
  /** The table to update. */
  private table: string;
  /** Optional alias for the table. */
  private tableAlias: string | null = null;
  /** Optional USING clause table. */
  private usingTable: string | null = null;
  /** Optional alias for the USING table. */
  private usingAlias: string | null = null;

  /** JOIN clauses for the update. */
  private joins: Join[] = [];
  /** SET values for the update. */
  private setValues: SetValue[] = [];
  /** RETURNING fields. */
  private returningFields: string[] = [];

  /**
    * Creates an instance of UpdateQuery.
    * @param table - The name of the table to update.
    * @param alias - An optional alias for the table.
    */
  constructor(table?: string, alias?: string) {
    super();
    this.table = table ? SqlEscaper.escapeTableName(table, this.flavor) : '';
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
    this.table = SqlEscaper.escapeTableName(table, this.flavor);
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
    this.usingTable = SqlEscaper.escapeTableName(table, this.flavor);
    this.usingAlias = alias;
    return this;
  }

  /**
    * Adds JOIN clauses to the update query.
    * Accepts either a single Join object or an array of Join objects.
    * @param join - The JOIN clause(s) to be added.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public join(
    join: Join | Join[] 
  ): this {
    if (Array.isArray(join)) {
      this.joins.push(...join.map(j => this.parseJoinObject(j)));
    } else {
      this.joins.push(this.parseJoinObject(join));
    }
    return this;
  }

  /**
    * Specifies the SET values for the update.
    * Accepts either a single SetValue object or an array of SetValue objects.
    * @param values - The SET value(s) to be added.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public set(values: SetValue | SetValue[] | { [key: string]: any }): this {
    if (Array.isArray(values)) {
      this.setValues = values
        .filter(v => v.value !== undefined)
        .map(v => ({ 
          setColumn: v.setColumn ? SqlEscaper.escapeTableName(v.setColumn, this.flavor) : '', 
          from: v.from ? SqlEscaper.escapeTableName(v.from, this.flavor) : undefined as any,
          value: v.value ?? null 
        }));
    } else if (values?.setColumn && (values?.from || values?.value !== undefined)) {
      this.setValues = [{
        setColumn: values.setColumn ? SqlEscaper.escapeTableName(values.setColumn, this.flavor) : '',
        from: values.from ? SqlEscaper.escapeTableName(values.from, this.flavor) : undefined as any,
        value: values.value ?? null
      }];
    } else if (typeof values === 'object' && !Array.isArray(values)) {
      this.setValues = Object.entries(values).filter(([, val]) => {
        return val !== undefined;
      }).map(([key, val]) => ({
        setColumn: SqlEscaper.escapeTableName(key, this.flavor),
        value: val
      }));
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
    this.setValues.push({ 
      setColumn: SqlEscaper.escapeTableName(column, this.flavor),
      from: SqlEscaper.escapeTableName(from, this.flavor)
    });
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
    this.setValues.push({ 
      setColumn: SqlEscaper.escapeTableName(column, this.flavor),
      value 
    });
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
      this.returningFields = SqlEscaper.escapeSelectIdentifiers(fields, this.flavor);
    } else {
      this.returningFields = SqlEscaper.escapeSelectIdentifiers([fields], this.flavor);
    }
    return this;
  }

  /**
    * Adds additional RETURNING fields to the update.
    * Accepts either a single field name or an array of field names.
    * @param field - The field(s) to be added to the RETURNING clause.
    * @returns The current UpdateQuery instance for method chaining.
    */
  public addReturning(field: string | string[]): this {
    if (Array.isArray(field)) {
      this.returningFields.push(...SqlEscaper.escapeSelectIdentifiers(field, this.flavor));
    } else {
      this.returningFields.push(...SqlEscaper.escapeSelectIdentifiers([field], this.flavor));
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
    this.whereStatement?.setOffset(1);

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
    let currentOffset = setValues.length + cteValues.length;
    let parametersToAdd: any = [];
    for (const join of this.joins) {
      if(isJoinTable(join)) {
        const onClause = 
          typeof join.on === 'string' ? join.on
          : (() => {
              join.on.disableWhere();
              join.on.addOffset(currentOffset);
              const stmt = join.on.build(false);
              currentOffset += stmt.values.length;
              parametersToAdd.push(...stmt.values);
              return stmt.statement;
            })();
        joinClauses += 
          `${joinClauses ? '\n' : ''}${join.type.toUpperCase()} JOIN ${join.table} ${join.alias}\n ON ${onClause}`;
      } else {
        join.subQuery.resetWhereOffset();
        join.subQuery.addWhereOffset(currentOffset);
        (join.subQuery as any).disabledAnalysis = true;
        const subQueryBuilt = join.subQuery.build(deepAnalysis);
        (join.subQuery as any).disabledAnalysis = false;
        currentOffset += subQueryBuilt.values.length;
        parametersToAdd.push(...subQueryBuilt.values);
        const onClause = 
          typeof join.on === 'string' ? join.on
          : (() => {
              join.on.disableWhere();
              join.on.addOffset(currentOffset);
              const stmt = join.on.build(false);
              currentOffset += stmt.values.length;
              parametersToAdd.push(...stmt.values);
              return stmt.statement;
            })();
        subQueryBuilt.text = this.spaceLines(subQueryBuilt.text, 1);
        joinClauses += 
          `${joinClauses ? '\n' : ''}${join.type.toUpperCase()} JOIN (\n${subQueryBuilt.text}\n) ${join.alias}\n ON ${onClause}`;
      }
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

    this.builtQuery = SqlEscaper.appendSchemas(
      this.builtQuery, this.schemas
    );

    const allValues = [...cteValues, ...setValues, ...values];

    const analyzed = this.reAnalyzeParsedQueryForDuplicateParams(this.builtQuery, allValues, deepAnalysis);
    this.builtQuery = analyzed.text;
    this.builtParams = analyzed.values;
    return { text: this.builtQuery, values: this.builtParams };
  }

  /**
    * Returns the built SQL query string.
    * If the query is not yet built, it triggers the build process.
    * @returns The SQL query string.
    */
  public toSQL(): string {
    if (!this.builtQuery) this.build();
    if (!this.builtQuery) throw new Error('Failed to build the SQL query.');
    return this.builtQuery;
  }

  /**
    * This an UPDATE query.
    * @returns The string 'UPDATE'.
    */
  public get kind() {
    return QueryKind.UPDATE;
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
    this.schemas = [];
  }

  /**
    * Retrieves the parameters associated with the query.
    * If the query is not yet built, it triggers the build process.
    * @returns An array of parameters for the query.
    */
  public getParams(): any[] {
    if (!this.builtParams) this.build();
    if (!this.builtParams) throw new Error('Failed to build the SQL query.');
    return this.builtParams;
  }

  /**
    * Creates a deep copy of the current UpdateQuery instance.
    * This is useful for preserving the current state of the query while making modifications to a clone.
    * @returns A new UpdateQuery instance that is a clone of the current instance.
    */
  public clone(): UpdateQuery {
    const cloned = new UpdateQuery();
    cloned.table = this.table;
    cloned.tableAlias = this.tableAlias;
    cloned.flavor = this.flavor;
    cloned.schemas = [...this.schemas];
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
