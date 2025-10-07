import { ColumnType } from "../queryUtils/Column.js";

/**
 * Contain all the possible column types in PostgreSQL
 * Reference: https://www.postgresql.org/docs/current/datatype.html
 */
export enum ColumnTypesEnum {
  // Numeric Types
  SMALLINT = "smallint",
  INTEGER = "integer",
  BIGINT = "bigint",
  DECIMAL = "decimal",
  NUMERIC = "numeric",
  REAL = "real",
  DOUBLE_PRECISION = "double precision",
  SERIAL = "serial",
  BIGSERIAL = "bigserial",
  SMALLSERIAL = "smallserial",
  MONEY = "money",

  // Character Types
  VARCHAR = "character varying",
  CHAR = "character",
  TEXT = "text",

  // Binary
  BYTEA = "bytea",

  // Date/Time
  TIMESTAMP = "timestamp",
  TIMESTAMPTZ = "timestamptz",
  DATE = "date",
  TIME = "time",
  TIMETZ = "timetz",
  INTERVAL = "interval",

  // Boolean
  BOOLEAN = "boolean",

  // Enumerated
  ENUM = "enum",

  // Geometric
  POINT = "point",
  LINE = "line",
  LSEG = "lseg",
  BOX = "box",
  PATH = "path",
  POLYGON = "polygon",
  CIRCLE = "circle",

  // Network
  CIDR = "cidr",
  INET = "inet",
  MACADDR = "macaddr",
  MACADDR8 = "macaddr8",

  // Bit Strings
  BIT = "bit",
  VARBIT = "bit varying",

  // Text Search
  TSVECTOR = "tsvector",
  TSQUERY = "tsquery",

  // UUID
  UUID = "uuid",

  // JSON
  JSON = "json",
  JSONB = "jsonb",

  // XML
  XML = "xml",

  // Arrays
  ARRAY = "array",

  // Composite
  COMPOSITE = "composite",

  // Range Types
  INT4RANGE = "int4range",
  INT8RANGE = "int8range",
  NUMRANGE = "numrange",
  TSRANGE = "tsrange",
  TSTZRANGE = "tstzrange",
  DATERANGE = "daterange",

  // Special
  OID = "oid",
  PG_LSN = "pg_lsn",
  TXID_SNAPSHOT = "txid_snapshot",
  REGPROC = "regproc",
  REGPROCEDURE = "regprocedure",
  REGOPER = "regoper",
  REGOPERATOR = "regoperator",
  REGCLASS = "regclass",
  REGTYPE = "regtype",
}

/**
 * Union type for ColumnTypesEnum keys
 */
export type ColumnTypesUnion = keyof typeof ColumnTypesEnum;

/**
 * Union type for ColumnTypesEnum values and keys
 */
export type ColumnTypes = ColumnTypesEnum | ColumnTypesUnion;

/**
 * Create a ColumnType of type VARCHAR with specified length
 * @param length - The maximum length of the VARCHAR column
 * @returns A ColumnType instance representing a VARCHAR column with the specified length
 */
function Varchar(length: number): ColumnType {
  return new ColumnType("VARCHAR", [length]);
}

/**
 * Create a ColumnType of type NUMERIC with specified precision and optional scale
 * @param precision - The total number of digits
 * @param scale - The number of digits to the right of the decimal point (optional)
 * @returns A ColumnType instance representing a NUMERIC column with the specified precision and scale
 */
function Numeric(precision: number, scale?: number): ColumnType {
  if (scale !== undefined) {
    return new ColumnType("NUMERIC", [precision, scale]);
  }
  return new ColumnType("NUMERIC", [precision]);
}

/**
 * Create a ColumnType of type DECIMAL with specified precision and optional scale
 * @param precision - The total number of digits
 * @param scale - The number of digits to the right of the decimal point (optional)
 * @returns A ColumnType instance representing a DECIMAL column with the specified precision and scale
 */
function Decimal(precision: number, scale?: number): ColumnType {
  if (scale !== undefined) {
    return new ColumnType("DECIMAL", [precision, scale]);
  }
  return new ColumnType("DECIMAL", [precision]);
}

/**
 * Create a ColumnType of type CHAR with specified length
 * @param length - The fixed length of the CHAR column
 * @returns A ColumnType instance representing a CHAR column with the specified length
 */
function Char(length: number): ColumnType {
  return new ColumnType("CHAR", [length]);
}

/**
 * Create a ColumnType of type VARBIT with specified length
 * @param length - The maximum length of the VARBIT column
 * @returns A ColumnType instance representing a VARBIT column with the specified length
 */
function VarBit(length: number): ColumnType {
  return new ColumnType("VARBIT", [length]);
}

/**
 * Create a ColumnType of type BIT with specified length
 * @param length - The fixed length of the BIT column
 * @returns A ColumnType instance representing a BIT column with the specified length
 */
function Bit(length: number): ColumnType {
  return new ColumnType("BIT", [length]);
}

export { Varchar, Numeric, Decimal, Char, VarBit, Bit };
