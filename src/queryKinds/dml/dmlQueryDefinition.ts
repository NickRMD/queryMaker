import type { ValidatorOptions } from "class-validator";
// Import types only since they are used for type checking only
// and zod is optional peer dependency
import type z from "zod";
import type CteMaker from "../../cteMaker.js";
import deepEqual from "../../deepEqual.js";
import { getClassValidator, getZod } from "../../getOptionalPackages.js";
import SqlEscaper from "../../sqlEscaper.js";
import type Statement from "../../statementMaker.js";
import type Join from "../../types/Join.js";
import { isJoinTable } from "../../types/Join.js";
import type QueryKind from "../../types/QueryKind.js";
import sqlFlavor from "../../types/sqlFlavor.js";

/**
 * An array of function names that can be used to execute SQL queries.
 * These functions are commonly found in database client libraries.
 */
const functionNames = ["execute", "query", "run", "all", "get"] as const;

/**
 * FunctionDeclarationReturnType type defines the possible return types for functions that execute SQL queries.
 * It can be an array of results, an object containing a rows property with the results,
 * or a tuple containing an array of results and a number (e.g., for affected rows).
 */
type FunctionDeclarationReturnType<T> = T[] | { rows: T[] } | [T[], number];

/**
 * FunctionDeclaration type defines the signature for functions that execute SQL queries.
 * It takes a query string and an array of parameters, and returns a promise that resolves
 * with a result of type FunctionDeclarationReturnType<T> or directly a result of that type.
 */
type FunctionDeclaration<T> = (
  query: string,
  params: any[],
) =>
  | Promise<FunctionDeclarationReturnType<T>>
  | FunctionDeclarationReturnType<T>;

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
export type QueryExecutor<T> = QueryExecutorObject<T> | FunctionDeclaration<T>;

/**
 * SchemaType is a conditional type that infers the type of data based on the provided schema.
 * It supports both Zod schemas and class-validator classes.
 */
type SchemaType<S> = S extends { safeParse: Function }
  ? z.infer<S>
  : S extends { new (): infer U }
    ? U
    : never;

/**
 * OmittingReturnFromValidate is a utility type that modifies the type T by omitting
 * the methods 'execute', 'getOne', and 'getMany', and adding the DmlQueryDefinition with the inferred schema type.
 */
type ReturnFromValidate<This, Schema> = DmlQueryDefinition<SchemaType<Schema>> &
  This;

/**
 * Abstract class DmlQueryDefinition serves as a blueprint for different types of SQL query definitions.
 * It defines the essential methods and properties that any concrete query class must implement.
 * This includes methods for building the SQL query, executing it, cloning the query definition,
 * resetting its state, and checking if the query is complete.
 * The class also provides a method to re-analyze the query for duplicate parameters to optimize parameter usage.
 */
export default abstract class DmlQueryDefinition<S = any> {
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
  public abstract clone(): DmlQueryDefinition;

  /**
   * Resets the query definition to its initial state.
   */
  public abstract reset(): void;

  /**
   * Indicates whether the query is complete and ready for execution.
   * @returns True if the query has been built and has parameters, false otherwise.
   */
  public get isDone(): boolean {
    return this.builtQuery !== null && this.builtParams !== null;
  }

  /**
   * Parses a Join object to ensure proper escaping and cloning of subqueries.
   * @param join The Join object to parse.
   * @returns The parsed Join object.
   */
  protected parseJoinObject(join: Join): Join {
    if (isJoinTable(join)) {
      return {
        ...join,
        table: SqlEscaper.escapeTableName(join.table, this.flavor),
      };
    } else {
      return {
        ...join,
        subQuery: join.subQuery.clone(),
      };
    }
  }

  /**
   * The kind of SQL operation represented by the query definition.
   * It can be one of 'INSERT', 'UPDATE', 'DELETE', or 'SELECT'.
   */
  public abstract get kind(): QueryKind;

  /**
   * Provides access to the current query definition instance.
   * @returns The current DmlQueryDefinition instance.
   */
  public get query(): DmlQueryDefinition {
    return this;
  }

  /**
   * Utility method to add spaces to each line of a given string.
   * This is useful for formatting SQL queries for better readability.
   * @param str The string to format.
   * @param spaces The number of spaces to add to the beginning of each line (default is 0).
   * @returns The formatted string with added spaces.
   */
  protected spaceLines(str: string, spaces: number = 0): string {
    const space = " ".repeat(spaces);
    return str
      .split("\n")
      .map((line) => space + line)
      .join("\n");
  }

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
   * The built SQL query string.
   * Null if the query has not been built yet or has been invalidated.
   */
  protected builtQuery: string | null = null;

