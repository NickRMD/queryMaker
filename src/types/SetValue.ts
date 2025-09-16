
/**
  * Interface representing a value to be set in a database operation.
  * It includes the column to be set, and either a direct value or a reference to another column.
  */
export default interface SetValue {
  setColumn: string;
  from?: string;
  value?: any;
}
