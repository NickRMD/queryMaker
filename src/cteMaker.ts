import type QueryDefinition from "./queryKinds/dml/dmlQueryDefinition.js";
import SelectQuery from "./queryKinds/dml/select.js";

/**
 * Cte represents a Common Table Expression (CTE) in SQL.
 * It allows defining a named subquery that can be referenced within other queries.
 */
export class Cte {
  /**
   * The name of the CTE.
   */
  private name: string;

  /**
   * The query that defines the CTE.
   */
  private query: QueryDefinition;

  /**
   * Indicates whether the CTE is recursive.
   */
  private recursiveCte: boolean;

  /**
   * Creates an instance of Cte.
   * @param name - The name of the CTE.
   * @param query - The query that defines the CTE.
   * @param recursive - Whether the CTE is recursive (default is false).
   */
  constructor(
    name?: string,
    query?: QueryDefinition,
    recursive: boolean = false,
  ) {
    this.name = name || "";
    this.query = query || new SelectQuery();
    this.recursiveCte = recursive;
  }

  /**
   * Marks the CTE as recursive.
   * @returns The current Cte instance for method chaining.
   */
  public recursive(): this {
    this.recursiveCte = true;
    return this;
  }

  /**
   * Sets the name of the CTE.
   * The name should be a valid SQL identifier.
   * @param name - The name of the CTE.
   * @returns The current Cte instance for method chaining.
   */
  public as(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Sets the query that defines the CTE.
   * The query should be an instance of a class that extends QueryDefinition (e.g., SelectQuery).
   * @param query - The query defining the CTE.
   * @returns The current Cte instance for method chaining.
   */
  public withQuery(query: SelectQuery): this {
    this.query = query;
    return this;
  }

  /**
   * Builds the SQL string for the CTE, including its name and query.
   * Returns an object containing the SQL text and associated parameter values.
   * @returns An object with the SQL text and parameter values.
   */
  public build(): { text: string; values: any[] } {
    const recursiveStr = this.recursiveCte ? "RECURSIVE " : "";
    const query = this.query.build();
    return {
      text: `${recursiveStr}${this.name} AS (\n${query.text}\n)`,
      values: query.values,
    };
  }
}

/**
 * CteMaker helps in constructing SQL queries with multiple Common Table Expressions (CTEs).
 * It manages a list of CTEs and builds the final SQL string with proper parameter indexing.
 */
export default class CteMaker {
  /**
   * The list of CTEs to be included in the SQL query.
   */
  private ctes: Cte[] = [];

  /**
   * Creates an instance of CteMaker.
   * @param ctes - An optional array of CTEs to initialize the CteMaker with.
   */
  constructor(...ctes: Cte[]) {
    this.ctes = ctes;
  }

  /**
   * Adds a new CTE to the list.
   * @param cte - The CTE to be added.
   * @returns The current CteMaker instance for method chaining.
   */
  public addCte(cte: Cte): this {
    this.ctes.push(cte);
    return this;
  }

  /**
   * Adds multiple CTEs to the list.
   * @param ctes - An array of CTEs to be added.
   * @returns The current CteMaker instance for method chaining.
   */
  public addCtes(ctes: Cte[]): this {
    this.ctes.push(...ctes);
    return this;
  }

  /**
   * Builds the SQL string for all CTEs, renumbering parameters to ensure uniqueness.
   * @returns An object with the SQL text and parameter values.
   */
  public build(): { text: string; values: any[] } {
    if (this.ctes.length === 0) {
      return { text: "", values: [] };
    }

    const cteResults: Array<{ text: string; values: any[] }> = [];
    let paramIndex = 1;

    // Build each CTE and renumber its parameters
    for (const cte of this.ctes) {
      const builtCte = cte.build();

      // Renumber parameters in this CTE's text
      const renumberedText = builtCte.text.replace(/\$(\d+)/g, () => {
        return `$${paramIndex++}`;
      });

      cteResults.push({
        text: renumberedText,
        values: builtCte.values,
      });
    }

    return {
      text: `WITH ${cteResults.map((r) => r.text).join(", ")}`,
      values: cteResults.flatMap((r) => r.values),
    };
  }
}
