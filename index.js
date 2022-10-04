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

const axios = require("axios");

const options = {
  method: 'GET',
  url: 'https://spotify23.p.rapidapi.com/search/',
  params: {
    q: 'Edgar Wasser Kalium',
    type: 'multi',
    offset: '0',
    limit: '10',
    numberOfTopResults: '5'
  },
  headers: {
    'X-RapidAPI-Key': 'b1904799a1msh36d47b5e29acae1p1b1451jsn94f28310070e',
    'X-RapidAPI-Host': 'spotify23.p.rapidapi.com'
  }
};

axios.request(options).then(function (response) {
	console.log(response.data);
}).catch(function (error) {
	console.error(error);
});

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
        box_id integer,
        owner_name text)`;

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
        guest_id integer,
        muted text)`;

    return  database.run(sqlQuery);
}

const  findUserByEmail  = (email, cb) => {
    return  database.get(`SELECT id, name, email, password, profile_image FROM users WHERE email = ?`,[email], (err, row) => {
            cb(err, row)
    });
}

const  createUser  = (user, cb) => {
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
    return  database.run('INSERT INTO partys (owner_id, party_name, box_id, owner_name) VALUES (?,?,?,?)',party, (err) => {
        cb(err)
    });
}

const  createGuest  = (guest, cb) => {
    console.log('guest: ' + JSON.stringify(guest))
    return  database.run('INSERT INTO guests (party_id, guest_id, muted) VALUES (?,?,?)',guest, (err) => {
        cb(err)
    });
}

const  createBox  = (box, cb) => {
    return  database.run('INSERT INTO boxes (owner_id, box_name, party_id) VALUES (?,?,?)',box, (err) => {
        cb(err)
    });
}

const  createInvitation  = (invitation, cb) => {
    return  database.run('INSERT INTO invite_codes (owner_id, party_id, invite_code, qr_code_picture, expiryDate) VALUES (?,?,?,?,?)',invitation, (err) => {
        cb(err)
    });
}

const  getAllActiveInvitations  = (cb) => {
    return  database.all(`SELECT * FROM invite_codes`,[], (err, row) => {
            cb(err, row)
    });
}

const  getPartyIdsByGuestId  = (id, cb) => {
    return  database.all(`SELECT party_id, guest_id FROM guests WHERE guest_id = ?`,[id], (err, row) => {
            cb(err, row)
    });
}

const  findGuestsOfSamePartysAsMe  = (myPartys, cb) => {
    return  database.all(`SELECT party_id, guest_id FROM guests WHERE party_id = ?`,[myPartys], (err, row) => {
            cb(err, row)
    });
}

const  getInformationAboutParty  = (party_id, cb) => {
    return  database.all(`SELECT id, owner_id, party_name, box_id, owner_name FROM partys WHERE id = ?`,[party_id], (err, row) => {
            cb(err, row)
    });
}

const  getGuestsOfParty  = (party_id, cb) => {
    return  database.all(`SELECT id, party_id, guest_id FROM guests WHERE party_id = ?`,[party_id[0].party_id], (err, row) => {
        //console.log(row)
            cb(err, row)
    });
}

const  getGuestsOfParty2  = (party_id, cb) => {
    return  database.all(`SELECT id, party_id, guest_id FROM guests WHERE party_id = ?`,[party_id], (err, row) => {
        //console.log(row)
            cb(err, row)
    });
}

const  getUserInfo  = (user_id, cb) => {
    return  database.all(`SELECT id, name, profile_image FROM users WHERE id = ?`,[user_id], (err, row) => {
        //console.log(row)
            cb(err, row)
    });
}

const  kickGuest  = (id, cb) => {
    return  database.run('DELETE from guests WHERE id = ?',[id], (err, row) => {
        cb(err, row)
    });
}

const  muteGuest  = (info, cb) => {
    return  database.run('UPDATE guests SET muted = ? WHERE party_id = ? AND guest_id = ?',[info], (err, row) => {
        cb(err, row)
    });
}

