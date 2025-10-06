import SearchModule from "./searchModule.js";
import Signal from "./signal.js";

/**
 * Defines the statement kind for combining statements.
 * 'AND' and 'OR' are the two possible kinds.
 */
export type StatementKind = "AND" | "OR";

/**
 * A class to build SQL WHERE clauses with parameterized queries.
 * It supports various SQL conditions and allows combining multiple statements.
 * It ensures that the generated SQL is safe from injection attacks by using placeholders.
 * It can also handle nested statements and subqueries.
 */
export default class Statement {
  /**
   * The current index for parameter placeholders.
   */
  private index: Signal<number>;
  /**
   * Array to hold individual unparsed SQL statements.
   * These statements will be combined to form the final SQL clause.
   * This is a reactive signal, so changes will trigger re-parsing
   * or invalidation based on the constructor option.
   */
  private statements = Signal.create<string[]>([]);
  /**
   * The final parsed SQL statement with placeholders.
   * This is generated when the build method is called.
   */
  private parsedStatement: string | null = null;
  /**
   * Array to hold the values corresponding to the placeholders in the SQL statement.
   * These values will be used in the parameterized query execution.
   * This is a reactive signal, so changes will trigger re-parsing
   * or invalidation based on the constructor option.
   */
  private values = Signal.create<any[]>([]);
  /**
   * Flag to determine if the final statement should include the 'WHERE' keyword.
   * This is useful when the statement is part of a larger SQL query.
   */
  private addWhere = true;

  /**
   * Flag to indicate if the statement should be re-parsed on changes.
   * This is useful for performance optimization, signals will handle reactivity.
   * If false, the statement will only be parsed when build() is called.
   * If true, it will re-parse on every change to statements or values.
   */
  private reparseOnChange: boolean;

  /**
   * Array of functions to unsubscribe from signals.
   * This is used to remove listeners when reparseOnChange is toggled.
   */
  private unsubscribeSignals: (() => void)[] = [];

  /**
   * Creates an instance of the Statement class.
   * @param initialOffset - An optional offset to start the parameter index from.
   * This is useful when combining multiple statements to ensure unique placeholders.
   */
  constructor(initialOffset = 0, reparseOnChange = false) {
    this.index = Signal.create(1 + initialOffset);
    this.reparseOnChange = reparseOnChange;
    this.subscribeToSignals();
  }

  /**
   * Unsubscribes from all signal listeners.
   * This is used when toggling the reparseOnChange flag to prevent memory leaks.
   */
  private unsubscribeAllSignals(): void {
    this.unsubscribeSignals.forEach((unsub) => unsub());
    this.unsubscribeSignals = [];
  }

  /**
   * Keys of the signals to subscribe to for changes.
   * This is used to set up listeners for statements, values, and index changes.
   */
  private subscribeKeys = ["statements", "values", "index"];

  /**
   * Subscribes to changes in the statements and values signals.
   * Depending on the reparseOnChange flag, it either invalidates the parsed statement
   * or triggers a re-parse when changes occur.
   */
  private subscribeToSignals(): void {
    if (!this.reparseOnChange) {
      for (const key of this.subscribeKeys) {
        this.unsubscribeSignals.push(
          (this as any)[key].subscribe(() => this.invalidate()),
        );
      }
    } else {
      for (const key of this.subscribeKeys) {
        this.unsubscribeSignals.push(
          (this as any)[key].subscribe(() => {
            this.invalidate();
            try {
              this.build();
            } catch {}
          }),
        );
      }
    }
  }

  /**
   * Enables re-parsing of the statement whenever there are changes to the statements or values.
   * This is useful for scenarios where the statement needs to be kept up-to-date with changes.
   * @returns The current Statement instance for method chaining.
   */
  public enableReparseOnChange(): this {
    if (this.reparseOnChange) return this;

    this.reparseOnChange = true;
    this.unsubscribeAllSignals();
    this.subscribeToSignals();

    return this;
  }

  /**
   * Disables re-parsing of the statement on changes to the statements or values.
   * Instead, the statement will only be parsed when the build method is called.
   * This is useful for performance optimization in scenarios where changes are frequent.
   * @returns The current Statement instance for method chaining.
   */
  public disableReparseOnChange(): this {
    if (!this.reparseOnChange) return this;

    this.reparseOnChange = false;
    this.unsubscribeAllSignals();
    this.subscribeToSignals();

    return this;
  }

