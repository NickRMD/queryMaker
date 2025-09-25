import Query from "./queryMaker.js";
import Statement, { StatementKind } from "./statementMaker.js";


/**
  * SearchModule class provides methods for building search-related SQL conditions.
  * It includes methods for full-text search, word-by-word search, and fuzzy search using trigram similarity.
  * Each method modifies the provided Statement instance to add the appropriate search conditions.
  */
export default class SearchModule {

  /**
    * Creates an instance of SearchModule.
    * @param statement - The Statement instance to which search conditions will be added.
    */
  constructor(
    private statement: Statement,
  ) {}

  /**
    * Performs a full-text search on a specified field with the given query.
    * It supports case-insensitive searches and allows combining conditions with AND/OR.
    * The method uses the LIKE or ILIKE operator based on the case sensitivity requirement.
    * @param field - The database field to search.
    * @param query - The search query string.
    * @param caseInsensitive - Whether the search should be case-insensitive (default is true).
    * @param statementKind - The kind of statement to combine with (default is 'AND').
    * @returns The modified Statement instance with the added full-text search condition.
    */
  public fulltext(
    field: string,
    query: string,
    caseInsensitive: boolean = true,
    statementKind: StatementKind = 'AND'
  ) {
    if (caseInsensitive) {
      this.statement.ilike(field, `%${query}%`, statementKind);
    } else {
      this.statement.like(field, `%${query}%`, statementKind);
    }

    return this.statement;
  }

  /**
    * Performs a full-text search using PostgreSQL's full-text search capabilities.
    * It constructs a ts_vector and ts_query for more advanced search functionality.
    * The method allows specifying a text search configuration and combining conditions with AND/OR.
    * @param field - The database field to search.
    * @param query - The search query string.
    * @param config - The text search configuration to use (default is 'simple').
    * @param statementKind - The kind of statement to combine with (default is 'AND').
    * @returns The modified Statement instance with the added full-text search condition.
    */
  public fulltextTsVector(
    field: string,
    query: string,
    config: string = 'simple',
    statementKind: StatementKind = 'AND'
  ) {
    const tsQuery = query
      .split(' ')
      .filter(word => word.trim())
      .map(word => `${word}:*`)
      .join(' & ');

    const tsVectorCondition = Query.statement.raw(
      '',
      `to_tsvector(?, ${field}) @@ to_tsquery(?, ?)`,
      config,
      config,
      tsQuery
    );

    if (statementKind === 'AND') {
      this.statement.and(tsVectorCondition);
    } else {
      this.statement.or(tsVectorCondition);
    }

    return this.statement;
  }

  /**
    * Performs a word-by-word search on a specified field with the given query.
    * It splits the query into individual words and searches for each word separately.
    * The method supports case-insensitive searches and allows combining conditions with AND/OR.
    * @param field - The database field to search.
    * @param query - The search query string.
    * @param caseInsensitive - Whether the search should be case-insensitive (default is true).
    * @param statementKind - The kind of statement to combine with (default is 'AND').
    * @returns The modified Statement instance with the added word-by-word search conditions.
    */
  public wordByWord(
    field: string,
    query: string,
    caseInsensitive: boolean = true,
    statementKind: StatementKind = 'AND'
  ) {
    const words = query.split(' ').filter(word => word.trim());
    words.forEach(word => {
      if (caseInsensitive) {
        this.statement.ilike(field, `%${word}%`, statementKind);
      } else {
        this.statement.like(field, `%${word}%`, statementKind);
      }
    });

    return this.statement;
  }

  /**
    * Performs a fuzzy search using trigram similarity on a specified field with the given query.
    * It uses PostgreSQL's pg_trgm extension to find similar strings based on a similarity threshold.
    * The method allows specifying the similarity threshold and combining conditions with AND/OR.
    * @param field - The database field to search.
    * @param query - The search query string.
    * @param similarityThreshold - The similarity threshold (default is 0.3).
    * @param statementKind - The kind of statement to combine with (default is 'AND').
    * @returns The modified Statement instance with the added fuzzy search conditions.
    */
  public fuzzyTrigram(
    field: string,
    query: string,
    similarityThreshold: number = 0.3,
    statementKind: StatementKind = 'AND'
  ) {
    const fuzzyStatement = Query.statement
      .raw('', `${field} % ?`, query)
      .raw('AND', `similarity(${field}, ?) >= ?`, query, similarityThreshold);

    if (statementKind === 'AND') {
      this.statement.and(fuzzyStatement);
    } else {
      this.statement.or(fuzzyStatement);
    }
    
    return this.statement;
  }


}
