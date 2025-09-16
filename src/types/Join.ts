import Statement from "../statementMaker.js";

/**
  * Join interface represents a SQL JOIN clause.
  * It includes the type of join, the table to join, an optional alias, and the condition for the join.
  */
export default interface Join {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  alias?: string;
  on: Statement | string;
}
