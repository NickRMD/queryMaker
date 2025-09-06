import QueryDefinition from "./queryKinds/query.js";

export default class BuiltQuery {
  private sql: string;
  private parameters: any[];
  private analyzedSql: string | null = null;
  private analyzedParameters: any[] | null = null;

  constructor(sql: string, parameters: any[] = []) {
    this.sql = sql;
    this.parameters = parameters;
  }

  public get text(): string {
    if (this.analyzedSql === null) {
      const analyzed = QueryDefinition
        .reAnalyzeParsedQueryForDuplicateParams(this.sql, this.parameters);
      this.analyzedSql = analyzed.text;
      this.analyzedParameters = analyzed.values;
    }

    return this.analyzedSql;
  }

  public get values(): any[] {
    if (this.analyzedParameters === null) {
      const analyzed = QueryDefinition
        .reAnalyzeParsedQueryForDuplicateParams(this.sql, this.parameters);
      this.analyzedSql = analyzed.text;
      this.analyzedParameters = analyzed.values;
    }
    return this.analyzedParameters;
  }
}