  /**
   * Adds multiple parameters to the values array and updates the index accordingly.
   * This is useful when you have a list of values to be used in the SQL statement.
   * @param params - An array of values to be added.
   * @returns The current Statement instance for method chaining.
   */
  public addParams(params: any[]): this {
    this.values.value = [...params, ...this.values.value];
    this.index.value += params.length;
    return this;
  }

  /**
   * Adds an offset to the current index.
   * This is useful when you want to adjust the starting point for parameter placeholders.
   * @param offset - The number to add to the current index.
   * @returns The current Statement instance for method chaining.
   */
  public addOffset(offset: number): this {
    this.index.value += offset;
    return this;
  }

  /**
   * Sets the current index to a specific value.
   * This is useful when you want to reset or set the starting point for parameter placeholders.
   * @param offset - The value to set the current index to.
   * @returns The current Statement instance for method chaining.
   */
  public setOffset(offset: number): this {
    this.index.value = offset;
    return this;
  }

  /**
   * Enables the addition of the 'WHERE' keyword in the final SQL statement.
   * This is useful when the statement is a standalone WHERE clause.
   * @returns void
   */
  public enableWhere(): this {
    this.addWhere = true;
    return this;
  }

  /**
   * Disables the addition of the 'WHERE' keyword in the final SQL statement.
   * This is useful when the statement is part of a larger SQL query that already includes 'WHERE'.
   * @returns void
   */
  public disableWhere(): this {
    this.addWhere = false;
    return this;
  }

  /**
   * Counts the number of placeholders ('?') in a given SQL template string.
   * This is useful for validating that the number of placeholders matches the number of provided values.
   * @param template - The SQL template string to be analyzed.
   * @returns The count of placeholders in the template.
   */
  private static countPlaceholders(template: string): number {
    return (template.match(/\?/g) || []).length;
  }

  /**
   * Invalidates the current parsed statement.
   * This forces a re-parse the next time the build method is called.
   * @returns void
   */
  public invalidate(): void {
    this.parsedStatement = null;
  }

  /**
   * Resets the statement to its initial state.
   * This clears all collected statements, values, and resets the index.
   * It also re-enables the addition of the 'WHERE' keyword.
   * @returns void
   */
  public reset(): void {
    this.statements.value = [];
    this.parsedStatement = null;
    this.values.value = [];
    this.index.value = 1;
    this.addWhere = true;
  }

  /**
   * Adds a new SQL statement to the list of statements.
   * It handles both string statements and nested Statement instances.
   * It also manages the values associated with the statement and the logical kind (AND/OR).
   * @param statement - The SQL statement to be added, either as a string or a Statement instance.
   * @param values - The values corresponding to the placeholders in the statement.
   * @param kind - The logical operator to combine this statement with previous ones ('AND' or 'OR').
   * @returns void
   * @throws Error if the number of placeholders does not match the number of provided values.
   */
  private addStatement(
    statement: string | Statement,
    values: any | any[] = [],
    kind: StatementKind | string = "AND",
  ): void {
    if (statement instanceof Statement) {
      const raw = statement.returnRaw();
      statement = raw.statement;
      values = raw.values.value;
    }

    values = Array.isArray(values) ? values : [values];

    if (Statement.countPlaceholders(statement) !== values.length) {
      throw new Error("Number of placeholders does not match number of values");
    }

    if (this.statements.value.length === 0) {
      this.statements.setValue((v) => v.push(`(${statement})`));
    } else {
      this.statements.setValue((v) => v.push(`${kind} (${statement})`));
    }
    this.values.setValue((v) => v.push(...values));
  }

  /**
   * Adds a new statement combined with 'AND'.
   * @param statement - The SQL statement to be added, either as a string or a Statement instance.
   * @param values - The values corresponding to the placeholders in the statement.
   * @returns The current Statement instance for method chaining.
   */
  public and(statement: string | Statement, values: any | any[] = []): this {
    this.addStatement(statement, values, "AND");
    return this;
  }

  /**
   * Adds a new statement combined with 'OR'.
   * @param statement - The SQL statement to be added, either as a string or a Statement instance.
   * @param values - The values corresponding to the placeholders in the statement.
   * @returns The current Statement instance for method chaining.
   */
  public or(statement: string | Statement, values: any | any[] = []): this {
    this.addStatement(statement, values, "OR");
    return this;
  }

