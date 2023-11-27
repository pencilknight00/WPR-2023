const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const mysql = require('mysql2');
const multer = require('multer');
const upload = multer({ dest: 'D:\\mon chung\\upload/' }); 
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '2109',
    database: 'wpr2023'
})

connection.connect((err) => {
    if(err) throw err
    else console.log('connect to the database successfully!');
})
app.get('/', (req, res) => {
    res.render("pages/sign_in", { msg: undefined});
})
app.get('/sign_in', (req, res) => {
    if (req.cookies.user_name) {
        return res.redirect('/inbox');
    }
    res.render('pages/sign_in', { msg: undefined});
})
app.get('/sign_out', (req, res) => {
    res.clearCookie('user_id');
    
    res.clearCookie('user_name');
    res.render('pages/sign_in', {msg: undefined});
})
app.post('/sign_in', (req,res) =>{
    function getIdByUsername(username) {
        return connection.promise().query('SELECT id FROM users WHERE username = ?', username);
    }
    let { username, password } = req.body;
    let uname = req.body.username;
    
    connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], async (err, results) => {
        if (err) {
            console.error('Error querying the database: ', err);
            res.status(500).json({ error: 'Internal Server Error' });
            res.redirect('/sign_in');
            return;
        }

        if (results.length === 0) {
            res.render('pages/sign_in', {
                msg: 'Invalid username or password.',
            });
            return;
        }
        const getID = await getIdByUsername(uname);
        
        if (getID.length > 0) {
            const uid = getID[0][0].id;
            res.cookie('user_id', uid, {
            maxAge: 600000
        });
        }   
        res.cookie('user_name', uname, {
            maxAge: 600000
            });
        res.redirect('/inbox');
    });
});

app.get('/sign_up', (req, res) => {
    res.render('pages/sign_up');
});

app.post('/sign_up', async (req, res) => {
    try {
      let { fullname, email, password, re_password } = req.body;
      let successMsg = undefined;
      let mistakes = {};
  
      if (fullname === undefined || fullname === '') {
        mistakes.username = "Please enter username!";
      } else {
        let [results_username] = await connection.promise().query('SELECT * FROM users WHERE username = ?', [fullname]);
        if (results_username.length !== 0) {
          // username existed
          mistakes.username = `Username ${fullname} is already used!`;
        }
  
        let [results_email] = await connection.promise().query('SELECT * FROM users WHERE email = ?', [email]);
  
        if (results_email.length !== 0) {
          // email existed
          mistakes.email = `Email ${email} is already used!`;
        }
          //password length >= 6 characters
        if (password === undefined || password.length < 6) {
          mistakes.password = "Please enter a valid password!";
        }
        
        // Make sure the user re-enters the password correctly
        if (re_password !== password) {
          mistakes.re_password = "Please re-enter the password correctly!";
        }
          //sign up successfully, send successMsg
        if (Object.keys(mistakes).length === 0) {
          await connection.promise().query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [fullname, email, password]);
          successMsg = "Congratulations!";
        }
      }
  
      res.render('pages/sign_up', {
        msg: successMsg,
        err: mistakes,
        params: req.body
      });
  
    } catch (error) {
      console.error(error);
      res.redirect('/sign_up');
    }
  });

app.get('/inbox', async (req, res) => {
    let name =  req.cookies.user_name;
    let id =  req.cookies.user_id;
    let page = parseInt(req.query.page) || 1; 
    
    let inbox = [];
    let senders_name = [];
    let subjects = [];
    let bodies = [];
    let received_time = [];
    
    
    if (name !== undefined) {
            try {
        const totalEmails = await new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as total FROM emails WHERE recipient_id = ?', [id], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result[0].total);
                }
            });
        });

        const totalPages = Math.ceil(totalEmails / 5);
        const offset = (page - 1) * 5;

        const results = await new Promise((resolve, reject) => {
            connection.query('SELECT * FROM emails WHERE recipient_id = ? LIMIT ?, ?', [id, offset, 5], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        if (results.length > 0) {
            for (const mail of results) {
                const sender = await new Promise((resolve, reject) => {
                    connection.query('SELECT username FROM users WHERE id = ?', [mail.sender_id], (err, sender) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(sender[0].username);
                        }
                    });
                });
                senders_name.push(sender);
                const subject = mail.subject || '(no subject)';
                subjects.push(subject);
                bodies.push(mail.body);
                const date = new Date(mail.received_time);
                const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
                received_time.push(formattedDate);
            }
        }

        for (let i = 0; i < senders_name.length; i += 1) {
            inbox.push({ sender: senders_name[i], subject: subjects[i], body: bodies[i], received_time: received_time[i], emailId: results[i].id });
        }

        res.render(`pages/inbox`, { fullname: name, inboxes: inbox, totalPages, currentPage: page });

    } catch (error) {
        console.error(error);
        }
    } else {
        res.status(403).send('Access Denied. You are not recognized. <br />Please sign in <a href="/sign_in">here</a>');

        };
    
});

