
/**
  * ColumnValue interface represents a column and its associated value.
  * It includes the column name and an optional value to be assigned to that column.
  */
export default interface ColumnValue {
  /** The name of the column. */
  column: string;
  /** The value to be assigned to the column. */
  value?: any;
}
