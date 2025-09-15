
/*
  * ColumnValue interface represents a column and its associated value.
  * It includes the column name and an optional value to be assigned to that column.
  */
export default interface ColumnValue {
  column: string;
  value?: any;
}
