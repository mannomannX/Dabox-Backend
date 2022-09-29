"use strict";
const  express  =  require('express');
const  bodyParser  =  require('body-parser');
const cors = require('cors')
const  sqlite3  =  require('sqlite3').verbose();
const  jwt  =  require('jsonwebtoken');
const  bcrypt  =  require('bcryptjs');
const moment = require('moment')

const SECRET_KEY = "secretkey23456";

const  app  =  express();
const  router  =  express.Router();
app.use(cors())

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb' }))

router.use(bodyParser.urlencoded({ extended:  false }));
router.use(bodyParser.json());
const database = new sqlite3.Database("./my.db");

const  createUsersTable  = () => {
    const  sqlQuery  =  `
        CREATE TABLE IF NOT EXISTS users (
        id integer PRIMARY KEY,
        roles text,
        name text,
        vorname text,
        nachname text,
        adresse text,
        strasse text,
        hausnummer text,
        ort text,
        plz integer,
        sichtbarkeit text,
        categories text,
        isCouch text,
        email text UNIQUE,
        steuernummer text,
        password text,
        gekaufteCouchings text,
        eigeneCouchings text,
        rechnungen text,
        interests text)`;

    return  database.run(sqlQuery);
}

const  findUserByEmail  = (email, cb) => {
    return  database.get(`SELECT id, name, email, password FROM users WHERE email = ?`,[email], (err, row) => {
            cb(err, row)
    });
}

const  createUser  = (user, cb) => {
    console.log(user)
    return  database.run('INSERT INTO users (name, email, password) VALUES (?,?,?)',user, (err) => {
        cb(err)
    });
}

createUsersTable();

router.get('/', (req, res) => {
    res.status(200).send('This is an authentication server');
});

router.post('/register', (req, res) => {
    console.log(req.body);
    const  name  =  req.body.name;
    const  email  =  req.body.email;

    const  password  =  bcrypt.hashSync(req.body.password);

    createUser([name, email, password], (err)=>{
        if(err) return  res.status(500).send("Server error!");
        findUserByEmail(email, (err, user)=>{
            if (err) return  res.status(500).send('Server error!');  
            //const  expiresIn  =  24  *  60  *  60;
            const  expiresIn  =  60;
            const  accessToken  =  jwt.sign({ id:  user.id }, SECRET_KEY, {
                expiresIn:  expiresIn
            });
            res.status(200).send({ "user":  user, "access_token":  accessToken, "expires_in":  expiresIn, status: "ok" });
        });
    });
});


router.post('/login', (req, res) => {
    console.log(req.body)
    const  email  =  req.body.email;
    const  password  =  req.body.password;
    findUserByEmail(email, (err, user)=>{
        if (err) return  res.status(500).send('Server error!');
        if (!user) return  res.status(404).send('User not found!');
        const  result  =  bcrypt.compareSync(password, user.password);
        if(!result) return  res.status(401).send('Password not valid!');

        //const  expiresIn  =  24  *  60  *  60;
        const  expiresIn  =  60;
        const  accessToken  =  jwt.sign({ id:  user.id }, SECRET_KEY, {
            expiresIn:  expiresIn
        });
        res.status(200).send({ "user":  user, "access_token":  accessToken, "expires_in":  expiresIn, status: "ok" });
    });
});

router.post('/check-login', (req, res) => {
    try {
        let decodedJWT = jwt.decode(req.body.access_token);
        console.log(decodedJWT);
        let ablaufdatum = moment.unix(decodedJWT.exp).format();
        console.log(ablaufdatum);
        if (moment(ablaufdatum).isBefore(moment())) {
            console.log('is expired')
            res.status(200).send({ isExpired: 'true' });
        } else {
            console.log('is not expired')
            res.status(200).send({ isExpired: 'false' });
        }
    } catch(err) {
        console.log(err);
        res.status(500).send("Server error!");
    }
});

app.use(router);
const  port  =  process.env.PORT  ||  3000;
const  server  =  app.listen(port, () => {
    console.log('Server listening at http://localhost:'  +  port);
}); 