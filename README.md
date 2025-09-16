# SimpleQueryMaker (SQM)
QueryMaker is a simple tool to help you create SQL queries quickly and easily. 
It provides a user-friendly interface to build queries without needing to write SQL code manually.

You don't have to rely on an ORM (Object-Relational Mapping) library to interact with your database. 
Instead, you can use QueryMaker to generate SQL queries that you can execute directly against your database
by using your preferred database client (e.g., `pg` for PostgreSQL, `mysql2` for MySQL, etc.).

## Focus on PostgreSQL
While QueryMaker is designed to be compatible with multiple SQL database systems, it primarily focuses on PostgreSQL.
This means that some features and optimizations may be specific to PostgreSQL, but the core functionality should work with other SQL databases as well.

## Features
- User-friendly interface to build SQL queries
- Support for SELECT, INSERT, UPDATE, DELETE queries
- Ability to add WHERE clauses, JOINs, ORDER BY, GROUP BY, and more
- Export generated SQL queries for use in your application
- Lightweight and easy to integrate into your existing projects
- No dependencies on ORM libraries
- Compatible with multiple SQL database systems (focusing on PostgreSQL)
- Open-source and customizable

## Powerful search conditions
The `Query.statement` builder allows you to create complex search
conditions using logical operators like AND and OR. You can chain multiple conditions together to form intricate queries.
Or even using prebuilt search conditions utilizing the `search()` method, which allows you to
use fulltext search, similarity search (fuzzy search, trigram search), and other advanced search techniques like fts using TS Vector.

## Typescript support
QueryMaker is built with TypeScript, providing strong typing and autocompletion support. This helps you catch errors early and improves your development experience.

## Future Plans
- Support for more SQL features and clauses.
- Add more search techniques and optimizations.
- Improve documentation and provide more examples.
- Create a pagination helper for easier data retrieval.
- Make tests using Jest or another testing framework.
- Add other query kinds like `CREATE TABLE`, `ALTER TABLE`, etc.
- Quality of like improvements for multi-schema tenancy support.

## Installation
You can install QueryMaker via npm:

```bash
my-project$ npm install sqm
```

## Usage
Here's a simple example of how to use QueryMaker to create a SELECT query:

```ts
import Query from 'sqm';

const query = Query.select
    .from('users', 'u')
    .where(
        Query.statement
            .and('u.age > ?', 18)
            .or('u.status = ?', 'active')
    ).orderBy({ field: 'u.created_at', direction: 'DESC' })
    .limit(10)
    .offset(0);

const { text, values } = query.build();
console.log(text); // Generated SQL query
console.log(values); // Values for parameterized query
```

For an INSERT query, you can do something like this:

```ts
import Query from 'sqm';

const insertQuery = Query.create
    .into('users')
    .values([
        { column: 'name', value: 'John Doe' },
        { column: 'email', value: 'example@example.com' },
        { column: 'age', value: 30 }
        // ... more values
    ]);

// ...
```

For an UPDATE query:

```ts
import Query from 'sqm';

const updateQuery = Query.update
    .from('users')
    .set([
        { column: 'name', value: 'Jane Doe' },
        { column: 'age', value: 31 }
        // ... more values
    ])
    .where(
        Query.statement
            .and('id = ?', 1)
    );

// ...
```

For a DELETE query:

```ts
import Query from 'sqm';

const deleteQuery = Query.delete
    .from('users')
    .where(
        Query.statement
            .and('id = ?', 1)
    );

// ...
```


For creating an statement:

```ts
import Query from 'sqm';

// Statements can be started with either 'and', 'or', or even other methods.
const statement = Query.statement
    .and('age > ?', 18)
    .or('status = ?', 'active');

```
