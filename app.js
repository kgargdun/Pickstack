//jshint esversion:6
require('dotenv').config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const path = require('path');
const async = require("async");
const crypto = require("crypto");
const multer = require("multer");
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const nodemailer = require("nodemailer");
var flash = require('connect-flash');

errors = [];
msgs = [];
ln = "en";
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(flash());
app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});


app.use(passport.initialize());
app.use(passport.session());


const dbpass=process.env.DBPASS;

const mongoURL = "mongodb+srv://admin-kaustubhgarg:"+dbpass+"@cluster0-aegjo.mongodb.net/PicsDB";

mongoose.connect(mongoURL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

const conn = mongoose.createConnection(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true);


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    activity: [Date],
    upActivity: [Date],
    resetPasswordToken: String,
    resetPasswordExpires: Date,
});


userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
    if (req.isAuthenticated())
        res.render("dashboard", { userObj: req.user });
    else {
        errors.length = 0;
        msgs.length = 0;
        res.render("home.ejs", { ln });
    }
})


app.get("/login", function (req, res) {
    if (req.isAuthenticated())
        res.render("dashboard", { userObj: req.user });
    else {
        errors.length = 0;
        msgs.length = 0;
        res.render("login.ejs", { ln });

    }

})
app.get("/register", function (req, res) {
    if (req.isAuthenticated())
        res.render("dashboard", { userObj: req.user });
    else {
        errors.length = 0;
        msgs.length = 0;
        res.render("register.ejs", { ln });
    }
})


app.get("/hindi", function (req, res) {
    // console.log(req.headers.referer);
    ln = "hi";
    res.redirect(req.headers.referer);

})

app.get("/english", function (req, res) {
    // console.log(req.headers.referer);
    ln = "en";
    res.redirect(req.headers.referer);

})

app.post("/register", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    const rePassword = req.body.repassword;
    errors.length = 0;
    msgs.length = 0;

    if (!username || !password || !rePassword) {
        errors.push("1Missing fields");
    }
    if (password !== rePassword) {
        errors.push("2Passwords don't Match");
    }
    if (password.length < 6) {
        errors.push("3Password should be atleast 6 characters long");
    }
    // console.log(errors);
    if (errors.length > 0) {
        res.render("register",
            {
                errors
            });
    }
    else {
        User.register({ username: req.body.username }, req.body.password, function (err, user) {
            if (err) {
                if (err.name === "UserExistsError") {
                    errors.push("4User Already Exists");
                    res.render("register", { errors });
                }
                else {
                    errors.push("5Some unexpected error occured! Try again");
                    res.render("register", { errors });
                }
            }
            else {
                msgs.push("1You have registered! Login to your account");
                res.render("login", { msgs });
            }
        });
    }


})

app.get("/dashboard", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("dashboard", { userObj: req.user });
    }
    else {
        res.redirect("/login");
    }
});


app.get("/profile", function (req, res) {
    if (req.isAuthenticated()) {
        userObj = {};
        userObj = req.user;
        res.render("profile", { userObj });
    }
    else {
        res.redirect("/login");
    }
})



app.get("/change", function (req, res) {
    if (req.isAuthenticated()) {
        userObj = {};
        userObj = req.user;
        errors.length = 0;
        msgs.length = 0;
        res.render("change", { userObj });
    }
    else {
        res.redirect("/login");
    }
})

app.post("/change", function (req, res) {
    errors.length = 0;
    msgs.length = 0;
    if (req.isAuthenticated()) {
        userObj = {};
        userObj = req.user;
        if (req.body.newpassword !== req.body.renewpassword) {
            errors.push(" Passwords don't Match");
        }
        if (req.body.newpassword.length < 6) {
            errors.push(" Password should be atleast 6 characters long");
        }
        if (errors.length > 0) {
            res.render("change", errors)
        }
        else {
            User.findByUsername(userObj.username).then(function (sanitizedUser) {
                console.log(sanitizedUser);
                sanitizedUser.setPassword(req.body.newpassword, function () {
                    sanitizedUser.save();
                    res.redirect("/dashboard");
                });
            }, function (err) {
                console.error(err);
            })
        }
    }
    else {
        res.redirect("/login");
    }
})

