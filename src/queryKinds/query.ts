import { ValidatorOptions } from "class-validator";
import deepEqual from "../deepEqual.js";
import { getClassValidator, getZod } from "../getOptionalPackages.js";
// Import types only since they are used for type checking only
// and zod is optional peer dependency
import type z from "zod";
import type { ZodObject } from "zod";
import sqlFlavor from "../types/sqlFlavor.js";

/**
  * An array of function names that can be used to execute SQL queries.
  * These functions are commonly found in database client libraries.
  */
const functionNames = ['execute', 'query', 'run', 'all', 'get'] as const;

/**
  * FunctionDeclaration type defines the signature for functions that execute SQL queries.
  * It takes a query string and an array of parameters, and returns a promise that resolves
  * to either an array of results or an object containing a rows property with the results.
  */
type FunctionDeclaration<T> = (query: string, params: any[]) => Promise<T[] | { rows: T[] }>;

/**
  * QueryExecutorObject interface defines the structure for an object that can execute SQL queries.
  * It includes optional methods for executing queries in different ways, as well as an optional manager property.
  */
interface QueryExecutorObject<T> {
  execute?: FunctionDeclaration<T>;
  query?: FunctionDeclaration<T>;
  run?: FunctionDeclaration<T>;
  all?: FunctionDeclaration<T>;
  get?: FunctionDeclaration<T>;
  manager?: QueryExecutor<T>;
}

/**
  * QueryExecutor type can be either a QueryExecutorObject or a function that executes a query.
  */
type QueryExecutor<T> = 
  QueryExecutorObject<T> 
  | FunctionDeclaration<T>;

/**
  * SchemaType is a conditional type that infers the type of data based on the provided schema.
  * It supports both Zod schemas and class-validator classes.
  */
type SchemaType<S> =
  S extends ZodObject ? z.infer<S> :
  S extends { new(): infer U } ? U :
  never;

/**
  * Abstract class QueryDefinition serves as a blueprint for different types of SQL query definitions.
  * It defines the essential methods and properties that any concrete query class must implement.
  * This includes methods for building the SQL query, executing it, cloning the query definition,
  * resetting its state, and checking if the query is complete.
  * The class also provides a method to re-analyze the query for duplicate parameters to optimize parameter usage.
  */
export default abstract class QueryDefinition<S = any> {

  /**
    * Converts the query definition to its SQL string representation.
    */
  public abstract toSQL(): string;

  /**
    * Retrieves the parameters associated with the query.
    */
  public abstract getParams(): any[];

  /**
    * Builds the SQL query and returns an object containing the query text and its parameters.
    * The optional deepAnalysis parameter can be used to control the depth of analysis during the build process.
    */
  public abstract build(deepAnalysis?: boolean): {
    /** The SQL query text. */
    text: string;
    /** The parameters for the SQL query. */
    values: any[];
  };

  /**
    * Creates a deep copy of the current query definition.
    */
  public abstract clone(): QueryDefinition;

  /**
    * Resets the query definition to its initial state.
    */
  public abstract reset(): void;

  /**
    * Indicates whether the query definition is complete and ready for execution.
    */
  public abstract get isDone(): boolean;

  /**
    * The kind of SQL operation represented by the query definition.
    * It can be one of 'INSERT', 'UPDATE', 'DELETE', or 'SELECT'.
    */
  public abstract kind: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';

  /**
    * Provides access to the current query definition instance.
    */
  public abstract get query(): QueryDefinition;

  /**
    * The SQL flavor to use for escaping identifiers.
    * Default is PostgreSQL.
    */
  protected flavor: sqlFlavor = sqlFlavor.postgres;

  /**
    * Schemas to be used in the query.
    * This is useful for databases that support multiple schemas.
    * NOTICE: SQL Injection is not checked in schema names. Be sure to use only trusted schema names.
    */
  protected schemas: string[] = [];

  /**
    * Sets the SQL flavor for escaping identifiers.
    * @param flavor The SQL flavor to set.
    * @returns The current QueryDefinition instance for chaining.
    */
  public sqlFlavor(flavor: sqlFlavor) {
    this.flavor = flavor;
    return this;
  }

  /**
    * Set schemas to be used in the query.
    * This is useful for databases that support multiple schemas.
    * NOTICE: SQL Injection is not checked in schema names. Be sure to use only trusted schema names.
    * @param schemas The schemas to set.
    * @returns The current SelectQuery instance for chaining.
    */
  public schema(...schemas: string[]): this {
    this.schemas = schemas;
    return this;
  }

  /**
    * Adds schemas to the existing list of schemas.
    * This is useful for databases that support multiple schemas.
    * NOTICE: SQL Injection is not checked in schema names. Be sure to use only trusted schema names.
    * @param schemas The schemas to add.
    * @returns The current SelectQuery instance for chaining.
    */
  public addSchema(...schemas: string[]): this {
    this.schemas.push(...schemas);
    return this;
  }

