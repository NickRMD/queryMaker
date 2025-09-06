import CteMaker, { Cte } from "../cteMaker.js";
import QueryDefinition from "./query.js";
import SelectQuery from "./select.js";

interface ColumnValue {
  column: string;
  value?: any;
}

export default class InsertQuery extends QueryDefinition {
  private table: string;
  private columnValues: ColumnValue[] = [];
  private selectQuery: SelectQuery | null = null;
  private returningFields: string[] = [];
  private builtQuery: string | null = null;
  private ctes: CteMaker | null = null;

  constructor(table?: string) {
    super();
    this.table = table || '';
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

  public into(table: string): this {
    this.table = table;
    return this;
  }

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

  public fromSelect(query: SelectQuery): this {
    this.selectQuery = query;
    return this;
  }

  public returning(fields: string | string[]): this {
    if (Array.isArray(fields)) {
      this.returningFields = fields;
    } else {
      this.returningFields = [fields];
    }
    return this;
  }

  public clone(): QueryDefinition {
    const cloned = new InsertQuery(this.table);
    cloned.columnValues = JSON.parse(JSON.stringify(this.columnValues));
    cloned.selectQuery = this.selectQuery ? this.selectQuery.clone() : null;
    cloned.returningFields = [...this.returningFields];
    cloned.ctes = this.ctes ? new CteMaker(...this.ctes['ctes']) : null;
    return cloned;
  }

  public get kind(): 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' {
    return 'INSERT';
  }

  public get isDone(): boolean {
    return this.builtQuery !== null;
  }

  public get query(): InsertQuery {
    return this;
  }

  public invalidate(): void {
    this.builtQuery = null;
    this.selectQuery?.invalidate();
    if (this.ctes) {
      for (const cte of this.ctes['ctes']) {
        cte['query'].invalidate();
      }
    }
  }

  public reset(): void {
    this.table = '';
    this.columnValues = [];
    this.selectQuery = null;
    this.returningFields = [];
    this.builtQuery = null;
    this.ctes = null;
  }

  public getParams(): any[] {
    if (!this.builtQuery) this.build();
    let params: any[] = [];
    if (this.columnValues.length > 0) {
      params = this.columnValues.map(cv => cv.value);
    } else if (this.selectQuery) {
      params = this.selectQuery.getParams();
    }
    if (this.ctes) {
      params = [...this.ctes.build().values, ...params];
    }
    return params;
  }

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
    if (!this.builtQuery) this.build();
    return this.builtQuery as string;
  }
}
