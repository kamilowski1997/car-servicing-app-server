const express = require('express')
const mysql = require('mysql')
const path = require('path');
const cors = require('cors')
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require("passport")
const LocalStrategy = require("passport-local")
const passportJWT = require("passport-jwt")
const jwt = require("jsonwebtoken")


const app = express();

// Create connection
const db = mysql.createPool({
  host: "localhost",
  user: "nodeuser",
  password: "nodeuser@1234",
  database: "car_servicing_db"
})

const JWTStrategy = passportJWT.Strategy

//const apiRouter = require('./routes/api');

app.use(passport.initialize());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(logger('dev'));
app.use(cookieParser());

//temporary user before using database
const user = {
  id: "1",
  email: "example@email.com",
  password: "password"
}

//Local strategy passport to login
passport.use(new LocalStrategy({
  usernameField: "email"
}, (email, password, done) => {

  const sqlSelect = "SELECT * FROM user WHERE email = ?;"
  const filter = [email];
  let user ;
  db.query(sqlSelect, filter, (err, result) => {
    user = result[0];
    if(email === user.email && password === user.password) {
      return done(null, user)
    }else {
      return done(null, false)
    }
  })
  
}));

//JWT strategy passport to authenticate with ticket
passport.use(new JWTStrategy({
  jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: "jwt_secret"
}, (jwt_payload, done) => {

  const sqlSelect = "SELECT * FROM user WHERE email = ?;"
  const filter = [jwt_payload.user.email];
  let user;
  db.query(sqlSelect, filter, (err, result) => {
    user = result[0];
    if(user.id === jwt_payload.user.id){
      return done(null, user)
    } else {
      return done(null, false, {
        message: "Token not matched"
      })
    }
  })

}));

//app.use(express.urlencoded({ extended: false }));

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(err.message);
});


app.post("/api/login", (req, res, next) => {
  passport.authenticate("local", (err, user) => {
    if(err){
      return next(err)
    }
    if(!user){
      return res.send("Wrong email or password")
    }
    req.login(user, () => {
      const body = {id: user.id, email: user.email}
      const token = jwt.sign({user: body}, "jwt_secret", { expiresIn: '20m' })
      return res.json({token})
    })
  })(req, res, next)
})

app.get("/api/auth", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    res.json(true)
  }
})



app.post("/api/signUp", (req, res) => {

  const sqlInsert = "insert into user (name, email, password) values(?, ?, ?);"
  const values = [req.body.name, req.body.email, req.body.password];
  const nam = req.body.name;
  console.log(nam)
  db.query(sqlInsert, values,  (err, result) => {
    //res.send(err);
    //res.send(result)
    if(!err){
      res.status(200).send({message: 'user created'});
    }else{
      res.status(401).send('user not created');
    }
    //console.log(res)
    //console.log(err)
  })
/*
  passport.authenticate("local", (err, user) => {
    if(err){
      return next(err)
    }
    if(!user){
      return res.send("Wrong email or password")
    }
    req.login(user, () => {
      const body = {id: user.id, email: user.email}
      const token = jwt.sign({user: body}, "jwt_secret", { expiresIn: '20m' })
      return res.json({token})
    })
  })(req, res, next)*/
})

/*
app.get('/', (req, res) =>{
  const sqlInsert = "insert into user (name, email, password) values('node express2', 'nodeexpress2@gmail.com', 'password2');"
  db.query(sqlInsert, (err, result) => {
    //res.send(err);
    res.send("prawdopodobnie dodano")
  })
})


app.get('/api/get', (req, res) =>{
  const sqlSelect = "SELECT * FROM user;"
  db.query(sqlSelect, (err, result) => {
    //res.send(err);
    res.send(result);
  })
})
*/
app.listen(3001, () => {
  console.log("running on port 3001");
})