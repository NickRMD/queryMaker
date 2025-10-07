import type SelectQuery from "../queryKinds/dml/select.js";
import type Statement from "../statementMaker.js";

type joinTypeBase = "INNER" | "LEFT" | "RIGHT" | "FULL";

export type joinType = Lowercase<joinTypeBase> | joinTypeBase;

/**
 * Join interface represents the base to a SQL JOIN clause.
 * It includes the type of join, an optional alias, and the condition for the join.
 */
interface JoinBase {
  /** The type of join: INNER, LEFT, RIGHT, or FULL. */
  type: joinType;
  /** An optional alias for the joined table. */
  alias?: string;
  /** The condition for the join, which can be a Statement or a raw SQL string. */
  on: Statement | string;
}

/**
 * Join interface represents a SQL JOIN clause.
 * It includes the type of join, the table to join, an optional alias, and the condition for the join.
 */
type JoinTable = JoinBase & {
  /** The name of the table to join. */
  table: string;
  subQuery?: never;
};

type JoinSubQuery = JoinBase & {
  /** A subquery to join. */
  subQuery: SelectQuery;
  table?: never;
};

type Join = JoinTable | JoinSubQuery;

export function isJoinTable(join: Join): join is JoinTable {
  return (join as JoinTable).table !== undefined;
}

export default Join;
