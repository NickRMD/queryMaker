import Statement from "../../statementMaker.js";
import QueryKind from "../../types/QueryKind.js";
import OrderBy from "../../types/OrderBy.js";
import QueryDefinition from "./query.js";
import SelectQuery from "./select.js";
import SqlEscaper from "../../sqlEscaper.js";

/** Allowed types for UnionType */
export const UnionTypes = {
  UNION: "UNION",
  UNION_ALL: "UNION ALL",
  INTERSECT: "INTERSECT",
  INTERSECT_ALL: "INTERSECT ALL",
  EXCEPT: "EXCEPT",
  EXCEPT_ALL: "EXCEPT ALL",
} as const;

/** Array of allowed union types for validation */
const unionTypesArray = Object.values(UnionTypes);

/** Base types for UnionType */
type UnionTypeBase = typeof UnionTypes[keyof typeof UnionTypes];

/**
  * UnionType represents the type of SQL UNION operation.
  */
export type UnionType = Lowercase<UnionTypeBase> | UnionTypeBase;

/**
  * Type representing a SELECT query along with its associated union type.
  */
export type SelectQueryWithUnionType = {
  query: SelectQuery;
  type: UnionType;
};

/**
  * Union class represents a SQL UNION operation.
  * It allows combining multiple SELECT queries into a single result set.
  * It is basically a wrapper around multiple SelectQuery instances that
  * creates a SELECT query that is the union of all the provided queries.
  * It supports adding queries with different union types (UNION or UNION ALL)
  * and can optionally assign an alias to the resulting union query.
  */
export default class Union extends QueryDefinition {

  private selectFields: string[] = [];

  /** Needed alias for the union query */
  private unionAlias: string | null = null;

  /** Limit count for the union query */
  private limitCount: number | null = null;

  /** Offset count for the union query */
  private offsetCount: number | null = null;

  /** Array of SelectQuery instances and their corresponding union types */
  private selectQueries: SelectQueryWithUnionType[] = [];

  /** Order by clauses for the union query */
  private orderBys: OrderBy[] = [];

  /** Group by clauses for the union query */
  private groupBys: string[] = [];

  /** Having statement for the union query */
  private havingStatement: Statement | null = null;

  /**
    * Make the union without selecting from it
    * Useful when the raw union is needed as a subquery
    * @returns An object containing the raw SQL text of the union and its parameter values.
    */
  public rawUnion(): { text: string; values: any[] } {
    if (this.selectQueries.length === 0) {
      throw new Error('No SELECT queries added to the UNION.');
    }

    let unionItself: string = '';
    const values: any[] = [];

    let paramOffset = 1;
    for (const { query, type } of this.selectQueries) {
      (query as any).disabledAnalysis = true;
      query.resetWhereOffset();
      let builtQuery = query.addWhereOffset(paramOffset - 1).build();
      unionItself += (unionItself ? `\n\n${type}\n\n` : '') + `${builtQuery.text}`;
      paramOffset += builtQuery.values.length;
      values.push(...builtQuery.values);
    }

    const analyzed = this.reAnalyzeParsedQueryForDuplicateParams(
      unionItself,
      values,
      false
    );

    return {
      text: analyzed.text,
      values: analyzed.values
    };
  }

  /**
    * Specifies the fields to select in the union query.
    * If not called, defaults to selecting all fields ('*').
    * @param fields A single field name or an array of field names to select.
    * @returns The current Union instance for method chaining.
    */
  public select(fields: string | string[]): Union {
    if (Array.isArray(fields)) {
      this.rawSelect(SqlEscaper.escapeSelectIdentifiers(fields, this.flavor));
    } else {
      this.rawSelect(SqlEscaper.escapeSelectIdentifiers([fields], this.flavor));
    }
    return this;
  }

  /**
    * Adds fields to the existing selection in the union query.
    * If no fields have been selected yet, this behaves like the select() method.
    * @param fields A single field name or an array of field names to add to the selection.
    * @returns The current Union instance for method chaining.
    */
  public addSelect(fields: string | string[]): Union {
    if (Array.isArray(fields)) {
      this.addRawSelect(SqlEscaper.escapeSelectIdentifiers(fields, this.flavor));
    } else {
      this.addRawSelect(SqlEscaper.escapeSelectIdentifiers([fields], this.flavor));
    }
    return this;
  }

  /**
    * Specifies raw fields to select in the union query without any escaping.
    * Use this method with caution, as it does not perform any SQL injection protection.
    * @param fields A single raw field string or an array of raw field strings to select.
    * @returns The current Union instance for method chaining.
    */
  public rawSelect(fields: string | string[]): Union {
    if (Array.isArray(fields)) {
      this.selectFields = fields;
    } else {
      this.selectFields = [fields];
    }
    return this;
  }

