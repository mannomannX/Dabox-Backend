"use strict";
const  express  =  require('express');
const  bodyParser  =  require('body-parser');
const cors = require('cors')
const  sqlite3  =  require('sqlite3').verbose();
const  jwt  =  require('jsonwebtoken');
const  bcrypt  =  require('bcryptjs');
const moment = require('moment')
const {PNG} = require('pngjs');
const jsqr = require('jsqr');
var QRCode = require('qrcode');

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
        name text,
        email text UNIQUE,
        password text,
        profile_image text)`;

    return  database.run(sqlQuery);
}

const  createPartyTable  = () => {
    const  sqlQuery  =  `
        CREATE TABLE IF NOT EXISTS partys (
        id integer PRIMARY KEY,
        owner_id integer,
        party_name text,
        box_id integer)`;

    return  database.run(sqlQuery);
}

const  createInviteCodesTable  = () => {
    const  sqlQuery  =  `
        CREATE TABLE IF NOT EXISTS invite_codes (
        id integer PRIMARY KEY,
        owner_id integer,
        party_id text,
        invite_code text,
        qr_code_picture text,
        expiryDate text)`;

    return  database.run(sqlQuery);
}

const  createBoxTable  = () => {
    const  sqlQuery  =  `
        CREATE TABLE IF NOT EXISTS boxes (
        id integer PRIMARY KEY,
        owner_id integer,
        box_name text,
        party_id integer)`;

    return  database.run(sqlQuery);
}

const  createGuestsTable  = () => {
    const  sqlQuery  =  `
        CREATE TABLE IF NOT EXISTS guests (
        id integer PRIMARY KEY,
        party_id integer,
        guest_id integer)`;

    return  database.run(sqlQuery);
}

const  findUserByEmail  = (email, cb) => {
    return  database.get(`SELECT id, name, email, password, profile_image FROM users WHERE email = ?`,[email], (err, row) => {
            cb(err, row)
    });
}

const  createUser  = (user, cb) => {
    console.log(user)
    return  database.run('INSERT INTO users (name, email, password, profile_image) VALUES (?,?,?,?)',user, (err) => {
        cb(err)
    });
}

const  updateUserName  = (newName, id, cb) => {
    return  database.run('UPDATE users SET name = ? WHERE id = ?',[newName, id], (err) => {
        cb(err)
    });
}

const  updateProfileImage  = (profile_image, id, cb) => {
    return  database.run('UPDATE users SET profile_image = ? WHERE id = ?',[profile_image, id], (err) => {
        cb(err)
    });
}

const  createParty  = (party, cb) => {
    console.log(party)
    return  database.run('INSERT INTO partys (owner_id, party_name, box_id) VALUES (?,?,?)',party, (err) => {
        cb(err)
    });
}

const  createGuest  = (guest, cb) => {
    console.log(guest)
    return  database.run('INSERT INTO guests (party_id, guest_id) VALUES (?,?)',guest, (err) => {
        cb(err)
    });
}

const  createBox  = (box, cb) => {
    console.log(box)
    return  database.run('INSERT INTO boxes (owner_id, box_name, party_id) VALUES (?,?,?)',box, (err) => {
        cb(err)
    });
}

const  createInvitation  = (invitation, cb) => {
    console.log(invitation)
    return  database.run('INSERT INTO invite_codes (owner_id, party_id, invite_code, qr_code_picture, expiryDate) VALUES (?,?,?,?,?)',invitation, (err) => {
        cb(err)
    });
}

const  getAllActiveInvitations  = (cb) => {
    let activeInvitations = []
    return  database.all(`SELECT * FROM invite_codes`,[], (err, row) => {
            /*row.forEach((item) => {
                if(moment(item.expiryDate).isAfter(moment())) {
                    activeInvitations.push(item);
                }
            })*/
            cb(err, row)
    });
}

const  findPartysByGuestId  = (id, cb) => {
    return  database.all(`SELECT party_id, guest_id FROM guests WHERE guest_id = ?`,[id], (err, row) => {
            cb(err, row)
    });
}

const  findGuestsOfSamePartysAsMe  = (myPartys, cb) => {
    return  database.all(`SELECT party_id, guest_id FROM guests WHERE party_id = ?`,[myPartys], (err, row) => {
            cb(err, row)
    });
}

createUsersTable();
createPartyTable();
createBoxTable();
createGuestsTable();
createInviteCodesTable();

router.post('/get-my-partys', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);


        findPartysByGuestId([decodedJWT.id], (err, myPartys) => {
            if (err) {
                console.log(err)
                res.status(500).send("Server error!");
            } else {
                console.log('User ' + decodedJWT.id + ' ist auf Party ' + JSON.stringify(myPartys) + '\n') /* [ { party_id: 3, guest_id: 1 }, { party_id: 5, guest_id: 1 }, { party_id: 21, guest_id: 1 } ] */
                let result = []
                myPartys.forEach((party) => {
                    result.push({
                        party_id: party.party_id,
                        guests: []
                    })
                })
                for (let i=0; i<myPartys.length; i++) {
                    findGuestsOfSamePartysAsMe([myPartys[i].party_id], (err, guests) =>  {
                        if (err) {
                            console.log(err)
                            res.status(500).send("Server error!");
                        } else {
                            console.log('weitere Gäste von Party ' + myPartys[i].party_id + ' sind ' + JSON.stringify(guests, null, 1) + '\n')
                            for (let i=0; i<guests.length; i++) {
                                for (let x=0; x<result.length; x++) {
                                    if (guests[i].party_id == result[x].party_id) {
                                        result[x].guests.push(guests[i].guest_id)
                                    }
                                }
                            }
                            console.log(JSON.stringify(result))
                            
                        }
                    });
                }
                res.status(200).send({ "status": 'ok' });
            }

        });

    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/create-invite', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        let invite_code = String(Math.floor(Math.random() * 10000));
        QRCode.toDataURL(invite_code)
            .then(url => {
                let invitation = {
                    owner_id: decodedJWT.id,
                    party_id: req.body.party_id,
                    invite_code: invite_code,
                    qr_code_picture: url,
                    expiryDate: moment().add(1, 'hour').toString()
                }
                //console.log(invitation)
                createInvitation([invitation.owner_id, invitation.party_id, invitation.invite_code, invitation.qr_code_picture, invitation.expiryDate], (err) => {
                    if (err) {
                        console.log(err)
                        res.status(500).send("Server error!");
                    } else {
                        res.status(200).send({ "status": 'ok', "invitation": invitation });
                    }
                });
            })
            .catch(err => {
                console.error(err)
            })
         


    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/join', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        let picture = req.body.picture;
        const dataUri = picture;
        const png = PNG.sync.read(Buffer.from(dataUri.slice('data:image/png;base64,'.length), 'base64'));
        const code = jsqr(Uint8ClampedArray.from(png.data), png.width, png.height);
        console.log(code);
        //invitation.owner_id, invitation.party_id, invitation.invite_code, invitation.expiryDate
        getAllActiveInvitations((err, activeInvitations)=>{
            if (err) return  res.status(500).send('Server error!');
            console.log(activeInvitations.length)
            for (let i=0; i<activeInvitations.length; i++) {
                if (/*activeInvitations[0].invite_code == code*/true) {
                    createGuest([activeInvitations[0].party_id, decodedJWT.id], (err)=>{
                        if(err) return  res.status(500).send("Server error!");
                        res.status(200).send({ status: "ok" });
                    })
                }
            }

        });


    } else {
        res.status(401).send("Server error!");
    }
});

router.get('/', (req, res) => {
    res.status(200).send('This is an authentication server');
});

router.post('/register', (req, res) => {
    console.log(req.body);
    const  name  =  req.body.name;
    const  email  =  req.body.email;
    const  profile_image  =  req.body.profileImage;

    const  password  =  bcrypt.hashSync(req.body.password);

    createUser([name, email, password, profile_image], (err)=>{
        if(err) return  res.status(500).send("Server error!");
        findUserByEmail(email, (err, user)=>{
            if (err) return  res.status(500).send('Server error!');  
            const  expiresIn  =  24  *  60  *  60;
            //const  expiresIn  =  60;
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

        const  expiresIn  =  24  *  60  *  60;
        //const  expiresIn  =  60;
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

router.post('/update-user-name', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        console.log(decodedJWT);
        let newUserName = req.body.newUserName;
        console.log('newUserName: ' + newUserName);
        console.log('userId: ' + decodedJWT.id);
        try {


                updateUserName(newUserName, decodedJWT.id, (err) => {
                    if (err) {
                        console.log(err)
                    } else {

                    }
                });
            
            res.status(200).send({ "status": 'ok' });
        } catch (err) {
            console.log(err)
            res.status(500).send("Server error!");
        }
    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/update-profile-image', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        console.log(decodedJWT);
        let newProfileImage = req.body.newProfileImage;
        console.log('newProfileImage: ' + newProfileImage);
        console.log('userId: ' + decodedJWT.id);
        try {


            updateProfileImage(newProfileImage, decodedJWT.id, (err) => {
                    if (err) {
                        console.log(err)
                    } else {

                    }
                });
            
            res.status(200).send({ "status": 'ok' });
        } catch (err) {
            console.log(err)
            res.status(500).send("Server error!");
        }
    } else {
        res.status(401).send("Server error!");
    }
});

/* used by admin only */
router.post('/create-box', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        let box = {
            owner_id: req.body.owner_id,
            box_name: req.body.box_name,
            party_id: req.body.party_id
        }

        createBox([box.owner_id, box.box_name, box.party_id], (err) => {
            if (err) {
                console.log(err)
                res.status(500).send("Server error!");
            } else {
                res.status(200).send({ "status": 'ok' });
            }

        });

    } else {
        res.status(401).send("Server error!");
    }
});

/* used by admin only */
router.post('/create-party', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        let party = {
            owner_id: req.body.owner_id,
            party_name: req.body.party_name,
            box_id: req.body.box_id
        }

        createParty([party.owner_id, party.party_name, party.box_id], (err) => {
            if (err) {
                console.log(err)
                res.status(500).send("Server error!");
            } else {
                res.status(200).send({ "status": 'ok' });
            }

        });

    } else {
        res.status(401).send("Server error!");
    }
});

/* used by admin only, aber eigentlich gar nicht */
router.post('/create-guest', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        let guest = {
            party_id: req.body.party_id,
            guest_id: req.body.guest_id,
        }

        createGuest([guest.party_id, guest.guest_id], (err)=>{
            if(err) return  res.status(500).send("Server error!");
            res.status(200).send({ status: "ok" });
        })

    } else {
        res.status(401).send("Server error!");
    }
});

app.use(router);
const  port  =  process.env.PORT  ||  3000;
const  server  =  app.listen(port, () => {
    console.log('Server listening at http://localhost:'  +  port);
}); 