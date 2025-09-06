import CteMaker, { Cte } from "../cteMaker.js";
import Statement from "../statementMaker.js";
import Join from "../types/Join.js";
import QueryDefinition from "./query.js";

interface SetValue {
  setColumn: string;
  from?: string;
  value?: any;
}

export default class UpdateQuery extends QueryDefinition {
  private table: string;
  private tableAlias: string | null = null;
  private usingTable: string | null = null;
  private usingAlias: string | null = null;
  private joins: Join[] = [];
  private setValues: SetValue[] = [];
  private whereStatement: Statement | null = null;
  private returningFields: string[] = [];
  private builtQuery: string | null = null;
  private ctes: CteMaker | null = null;

  constructor(table?: string, alias?: string) {
    super();
    this.table = table || '';
    this.tableAlias = alias || null;
  }

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

  public from(table: string, alias: string | null = null): this {
    this.table = table;
    this.tableAlias = alias;
    return this;
  }

  public using(table: string, alias: string | null = null): this {
    this.usingTable = table;
    this.usingAlias = alias;
    return this;
  }

  public join(join: Join | Join[]): this {
    if (Array.isArray(join)) {
      this.joins.push(...join);
    } else {
      this.joins.push(join);
    }
    return this;
  }

  public set(values: SetValue | SetValue[]): this {
    if (Array.isArray(values)) {
      this.setValues = values;
    } else {
      this.setValues = [values];
    }
    return this;
  }

  public addSet(column: string, from: string): this {
    this.setValues.push({ setColumn: column, from });
    return this;
  }

  public addSetValue(column: string, value: any): this {
    this.setValues.push({ setColumn: column, value });
    return this;
  }

  public where(statement: Statement | string, ...values: any[]): this {
    if (typeof statement === 'string') {
      statement = new Statement().raw('', statement, ...values);
    }
    
    this.whereStatement = statement;
    return this;
  }

  public useStatement(statement: (stmt: Statement) => Statement): this {
    const newStmt = statement(new Statement());
    return this.where(newStmt);
  }

  public returning(fields: string | string[]): this {
    if (Array.isArray(fields)) {
      this.returningFields.push(...fields);
    } else {
      this.returningFields.push(fields);
    }
    return this;
  }

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


  public toSQL(): string {
    if (!this.builtQuery) this.build();
    return this.builtQuery as string;
  }

  public get isDone(): boolean {
    return this.builtQuery !== null;
  }

  public get kind(): 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' {
    return 'UPDATE';
  }

  public get query(): QueryDefinition {
    return this;
  }

  public invalidate(): void {
    this.builtQuery = null;
    if (this.whereStatement) this.whereStatement.invalidate();
    if (this.ctes) {
      for (const cte of this.ctes['ctes']) {
        cte['query'].invalidate();
      }
    }
  }

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

  public getParams(): any[] {
    if (!this.builtQuery) this.build();
    let params: any[] = [];
    if (this.whereStatement) {
      params = this.whereStatement.params;
    }
    if (this.ctes) {
      params = [...this.ctes.build().values, ...params];
    }
    return params;
  }

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
