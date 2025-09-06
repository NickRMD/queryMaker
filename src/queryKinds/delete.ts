import CteMaker, { Cte } from "../cteMaker.js";
import Statement from "../statementMaker.js";
import UsingTable from "../types/UsingTable.js";
import QueryDefinition from "./query.js";

export default class DeleteQuery extends QueryDefinition {
  private deletingFrom: string;
  private deletingFromAlias: string | null = null;
  private usingTables: UsingTable[] = [];
  private whereStatement: Statement | null = null;
  private returningFields: string[] = [];
  private builtQuery: string | null = null;
  private ctes: CteMaker | null = null;

  constructor(from?: string, alias: string | null = null) {
    super();
    this.deletingFrom = from || '';
    this.deletingFromAlias = alias;
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
    this.deletingFrom = table;
    this.deletingFromAlias = alias;
    return this;
  }

  public using(tables: string | UsingTable | UsingTable[]): this {
    if (Array.isArray(tables)) {
      this.usingTables.push(...tables);
    } else if (typeof tables === 'string') {
      const tableParts = tables.split(' ');
      if (tableParts[0] && tableParts[0]?.trim() !== '') {
        this.usingTables.push({ table: tableParts[0], alias: tableParts[1] || null });
      } else {
        throw new Error('Invalid table name provided to USING clause.');
      }
    } else {
      this.usingTables.push(tables);
    }
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

  public clone(): DeleteQuery {
    const cloned = new DeleteQuery(this.deletingFrom, this.deletingFromAlias);
    cloned.usingTables = JSON.parse(JSON.stringify(this.usingTables));
    cloned.whereStatement = this.whereStatement ? this.whereStatement.clone() : null;
    cloned.returningFields = [...this.returningFields];
    cloned.ctes = this.ctes ? new CteMaker(...this.ctes['ctes']) : null;
    return cloned;
  }

  public reset(): void {
    this.deletingFrom = '';
    this.deletingFromAlias = null;
    this.usingTables = [];
    this.whereStatement = null;
    this.returningFields = [];
    this.ctes = null;
    this.builtQuery = null;
  }

  public get isDone(): boolean {
    return this.builtQuery !== null;
  }

  public get kind(): 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' {
    return 'DELETE';
  }

  public get query(): DeleteQuery {
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

  public build(deepAnalysis: boolean = false): { text: string; values: any[] } {
    if (!this.deletingFrom) {
      throw new Error('No table specified for DELETE query.');
    }

    this.whereStatement = this.whereStatement || new Statement();

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

    const analyzed = this.reAnalyzeParsedQueryForDuplicateParams(this.builtQuery, values, deepAnalysis);
    this.builtQuery = analyzed.text;
    return { text: this.builtQuery, values: analyzed.values };
  }

  public toSQL(): string {
    if (!this.builtQuery) this.build();
    return this.builtQuery as string;
  }

  public getParams(): any[] {
    if (!this.builtQuery) this.build();
    let params: any[] = [];
    if (this.whereStatement) {
      params = this.whereStatement.params;
    };
    if (this.ctes) {
      params = [...this.ctes.build().values, ...params];
    }
    return params;
  }
}