  /**
   * Adds an IN condition to the statement.
   * @param column - The database column to compare.
   * @param values - The array of values for the IN condition.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public in(column: string, values: any[], kind: StatementKind = "AND"): this {
    const placeholders = values.map(() => "?").join(", ");
    this.addStatement(`${column} IN (${placeholders})`, values, kind);
    return this;
  }

  /**
   * Adds a NOT IN condition to the statement.
   * @param column - The database column to compare.
   * @param values - The array of values for the NOT IN condition.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public notIn(
    column: string,
    values: any[],
    kind: StatementKind = "AND",
  ): this {
    const placeholders = values.map(() => "?").join(", ");
    this.addStatement(`${column} NOT IN (${placeholders})`, values, kind);
    return this;
  }

  /**
   * Adds a BETWEEN condition to the statement.
   * @param column - The database column to compare.
   * @param start - The start value of the range.
   * @param end - The end value of the range.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public between(
    column: string,
    start: any,
    end: any,
    kind: StatementKind = "AND",
  ): this {
    this.addStatement(`${column} BETWEEN ? AND ?`, [start, end], kind);
    return this;
  }

  /**
   * Adds a NOT BETWEEN condition to the statement.
   * @param column - The database column to compare.
   * @param start - The start value of the range.
   * @param end - The end value of the range.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public notBetween(
    column: string,
    start: any,
    end: any,
    kind: StatementKind = "AND",
  ): this {
    this.addStatement(`${column} NOT BETWEEN ? AND ?`, [start, end], kind);
    return this;
  }

  /**
   * Adds an IS NULL condition to the statement.
   * @param column - The database column to check for NULL.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public isNull(column: string, kind: StatementKind = "AND"): this {
    this.addStatement(`${column} IS NULL`, [], kind);
    return this;
  }

  /**
   * Adds an IS NOT NULL condition to the statement.
   * @param column - The database column to check for NOT NULL.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public isNotNull(column: string, kind: StatementKind = "AND"): this {
    this.addStatement(`${column} IS NOT NULL`, [], kind);
    return this;
  }

  /**
   * Adds a case-sensitive LIKE condition to the statement.
   * @param column - The database column to compare.
   * @param pattern - The pattern to match using LIKE.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public like(
    column: string,
    pattern: string,
    kind: StatementKind = "AND",
  ): this {
    this.addStatement(`${column} LIKE ?`, [pattern], kind);
    return this;
  }

  /**
   * Adds a case-insensitive LIKE condition to the statement.
   * @param column - The database column to compare.
   * @param pattern - The pattern to match using ILIKE.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public ilike(
    column: string,
    pattern: string,
    kind: StatementKind = "AND",
  ): this {
    this.addStatement(`${column} ILIKE ?`, [pattern], kind);
    return this;
  }

  /**
   * Adds a NOT LIKE condition to the statement.
   * @param column - The database column to compare.
   * @param pattern - The pattern to match using NOT LIKE.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   */
  public notLike(
    column: string,
    pattern: string,
    kind: StatementKind = "AND",
  ): this {
    this.addStatement(`${column} NOT LIKE ?`, [pattern], kind);
    return this;
  }

  /**
   * Adds a case-insensitive NOT LIKE condition to the statement.
   * @param column - The database column to compare.
   * @param pattern - The pattern to match using NOT ILIKE.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public notIlike(
    column: string,
    pattern: string,
    kind: StatementKind = "AND",
  ): this {
    this.addStatement(`${column} NOT ILIKE ?`, [pattern], kind);
    return this;
  }

  /**
   * Adds an EXISTS condition with a subquery to the statement.
   * @param subquery - The subquery to be used in the EXISTS condition.
   * @param values - The values corresponding to the placeholders in the subquery.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public exists(
    subquery: string,
    values: any | any[] = [],
    kind: StatementKind = "AND",
  ): this {
    this.addStatement(`EXISTS (${subquery})`, values, kind);
    return this;
  }

  /**
   * Adds a NOT EXISTS condition with a subquery to the statement.
   * @param subquery - The subquery to be used in the NOT EXISTS condition.
   * @param values - The values corresponding to the placeholders in the subquery.
   * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public notExists(
    subquery: string,
    values: any | any[] = [],
    kind: StatementKind = "AND",
  ): this {
    this.addStatement(`NOT EXISTS (${subquery})`, values, kind);
    return this;
  }

  /**
   * Provides access to the SearchModule for advanced search capabilities.
   * This allows for full-text search, tsvector search, word-by-word search, etc.
   * Returns an instance of SearchModule linked to this Statement.
   * @returns An instance of SearchModule for building search conditions.
   */
  public search(): SearchModule {
    return new SearchModule(this);
  }