app.post('/login', function (req, res, next) {
    errors.length = 0;
    msgs.length = 0;
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            console.log(err);
            return next(err);
        }
        if (!user) {
            errors.push("6Username and password don't match");
            return res.render('login', { errors });
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }
            user.activity.push(Date.now());
            user.save();
            return res.redirect("/dashboard");
        });
    })(req, res, next);
});



app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
})



app.listen(3000, function () {
    console.log("Listening at port 3000");
})


let gfs;

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});


const storage = new GridFsStorage({
    url: mongoURL,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }

                const filename = req.user._id.toString();
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads',
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });


app.get('/pictures', (req, res) => {
    if (!req.isAuthenticated())
        res.redirect("/login");
    else {
        userObj = req.user;
        gfs.files.find().toArray((err, files) => {
            if (!files || files.length === 0) {
                res.render('pictures', { userObj, files: false });
            } else {
                files.map(file => {
                    if (
                        file.contentType === 'image/jpeg' ||
                        file.contentType === 'image/png'
                    ) {
                        file.isImage = true;
                    } else {
                        file.isImage = false;
                    }
                    // console.log(file);
                });
                res.render('pictures', { userObj, files: files });
            }
        });
    }
});

app.post('/upload', upload.single('file'), (req, res) => {
    User.findOne({ username: req.user.username }, function (err, user) {
        user.upActivity.push(Date.now());
        user.save();
    });

    res.redirect('/pictures');
});

app.get('/image:filename', (req, res) => {
    if (req.params.filename != req.user._id.toString()) {
        res.redirect("/login");
    }
    else {
        gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
            if (!file || file.length === 0) {
                return res.status(404).json({
                    err: 'No file exists'
                });
            }
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        });
    }
});

app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
        if (err) {
            console.log(err);
            return res.redirect("/pictures");
        }

        res.redirect('/pictures');
    });
});




// 
app.get('/forgot', function (req, res) {
    errors.length = 0;
    msgs.length = 0;
    res.render('forgot', {ln});
});

app.post('/forgot', function (req, res, next) {
    errors.length = 0;
    msgs.length = 0;
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function (token, done) {
            User.findOne({ username: req.body.email }, function (err, user) {
                if (!user) {
                    errors.push("7No account with that email address exists");
                    return res.render('forgot', { errors });
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 1800000;

                user.save(function (err) {
                    done(err, token, user);
                });
            });
        },
        function (token, user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'kgargdun@gmail.com',
                    pass: process.env.PASSWORD
                }
            });
            var mailOptions = {
                to: user.username,
                from: 'kgargdun@gmail.com',
                subject: 'Node.js Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function (err) {
                console.log('mail sent');
                msgs.push('2An e-mail has been sent to ' + user.username + ' with further instructions.');
                done(err, 'done');
            });
        }
    ], function (err) {
        if (err) return next(err);
        res.render('forgot', { errors });
    });
});

app.get('/reset/:token', function (req, res) {
    errors.length = 0;
    msgs.lentgh = 0;
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
            errors.push('8Password reset token is invalid or has expired.');
            return res.render('forgot', { errors });
        }
        res.render('reset', { token: req.params.token });
    });
});

app.post('/reset/:token', function (req, res) {
    async.waterfall([
        function (done) {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
                if (!user) {
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('back');
                }
                if (req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, function (err) {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(function (err) {
                            req.logIn(user, function (err) {
                                done(err, user);
                            });
                        });
                    })
                } else {
                    req.flash("error", "Passwords do not match.");
                    return res.redirect('back');
                }
            });
        },
        function (user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'kgargdun@gmail.com',
                    pass: process.env.PASSWORD
                }
            });
            var mailOptions = {
                to: user.username,
                from: 'kgargdun@gmail.com',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                    'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOptions, function (err) {
                req.flash('success', 'Success! Your password has been changed.');
                done(err);
            });
        }
    ], function (err) {
        res.redirect("/dashboard");
    });
});


app.get("/activity", function (req, res) {
    if (!req.isAuthenticated())
        return res.redirect("/login");
    res.render("activity", { userObj: req.user });
})


app.get("/about", function (req, res) {

    res.render("about", { ln });
})
