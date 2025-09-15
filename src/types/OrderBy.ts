
/*
  * OrderBy interface represents sorting criteria for database queries or data collections.
  * It includes the field to sort by and the direction of sorting (ascending or descending).
  */
export default interface OrderBy {
  field: string;
  direction: 'ASC' | 'DESC';
}