app.get('/outbox', async (req, res) => {
    let name =  req.cookies.user_name;
    let id =  req.cookies.user_id;
    let page = parseInt(req.query.page) || 1; 
    
    let outbox = [];
    let recipients_name = [];
    let subjects = [];
    let bodies = [];
    let received_time = [];
    if (name !== undefined) {
            try {
        const totalEmails = await new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as total FROM emails WHERE sender_id = ?', [id], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result[0].total);
                }
            });
        });

        const totalPages = Math.ceil(totalEmails / 5);
        const offset = (page - 1) * 5;

        const results = await new Promise((resolve, reject) => {
            connection.query('SELECT * FROM emails WHERE sender_id = ? LIMIT ?, ?', [id, offset, 5], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        if (results.length > 0) {
        for (const mail of results) {
            const recipent = await new Promise((resolve, reject) => {
                connection.query('SELECT username FROM users WHERE id = ?', mail.recipient_id, (err, recipent) => {
                     if (err) {
                        reject(err);
                     } else {
                         resolve(recipent[0].username);
                    }
                });
            });
               recipients_name.push(recipent);
               const subject = mail.subject || '(no subject)';
              subjects.push(subject);
             bodies.push(mail.body);
             const date = new Date(mail.received_time);
                const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
                received_time.push(formattedDate);
         }
      }

        for (let i = 0; i < recipients_name.length; i += 1) {
            outbox.push({ recipient: recipients_name[i], subject: subjects[i], body: bodies[i], received_time: received_time[i], emailId: results[i].id });
        }

        res.render(`pages/outbox`, { fullname: name, outboxes: outbox, totalPages, currentPage: page});

    } catch (error) {
        console.error(error);
        }
    } else {
        res.status(403).send('Access Denied. You are not recognized. <br />Please sign up <a href="/sign_in">here</a>');

        };
    
});

app.get('/compose', (req, res) => {
    let name = req.cookies.user_name;
        if(name !== undefined){
            const getUsersQuery = 'SELECT id, username FROM users';
    
            connection.query(getUsersQuery, (err, users) => {
        if (err) {
            console.error('Error fetching users:', err);
            res.status(500).send('Error fetching users');
        } else {
            res.render(`pages/compose`, { fullname: name, users: users });
        }
        });
        } else {
            res.status(403).send('Access Denied. You are not recognized. <br />Please sign up <a href="/sign_in">here</a>');

        };
});

app.post('/compose',upload.single('attachment'), (req, res) => {
    let { recipient, subject, body } = req.body;
    let senderId = req.cookies.user_id;
    let received_time = new Date();
    let attachment = req.file;

    const insertQuery = 'INSERT INTO emails (sender_id, recipient_id, subject, body, received_time, attachment) VALUES (?, ?, ?, ?, ?, ?)';

    connection.query(insertQuery, [senderId, recipient, subject, body, received_time, attachment ? attachment.path : null], (err, results) => {
        if (err) {
            console.error('Error inserting email data:', err);
            res.status(500).send('Error storing email data');
        } else {
            console.log('Email data stored in the database:', results);
            res.redirect('/compose');
        }

    });
});

app.get('/email_detail/:emailId', async (req, res) => {
    let name = req.cookies.user_name;
    const emailId = req.params.emailId;

        if(name !== undefined){
            try {
                const emailDetails = await new Promise((resolve, reject) => {
                    connection.query('SELECT * FROM emails WHERE id = ?', [emailId], (err, results) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results[0]); // Assuming the query returns a single email based on ID
                        }
                    });
                });
        
                if (emailDetails) {
                    const senderName = await new Promise((resolve, reject) => {
                        connection.query('SELECT username FROM users WHERE id = ?', [emailDetails.sender_id], (err, sender) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(sender[0].username);
                            }
                        });
                    });
        
                    const recipientName = await new Promise((resolve, reject) => {
                        connection.query('SELECT username FROM users WHERE id = ?', [emailDetails.recipient_id], (err, recipient) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(recipient[0].username);
                            }
                        });
                    });
                    const date = new Date(emailDetails.received_time);
                    const rec_time = new Intl.DateTimeFormat('en-US', {  month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
                    
                    res.render('pages/email_detail', {
                        fullname: name,
                        subject: emailDetails.subject || '(no subject)',
                        senderName,
                        recipientName,
                        received_time: rec_time,
                        body: emailDetails.body
                    });
                } else {
                    // Handle case where email with specified ID is not found
                    res.status(404).send('Email not found');
                }
        
            } catch (error) {
                console.error(error);
                // Handle the error appropriately
                res.status(500).send('Internal Server Error');
            }
            
        } else {
            res.status(403).send('Access Denied. You are not recognized. <br />Please sign up <a href="/sign_in">here</a>');

        };
})

app.listen(8000);