  /**
    * Invalidates the current state of the query definition, forcing a rebuild on the next operation.
    */
  public abstract invalidate(): void;

  /**
    * True if the schema to validate against is a Zod schema, false otherwise.
    */
  private isZodSchema: boolean = false;

  /**
    * True if the schema to validate against is a class-validator schema, false otherwise.
    */
  private isClassValidatorSchema: boolean = false;

  /**
    * The schema to validate against, can be either a Zod schema or a class-validator class.
    * Null if no schema is set.
    */
  private validatorSchema: any = null;

  /**
    * Options for class-validator validation.
    * Default options are set to whitelist properties, forbid non-whitelisted properties,
    * and exclude the target object from validation errors.
    */
  private classValidatorOptions: ValidatorOptions = {
    whitelist: true,
    forbidNonWhitelisted: false,
    validationError: { target: false }
  };

  /**
    * Use zod or class-validator + class-transformer to validate the input schema.
    * @param schema The schema to validate against.
    * @returns A promise that resolves if the schema is valid, or rejects with validation errors.
    * @throws An error if no validation library is available.
    */
  public validate<T extends ZodObject | (new (...args: any[]) => any)>(
    schema: T
  ): QueryDefinition<SchemaType<T>> {
    if ((schema as any).safeParse) {
      this.isZodSchema = true;
    } else {
      this.isClassValidatorSchema = true;
    }
    this.validatorSchema = schema;

    return this;
  }

  /**
    * Configures options for class-validator validation.
    * @param config The configuration options for class-validator.
    * @returns The current QueryDefinition instance for method chaining.
    */
  public classValidatorConfig(
    config: ValidatorOptions
  ) {
    this.classValidatorOptions = config;
    return this;
  }

  /**
    * Handles validation of the input data against the set schema.
    * Supports both Zod schemas and class-validator classes.
    * @param input The data to validate.
    * @returns A promise that resolves if the data is valid, or rejects with validation errors.
    * @throws An error if no validation library is available.
    */
  private async handleValidation(input: any) {
    if (this.validatorSchema) {
      if (this.isZodSchema) {
        const zod = await getZod();
        await zod.array(this.validatorSchema).parseAsync(input);
      } else if (this.isClassValidatorSchema) {
        const { classValidator, classTransformer } = await getClassValidator();
        const { validateOrReject } = classValidator;
        const transformed = classTransformer.plainToInstance(this.validatorSchema, input);
        for (const item of transformed) {
          // Use class-validator to validate each item
          await validateOrReject(item as any, this.classValidatorOptions);
        }
      }
    }
  }

  /**
    * Builds the SQL query and re-analyzes it for duplicate parameters.
    * This method ensures that the query is optimized by removing redundant parameters.
    * @returns An object containing the optimized query text and its parameters.
    * @throws An error if the build process fails.
    */
  public buildReanalyze(): { text: string; values: any[] } {
    const query = this.build();
    return this.reAnalyzeParsedQueryForDuplicateParams(query.text, query.values);
  }

  /**
    * Executes the built SQL query using the provided query executor.
    * The query executor can be a function or an object with methods to execute the query.
    * The optional noManager parameter can be used to bypass the manager property if present.
    * @param queryExecutor The executor to run the SQL query.
    * @param noManager If true, bypasses the manager property of the executor object.
    * @returns A promise that resolves with the result of the query execution.
    * @throws An error if the provided query executor is invalid or if validation fails.
    */
  public async execute<T = S>(
    queryExecutor: QueryExecutor<T>,
    noManager: boolean = false
  ): Promise<T[]> {
    if (typeof queryExecutor === 'function') {
      const result = await queryExecutor(this.toSQL(), this.getParams());
      if ((result as any)?.rows) {
        await this.handleValidation((result as any).rows);
        return (result as any).rows as T[];
      } else {
        await this.handleValidation(result);
        return result as T[];
      }
    }

    if (!noManager && queryExecutor?.manager && typeof queryExecutor?.manager === 'object') {
      for (const functionName of functionNames) {
        if (typeof queryExecutor.manager[functionName] === 'function') {
          const result = await queryExecutor.manager[functionName]!(this.toSQL(), this.getParams());
          if ((result as any)?.rows) {
            await this.handleValidation((result as any).rows);
            return (result as any).rows as T[];
          } else {
            await this.handleValidation(result);
            return result as T[];
          }
        }
      }
    } else {
      for (const functionName of functionNames) {
        if (typeof queryExecutor[functionName] === 'function') {
          const result = await queryExecutor[functionName]!(this.toSQL(), this.getParams());
          if ((result as any)?.rows) {
            await this.handleValidation((result as any).rows);
            return (result as any).rows as T[];
          } else {
            await this.handleValidation(result);
            return result as T[];
          }
        }
      }
    }

    throw new Error('Invalid query executor provided.');
  }

  /**
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

  /**
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
 
  /**
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

  /**
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
