import SearchModule from "./searchModule.js";

/**
  * Defines the statement kind for combining statements.
  * 'AND' and 'OR' are the two possible kinds.
  */
export type StatementKind = 'AND' | 'OR';

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
  private index: number;
  /**
    * Array to hold individual unparsed SQL statements.
    * These statements will be combined to form the final SQL clause.
    */
  private statements: string[] = [];
  /**
    * The final parsed SQL statement with placeholders.
    * This is generated when the build method is called.
    */
  private parsedStatement: string | null = null;
  /**
    * Array to hold the values corresponding to the placeholders in the SQL statement.
    * These values will be used in the parameterized query execution.
    */
  private values: any[] = [];
  /**
    * Flag to determine if the final statement should include the 'WHERE' keyword.
    * This is useful when the statement is part of a larger SQL query.
    */
  private addWhere = true;

  /**
    * Creates an instance of the Statement class.
    * @param initialOffset - An optional offset to start the parameter index from.
    * This is useful when combining multiple statements to ensure unique placeholders.
    */
  constructor(initialOffset = 0) {
    this.index = 1 + initialOffset;
  }

  /**
    * Adds multiple parameters to the values array and updates the index accordingly.
    * This is useful when you have a list of values to be used in the SQL statement.
    * @param params - An array of values to be added.
    * @returns The current Statement instance for method chaining.
    */
  public addParams(params: any[]) {
    this.values = [...params, ...this.values];
    this.index += params.length;
    return this;
  }

  /**
    * Adds an offset to the current index.
    * This is useful when you want to adjust the starting point for parameter placeholders.
    * @param offset - The number to add to the current index.
    * @returns The current Statement instance for method chaining.
    */
  public addOffset(offset: number) {
    this.index += offset;
    return this;
  }

  /**
    * Enables the addition of the 'WHERE' keyword in the final SQL statement.
    * This is useful when the statement is a standalone WHERE clause.
    * @returns void
    */
  public enableWhere() {
    this.addWhere = true;
  }

  /**
    * Disables the addition of the 'WHERE' keyword in the final SQL statement.
    * This is useful when the statement is part of a larger SQL query that already includes 'WHERE'.
    * @returns void
    */
  public disableWhere() {
    this.addWhere = false;
  }

  /**
    * Counts the number of placeholders ('?') in a given SQL template string.
    * This is useful for validating that the number of placeholders matches the number of provided values.
    * @param template - The SQL template string to be analyzed.
    * @returns The count of placeholders in the template.
    */
  private static countPlaceholders(template: string) {
    return (template.match(/\?/g) || []).length;
  }

  /**
    * Invalidates the current parsed statement.
    * This forces a re-parse the next time the build method is called.
    * @returns void
    */
  public invalidate() {
    this.parsedStatement = null;
  }

  /**
    * Resets the statement to its initial state.
    * This clears all collected statements, values, and resets the index.
    * It also re-enables the addition of the 'WHERE' keyword.
    * @returns void
    */
  public reset() {
    this.statements = [];
    this.parsedStatement = null;
    this.values = [];
    this.index = 1;
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
    kind: StatementKind | string = 'AND'
  ) {
    if (statement instanceof Statement) {
      const raw = statement.returnRaw();
      statement = raw.statement;
      values = raw.values;
    }

    values = Array.isArray(values) ? values : [values];

    if(Statement.countPlaceholders(statement) !== values.length) {
      throw new Error('Number of placeholders does not match number of values');
    }

    if (this.statements.length === 0) {
      this.statements.push(`(${statement})`);
    } else {
      this.statements.push(`${kind} (${statement})`);
    }
    this.values.push(...values); 
  }

  /**
    * Adds a new statement combined with 'AND'.
    * @param statement - The SQL statement to be added, either as a string or a Statement instance.
    * @param values - The values corresponding to the placeholders in the statement.
    * @returns The current Statement instance for method chaining.
    */
  public and(
    statement: string | Statement,
    values: any | any[] = []
  ) {
    this.addStatement(statement, values, 'AND');
    return this;
  }

  /**
    * Adds a new statement combined with 'OR'.
    * @param statement - The SQL statement to be added, either as a string or a Statement instance.
    * @param values - The values corresponding to the placeholders in the statement.
    * @returns The current Statement instance for method chaining.
    */
  public or(
    statement: string | Statement,
    values: any | any[] = []
  ) {
    this.addStatement(statement, values, 'OR');
    return this;
  }

  /**
    * Adds an IN condition to the statement.
    * @param column - The database column to compare.
    * @param values - The array of values for the IN condition.
    * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
    * @returns The current Statement instance for method chaining.
    */
  public in(
    column: string,
    values: any[],
    kind: StatementKind = 'AND'
  ) {
    const placeholders = values.map(() => '?').join(', ');
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
  public notIn(column: string, values: any[], kind: StatementKind = 'AND') {
    const placeholders = values.map(() => '?').join(', ');
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
    kind: StatementKind = 'AND'
  ) {
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
    kind: StatementKind = 'AND'
  ) {
    this.addStatement(`${column} NOT BETWEEN ? AND ?`, [start, end], kind);
    return this;
  }

  /**
    * Adds an IS NULL condition to the statement.
    * @param column - The database column to check for NULL.
    * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
    * @returns The current Statement instance for method chaining.
    */
  public isNull(
    column: string,
    kind: StatementKind = 'AND'
  ) {
    this.addStatement(`${column} IS NULL`, [], kind);
    return this;
  }

  /**
    * Adds an IS NOT NULL condition to the statement.
    * @param column - The database column to check for NOT NULL.
    * @param kind - The logical operator to combine this condition with previous ones ('AND' or 'OR').
    * @returns The current Statement instance for method chaining.
    */
  public isNotNull(
    column: string,
    kind: StatementKind = 'AND'
  ) {
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
    kind: StatementKind = 'AND'
  ) {
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
    kind: StatementKind = 'AND'
  ) {
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
    kind: StatementKind = 'AND'
  ) {
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
  public notILike(
    column: string,
    pattern: string,
    kind: StatementKind = 'AND'
  ) {
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
    kind: StatementKind = 'AND'
  ) {
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
    kind: StatementKind = 'AND'
  ) {
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
  ) {
    const parts = template.split('?');
    let statement = '';

    if (parts.length !== values.length + 1) {
      throw new Error('Number of placeholders does not match number of values');
    }

    for (let i = 0; i < values.length; i++) {
      statement += parts[i] + '?';
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
    joinWith: StatementKind = 'AND'
  ) {
    statements.forEach((stmt) => {
      const raw = stmt.returnRaw();
      this.addStatement(raw.statement, raw.values, joinWith);
    });

    return this;
  }

  /**
    * Checks if the statements have already been parsed.
    * This prevents re-parsing and ensures that the final SQL is only generated once.
    * @returns True if the statements have been parsed, false otherwise.
    */
  public hasParsed() {
    return this.parsedStatement !== null;
  }

  /**
    * Parses the collected statements into a single SQL string with placeholders.
    * It also adds the 'WHERE' keyword if required.
    * @param newLine - Whether to separate statements with new lines for readability (default is true).
    * @returns The final parsed SQL statement as a string.
    */
  private parseStatements(newLine = true) {
    if (this.hasParsed()) {
      return this.parsedStatement as string;
    }

    if (this.statements.length === 0) {
      this.parsedStatement = '';
      return this.parsedStatement;
    }
    let separator = newLine ? '\n ' : ' ';
    let index = this.index;
    let statement = this.statements.join(separator).replace(/\?/g, () => `$${index++}`);
    this.parsedStatement = this.addWhere ? `WHERE ${statement}` : statement;
    return this.parsedStatement;
  }

  /**
    * Builds the final SQL statement and the corresponding values array.
    * This is the method to call when the statement is complete and ready for execution.
    * @param newLine - Whether to separate statements with new lines for readability (default is true).
    * @returns An object containing the final SQL statement and the array of values.
    */
  public build(newLine = true) {
    return {
      statement: this.parseStatements(newLine),
      values: this.values
    }
  }

  /**
    * Provides access to the values array.
    * This is useful for retrieving the parameters to be used in the parameterized query execution.
    * @returns The array of values corresponding to the placeholders in the SQL statement.
    */
  public get params() {
    return this.values;
  }

  /**
    * Creates a deep copy of the current Statement instance.
    * This is useful when you want to duplicate the statement without affecting the original.
    * @returns A new Statement instance that is a clone of the current one.
    */
  public clone(): Statement {
    const clone = new Statement(this.index - 1);
    clone.statements = [...this.statements];
    clone.parsedStatement = this.parsedStatement;
    clone.values = [...this.values];
    clone.addWhere = this.addWhere;
    clone.index = this.index;
    return clone;
  }

  /**
    * Returns the raw SQL statement and values without parsing.
    * This is useful for debugging or when the raw format is needed.
    * @returns An object containing the raw SQL statement and the array of values.
    */
  private returnRaw() {
    const statement = this.statements.join('\n ');
    return {
      statement: statement,
      values: this.values
    }
  }
}