  /**
    * Adds raw fields to the existing selection in the union query without any escaping.
    * Use this method with caution, as it does not perform any SQL injection protection.
    * If no fields have been selected yet, this behaves like the rawSelect() method.
    * @param fields A single raw field string or an array of raw field strings to add to the selection.
    * @returns The current Union instance for method chaining.
    */
  public addRawSelect(fields: string | string[]): Union {
    if (Array.isArray(fields)) {
      this.selectFields.push(...fields);
    } else {
      this.selectFields.push(fields);
    }
    return this;
  }

  /**
    * Assigns an alias to the resulting union query.
    * @param alias The alias to assign to the union query.
    * @returns The current Union instance for method chaining.
    */
  public as(alias: string): Union {
    this.unionAlias = alias;
    return this;
  }

  /**
    * Adds a SELECT query to the union with the specified union type.
    * @param query The SelectQuery instance to add to the union.
    * @param type The type of union operation ('UNION' or 'UNION ALL'). Defaults to 'UNION ALL'.
    * @returns The current Union instance for method chaining.
    * @throws Error if an invalid union type is provided.
    */
  public add(query: SelectQuery, type: UnionType = 'UNION ALL'): Union {
    type = type.toUpperCase() as UnionTypeBase;
    if (!unionTypesArray.includes(type))
      throw new Error("Invalid union type. Only 'UNION' and 'UNION ALL' are allowed.");

    this.selectQueries.push({ query, type });
    return this;
  }

  /**
    * Adds multiple SELECT queries to the union.
    * @param queries An array of objects containing SelectQuery instances and their corresponding union types.
    * @returns The current Union instance for method chaining.
    */
  public addMany(queries: SelectQueryWithUnionType[]): Union {
    queries.forEach(({ query, type }) => {
      this.add(query, type);
    });
    return this;
  }

  /**
    * Adds multiple SELECT queries to the union of the same union type.
    * @param queries An array of SelectQuery instances to add to the union.
    * @param type The type of union operation ('UNION' or 'UNION ALL'). Defaults to 'UNION ALL'.
    * @returns The current Union instance for method chaining.
    */
  public addManyOfType(queries: SelectQuery[], type: UnionType = 'UNION ALL'): Union {
    queries.forEach((query) => {
      this.add(query, type);
    });
    return this;
  }

  /**
    * Adds a WHERE clause to the union query.
    * @param statement The WHERE clause as a Statement instance or a raw SQL string.
    * @param values Optional parameter values if a raw SQL string is provided.
    * @returns The current Union instance for method chaining.
    */
  public where(statement: Statement | string, ...values: any[]): Union {
    if (typeof statement === 'string') {
      statement = new Statement().raw('', statement, ...values);
    }
    this.whereStatement = statement;
    return this;
  }

  /**
    * Adds a WHERE clause to the union query using a callback function.
    * The callback function receives a Statement instance to build the WHERE clause.
    * @param statement A callback function that takes a Statement instance and returns a Statement or void.
    * @returns The current Union instance for method chaining.
    */
  public useStatement(statement: (stmt: Statement) => Statement | void): Union {
    const stmt = new Statement();
    const newStatement = statement(stmt) || stmt;

    this.whereStatement = newStatement;
    return this;
  }

  /**
    * Sets a LIMIT on the number of rows returned by the union query.
    * @param limit The maximum number of rows to return. Must be a non-negative integer.
    * @returns The current Union instance for method chaining.
    * @throws Error if the limit is negative or not an integer.
    */
  public limit(limit: number): Union {
    if (limit < 0 || !Number.isInteger(limit)) {
      throw new Error('Limit must be a non-negative integer.');
    }
    this.limitCount = limit;
    return this;
  }

  /**
    * Sets an OFFSET for the union query.
    * @param offset The number of rows to skip before starting to return rows. Must be a non-negative integer.
    * @returns The current Union instance for method chaining.
    * @throws Error if the offset is negative or not an integer.
    */
  public offset(offset: number): Union {
    if (offset < 0 || !Number.isInteger(offset)) {
      throw new Error('Offset must be a non-negative integer.');
    }
    this.offsetCount = offset;
    return this;
  }

  /**
    * Sets both LIMIT and OFFSET for the union query.
    * @param limit The maximum number of rows to return. Must be a non-negative integer.
    * @param offset The number of rows to skip before starting to return rows. Must be a non-negative integer.
    * @returns The current Union instance for method chaining.
    * @throws Error if the limit or offset is negative or not an integer.
    */
  public limitAndOffset(limit: number, offset: number): Union {
    return this.limit(limit).offset(offset);
  }

