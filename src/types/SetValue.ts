
/**
  * Interface representing a value to be set in a database operation.
  * It includes the column to be set, and either a direct value or a reference to another column.
  * Only one of 'from' or 'value' should be provided.
  */
export default interface SetValue {
  /** The column to be set. */
  setColumn: string;
  /** The column from which to take the value, if applicable. */
  from?: string;
  /** The value to be assigned to the column, if applicable. */
  value?: any;
}
