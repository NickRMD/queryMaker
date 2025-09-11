# SimpleQueryMaker (SQM)
QueryMaker is a simple tool to help you create SQL queries quickly and easily. It provides a user-friendly interface to build queries without needing to write SQL code manually.

You don't have to rely on an ORM (Object-Relational Mapping) library to interact with your database. Instead, you can use QueryMaker to generate SQL queries that you can execute directly against your database.

## Features
- User-friendly interface to build SQL queries
- Support for SELECT, INSERT, UPDATE, DELETE queries
- Ability to add WHERE clauses, JOINs, ORDER BY, GROUP BY, and more
- Export generated SQL queries for use in your application
- Lightweight and easy to integrate into your existing projects
- No dependencies on ORM libraries
- Compatible with multiple SQL database systems (focusing on PostgreSQL)
- Open-source and customizable

## Installation
You can install QueryMaker via npm:

```bash
my-project$ npm install sqm
```

## Usage
Here's a simple example of how to use QueryMaker to create a SELECT query:

```javascript
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
