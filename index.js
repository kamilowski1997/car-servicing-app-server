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
var async = require('async');


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

app.get("/api/getVehicles", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    const sqlSelect = "SELECT * FROM vehicle WHERE user_id = ?;"
    const filter = [req.user.id];
    const vehicles = null;
    db.query(sqlSelect, filter, (err, result) => {
      res.json(result);
    })
    
  }
})

app.get("/api/getServices", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    let services;
    async.series( [
      // Get the first table contents
      function ( callback ) {
        const sqlSelect = "SELECT user_id FROM vehicle WHERE id = ?;"
        const filter = [req.header('selectedVehicleId')];
        db.query(sqlSelect, filter, (err, result) => {
          checked_user_id=result[0].user_id;
          callback();
        });
      },
      // Get the second table contents
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlSelect = "SELECT id, name, date, mileage, description FROM service WHERE vehicle_id = ? ORDER BY date DESC;"
          const filter = [req.header('selectedVehicleId')];
          db.query(sqlSelect, filter, (err, result) => {
            services = result;
            callback();
          });
        }
      }
  // Send the response
    ], function ( error, results ) {
        res.json(services);
    });
  }
})


app.get("/api/getVehicle", passport.authenticate("jwt", { session: false }), (req, res) => {
  //console.log(req.header('selectedVehicleId'));
  if(!req.user){
    res.json(false)
  } else {
    const sqlSelect = "SELECT * FROM vehicle WHERE user_id = ? AND id = ?;"
    const filter = [req.user.id, req.header('selectedVehicleId')];
    db.query(sqlSelect, filter, (err, result) => {
      res.json(result);
    })
  }
})

app.get("/api/getUsername", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    const sqlSelect = "SELECT name FROM user WHERE id = ?;"
    const filter = [req.user.id];
    db.query(sqlSelect, filter, (err, result) => {
      res.json(result);
    })
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

app.post("/api/AddVehicle", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
      let sqlInsert;
      let values;
    if(req.body.production_date != null){
      sqlInsert = "INSERT INTO vehicle (user_id, name, mileage, brand, model, production_date, vin, color) VALUES(?, ?, ?, ?, ?, DATE(?), ?, ?);"
      values = [req.user.id, req.body.name, req.body.mileage, req.body.brand, req.body.model, req.body.production_date, req.body.vin, req.body.color];
    }else{
      sqlInsert = "INSERT INTO vehicle (user_id, name, mileage, brand, model, vin, color) VALUES(?, ?, ?, ?, ?, ?, ?);"
      values = [req.user.id, req.body.name, req.body.mileage, req.body.brand, req.body.model, req.body.vin, req.body.color];
    }
    db.query(sqlInsert, values,  (err, result) => {
      //res.send(err);
      //res.send(result)
      if(!err){
        res.status(200).send({message: 'Vehicle added'});
      }else{
        console.log(err)
        res.status(401).send('Vehicle not added');
      }
      //console.log(res)
    })
  }
});

app.post("/api/AddService", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    let services;
    async.series( [
      // Get the first table contents
      function ( callback ) {
        const sqlSelect = "SELECT user_id FROM vehicle WHERE id = ?;"
        const filter = [req.header('selectedVehicleId')];
        db.query(sqlSelect, filter, (err, result) => {
          checked_user_id=result[0].user_id;
          callback();
        });
      },
      // Get the second table contents
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlInsert = "INSERT INTO service (vehicle_id, name, date, mileage, description) VALUES(?, ?, DATE(?), ?, ?);"
          const values = [req.header('selectedVehicleId'), req.body.name, req.body.date, req.body.mileage, req.body.description];
          db.query(sqlInsert, values,  (err, result) => {
            if(!err){
              res.status(200).send({message: 'Service added'});
            }else{
              console.log(err)
              res.status(401).send('Service not added');
            }
          })
        }
      }
  // Send the response
    ], function ( error, results ) { });
  }
});

app.post("/api/EditService", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    let services;
    async.series( [
      // Get the first table contents
      function ( callback ) {
        const sqlSelect = "SELECT user_id FROM vehicle WHERE id = (SELECT vehicle_id FROM service WHERE id = ?);"
        const filter = [req.header('serviceId')];
        db.query(sqlSelect, filter, (err, result) => {
          checked_user_id=result[0].user_id;
          callback();
        });
      },
      // Get the second table contents
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlInsert = "UPDATE service SET name=?, date=DATE(?), mileage=?, description=? WHERE id=? ;"
          const values = [ req.body.name, req.body.date, req.body.mileage, req.body.description, req.header('serviceId')];
          db.query(sqlInsert, values,  (err, result) => {
            if(!err){
              res.status(200).send({message: 'Service updated'});
            }else{
              console.log(err)
              res.status(401).send('Service not updated');
            }
          })
        }
      }
  // Send the response
    ], function ( error, results ) { });
  }
});

app.post("/api/DeleteService", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    async.series( [
      // Get the first table contents
      function ( callback ) {
        const sqlSelect = "SELECT user_id FROM vehicle WHERE id = (SELECT vehicle_id FROM service WHERE id = ?);"
        const filter = [req.header('serviceId')];
        db.query(sqlSelect, filter, (err, result) => {
          checked_user_id=result[0].user_id;
          callback();
        });
      },
      // Get the second table contents
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlDelete = "DELETE FROM service WHERE id=? ;"
          const values = [req.header('serviceId')];
          db.query(sqlDelete, values,  (err, result) => {
            if(!err){
              res.status(200).send({message: 'Service deleted'});
            }else{
              console.log(err)
              res.status(401).send('Service not deleted');
            }
          })
        }
      }
  // Send the response
    ], function ( error, results ) { });
  }
});
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