const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2109',
  database: 'wpr2023'
});

connection.connect();

const createUserTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255) CHECK(CHAR_LENGTH(password) >= 6)
  );
`;

const createEmailTableQuery = `
  CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    subject VARCHAR(255) DEFAULT '(no subject)',
    body TEXT, 
    received_time DATETIME NOT NULL,
    attachment VARCHAR(255),
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id)
  );
`;

const insertUserDataQuery = `
  INSERT INTO users (username, email, password) VALUES
    ('User1', 'a@a.com', 'password1'),
    ('User2', 'b@b.com', 'password2'),
    ('User3', 'c@c.com', 'password3');
`;

const insertEmailDataQuery = `
  INSERT INTO emails (sender_id, recipient_id, subject, body, received_time) VALUES
    (1, 2, 'first(a to b)', 'This is the first email from user1 to user2.', '2023-03-01 15:10:10'),
    (1, 3, 'first(a to c)', 'This is the first email from user1 to user3.', '2022-04-01 12:10:10'),
    (2, 1, 'first(b to a)', 'This is the first email from user2 to user1.', '2024-05-01 13:10:10'),
    (3, 1, 'first(c to a)', 'This is the first email from user3 to user1.', '2021-06-01 11:10:10'),
    (2, 3, 'first(b to c)', 'This is the first email from user2 to user3.', '2022-07-01 10:10:10'),
    (3, 2, 'first(c to b)', 'This is the first email from user3 to user2.', '2023-09-01 19:10:10'),
    (2, 3, 'second(b to c)', 'This is the second email from user2 to user3.', '2020-09-01 20:10:10'),
    (3, 2, 'second(c to b)', 'This is the second email from user3 to user2.', '2020-01-01 01:10:10'),  
    (1, 2, 'second(a to b)', 'This is the second email from user1 to user2.', '2020-01-01 01:10:10'),
    (1, 2, 'third(a to b)', 'This is the third email from user1 to user2.', '2020-01-01 01:10:10'),
    (1, 2, 'fourth(a to b)', 'This is the fourth email from user1 to user2.', '2020-01-01 01:10:10'),
    (1, 3, 'second(a to c)', 'This is the second email from user1 to user3.', '2020-01-01 01:10:10'),
    (1, 3, 'third(a to c)', 'This is the third email from user1 to user3.', '2020-01-01 01:10:10');
`;


function setupDatabase() {
  connection.query(createUserTableQuery, (err) => {
    if (err) throw err;

    connection.query(createEmailTableQuery, (err) => {
      if (err) throw err;

      connection.query(insertUserDataQuery, (err) => {
        if (err) throw err;

        connection.query(insertEmailDataQuery, (err) => {
          if (err) throw err;

          console.log('Database setup completed.');
          connection.end();
        });
      });
    });
  });
}
setupDatabase();
