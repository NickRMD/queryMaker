import { Cte } from "./cteMaker.js";
import DeleteQuery from "./queryKinds/delete.js";
import InsertQuery from "./queryKinds/insert.js";
import SelectQuery from "./queryKinds/select.js";
import UpdateQuery from "./queryKinds/update.js";
import Statement from "./statementMaker.js";

/*
  * QueryMaker is a factory class that provides static methods to create instances of different query types.
  * It includes methods for creating SELECT, CREATE, DELETE, and UPDATE queries.
  * It also provides a method to create a Statement instance for building complex SQL statements.
  * Each method returns a new instance of the respective query class.
  */
class Query {

  constructor(
    private readonly deepAnalysisDefault: boolean = false
  ) {}

  /*
    * Initiates a new SELECT query.
    */
  public get select() {
    const selectQuery = new SelectQuery();
    selectQuery.build = (deepAnalysis: boolean = this.deepAnalysisDefault) => {
      return SelectQuery.prototype.build.call(selectQuery, deepAnalysis);
    }
    return selectQuery;
  }

  /*
    * Initiates a new DELETE query.
    */
  public get delete() {
    const deleteQuery = new DeleteQuery();
    deleteQuery.build = (deepAnalysis: boolean = this.deepAnalysisDefault) => {
      return DeleteQuery.prototype.build.call(deleteQuery, deepAnalysis);
    }
    return deleteQuery;
  }

  /*
    * Initiates a new UPDATE query.
    */
  public get update() {
    const updateQuery = new UpdateQuery();
    updateQuery.build = (deepAnalysis: boolean = this.deepAnalysisDefault) => {
      return UpdateQuery.prototype.build.call(updateQuery, deepAnalysis);
    }
    return updateQuery;
  }

  /*
    * Initiates a new INSERT query.
    */
  public get create() {
    const insertQuery = new InsertQuery();
    insertQuery.build = (deepAnalysis: boolean = this.deepAnalysisDefault) => {
      return InsertQuery.prototype.build.call(insertQuery, deepAnalysis);
    }
    return insertQuery;
  }

  /*
    * Initiates a new CTE (Common Table Expression) instance.
    * This can be used to define CTEs for use in queries.
    */
  public get cte() {
    return new Cte();
  }

  /*
    * Initiates a new SELECT query.
    */
  public static get select() {
    return new SelectQuery();
  }

  /*
    * Initiates a new DELETE query.
    */
  public static get delete() {
    return new DeleteQuery();
  }

  /*
    * Initiates a new UPDATE query.
    */
  public static get update() {
    return new UpdateQuery();
  }

  /*
    * Initiates a new INSERT query.
    */
  public static get create() {
    return new InsertQuery();
  }

  /*
    * Initiates a new Statement instance for building complex SQL statements.
    * This can be used to create WHERE clauses, JOIN conditions, etc.
    */
  public static get statement() {
    return new Statement();
  }

  /*
    * Initiates a new CTE (Common Table Expression) instance.
    * This can be used to define CTEs for use in queries.
    */
  public static get cte() {
    return new Cte();
  }

}

export default Query;