  /**
   * Adds a raw SQL statement with placeholders to the statement list.
   * This allows for custom SQL conditions that may not be covered by the predefined methods.
   * @param kind - The logical operator to combine this statement with previous ones ('AND' or 'OR').
   * @param template - The SQL template string containing '?' placeholders.
   * @param values - The values corresponding to the placeholders in the template.
   * @returns The current Statement instance for method chaining.
   * @throws Error if the number of placeholders does not match the number of provided values.
   */
  public raw(
    kind: StatementKind | string,
    template: string,
    ...values: any[]
  ): this {
    const parts = template.split("?");
    let statement = "";

    if (parts.length !== values.length + 1) {
      throw new Error("Number of placeholders does not match number of values");
    }

    for (let i = 0; i < values.length; i++) {
      statement += `${parts[i]}?`;
    }
    statement += parts[parts.length - 1];

    this.addStatement(statement, values, kind);
    return this;
  }

  /**
   * Joins multiple Statement instances into the current statement.
   * This allows for complex nested conditions to be built up from smaller parts.
   * @param statements - An array of Statement instances to be joined.
   * @param joinWith - The logical operator to combine these statements ('AND' or 'OR').
   * @returns The current Statement instance for method chaining.
   */
  public joinMultipleStatements(
    statements: Statement[],
    joinWith: StatementKind = "AND",
  ): this {
    statements.forEach((stmt) => {
      const raw = stmt.returnRaw();
      this.addStatement(raw.statement, raw.values.value, joinWith);
    });

    return this;
  }

  /**
   * Checks if the statements have already been parsed.
   * This prevents re-parsing and ensures that the final SQL is only generated once.
   * @returns True if the statements have been parsed, false otherwise.
   */
  public isDone(): boolean {
    return this.parsedStatement !== null;
  }

  /**
   * Parses the collected statements into a single SQL string with placeholders.
   * It also adds the 'WHERE' keyword if required.
   * @param newLine - Whether to separate statements with new lines for readability (default is true).
   * @returns The final parsed SQL statement as a string.
   */
  private parseStatements(newLine = true) {
    if (this.isDone()) {
      return this.parsedStatement as string;
    }

    if (this.statements.value.length === 0) {
      this.parsedStatement = "";
      return this.parsedStatement;
    }
    const separator = newLine ? "\n " : " ";
    let index = this.index.value;
    const statement = this.statements.value
      .join(separator)
      .replace(/\?/g, () => `$${index++}`);
    this.parsedStatement = this.addWhere ? `WHERE ${statement}` : statement;
    return this.parsedStatement;
  }

  /**
   * Builds the final SQL statement and the corresponding values array.
   * This is the method to call when the statement is complete and ready for execution.
   * @param newLine - Whether to separate statements with new lines for readability (default is true).
   * @returns An object containing the final SQL statement and the array of values.
   */
  public build(newLine = true): { statement: string; values: any[] } {
    return {
      statement: this.parseStatements(newLine),
      values: this.values.value,
    };
  }

  /**
   * Provides access to the values array.
   * This is useful for retrieving the parameters to be used in the parameterized query execution.
   * @returns The array of values corresponding to the placeholders in the SQL statement.
   */
  public get params(): any[] {
    return this.values.value;
  }

  /**
   * Creates a deep copy of the current Statement instance.
   * This is useful when you want to duplicate the statement without affecting the original.
   * @returns A new Statement instance that is a clone of the current one.
   */
  public clone(): Statement {
    const clone = new Statement(this.index.value - 1, this.reparseOnChange);
    clone.statements.value = [...this.statements.value];
    clone.parsedStatement = this.parsedStatement;
    clone.values.value = [...this.values.value];
    clone.addWhere = this.addWhere;
    clone.index.value = this.index.value;
    clone.subscribeToSignals();
    return clone;
  }

  /**
   * Returns the raw SQL statement and values without parsing.
   * This is useful for debugging or when the raw format is needed.
   * @returns An object containing the raw SQL statement and the array of values.
   */
  private returnRaw() {
    const statement = this.statements.value.join("\n ");
    return {
      statement: statement,
      values: this.values,
    };
  }
}
