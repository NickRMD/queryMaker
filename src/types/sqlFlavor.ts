
/**
  * Enumeration of supported SQL flavors.
  * This enum helps in identifying the SQL dialect being used,
  * which can affect query syntax and features.
  */
enum sqlFlavor {
  postgres = "postgres",
  mysql = "mysql",
  sqlite = "sqlite",
  mssql = "mssql",
  oracle = "oracle"
}

export default sqlFlavor;