  /**
    * Sets the ORDER BY clauses for the union query, replacing any existing clauses.
    * @param orderBy A single OrderBy object or an array of OrderBy objects.
    * @returns The current Union instance for method chaining.
    */
  public orderBy(orderBy: OrderBy | OrderBy[]): Union {
    if (Array.isArray(orderBy)) {
      this.orderBys = orderBy
    } else {
      this.orderBys = [orderBy];
    }
    return this;
  }

  /**
    * Adds ORDER BY clauses to the union query without replacing existing clauses.
    * @param orderBy A single OrderBy object or an array of OrderBy objects to add.
    * @returns The current Union instance for method chaining.
    */
  public addOrderBy(orderBy: OrderBy | OrderBy[]): Union {
    if (Array.isArray(orderBy)) {
      this.orderBys.push(...orderBy)
    } else {
      this.orderBys.push(orderBy);
    }
    return this;
  }

  /**
    * Sets the GROUP BY clauses for the union query, replacing any existing clauses.
    * @param field A single field name or an array of field names to group by.
    * @returns The current Union instance for method chaining.
    */
  public groupBy(field: string | string[]): Union {
    if (Array.isArray(field)) {
      this.groupBys = field
    } else {
      this.groupBys = [field];
    }
    return this;
  }

  /**
    * Adds GROUP BY clauses to the union query without replacing existing clauses.
    * @param field A single field name or an array of field names to add to the GROUP BY clause.
    * @returns The current Union instance for method chaining.
    */
  public addGroupBy(field: string | string[]): Union {
    if (Array.isArray(field)) {
      this.groupBys.push(...field)
    } else {
      this.groupBys.push(field);
    }
    return this;
  }

  /**
    * Adds a HAVING clause to the union query.
    * @param statement The HAVING clause as a Statement instance or a raw SQL string.
    * @param values Optional parameter values if a raw SQL string is provided.
    * @returns The current Union instance for method chaining.
    */
  public having(statement: Statement | string, ...values: any[]): Union {
    if (typeof statement === 'string') {
      statement = new Statement().raw('', statement, ...values);
    }
    this.havingStatement = statement;
    return this;
  }

  /**
    * Adds a HAVING clause to the union query using a callback function.
    * The callback function receives a Statement instance to build the HAVING clause.
    * @param statement A callback function that takes a Statement instance and returns a Statement or void.
    * @returns The current Union instance for method chaining.
    */
  public useHavingStatement(statement: (stmt: Statement) => Statement | void): Union {
    const stmt = new Statement();
    const newStatement = statement(stmt) || stmt;

    this.havingStatement = newStatement;
    return this;
  }