const  deMuteGuest  = (info, cb) => {
    return  database.run('UPDATE guests SET muted = ? WHERE party_id = ? AND guest_id = ?',[info], (err, row) => {
        cb(err, row)
    });
}

const  checkIfPartyOwner  = (info, cb) => {
    return  database.all(`SELECT * FROM partys`,[], (err, row) => {
            cb(err, row)
    });
}

createUsersTable();
createPartyTable();
createBoxTable();
createGuestsTable();
createInviteCodesTable();

router.post('/check-if-party-owner', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        console.log('req.body.party_id.party_id: ' + JSON.stringify(req.body.party_id.party_id))
        console.log('decodedJWT.id: ' + decodedJWT.id)
            checkIfPartyOwner([], (err, row) => {
                if (err) {
                    console.log(err)
                    res.status(500).send("Server error!");
                } else {
                    let isAdmin = false
                    for (let i=0; i<row.length; i++) {
                        if (row[i].owner_id == decodedJWT.id && row[i].id == req.body.party_id.party_id) {
                            isAdmin = true
                            break;
                        }
                    }
                    if (isAdmin) {
                        console.log('is admin') 
                        res.status(200).send({ "status": 'true' });
                    } else {
                        console.log('is not admin')
                        res.status(200).send({ "status": 'false' });
                    }
                } 
            });
    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/kick-guest', (req, res) => {
    console.log('kick')
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        console.log('req.body.guest_id: ' + req.body.guest_id)
        console.log('req.body.party_id: ' + req.body.party_id)
        getGuestsOfParty2([req.body.party_id], (err, guests) => {
            if (err) {
                console.log(err)
                res.status(500).send("Server error!");
            } else {
                console.log('guests: ' + JSON.stringify(guests))
                for (let i=0; i<guests.length; i++) {
                    if (guests[i].party_id == req.body.party_id && guests[i].guest_id == req.body.guest_id) {
                        kickGuest([guests[i].id], (err, status) => {
                            if (err) {
                                console.log(err)
                                res.status(500).send("Server error!");
                            } else {
                                console.log('status: ' + status)
                                res.status(200).send({ "status": 'kicked', id: req.body.guest_id });
                            } 
                        });
                    }
                }
            } 
        })
    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/mute-guest', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        console.log('req.body.guest_id: ' + req.body.guest_id)
        console.log('req.body.party_id: ' + req.body.party_id)
            muteGuest(['true', req.body.party_id, req.body.guest_id], (err, status) => {
                if (err) {
                    console.log(err)
                    res.status(500).send("Server error!");
                } else {
                    console.log(status)
                    res.status(200).send({ "status": 'ok' });
                } 
            });
    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/de-mute-guest', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        console.log('req.body.guest_id: ' + req.body.guest_id)
        console.log('req.body.party_id: ' + req.body.party_id)
            deMuteGuest(['false', req.body.party_id, req.body.guest_id], (err, status) => {
                if (err) {
                    console.log(err)
                    res.status(500).send("Server error!");
                } else {
                    console.log(status)
                    res.status(200).send({ "status": 'ok' });
                } 
            });
    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/get-guest-info', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        //console.log('req.body.guest_id: ' + req.body.guest_id)
            getUserInfo(req.body.guest_id, (err, guest) => {
                if (err) {
                    console.log(err)
                    res.status(500).send("Server error!");
                } else {
                    //console.log(guest)
                    res.status(200).send({ "status": 'ok', "guest": guest });
                } 
            });
    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/get-guests', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        getGuestsOfParty([req.body.party_id], (err, guests) => {
            if (err) {
                console.log(err)
                res.status(500).send("Server error!");
            } else {
                //console.log(guests)
                res.status(200).send({ "status": 'ok', "guests": guests });
            }
        });
    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/get-my-partys-information', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        getInformationAboutParty([req.body.party_id], (err, myParty) => {
            if (err) {
                console.log(err)
                res.status(500).send("Server error!");
            } else {
                res.status(200).send({ "status": 'ok', "myParty": myParty });
                    /*findGuestsOfSamePartysAsMe(allIDs, (err, guests) =>  {
                        if (err) {
                            console.log(err)
                            res.status(500).send("Server error!");
                        } else {
                            console.log('weitere Gäste von Party ' + myPartys[i].party_id + ' sind ' + JSON.stringify(guests, null, 1) + '\n')
                            for (let i=0; i<guests.length; i++) {
                                for (let x=0; x<result.length; x++) {
                                    if (guests[i].party_id == result[x].party_id) {
                                        result[x].guest_ids.push(guests[i].guest_id)
                                    }
                                }
                            }
                        }
                    });
                let partyInformation = []
                for (let i=0; i<result.length; i++) {
                    console.log('result[i].party_id: ' + result[i].party_id)
                    getInformationAboutParty([result[i].party_id], (err, partyInfo) =>  {
                        if (err) return  res.status(500).send('Server error!');
                        partyInformation.push(partyInfo)
                        console.log('partyInfo: ' + partyInfo)
                    });
                }*/
                //console.log(JSON.stringify(result))
                //res.status(200).send({ "status": 'ok' });
            }

        });

    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/get-my-party-ids', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        getPartyIdsByGuestId([decodedJWT.id], (err, myPartys) => {
            if (err) {
                console.log(err)
                res.status(500).send("Server error!");
            } else {
                //  console.log('User ' + decodedJWT.id + ' ist auf Party ' + JSON.stringify(myPartys) + '\n')

                let allPartyIds = []
                myPartys.forEach((party) => {
                    allPartyIds.push(party.party_id)
                });
                res.status(200).send({ "status": 'ok', "myPartys": myPartys, "allPartyIds": allPartyIds });
                    /*findGuestsOfSamePartysAsMe(allIDs, (err, guests) =>  {
                        if (err) {
                            console.log(err)
                            res.status(500).send("Server error!");
                        } else {
                            console.log('weitere Gäste von Party ' + myPartys[i].party_id + ' sind ' + JSON.stringify(guests, null, 1) + '\n')
                            for (let i=0; i<guests.length; i++) {
                                for (let x=0; x<result.length; x++) {
                                    if (guests[i].party_id == result[x].party_id) {
                                        result[x].guest_ids.push(guests[i].guest_id)
                                    }
                                }
                            }
                        }
                    });
                let partyInformation = []
                for (let i=0; i<result.length; i++) {
                    console.log('result[i].party_id: ' + result[i].party_id)
                    getInformationAboutParty([result[i].party_id], (err, partyInfo) =>  {
                        if (err) return  res.status(500).send('Server error!');
                        partyInformation.push(partyInfo)
                        console.log('partyInfo: ' + partyInfo)
                    });
                }*/
                //console.log(JSON.stringify(result))
                //res.status(200).send({ "status": 'ok' });
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
        let invite_obj = {
            invite_code: invite_code,
            party_id: req.body.party_id
        }
        console.log(invite_obj);
        QRCode.toDataURL(JSON.stringify(invite_obj))
            .then(url => {
                let invitation = {
                    owner_id: decodedJWT.id,
                    party_id: req.body.party_id,
                    invite_code: invite_code,
                    qr_code_picture: url,
                    expiryDate: moment().add(1, 'hour').toString()
                }
                console.log(invitation)
                createInvitation([invitation.owner_id, invitation.party_id, invitation.invite_code, invitation.qr_code_picture, invitation.expiryDate], (err) => {
                    if (err) {
                        console.log(err)
                        res.status(500).send("Server error!");
                    } else {
                        console.log(invitation)
                        invitation.invite_code = invitation.invite_code + '-' + req.body.party_id;
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

router.post('/join-qr', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        let decodedJWT = jwt.decode(req.body.access_token);
        let picture = req.body.picture;
        const dataUri = picture;
        const png = PNG.sync.read(Buffer.from(dataUri.slice('data:image/png;base64,'.length), 'base64'));
        const code = jsqr(Uint8ClampedArray.from(png.data), png.width, png.height);
        let parsedInviteObj = JSON.parse(code.data);
        let invite_code = parsedInviteObj.invite_code;
        let party_id = parsedInviteObj.party_id;
        let invitation;
        let invitationValid = false;
        let alreadyInParty;
        getAllActiveInvitations((err, activeInvitations) => {
            if (err) return res.status(500).send('Server error!');
            for (let i=0; i<activeInvitations.length; i++) {
                if (party_id == activeInvitations[i].party_id && invite_code == activeInvitations[i].party_id) {
                    invitation = activeInvitations[i];
                    invitationValid = true;
                    break;
                }
            }
            if (invitationValid) {
                // check if guest is already in given party
                getGuestsOfParty((err, guests) => {
                    if (err) return res.status(500).send('Server error!');
                    for (let i=0; i<guests.length; i++) {
                        if (invitation.party_id == guests[i].party_id && decodedJWT.id == guests[i].guest_id) {
                            alreadyInParty = true;
                            break;
                        }
                    }
                    if (!alreadyInParty) {
                        createGuest([party_id, decodedJWT.id, 'false'], (err) => {
                            if (err) return res.status(500).send("Server error!");
                            inviteSuccess = true
                        });
                    } else {
                        res.status(200).send({ status: "AlreadyInParty" });
                    }
                    if (inviteSuccess) {
                        res.status(200).send({ status: "InviteSuccess" });
                    }
                })
            }
        });
    } else {
        res.status(401).send("Server error!");
    }
});

router.post('/join-code', (req, res) => {
    if (jwt.verify(req.body.access_token, SECRET_KEY)) {
        console.log('Join-Request with Number-Code: ' + req.body.code)
        let decodedJWT = jwt.decode(req.body.access_token);
        let invite = String(req.body.code).split('-');
        let invite_code = invite[0]
        console.log('invite_code: ' + invite_code)
        let party_id = invite[1]
        console.log('party_id: ' + party_id)
 
        let invitation;
        let invitationValid = false;
        let alreadyInParty;
        let inviteSuccess = false;
        getAllActiveInvitations((err, activeInvitations) => {
            if (err) return res.status(500).send('Server error!');
            for (let i=0; i<activeInvitations.length; i++) {
                /*console.log('party_id='+party_id)
                console.log('activeInvitations[i].party_id='+activeInvitations[i].party_id)
                console.log('invite_code='+invite_code)*/
                console.log('activeInvitations[i].invite_code='+activeInvitations[i].invite_code)
                if (party_id == activeInvitations[i].party_id && invite_code == activeInvitations[i].invite_code) {
                    invitation = activeInvitations[i];
                    invitationValid = true;
                    console.log('Found invitation')
                    break;
                }
            }
            if (invitationValid) {
                // check if guest is already in given party 
                getGuestsOfParty([{ party_id: party_id }], (err, guests) => {
                    if (err) return res.status(500).send('Server error!');
                    for (let i=0; i<guests.length; i++) {
                        if (invitation.party_id == guests[i].party_id && decodedJWT.id == guests[i].guest_id) {
                            alreadyInParty = true;
                            break;
                        }
                    }
                    if (!alreadyInParty) {
                        createGuest([party_id, decodedJWT.id, 'false'], (err) => {
                            if (err) return res.status(500).send("Server error!");
                            inviteSuccess = true
                            res.status(200).send({ status: "InviteSuccess", party_id: party_id });
                        });
                    } else {
                        res.status(200).send({ status: "AlreadyInParty", party_id: party_id });
                    }
                })
            } else {
                res.status(200).send({ status: "WrongCode" });
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
            box_id: req.body.box_id,
            owner_name: req.body.owner_name
        }

        createParty([party.owner_id, party.party_name, party.box_id, party.owner_name], (err) => {
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

        createGuest([guest.party_id, guest.guest_id, 'false'], (err)=>{
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