import deepEqual from "../deepEqual.js";

/*
  * QueryExecutorObject interface defines the structure for an object that can execute SQL queries.
  * It includes optional methods for executing queries in different ways, as well as an optional manager property.
  */
interface QueryExecutorObject {
  execute?: (query: string, params: any[]) => Promise<any>;
  query?: (query: string, params: any[]) => Promise<any>;
  run?: (query: string, params: any[]) => Promise<any>;
  all?: (query: string, params: any[]) => Promise<any>;
  get?: (query: string, params: any[]) => Promise<any>;
  manager?: QueryExecutor;
}

/*
  * QueryExecutor type can be either a QueryExecutorObject or a function that executes a query.
  */
type QueryExecutor = QueryExecutorObject | ((query: string, params: any[]) => Promise<any>);

/*
  * Abstract class QueryDefinition serves as a blueprint for different types of SQL query definitions.
  * It defines the essential methods and properties that any concrete query class must implement.
  * This includes methods for building the SQL query, executing it, cloning the query definition,
  * resetting its state, and checking if the query is complete.
  * The class also provides a method to re-analyze the query for duplicate parameters to optimize parameter usage.
  */
export default abstract class QueryDefinition {

  /*
    * Converts the query definition to its SQL string representation.
    */
  public abstract toSQL(): string;

  /*
    * Retrieves the parameters associated with the query.
    */
  public abstract getParams(): any[];

  /*
    * Builds the SQL query and returns an object containing the query text and its parameters.
    * The optional deepAnalysis parameter can be used to control the depth of analysis during the build process.
    */
  public abstract build(deepAnalysis?: boolean): {
    text: string;
    values: any[];
  };

  /*
    * Creates a deep copy of the current query definition.
    */
  public abstract clone(): QueryDefinition;

  /*
    * Resets the query definition to its initial state.
    */
  public abstract reset(): void;

  /*
    * Indicates whether the query definition is complete and ready for execution.
    */
  public abstract get isDone(): boolean;

  /*
    * The kind of SQL operation represented by the query definition.
    * It can be one of 'INSERT', 'UPDATE', 'DELETE', or 'SELECT'.
    */
  public abstract kind: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';

  /*
    * Provides access to the current query definition instance.
    */
  public abstract get query(): QueryDefinition;

  /*
    * Invalidates the current state of the query definition, forcing a rebuild on the next operation.
    */
  public abstract invalidate(): void;

  /*
    * Builds the SQL query and re-analyzes it for duplicate parameters.
    * This method ensures that the query is optimized by removing redundant parameters.
    */
  public buildReanalyze(): { text: string; values: any[] } {
    const query = this.build();
    return this.reAnalyzeParsedQueryForDuplicateParams(query.text, query.values);
  }

  /*
    * Executes the built SQL query using the provided query executor.
    * The query executor can be a function or an object with methods to execute the query.
    * The optional noManager parameter can be used to bypass the manager property if present.
    */
  public async execute(
    queryExecutor: QueryExecutor,
    noManager: boolean = false
  ): Promise<any> {
    if (typeof queryExecutor === 'function') {
      return queryExecutor(this.toSQL(), this.getParams());
    }

    if (!noManager && queryExecutor?.manager && typeof queryExecutor?.manager === 'object') {
      return this.execute(queryExecutor.manager);
    } else if (queryExecutor?.execute && typeof queryExecutor?.execute === 'function') {
      return queryExecutor.execute(this.toSQL(), this.getParams());
    } else if (queryExecutor?.query && typeof queryExecutor?.query === 'function') {
      return queryExecutor.query(this.toSQL(), this.getParams());
    } else if (queryExecutor?.run && typeof queryExecutor?.run === 'function') {
      return queryExecutor.run(this.toSQL(), this.getParams());
    } else if (queryExecutor?.all && typeof queryExecutor?.all === 'function') {
      return queryExecutor.all(this.toSQL(), this.getParams());
    } else if (queryExecutor?.get && typeof queryExecutor?.get === 'function') {
      return queryExecutor.get(this.toSQL(), this.getParams());
    } else {
      throw new Error('Invalid query executor provided.');
    }
  }

  /*
    * Builds the SQL query with EXPLAIN ANALYZE prefix for performance analysis.
    * This method is useful for debugging and optimizing SQL queries.
    */
  public buildExplainAnalyze() {
    const query = this.build();
    return {
      text: `EXPLAIN ANALYZE ${query.text}`,
      values: query.values
    }
  }

  /*
    * Builds the SQL query with EXPLAIN prefix for query plan analysis.
    * This method is useful for understanding how the database will execute the query.
    */
  public buildExplain() {
    const query = this.build();
    return {
      text: `EXPLAIN ${query.text}`,
      values: query.values
    }
  }
 
  /*
    * Re-analyzes the parsed SQL query to identify and consolidate duplicate parameters.
    * This method helps optimize the query by reducing the number of parameters used.
    * It can perform deep equality checks if specified.
    */
  protected reAnalyzeParsedQueryForDuplicateParams(
    query: string,
    values: any[],
    useDeepEqual: boolean = false
  ): { text: string; values: any[] } {
    return QueryDefinition.reAnalyzeParsedQueryForDuplicateParams(query, values, useDeepEqual);
  }

  /*
    * Static method to re-analyze a parsed SQL query for duplicate parameters.
    * This method can be used independently of any instance of QueryDefinition.
    */
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