  /**
    * Builds the final SQL query for the union operation.
    * It combines all added SELECT queries with their respective union types,
    * applies any WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, and OFFSET clauses,
    * and returns the complete SQL text along with the parameter values.
    * @param deepAnalysis If true, performs a deep analysis to re-index parameters. Defaults to false.
    * @returns An object containing the final SQL text and an array of parameter values.
    * @throws Error if no SELECT queries have been added to the union.
    */
  public build(deepAnalysis: boolean = false): { text: string; values: any[] } {
    if (this.selectQueries.length === 0) {
      throw new Error('No SELECT queries added to the UNION.');
    }

    let unionItself: string = '';
    const values: any[] = [];

    let selectClause = '';
    if (this.selectFields.length > 0) {
      selectClause = this.selectFields.join(',\n ');
    } else {
      selectClause = '*';
    }

    // Add offset on each select query to ensure correct parameter indexing
    let paramOffset = 1;
    for (const { query, type: unionType } of this.selectQueries) {
      (query as any).disabledAnalysis = true;
      query.resetWhereOffset();
      let builtQuery = query.addWhereOffset(paramOffset - 1).build();
      builtQuery.text = this.spaceLines(`(${builtQuery.text})`, 1);
      const type = this.spaceLines(unionType, 1);
      unionItself += (unionItself ? `\n\n${type}\n\n` : '') + `${builtQuery.text}`;
      paramOffset += builtQuery.values.length;
      values.push(...builtQuery.values);
    }

    let whereClause = '';
    let whereValues: any[] = [];
    if (this.whereStatement) {
      const builtWhere = this.whereStatement
        .enableWhere()
        .setOffset(paramOffset)
        .build();
      whereClause = builtWhere.statement;
      whereValues = builtWhere.values;
    }

    let groupByClause = '';
    if (this.groupBys.length > 0) {
      groupByClause = 'GROUP BY ' + this.groupBys.map(gb => `"${gb}"`).join(', ');
    }

    let havingClause = '';
    let havingValues: any[] = [];
    if (this.havingStatement) {
      const builtHaving = this.havingStatement
        .disableWhere()
        .setOffset(paramOffset + whereValues.length)
        .build();
      havingClause = 'HAVING ' + builtHaving.statement;
      havingValues = builtHaving.values;
    }

    let orderByClause = '';
    if (this.orderBys.length > 0) {
      orderByClause = 'ORDER BY ' + this.orderBys.map(ob => {
        const direction = ob.direction ? ` ${ob.direction.toUpperCase()}` : '';
        return `"${(ob as any).field || (ob as any).column}"${direction}`;
      }).join(', ');
    }

    let limitClause = '';
    if (this.limitCount !== null) {
      limitClause = `LIMIT ${this.limitCount}`;
    }

    let offsetClause = '';
    if (this.offsetCount !== null) {
      offsetClause = `OFFSET ${this.offsetCount}`;
    }

    const firstLine =
      `SELECT${selectClause.length > 1 ? '\n' : ''} ${selectClause}${selectClause.length > 1 ? '\n' : ''} FROM (`;

    const union = [
      firstLine,
      `${unionItself}\n) AS ${this.unionAlias || 'union_subquery'}`,
      whereClause,
      groupByClause,
      havingClause,
      orderByClause,
      limitClause,
      offsetClause
    ].filter(part => part.trim() !== '').join('\n');

    const finalValues = [...values, ...whereValues, ...havingValues]; 

    const analyzed = this.reAnalyzeParsedQueryForDuplicateParams(
      union,
      finalValues,
      deepAnalysis
    );

    this.builtQuery = analyzed.text;
    this.builtParams = analyzed.values;

    return {
      text: this.builtQuery,
      values: this.builtParams
    };
  }

  /**
    * Generates the SQL string for the union query.
    * If the query has not been built yet, it will build it first.
    * @returns The SQL string of the union query.
    * @throws Error if the query fails to build.
    */
  public toSQL(): string {
    if(!this.builtQuery) this.build();
    if(!this.builtQuery) throw new Error("Failed to build the query.");
    return this.builtQuery;
    
  }

  /**
    * Retrieves the parameter values for the union query.
    * If the query has not been built yet, it will build it first.
    * @returns An array of parameter values for the union query.
    * @throws Error if the query fails to build.
    */
  public getParams(): any[] {
    if(!this.builtParams) this.build();
    if(!this.builtParams) throw new Error("Failed to build the query.");
    return this.builtParams;
  }

  /**
    * Creates a deep clone of the current Union instance.
    * This includes cloning all properties and nested objects to ensure
    * that modifications to the clone do not affect the original instance.
    * @returns A new Union instance that is a deep clone of the current instance.
    */
  public clone(): Union {
    const newUnion = new Union();
    newUnion.selectFields = [...this.selectFields];
    newUnion.flavor = this.flavor;
    newUnion.unionAlias = this.unionAlias;
    newUnion.limitCount = this.limitCount;
    newUnion.offsetCount = this.offsetCount;
    newUnion.schemas = [...this.schemas];
    newUnion.selectQueries = this.selectQueries.map(sq => ({
      query: sq.query.clone() as SelectQuery,
      type: sq.type
    }));
    newUnion.orderBys = [...this.orderBys];
    newUnion.groupBys = [...this.groupBys];
    newUnion.havingStatement = this.havingStatement ? this.havingStatement.clone() : null;
    newUnion.whereStatement = this.whereStatement ? this.whereStatement.clone() : null;
    return newUnion;
  }

  /**
    * Resets the internal state of the Union instance.
    * This clears all properties, including the union alias, limit, offset,
    * select queries, order by clauses, group by clauses, having statement,
    * where statement, built query, built parameters, and schemas.
    * After calling this method, the Union instance will be in its initial state.
    */
  public reset(): void {
    this.selectFields = [];
    this.unionAlias = null;
    this.limitCount = null;
    this.offsetCount = null;
    this.selectQueries = [];
    this.orderBys = [];
    this.groupBys = [];
    this.havingStatement = null;
    this.whereStatement = null;
    this.builtQuery = null;
    this.builtParams = null;
    this.schemas = [];
  }

  /**
    * This is a UNION query.
    * @returns The kind of SQL operation, which is 'UNION' for this class.
    */
  public get kind() {
    return QueryKind.UNION;
  }

}

