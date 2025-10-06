import DdlQueryDefinition from "../ddlQueryDefinition.js";

export default abstract class TableQueryDefinition extends DdlQueryDefinition {
  /** Flag indicating whether to include IF NOT EXISTS clause. */
  protected ifNotExistsFlag: boolean = false;

  /**
   * Marks the table creation to include IF NOT EXISTS clause.
   * @returns The current instance for method chaining.
   */
  public ifNotExists(): this {
    this.ifNotExistsFlag = true;
    return this;
  }

  /**
   * Resets the IF NOT EXISTS clause for the table creation.
   * @returns The current instance for method chaining.
   */
  public resetIfNotExists(): this {
    this.ifNotExistsFlag = false;
    return this;
  }
}
