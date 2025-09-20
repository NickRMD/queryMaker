
/**
  * Interface representing a table used in a SQL query with an optional alias.
  */
export default interface UsingTable {
  /** The name of the table. */
  table: string;
  /** An optional alias for the table. */
  alias: string | null;
}
