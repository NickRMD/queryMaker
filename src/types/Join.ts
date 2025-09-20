import Statement from "../statementMaker.js";

type joinTypeBase = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

export type joinType = Lowercase<joinTypeBase> | joinTypeBase;

/**
  * Join interface represents a SQL JOIN clause.
  * It includes the type of join, the table to join, an optional alias, and the condition for the join.
  */
export default interface Join {
  /** The type of join: INNER, LEFT, RIGHT, or FULL. */
  type: joinType;
  /** The name of the table to join. */
  table: string;
  /** An optional alias for the joined table. */
  alias?: string;
  /** The condition for the join, which can be a Statement or a raw SQL string. */
  on: Statement | string;
}
