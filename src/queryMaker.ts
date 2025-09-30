import { Cte } from "./cteMaker.js";
import DeleteQuery from "./queryKinds/dml/delete.js";
import InsertQuery from "./queryKinds/dml/insert.js";
import SelectQuery from "./queryKinds/dml/select.js";
import Union from "./queryKinds/dml/union.js";
import UpdateQuery from "./queryKinds/dml/update.js";
import Statement from "./statementMaker.js";
import sqlFlavor from "./types/sqlFlavor.js";

/**
  * QueryMaker is a factory class that provides static methods to create instances of different query types.
  * It includes methods for creating SELECT, CREATE, DELETE, and UPDATE queries.
  * It also provides a method to create a Statement instance for building complex SQL statements.
  * Each method returns a new instance of the respective query class.
  */
class Query {

  /**
    * Creates an instance of QueryMaker.
    * @param deepAnalysisDefault - Optional boolean to set the default deep analysis behavior for query building.
    * @param flavor - Optional SQL flavor to tailor the query syntax (default is 'postgres').
    */
  constructor(
    private readonly deepAnalysisDefault: boolean = false,
    private readonly flavor = sqlFlavor.postgres
  ) {}

  /**
    * Initiates a new SELECT query.
    * @returns A new SelectQuery instance with a build method that respects the deepAnalysisDefault setting.
    */
  public get select(): SelectQuery {
    const selectQuery = new SelectQuery();
    (selectQuery as any).flavor = this.flavor;
    selectQuery.build = (deepAnalysis: boolean = this.deepAnalysisDefault) => {
      return SelectQuery.prototype.build.call(selectQuery, deepAnalysis);
    }
    return selectQuery;
  }

  /**
    * Initiates a new DELETE query.
    * @returns A new DeleteQuery instance with a build method that respects the deepAnalysisDefault setting.
    */
  public get delete(): DeleteQuery {
    const deleteQuery = new DeleteQuery();
    (deleteQuery as any).flavor = this.flavor;
    deleteQuery.build = (deepAnalysis: boolean = this.deepAnalysisDefault) => {
      return DeleteQuery.prototype.build.call(deleteQuery, deepAnalysis);
    }
    return deleteQuery;
  }

  /**
    * Initiates a new UPDATE query.
    * @returns A new UpdateQuery instance with a build method that respects the deepAnalysisDefault setting.
    */
  public get update(): UpdateQuery {
    const updateQuery = new UpdateQuery();
    (updateQuery as any).flavor = this.flavor;
    updateQuery.build = (deepAnalysis: boolean = this.deepAnalysisDefault) => {
      return UpdateQuery.prototype.build.call(updateQuery, deepAnalysis);
    }
    return updateQuery;
  }

  /**
    * Initiates a new INSERT query.
    * @returns A new InsertQuery instance with a build method that respects the deepAnalysisDefault setting.
    */
  public get create(): InsertQuery {
    const insertQuery = new InsertQuery();
    (insertQuery as any).flavor = this.flavor;
    insertQuery.build = (deepAnalysis: boolean = this.deepAnalysisDefault) => {
      return InsertQuery.prototype.build.call(insertQuery, deepAnalysis);
    }
    return insertQuery;
  }

  /**
    * Initiates a new CTE (Common Table Expression) instance.
    * This can be used to define CTEs for use in queries.
    * @returns A new Cte instance.
    */
  public get cte(): Cte {
    return new Cte();
  }

  /**
    * Initiates a new UNION query.
    * @returns A new Union instance with a build method that respects the deepAnalysisDefault setting.
    */
  public get union(): Union {
    const unionQuery = new Union();
    (unionQuery as any).flavor = this.flavor;
    unionQuery.build = (deepAnalysis: boolean = this.deepAnalysisDefault) => {
      return Union.prototype.build.call(unionQuery, deepAnalysis);
    }
    return unionQuery;
  }

  /**
    * Initiates a new SELECT query.
    * @returns A new SelectQuery instance.
    */
  public static get select(): SelectQuery {
    return new SelectQuery();
  }

  /**
    * Initiates a new DELETE query.
    * @returns A new DeleteQuery instance.
    */
  public static get delete(): DeleteQuery {
    return new DeleteQuery();
  }

  /**
    * Initiates a new UPDATE query.
    * @returns A new UpdateQuery instance.
    */
  public static get update(): UpdateQuery {
    return new UpdateQuery();
  }

  /**
    * Initiates a new INSERT query.
    * @returns A new InsertQuery instance.
    */
  public static get create(): InsertQuery {
    return new InsertQuery();
  }

  /**
    * Initiates a new Statement instance for building complex SQL statements.
    * This can be used to create WHERE clauses, JOIN conditions, etc.
    * @returns A new Statement instance.
    */
  public static get statement(): Statement {
    return new Statement();
  }

  /**
    * Initiates a new CTE (Common Table Expression) instance.
    * This can be used to define CTEs for use in queries.
    * @returns A new Cte instance.
    */
  public static get cte(): Cte {
    return new Cte();
  }

  /**
    * Initiates a new UNION query.
    * @returns A new Union instance.
    */
  public static get union(): Union {
    return new Union();
  }

}

export default Query;
