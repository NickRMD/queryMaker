
/*
  * Interface representing a table used in a SQL query with an optional alias.
  */
export default interface UsingTable {
  table: string;
  alias: string | null;
}
