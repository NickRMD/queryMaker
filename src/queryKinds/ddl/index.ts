import sqlFlavor from '../../types/sqlFlavor.js';
import * as tables from './table/index.js';

export * as table from './table/index.js';
export * from './ddlQueryDefinition.js';
export { default as DdlQueryDefinition } from './ddlQueryDefinition.js';

/**
  * Class representing a Table for DDL operations.
  * This class provides methods to initiate DDL queries such as CREATE TABLE.
  */
export class Table {
  
  constructor(
    private deepAnalysis: boolean = false,
    private flavor = sqlFlavor.postgres
  ) {}

  /**
    * Initiates a new CREATE TABLE query.
    * @returns A new CreateTableQuery instance with a build method that respects the deepAnalysis setting.
    */
  public get create() {
    const query = new tables.CreateTableQuery();
    query.sqlFlavor(this.flavor);
    query.build = (deepAnalysis: boolean = this.deepAnalysis) => {
      return tables.CreateTableQuery.prototype.build.call(query, deepAnalysis);
    }
    return query;
  }

  /**
    * Initiates a new DROP TABLE query.
    * @returns A new DropTableQuery instance with a build method that respects the deepAnalysis setting.
    */
  public get drop() {
    const query = new tables.DropTableQuery();
    query.sqlFlavor(this.flavor);
    query.build = (deepAnalysis: boolean = this.deepAnalysis) => {
      return tables.DropTableQuery.prototype.build.call(query, deepAnalysis);
    }
    return query;
  }

  /**
    * Initiates a new ALTER TABLE query.
    * @returns A new AlterTableQuery instance with a build method that respects the deepAnalysis setting.
    */
  public get alter() {
    const query = new tables.AlterTableQuery();
    query.sqlFlavor(this.flavor);
    query.build = (deepAnalysis: boolean = this.deepAnalysis) => {
      return tables.AlterTableQuery.prototype.build.call(query, deepAnalysis);
    }
    return query;
  }
}
