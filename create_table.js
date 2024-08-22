const { Client } = require('pg');

console.log(123);

const client = new Client({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: '5432',
  database: 'mev_scrapper',
});

client
  .connect()
  .then(() => {
    console.log('Connected to PostgreSQL database');
    const createTable = `
      CREATE TABLE employees(
        id serial PRIMARY KEY,
        column1 integer,
        column2 integer
      );
      `;
    client.query(createTable, (err, result) => {
      console.log(result);
      if (err) {
        console.error('Error creating table', err);
      } else {
        console.log('Table created successfully');
      }

      client.end();
    });

    client
      .end()
      .then(() => {
        console.log('Connection to PostgreSQL closed');
      })
      .catch((err) => {
        console.error('Error closing connection', err);
      });
  })
  .catch((err) => {
    console.error('Error connecting to PostgreSQL database', err);
  });

console.log(123);
