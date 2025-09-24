import Statement from "../statementMaker.js";
import QueryKind from "../types/QueryKind.js";
import OrderBy from "../types/OrderBy.js";
import QueryDefinition from "./query.js";
import SelectQuery from "./select.js";

type UnionTypeBase = 'UNION' | 'UNION ALL';

export type UnionType = Lowercase<UnionTypeBase> | UnionTypeBase;

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

  public as(alias: string): Union {
    this.unionAlias = alias;
    return this;
  }

  public add(query: SelectQuery, type: UnionType = 'UNION ALL'): Union {
    type = type.toUpperCase() as UnionType;
    if (type !== 'UNION' && type !== 'UNION ALL')
      throw new Error("Invalid union type. Only 'UNION' and 'UNION ALL' are allowed.");

    this.selectQueries.push({ query, type });
    return this;
  }

  public addMany(queries: SelectQueryWithUnionType[]): Union {
    queries.forEach(({ query, type }) => {
      this.add(query, type);
    });
    return this;
  }

  public where(statement: Statement | string, ...values: any[]): Union {
    if (typeof statement === 'string') {
      statement = new Statement().raw('', statement, ...values);
    }
    this.whereStatement = statement;
    return this;
  }

  public useStatement(statement: (stmt: Statement) => Statement | void): Union {
    const stmt = new Statement();
    const newStatement = statement(stmt) || stmt;

    this.whereStatement = newStatement;
    return this;
  }

  public limit(limit: number): Union {
    if (limit < 0 || !Number.isInteger(limit)) {
      throw new Error('Limit must be a non-negative integer.');
    }
    this.limitCount = limit;
    return this;
  }

  public offset(offset: number): Union {
    if (offset < 0 || !Number.isInteger(offset)) {
      throw new Error('Offset must be a non-negative integer.');
    }
    this.offsetCount = offset;
    return this;
  }

  public limitAndOffset(limit: number, offset: number): Union {
    return this.limit(limit).offset(offset);
  }

  public orderBy(orderBy: OrderBy | OrderBy[]): Union {
    if (Array.isArray(orderBy)) {
      this.orderBys = orderBy
    } else {
      this.orderBys = [orderBy];
    }
    return this;
  }

  public addOrderBy(orderBy: OrderBy | OrderBy[]): Union {
    if (Array.isArray(orderBy)) {
      this.orderBys.push(...orderBy)
    } else {
      this.orderBys.push(orderBy);
    }
    return this;
  }

  public groupBy(field: string | string[]): Union {
    if (Array.isArray(field)) {
      this.groupBys = field
    } else {
      this.groupBys = [field];
    }
    return this;
  }

  public addGroupBy(field: string | string[]): Union {
    if (Array.isArray(field)) {
      this.groupBys.push(...field)
    } else {
      this.groupBys.push(field);
    }
    return this;
  }

  public having(statement: Statement | string, ...values: any[]): Union {
    if (typeof statement === 'string') {
      statement = new Statement().raw('', statement, ...values);
    }
    this.havingStatement = statement;
    return this;
  }

  public useHavingStatement(statement: (stmt: Statement) => Statement | void): Union {
    const stmt = new Statement();
    const newStatement = statement(stmt) || stmt;

    this.havingStatement = newStatement;
    return this;
  }

  public build(deepAnalysis: boolean = false): { text: string; values: any[] } {
    if (this.selectQueries.length === 0) {
      throw new Error('No SELECT queries added to the UNION.');
    }

    let unionItself: string = '';
    const values: any[] = [];

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

    const union = [
      'SELECT * FROM (',
      `${unionItself}\n) AS ${this.unionAlias}`,
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

  public toSQL(): string {
    if(!this.builtQuery) this.build();
    if(!this.builtQuery) throw new Error("Failed to build the query.");
    return this.builtQuery;
    
  }

  public getParams(): any[] {
    if(!this.builtParams) this.build();
    if(!this.builtParams) throw new Error("Failed to build the query.");
    return this.builtParams;
  }

  public clone(): Union {
    const newUnion = new Union();
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

  public reset(): void {
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

  public get kind() {
    return QueryKind.UNION;
  }

}

