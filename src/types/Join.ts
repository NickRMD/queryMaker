import Statement from "../statementMaker.js";

export default interface Join {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  alias?: string;
  on: Statement | string;
}
