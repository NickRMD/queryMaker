
type DirectionBase = 'ASC' | 'DESC';
export type Direction = Lowercase<DirectionBase> | DirectionBase;

/**
  * OrderByField interface represents sorting criteria for database queries or data collections.
  * It includes the field to sort by and the direction of sorting (ascending or descending).
  */
export interface OrderByField {
  /** The field to sort by. */
  field: string;
  /** The direction of sorting: 'ASC' for ascending or 'DESC' for descending. */
  direction: Direction;
  column?: never;
}

/**
  * OrderByColumn interface represents sorting criteria for database queries or data collections.
  * It includes the column to sort by and the direction of sorting (ascending or descending).
  */
export interface OrderByColumn {
  /** The column to sort by. */
  column: string;
  /** The direction of sorting: 'ASC' for ascending or 'DESC' for descending. */
  direction: Direction;
  field?: never;
}

type OrderBy = OrderByField | OrderByColumn

export function isOrderByField(obj: any): obj is OrderByField {
  return obj && typeof obj === 'object' && 'field' in obj && 'direction' in obj;
}

export default OrderBy;