  /**
   * The parameters for the built SQL query.
   * Null if the query has not been built yet or has been invalidated.
   */
  protected builtParams: any[] | null = null;

  /** Optional Common Table Expressions (CTEs) for the query. */
  protected ctes: CteMaker | null = null;

  /** The WHERE clause statement. */
  protected whereStatement: Statement | null = null;

  /**
   * Invalidates the current state of the query, forcing a rebuild on the next operation.
   * @returns void
   */
  public invalidate(): void {
    this.builtQuery = null;
    this.builtParams = null;
    if (this.whereStatement) this.whereStatement.invalidate();
    if (this.ctes) {
      for (const cte of this.ctes["ctes"]) {
        cte["query"].invalidate();
      }
    }
  }

  /**
   * Sets the SQL flavor for escaping identifiers.
   * @param flavor The SQL flavor to set.
   * @returns The current DmlQueryDefinition instance for chaining.
   */
  public sqlFlavor(flavor: sqlFlavor): this {
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
    validationError: { target: false },
  };

  /**
   * Use zod or class-validator + class-transformer to validate the input schema.
   * @param schema The schema to validate against.
   * @returns A promise that resolves if the schema is valid, or rejects with validation errors.
   * @throws An error if no validation library is available.
   */
  public validate<
    T extends { safeParse: Function } | (new (...args: any[]) => any),
  >(schema: T): ReturnFromValidate<this, T> {
    if ("safeParse" in schema) {
      this.isZodSchema = true;
    } else {
      this.isClassValidatorSchema = true;
    }
    this.validatorSchema = schema;

    return this as ReturnFromValidate<this, T>;
  }

