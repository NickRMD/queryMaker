import deepEqual from "../deepEqual.js";

interface QueryExecutorObject {
  execute?: (query: string, params: any[]) => Promise<any>;
  query?: (query: string, params: any[]) => Promise<any>;
  run?: (query: string, params: any[]) => Promise<any>;
  all?: (query: string, params: any[]) => Promise<any>;
  get?: (query: string, params: any[]) => Promise<any>;
  manager?: QueryExecutor;
}

type QueryExecutor = QueryExecutorObject | ((query: string, params: any[]) => Promise<any>);

export default abstract class QueryDefinition {
  public abstract toSQL(): string;
  public abstract getParams(): any[];
  public abstract build(deepAnalysis?: boolean): {
    text: string;
    values: any[];
  };
  public abstract clone(): QueryDefinition;
  public abstract reset(): void;
  public abstract get isDone(): boolean;
  public abstract kind: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  public abstract get query(): QueryDefinition;
  public abstract invalidate(): void;
  public buildReanalyze(): { text: string; values: any[] } {
    const query = this.build();
    return this.reAnalyzeParsedQueryForDuplicateParams(query.text, query.values);
  }

  public async execute(
    queryExecutor: QueryExecutor,
    noManager: boolean = false
  ): Promise<any> {
    if (typeof queryExecutor === 'function') {
      return queryExecutor(this.toSQL(), this.getParams());
    }

    if (!noManager && queryExecutor.manager && typeof queryExecutor.manager === 'object') {
      return this.execute(queryExecutor.manager);
    } else if (queryExecutor.execute && typeof queryExecutor.execute === 'function') {
      return queryExecutor.execute(this.toSQL(), this.getParams());
    } else if (queryExecutor.query && typeof queryExecutor.query === 'function') {
      return queryExecutor.query(this.toSQL(), this.getParams());
    } else if (queryExecutor.run && typeof queryExecutor.run === 'function') {
      return queryExecutor.run(this.toSQL(), this.getParams());
    } else if (queryExecutor.all && typeof queryExecutor.all === 'function') {
      return queryExecutor.all(this.toSQL(), this.getParams());
    } else if (queryExecutor.get && typeof queryExecutor.get === 'function') {
      return queryExecutor.get(this.toSQL(), this.getParams());
    } else {
      throw new Error('Invalid query executor provided.');
    }
  }

  // public reAnalyzeParsedQueryForDuplicateParams(query: string, values: any[]): { text: string; values: any[]; } {
  //   const valueMap: Map<any, number> = new Map();
  //   let paramIndex = 1;
  //   let newValues: any[] = [];
  //
  //   const newQuery = query.replace(/\$(\d+)/g, (_, p1) => {
  //     const originalValue = values[parseInt(p1) - 1];
  //     if (valueMap.has(originalValue)) {
  //       return `$${valueMap.get(originalValue)}`;
  //     } else {
  //       valueMap.set(originalValue, paramIndex);
  //       newValues.push(originalValue);
  //       return `$${paramIndex++}`;
  //     }
  //   });
  //
  //   return { text: newQuery, values: newValues };
  // }
  
  protected reAnalyzeParsedQueryForDuplicateParams(
    query: string,
    values: any[],
    useDeepEqual: boolean = false
  ): { text: string; values: any[] } {
    return QueryDefinition.reAnalyzeParsedQueryForDuplicateParams(query, values, useDeepEqual);
  }

  public static reAnalyzeParsedQueryForDuplicateParams(
    query: string,
    values: any[],
    useDeepEqual: boolean = false
  ): { text: string; values: any[] } {
    const valueMap: Map<any, number> = new Map();
    let paramIndex = 1;
    let newValues: any[] = [];

    const newQuery = query.replace(/\$(\d+)/g, (_, p1) => {
      const originalValue = values[parseInt(p1) - 1];
      let foundKey: any = null;

      if (useDeepEqual) {
        for (let [key] of valueMap) {
          if (deepEqual(key, originalValue)) {
            foundKey = key;
            break;
          }
        }
      } else {
        if (valueMap.has(originalValue)) {
          foundKey = originalValue;
        }
      }

      if (foundKey !== null) {
        return `$${valueMap.get(foundKey)}`;
      } else {
        valueMap.set(originalValue, paramIndex);
        newValues.push(originalValue);
        return `$${paramIndex++}`;
      }
    });

    return { text: newQuery, values: newValues };
  }
}
