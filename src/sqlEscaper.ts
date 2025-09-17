import { match } from "ts-pattern";
import { union } from "ts-pattern/dist/patterns";
import sqlFlavor from "./types/sqlFlavor";

export default class SqlEscaper {

  private static schemaRegex = /^\$schema\d*$/;

  public static escape(
    value: string,
    escapeChar: string = "\"",
    escapeCharReplacement: string = "\"\""
  ): string {
    return `${escapeChar}${value.replace(new RegExp(escapeChar, "g"), escapeCharReplacement)}${escapeChar}`;
  }

  /**
    * Will escape an identifier for use in a SQL statement.
    * The identifier will be escaped according to the specified SQL flavor.
    * It will return a string of the escaped identifier.
    */
  public static escapeIdentifier(
    identifier: string,
    flavor: sqlFlavor
  ): string {

    if (identifier) {
      const isSchema = this.schemaRegex.test(identifier);
      if (isSchema) {
        return identifier;
      }
    }

    const escapedIdentifier = match(flavor)
      .returnType<string | undefined>()
      .with(union(sqlFlavor.postgres, sqlFlavor.sqlite), () => {
        return this.escape(identifier, "\"", "\"\"");
      })
      .with(sqlFlavor.mysql, () => {
        return this.escape(identifier, "`", "``");
      })
      .with(sqlFlavor.mssql, () => {
        return this.escape(identifier, "[", "]]");
      })
      .with(sqlFlavor.oracle, () => {
        return this.escape(identifier, "\"", "\"\"");
      })
      .exhaustive();

    if (escapedIdentifier) {
      return escapedIdentifier;
    } else {
      throw new Error(`Unsupported SQL flavor: ${flavor}`);
    }
  }

  /**
    * Will escape a list of identifiers for use in a SELECT statement.
    * The identifiers will be escaped according to the specified SQL flavor.
    * It will return a string array (string[]) of the escaped identifiers.
    */
  public static escapeSelectIdentifiers(
    identifiers: string[],
    flavor: sqlFlavor
  ): string[] {
    return identifiers.map(identifier => {
      const parts = identifier.split(/\s+AS\s+/i);
      if (parts.length === 2) {
        const [column, alias] = parts;

        if (!column || !alias) {
          throw new Error(`Invalid identifier with AS clause: ${identifier}`);
        }

        const columnParts = column.split(".");
        const escapedColumn = columnParts.map(part => this.escapeIdentifier(part.trim(), flavor)).join(".");
        const escapedAlias = this.escapeIdentifier(alias.trim(), flavor);
        return `${escapedColumn} AS ${escapedAlias}`;
      } else {
        return this.escapeIdentifier(identifier.trim(), flavor);
      }
    });
  }

  /**
    * Will escape a table name for use in a SQL statement.
    * The table name will be escaped according to the specified SQL flavor.
    * It will return a string of the escaped table name.
    * It supports $schema.table format.
    */
  public static escapeTableName(
    tableName: string,
    flavor: sqlFlavor
  ): string {
    const parts = tableName.split(".");
    if (parts.length === 2) {
      const [schema, table] = parts;

      if (!schema || !table) {
        throw new Error(`Invalid table name with schema: ${tableName}`);
      }

      const escapedSchema = this.escapeIdentifier(schema.trim(), flavor);
      const escapedTable = this.escapeIdentifier(table.trim(), flavor);
      return `${escapedSchema}.${escapedTable}`;
    } else if (parts.length === 1) {
      return this.escapeIdentifier(tableName.trim(), flavor);
    } else {
      throw new Error(`Invalid table name: ${tableName}`);
    }
  }

}
