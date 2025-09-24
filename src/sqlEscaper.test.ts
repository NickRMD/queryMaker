import { describe, expect, it } from 'vitest';
import SqlEscaper from './sqlEscaper.js';
import sqlFlavor from './types/sqlFlavor.js';


describe('SQL Escaper', () => {

  it('should escape identifiers correctly', () => {
    const escaped = SqlEscaper.escape('columnName', '"', null, '""', null);
    expect(escaped).toBe('"columnName"');
  })

  it('should escape identifiers with special characters', () => {
    const escaped = SqlEscaper.escape('column"Name', '"', null, '""', null);
    expect(escaped).toBe('"column""Name"');
  });

  it('should escape single table name', () => {
    const escaped = SqlEscaper.escapeTableName('tableName', sqlFlavor.postgres);
    expect(escaped).toBe('"tableName"');
  });

  it('should escape multiple identifiers', () => {
    const escaped = SqlEscaper.escapeSelectIdentifiers(['column1', 'table.column2', 'column3 AS col3'], sqlFlavor.postgres);
    expect(escaped).toEqual(['"column1"', '"table"."column2"', '"column3" AS "col3"']);
  });

  it('should throw error for invalid AS clause', () => {
    expect(() => {
      SqlEscaper.escapeSelectIdentifiers(['column1 AS', 'AS col2'], sqlFlavor.postgres);
    }).toThrow('Invalid identifier with AS clause: column1 AS');

    expect(() => {
      SqlEscaper.escapeSelectIdentifiers(['AS col2'], sqlFlavor.postgres);
    }).toThrow('Invalid identifier with AS clause: AS col2');
  });

  it('should escape table names correctly', () => {
    const escaped = SqlEscaper.escapeTableName('schema.table', sqlFlavor.postgres);
    expect(escaped).toBe('"schema"."table"');
  });

  it('should throw error for invalid table name', () => {
    expect(() => {
      SqlEscaper.escapeTableName('schema..table', sqlFlavor.postgres);
    }).toThrow('Invalid table name: schema..table');
  });

  it('should not escape schema keywords', () => {
    const escaped = SqlEscaper.escapeTableName('$schema.table', sqlFlavor.postgres);
    const escaped2 = SqlEscaper.escapeTableName('$schema1.table', sqlFlavor.postgres);
    expect(escaped).toBe('$schema."table"');
    expect(escaped2).toBe('$schema1."table"');
  });

  it('should handle different SQL flavors', () => {
    const pgEscaped = SqlEscaper.escapeIdentifier('column', sqlFlavor.postgres);
    const mysqlEscaped = SqlEscaper.escapeIdentifier('column', sqlFlavor.mysql);
    const mssqlEscaped = SqlEscaper.escapeIdentifier('column', sqlFlavor.mssql);
    const sqliteEscaped = SqlEscaper.escapeIdentifier('column', sqlFlavor.sqlite);
    const oracleEscaped = SqlEscaper.escapeIdentifier('column', sqlFlavor.oracle);

    expect(pgEscaped).toBe('"column"');
    expect(mysqlEscaped).toBe('`column`');
    expect(mssqlEscaped).toBe('[column]');
    expect(sqliteEscaped).toBe('"column"');
    expect(oracleEscaped).toBe('"column"');
  });

  it('should escape identifiers with spaces', () => {
    const escaped = SqlEscaper.escapeIdentifier('column name', sqlFlavor.postgres);
    expect(escaped).toBe('"column name"');
  });

  it('should escape identifiers with dots', () => {
    const escaped = SqlEscaper.escapeIdentifier('table.column', sqlFlavor.postgres);
    expect(escaped).toBe('"table.column"');
  });

  it('should append schemas correctly', () => {
    const escaped1 = SqlEscaper.escapeTableName('$schema.table', sqlFlavor.postgres);
    const escaped2 = SqlEscaper.escapeTableName('$schema1.table', sqlFlavor.postgres);
    const escaped = escaped1 + ', ' + escaped2;
    expect(escaped).toBe('$schema."table", $schema1."table"');

    const appended = SqlEscaper.appendSchemas(escaped, ['someSchema', 'anotherSchema']);
    expect(appended).toBe('someSchema."table", anotherSchema."table"');
  });

  it('should throw error if no schemas to append', () => {
    expect(() => {
      SqlEscaper.appendSchemas('$schema.table', []);
    }).toThrow('Schema index 0 out of bounds for provided schemas. Provided schemas: []');
  });

  it('should throw if flavor is unsupported', () => {
    expect(() => {
      SqlEscaper.escapeIdentifier('column', 'unsupportedFlavor' as any);
    }).toThrowError('Unsupported SQL flavor: unsupportedFlavor');
  });

  it('should throw if table name or schema is invalid', () => {
    expect(() => {
      SqlEscaper.escapeTableName('.table', sqlFlavor.postgres);
    }).toThrow('Invalid table name with schema: .table');
  });

})
