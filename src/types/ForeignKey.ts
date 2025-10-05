
/**
  * Represents a foreign key relationship in a database schema.
  * It includes the referenced table and column, as well as optional actions
  * to take on delete or update events.
  */
type ForeignKey = {
  table: string;
  column: string;
  onDelete?: Actions;
  onUpdate?: Actions;
};

/** Possible actions for foreign key constraints. */
export type Actions = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';

export default ForeignKey;