  /**
   * Configures options for class-validator validation.
   * @param config The configuration options for class-validator.
   * @returns The current DmlQueryDefinition instance for method chaining.
   */
  public classValidatorConfig(config: ValidatorOptions): this {
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
  private async handleValidation<T>(input: any): Promise<T[]> {
    input = Array.isArray(input) ? input : [input];

    input =
      input !== null
        ? Array.isArray(input) &&
          input.length === 2 &&
          Array.isArray(input?.[0]) &&
          typeof input?.[1] === "number"
          ? (input[0] ?? null)
          : (input ?? null)
        : input;

    try {
      if (this.validatorSchema) {
        if (this.isZodSchema) {
          const zod = await getZod();
          input = await zod.array(this.validatorSchema).parseAsync(input);
        } else if (this.isClassValidatorSchema) {
          const { classValidator, classTransformer } =
            await getClassValidator();
          const { validateOrReject } = classValidator;
          input = classTransformer.plainToInstance(this.validatorSchema, input);
          for (const item of input as any[]) {
            // Use class-validator to validate each item
            await validateOrReject(item as any, this.classValidatorOptions);
          }
        }
      }
    } catch (error) {
      console.group("Validation Error");
      console.error("Error during validation:", error);
      console.debug("Input data:", input);
      console.debug("Validator schema:", this.validatorSchema);
      console.groupEnd();

      throw new Error("Validation failed. See console for details.", {
        cause: {
          originalError: error,
          input,
          schema: this.validatorSchema,
        },
      });
    }

    return input;
  }

  /**
   * Builds the SQL query and re-analyzes it for duplicate parameters.
   * This method ensures that the query is optimized by removing redundant parameters.
   * @returns An object containing the optimized query text and its parameters.
   * @throws An error if the build process fails.
   */
  public buildReanalyze(): { text: string; values: any[] } {
    const query = this.build();
    return this.reAnalyzeParsedQueryForDuplicateParams(
      query.text,
      query.values,
    );
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
    noManager: boolean = false,
  ): Promise<T[]> {
    if (typeof queryExecutor === "function") {
      const builtQuery = this.build();
      const result = await queryExecutor(builtQuery.text, builtQuery.values);
      if (result === undefined || result === null) return [];

      if (typeof result !== "object") {
        throw new Error("Invalid result from query executor function.");
      }

      if ("rows" in result) {
        if (result.rows === undefined || result.rows === null) return [];

        if (typeof result.rows !== "object") {
          throw new Error(
            "Invalid rows property in result from query executor function.",
          );
        }

        return await this.handleValidation<T>(result.rows);
      } else {
        return await this.handleValidation<T>(result);
      }
    }

    if (
      !noManager &&
      queryExecutor?.manager &&
      typeof queryExecutor?.manager === "object"
    ) {
      for (const functionName of functionNames) {
        if (typeof queryExecutor.manager[functionName] === "function") {
          const builtQuery = this.build();
          const result = await queryExecutor.manager[functionName]!(
            builtQuery.text,
            builtQuery.values,
          );
          if (result === undefined || result === null) return [];

          if (typeof result !== "object") {
            throw new Error(
              "Invalid result from query executor manager function.",
            );
          }

          if ("rows" in result) {
            if (result.rows === undefined || result.rows === null) return [];

            if (typeof result.rows !== "object") {
              throw new Error(
                "Invalid rows property in result from query executor manager function.",
              );
            }

            return await this.handleValidation<T>(result.rows);
          } else {
            return await this.handleValidation<T>(result);
          }
        }
      }
    } else {
      for (const functionName of functionNames) {
        if (typeof queryExecutor[functionName] === "function") {
          const builtQuery = this.build();
          const result = await queryExecutor[functionName]!(
            builtQuery.text,
            builtQuery.values,
          );
          if (!result) return [];

          if (typeof result !== "object") {
            throw new Error(
              "Invalid result from query executor object function.",
            );
          }

          if ("rows" in result) {
            if (result.rows === undefined || result.rows === null) return [];

            if (typeof result.rows !== "object") {
              throw new Error(
                "Invalid rows property in result from query executor manager function.",
              );
            }

            return await this.handleValidation<T>(result.rows);
          } else {
            return await this.handleValidation<T>(result);
          }
        }
      }
    }

    throw new Error("Invalid query executor provided.");
  }

  /**
   * Executes the built SQL query and returns a single result or null if no result is found.
   * This method ensures that only one result is returned by applying a limit if necessary.
   * @param queryExecutor The executor to run the SQL query.
   * @param noManager If true, bypasses the manager property of the executor object.
   * @returns A promise that resolves with a single result or null.
   * @throws An error if the provided query executor is invalid or if validation fails.
   */
  public async getOne<T = S>(
    queryExecutor: QueryExecutor<T>,
    noManager: boolean = false,
  ): Promise<T | null> {
    if (
      "limit" in this &&
      typeof this.limit === "function" &&
      this.limit instanceof Function &&
      this.limit(1) !== this
    ) {
      this.limit(1);
    }

    const result = await this.execute<T>(queryExecutor, noManager);

    return result !== null
      ? Array.isArray(result) &&
        result.length === 2 &&
        Array.isArray(result?.[0]) &&
        typeof result?.[1] === "number"
        ? ((result[0][0] as T) ?? null)
        : ((result[0] as T) ?? null)
      : null;
  }

  /**
   * Executes the built SQL query and returns multiple results.
   * @param queryExecutor The executor to run the SQL query.
   * @param noManager If true, bypasses the manager property of the executor object.
   * @returns A promise that resolves with an array of results.
   * @throws An error if the provided query executor is invalid or if validation fails.
   */
  public async getMany<T = S>(
    queryExecutor: QueryExecutor<T>,
    noManager: boolean = false,
  ): Promise<T[]> {
    return this.execute<T>(queryExecutor, noManager);
  }

  /**
   * Builds the SQL query with EXPLAIN ANALYZE prefix for performance analysis.
   * This method is useful for debugging and optimizing SQL queries.
   */
  public buildExplainAnalyze(): { text: string; values: any[] } {
    const query = this.build();
    return {
      text: `EXPLAIN ANALYZE ${query.text}`,
      values: query.values,
    };
  }

  /**
   * Builds the SQL query with EXPLAIN prefix for query plan analysis.
   * This method is useful for understanding how the database will execute the query.
   */
  public buildExplain(): { text: string; values: any[] } {
    const query = this.build();
    return {
      text: `EXPLAIN ${query.text}`,
      values: query.values,
    };
  }

  /**
   * Re-analyzes the parsed SQL query to identify and consolidate duplicate parameters.
   * This method helps optimize the query by reducing the number of parameters used.
   * It can perform deep equality checks if specified.
   */
  protected reAnalyzeParsedQueryForDuplicateParams(
    query: string,
    values: any[],
    useDeepEqual: boolean = false,
  ): { text: string; values: any[] } {
    return DmlQueryDefinition.reAnalyzeParsedQueryForDuplicateParams(
      query,
      values,
      useDeepEqual,
    );
  }

  /**
   * Static method to re-analyze a parsed SQL query for duplicate parameters.
   * This method can be used independently of any instance of DmlQueryDefinition.
   */
  public static reAnalyzeParsedQueryForDuplicateParams(
    query: string,
    values: any[],
    useDeepEqual: boolean = false,
  ): { text: string; values: any[] } {
    const valueMap: Map<any, number> = new Map();
    let paramIndex = 1;
    const newValues: any[] = [];

    const newQuery = query.replace(/\$(\d+)/g, (_, p1) => {
      const originalValue = values[parseInt(p1, 10) - 1];
      let foundKey: any = null;

      if (useDeepEqual) {
        for (const [key] of valueMap) {
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
