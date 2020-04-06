//jshint esversion:6
require('dotenv').config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
errors = [];
msgs = [];



app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");


app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/SecretsDB",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

mongoose.set("useCreateIndex", true);
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
    if (req.isAuthenticated())
        res.render("dashboard");
    else {
        errors.length = 0;
        msgs.length = 0;
        res.render("home.ejs");
    }
})


app.get("/login", function (req, res) {
    if (req.isAuthenticated())
        res.render("dashboard");
    else {
        errors.length = 0;
        msgs.length = 0;
        res.render("login.ejs");

    }

})

app.get("/register", function (req, res) {
    if (req.isAuthenticated())
        res.render("dashboard");
    else {
        errors.length = 0;
        msgs.length = 0;
        res.render("register.ejs");
    }
})




app.post("/register", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    const rePassword = req.body.repassword;
    errors.length = 0;
    msgs.length = 0;

    if (!username || !password || !rePassword) {
        errors.push("Missing fields");
    }
    if (password !== rePassword) {
        errors.push("Passwords don't Match");
    }
    if (password.length < 6) {
        errors.push("Password should be atleast 6 characters long");
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
                    errors.push("User Already Exists");
                    res.render("register", { errors });
                }
                else {
                    errors.push("Some unexpected error occured! Try again");
                    res.render("register", { errors });
                }
            }
            else {
                msgs.push("You have registered! Login to your account");
                res.render("login", { msgs });
            }
        });
    }


})

app.get("/dashboard/:userName", function (req, res) {
    if (req.isAuthenticated()) {
        console.log(req.user);
        res.render("dashboard");
    }
    else {
        res.redirect("/login");
    }
});


app.post('/login', function (req, res, next) {
    errors.length = 0;
    msgs.length = 0;
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            console.log(err);
            return next(err);
        }
        if (!user) {
            errors.push("Username and password don't match");
            return res.render('login', { errors });
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }
            return res.redirect("/dashboard/"+user.username);
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