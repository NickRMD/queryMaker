import { match, P } from "ts-pattern";
import sqlFlavor from "./types/sqlFlavor.js";

/**
  * SqlEscaper provides static methods to escape SQL identifiers and values
  * according to different SQL dialects (flavors). It includes methods to escape
  * identifiers, table names, and to append schema names in queries.
  */
export default class SqlEscaper {

  /** Regex to identify schema placeholders like $schema, $schema1, $schema2, etc. */
  private static schemaRegex = /^\$schema\d*$/;

  /**
    * Escapes a given string value by wrapping it with the specified escape character
    * and replacing occurrences of the escape character within the value.
    * @param value - The string value to be escaped.
    * @param escapeChar - The character used to escape the value (default is double quote `"`).
    * @param escapeCharReplacement - The string to replace occurrences of the escape character (default is two double quotes `""`).
    * @returns The escaped string value.
    */
  public static escape(
    value: string,
    escapeChar: string = "\"",
    escapeCharReplacement: string = "\"\""
  ): string {
    return `${escapeChar}${value.replace(new RegExp(escapeChar, "g"), escapeCharReplacement)}${escapeChar}`;
  }

  /**
    * Replaces schema placeholders in the query with actual schema names from the provided array.
    * Placeholders are in the format $schema, $schema1, $schema2, etc.
    * @param query - The SQL query string containing schema placeholders.
    * @param schemas - An array of schema names to replace the placeholders.
    * @returns The SQL query string with schema names appended.
    * @throws Error if a placeholder index is out of bounds for the provided schemas array.
    */
  public static appendSchemas(
    query: string,
    schemas: string[] = []
  ) {
    return query.replace(/\$schema\d*/g, (match) => {
      const indexMatch = match.match(/\d+/);
      const index = indexMatch ? parseInt(indexMatch[0], 10) : 0;
      if (index < schemas.length) {
        return schemas[index]!;
      } else {
        throw new Error(
          [
            `Schema index ${index} out of bounds for provided schemas.`,
            `Provided schemas: [${schemas.join(", ")}]`
          ].join(" ")
        );
      }
    });
  }

  /**
    * Will escape an identifier for use in a SQL statement.
    * The identifier will be escaped according to the specified SQL flavor.
    * It will return a string of the escaped identifier.
    * @param identifier - The identifier to be escaped.
    * @param flavor - The SQL flavor to use for escaping (e.g., postgres, mysql, mssql, sqlite, oracle).
    * @returns The escaped identifier string.
    * @throws Error if the SQL flavor is unsupported.
    * @remarks If the identifier matches the schema regex (e.g., $schema), it will be returned as is without escaping.
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
      .with(P.union(sqlFlavor.postgres, sqlFlavor.sqlite), () => {
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
    * @param identifiers - The list of identifiers to be escaped.
    * @param flavor - The SQL flavor to use for escaping (e.g., postgres, mysql, mssql, sqlite, oracle).
    * @returns An array of escaped identifier strings.
    * @throws Error if an identifier with an AS clause is invalid.
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
        const columnParts = identifier.split(".");
        if (columnParts.length > 1) {
          return columnParts.map(part => this.escapeIdentifier(part.trim(), flavor)).join(".");
        }

        return this.escapeIdentifier(identifier.trim(), flavor);
      }
    });
  }

  /**
    * Will escape a table name for use in a SQL statement.
    * The table name will be escaped according to the specified SQL flavor.
    * It will return a string of the escaped table name.
    * It supports $schema.table format.
    * @param tableName - The table name to be escaped.
    * @param flavor - The SQL flavor to use for escaping (e.g., postgres, mysql, mssql, sqlite, oracle).
    * @returns The escaped table name string.
    * @throws Error if the table name is invalid.
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
