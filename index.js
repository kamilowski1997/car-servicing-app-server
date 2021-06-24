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
const async = require('async');
const nodemailer = require('nodemailer'); 

const moment = require('moment');  

const app = express();

// Create db connection
const db = mysql.createPool({
  host: "localhost",
  user: "nodeuser",
  password: "nodeuser@1234",
  database: "car_servicing_db"
})

const JWTStrategy = passportJWT.Strategy

app.use(passport.initialize());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(logger('dev'));
app.use(cookieParser());

//Local strategy passport to login
passport.use(new LocalStrategy({
  usernameField: "email"
}, (email, password, done) => {

  const sqlSelect = "SELECT * FROM user WHERE email = ?;"
  const filter = [email];
  let user ;
  db.query(sqlSelect, filter, (err, result) => {
    user = result[0];
    if(user != undefined){
      if(email === user.email && password === user.password) {
        return done(null, user)
      }else {
        return done(null, false)
      }
    }
    else {
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

app.get("/api/getVehicle", passport.authenticate("jwt", { session: false }), (req, res) => {
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
});


app.get("/api/getMaintenances", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    let maintenances;
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
          const sqlSelect = "SELECT id, name, date, mileage, description FROM maintenance WHERE vehicle_id = ? ORDER BY date DESC;"
          const filter = [req.header('selectedVehicleId')];
          db.query(sqlSelect, filter, (err, result) => {
            maintenances = result;
            callback();
          });
        }
      }
  // Send the response
    ], function ( error, results ) {
        res.json(maintenances);
    });
  }
});

app.get("/api/getNextMaintenances", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    let nextMaintenances;
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
          const sqlSelect = "SELECT id, name, date, mileage, time_interval, mileage_interval, description FROM next_maintenance WHERE vehicle_id = ? ORDER BY date ASC;"
          const filter = [req.header('selectedVehicleId')];
          db.query(sqlSelect, filter, (err, result) => {
            nextMaintenances = result;
            callback();
          });
        }
      }
  // Send the response
    ], function ( error, results ) {
        res.json(nextMaintenances);
    });
  }
});


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
});


app.post("/api/signUp", (req, res) => {

  const sqlInsert = "insert into user (name, email, password) values(?, ?, ?);"
  const values = [req.body.name, req.body.email, req.body.password];
  const nam = req.body.name;
  console.log(nam)
  db.query(sqlInsert, values,  (err, result) => {
    if(!err){
      res.status(200).send({message: 'user created'});
    }else{
      res.status(401).send('user not created');
    }
  })
})

app.post("/api/addVehicle", passport.authenticate("jwt", { session: false }), (req, res) => {
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
      if(!err){
        res.status(200).send({message: 'Vehicle added'});
      }else{
        console.log(err)
        res.status(401).send('Vehicle not added');
      }
    })
  }
});

app.post("/api/editVehicle", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
      let sqlUpdate;
      let values;
    if(req.body.production_date != null){
      sqlUpdate = "UPDATE vehicle SET name=?, mileage=?, brand=?, model=?, production_date=DATE(?), vin=?, color=? WHERE id=? AND user_id=? ;"
      values = [req.body.name, req.body.mileage, req.body.brand, req.body.model, req.body.production_date, req.body.vin, req.body.color, req.header('vehicleId') , req.user.id];
    }else{
      sqlUpdate = "UPDATE vehicle SET name=?, mileage=?, brand=?, model=?, vin=?, color=? WHERE id=? AND user_id=? ;"
      values = [req.body.name, req.body.mileage, req.body.brand, req.body.model, req.body.vin, req.body.color, req.header('vehicleId') , req.user.id];
    }
    db.query(sqlUpdate, values,  (err, result) => {
      if(!err){
        res.status(200).send({message: 'Vehicle edited'});
      }else{
        console.log(err)
        res.status(401).send('Vehicle not edited');
      }
    })
  }
});

app.post("/api/addService", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
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

app.post("/api/editService", passport.authenticate("jwt", { session: false }), (req, res) => {
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
          const sqlUpdate = "UPDATE service SET name=?, date=DATE(?), mileage=?, description=? WHERE id=? ;"
          const values = [ req.body.name, req.body.date, req.body.mileage, req.body.description, req.header('serviceId')];
          db.query(sqlUpdate, values,  (err, result) => {
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

app.post("/api/deleteService", passport.authenticate("jwt", { session: false }), (req, res) => {
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

app.post("/api/addMaintenance", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
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
          const sqlInsert = "INSERT INTO maintenance (vehicle_id, name, date, mileage, description) VALUES(?, ?, DATE(?), ?, ?);"
          const values = [req.header('selectedVehicleId'), req.body.name, req.body.date, req.body.mileage, req.body.description];
          db.query(sqlInsert, values,  (err, result) => {
            if(!err){
              res.status(200).send({message: 'Maintenance added'});
            }else{
              console.log(err)
              res.status(401).send('Maintenance not added');
            }
          })
        }
      }
  // Send the response
    ], function ( error, results ) { });
  }
});

app.post("/api/editMaintenance", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    async.series( [
      // Get the first table contents
      function ( callback ) {
        const sqlSelect = "SELECT user_id FROM vehicle WHERE id = (SELECT vehicle_id FROM maintenance WHERE id = ?);"
        const filter = [req.header('maintenanceId')];
        db.query(sqlSelect, filter, (err, result) => {
          checked_user_id=result[0].user_id;
          callback();
        });
      },
      // Get the second table contents
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlUpdate = "UPDATE maintenance SET name=?, date=DATE(?), mileage=?, description=? WHERE id=? ;"
          const values = [ req.body.name, req.body.date, req.body.mileage, req.body.description, req.header('maintenanceId')];
          db.query(sqlUpdate, values,  (err, result) => {
            if(!err){
              res.status(200).send({message: 'Maintenance updated'});
            }else{
              console.log(err)
              res.status(401).send('Maintenance not updated');
            }
          })
        }
      }
  // Send the response
    ], function ( error, results ) { });
  }
});

app.post("/api/deleteMaintenance", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    async.series( [
      // Get the first table contents
      function ( callback ) {
        const sqlSelect = "SELECT user_id FROM vehicle WHERE id = (SELECT vehicle_id FROM maintenance WHERE id = ?);"
        const filter = [req.header('maintenanceId')];
        db.query(sqlSelect, filter, (err, result) => {
          checked_user_id=result[0].user_id;
          callback();
        });
      },
      // Get the second table contents
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlDelete = "DELETE FROM maintenance WHERE id=? ;"
          const values = [req.header('maintenanceId')];
          db.query(sqlDelete, values,  (err, result) => {
            if(!err){
              res.status(200).send({message: 'Maintenance deleted'});
            }else{
              console.log(err)
              res.status(401).send('Maintenance not deleted');
            }
          })
        }
      }
  // Send the response
    ], function ( error, results ) { });
  }
});

app.post("/api/addNextMaintenance", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
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
          const sqlInsert = "INSERT INTO next_maintenance (vehicle_id, name, date, mileage, time_interval, mileage_interval, description) VALUES(?, ?, DATE(?), ?, ?, ?, ?);"
          const values = [req.header('selectedVehicleId'), req.body.name, req.body.date, parseInt(req.body.mileage) || 2147483647, parseInt(req.body.time_interval) || null,
                            parseInt(req.body.mileage_interval) || null, req.body.description];
          db.query(sqlInsert, values,  (err, result) => {
            if(!err){
              res.status(200).send({message: 'Next maintenance added'});
            }else{
              console.log(err)
              res.status(401).send('Next maintenance not added');
            }
          })
        }
      }
  // Send the response
    ], function ( error, results ) { });
  }
});

app.post("/api/confirmMaintenance", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    let maintenance;
    
    async.series( [
      // Get the first table contents
      function ( callback ) {
        const sqlSelect = "SELECT user_id FROM vehicle WHERE id = (SELECT vehicle_id FROM next_maintenance WHERE id = ?);"
        const filter = [req.header('nextMaintenanceId')];
        db.query(sqlSelect, filter, (err, result) => {
          console.log(result[0]);
          checked_user_id=result[0].user_id;
          console.log(err);
          callback();
        });
      },
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlSelect = "SELECT * FROM next_maintenance WHERE id =?;"
          const filter = [req.header('nextMaintenanceId')];
          db.query(sqlSelect, filter, (err, result) => {
            maintenance=result[0];
            console.log(err);
            callback();
          });
        }
      },
      // Get the second table contents
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const nextMaintenanceDate = new Date(req.body.done_date);
          nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth()+maintenance.time_interval);
          const nextMaintenanceMileage = parseInt(req.body.done_mileage) + parseInt(maintenance.mileage_interval);
          
          const sqlUpdate = "UPDATE next_maintenance SET date=DATE(?), mileage=?, reminder_sent = 0 WHERE id=? ;"
          const values = [ nextMaintenanceDate, nextMaintenanceMileage, req.header('nextMaintenanceId')];
          db.query(sqlUpdate, values,  (err, result) => {
            console.log(err);
            callback();
          })
        }
      },
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlInsert = "INSERT INTO maintenance (vehicle_id, name, date, mileage, description) VALUES(?, ?, DATE(?), ?, ?);"
          const values = [maintenance.vehicle_id, maintenance.name, req.body.done_date, req.body.done_mileage, maintenance.description];
          db.query(sqlInsert, values,  (err, result) => {
            callback();
          })
        }
      }
      
  // Send the response
    ], function ( error, results ) { 
      if(!error){
        res.status(200).send({message: 'Next maintenance confirmed'});
      }else{
        console.log(error)
        res.status(401).send('Next maintenance not confirmed');
      }});
  }
});


app.post("/api/editNextMaintenance", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    async.series( [
      // Get the first table contents
      function ( callback ) {
        const sqlSelect = "SELECT user_id FROM vehicle WHERE id = (SELECT vehicle_id FROM next_maintenance WHERE id = ?);"
        const filter = [req.header('nextMaintenanceId')];
        db.query(sqlSelect, filter, (err, result) => {
          checked_user_id=result[0].user_id;
          callback();
        });
      },
      // Get the second table contents
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlUpdate = "UPDATE next_maintenance SET name=?, date=DATE(?), mileage=?, time_interval=?, mileage_interval=?, description=?, reminder_sent = 0 WHERE id=? ;"
          const values = [req.body.name, req.body.date, parseInt(req.body.mileage) || 2147483647, parseInt(req.body.time_interval) || null, parseInt(req.body.mileage_interval) || null,
                            req.body.description, req.header('nextMaintenanceId')];
          db.query(sqlUpdate, values,  (err, result) => {
            if(!err){
              res.status(200).send({message: 'Next maintenance updated'});
            }else{
              console.log(err)
              res.status(401).send('Next maintenance not updated');
            }
          })
        }
      }
  // Send the response
    ], function ( error, results ) { });
  }
});

app.post("/api/deleteNextMaintenance", passport.authenticate("jwt", { session: false }), (req, res) => {
  if(!req.user){
    res.json(false)
  } else {
    let checked_user_id = null;
    async.series( [
      // Get the first table contents
      function ( callback ) {
        const sqlSelect = "SELECT user_id FROM vehicle WHERE id = (SELECT vehicle_id FROM next_maintenance WHERE id = ?);"
        const filter = [req.header('nextMaintenanceId')];
        db.query(sqlSelect, filter, (err, result) => {
          checked_user_id=result[0].user_id;
          callback();
        });
      },
      // Get the second table contents
      function ( callback ) {
        if(checked_user_id==req.user.id){
          const sqlDelete = "DELETE FROM next_maintenance WHERE id=? ;"
          const values = [req.header('nextMaintenanceId')];
          db.query(sqlDelete, values,  (err, result) => {
            if(!err){
              res.status(200).send({message: 'Next maintenance deleted'});
            }else{
              console.log(err)
              res.status(401).send('Next maintenance not deleted');
            }
          })
        }
      }
  // Send the response
    ], function ( error, results ) { });
  }
});

//EMAIL____________________________________-DZIAŁA------------------------------------------------------------

const applicationEmail = 'XXX@gmail.com';
const applicationEmailPassword = 'XXX';
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: applicationEmail,
    pass: applicationEmailPassword
  }
});


//--------------------- REMINDER EMAILS FOR MAINTENANCES-----------------
const getNextMaintenances = ()=>{
  return new Promise((resolve, reject) => {
    const sqlSelect = "SELECT * FROM next_maintenance;"
    db.query(sqlSelect, (err, result) => {
      if (err) reject(err); 
      resolve(result);
    })
  })
}
const getVehicle = (vehicleId)=>{
  return new Promise((resolve, reject) => {
    const sqlSelect = "SELECT * FROM vehicle WHERE id = ?;"
    const filter = [vehicleId];
    db.query(sqlSelect, filter, (err, result) => {
      if (err) reject(err); 
      resolve(result[0]);
    })
  })
}
const getUser = (id)=>{
  return new Promise((resolve, reject) => {
    const sqlSelect = "SELECT * FROM user WHERE id = ?;"
    const filter = [id];
    db.query(sqlSelect, filter, (err, result) => {
      if (err) reject(err); 
      resolve(result[0]);
    })
  })
}
const setIsSent = (id, reminder_sent)=>{
  return new Promise((resolve, reject) => {
    const sqlUpdate = "UPDATE next_maintenance SET reminder_sent = ? WHERE id=? ;"
    const filter = [reminder_sent, id];
    db.query(sqlUpdate, filter, (err, result) => {
      if (err) reject(err); 
      resolve(true);
    })
  })
}

let maintenanceReminderTimerId = setInterval(async() => {
  const nextMaintenances = await getNextMaintenances();
  for(const i in nextMaintenances){
    if(nextMaintenances[i].reminder_sent==0){
      const today = new Date();
      const nextWeek = Date.parse(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
      
      if(nextMaintenances[i].date<=nextWeek){
        const vehicle= await getVehicle(nextMaintenances[i].vehicle_id);
        const user= await getUser(vehicle.user_id);
        const daysToMake = nextMaintenances[i].date.getDate() - today.getDate();
        let mailText;
        if(daysToMake<0){
          mailText = `Hello ${user.name}!\n`
          +`Your car ${vehicle.name} needs maintenance named ${nextMaintenances[i].name}. Your maintenance was scheduled for ${moment(nextMaintenances[i].date).format('DD.MM.YYYY')}`
          + `,so you should have done it ${0-daysToMake} days ago.\n`
          + `Mileage of scheduled maintenance: ${nextMaintenances[i].mileage}\n`
          + `Descpription of maintenance:\n${nextMaintenances[i].description}`;
        }else{
          mailText = `Hello ${user.name}!\n`
          +`Your car ${vehicle.name} needs maintenance named ${nextMaintenances[i].name}. Your maintenance was scheduled for ${moment(nextMaintenances[i].date).format('DD.MM.YYYY')}`
          + `,so you have ${nextMaintenances[i].date.getDate() - today.getDate()} days to make it.\n`
          + `Mileage of scheduled maintenance: ${nextMaintenances[i].mileage}\n`
          + `Descpription of maintenance:\n${nextMaintenances[i].description}`;
        }
        //console.log(mailText);
        //mail
        var mailOptions = {
          from: applicationEmail,
          to: user.email, // user.email
          subject: `Your car ${vehicle.name} needs maintenance!`,
          text: mailText
        };
        transporter.sendMail(mailOptions, function(error, info){
          if (error) {
            console.log(error);
          } else {
            console.log('Email sent: ' + info.response);
            setIsSent(nextMaintenances[i].id, 1);
          }
        });
      }else{
        const vehicle= await getVehicle(nextMaintenances[i].vehicle_id);
        if(nextMaintenances[i].mileage<vehicle.mileage+1000){
          const user= await getUser(vehicle.user_id);
          let mailText;
          if(nextMaintenances[i].mileage<vehicle.mileage){
            mailText = `Hello ${user.name}!\n`
            +`Your car ${vehicle.name} needs maintenance named ${nextMaintenances[i].name}. Your maintenance was scheduled for ${nextMaintenances[i].mileage} mileage,`
            + ` and now mileage of your car is ${vehicle.mileage} ,so you should have done it ${0-nextMaintenances[i].mileage-vehicle.mileage} mileage ago.\n`
            + `Date of scheduled maintenance: ${moment(nextMaintenances[i].date).format('DD.MM.YYYY')}\n`
            + `Descpription of maintenance:\n${nextMaintenances[i].description}`;
          }else{
            mailText = `Hello ${user.name}!\n`
            +`Your car ${vehicle.name} needs maintenance named ${nextMaintenances[i].name}. Your maintenance was scheduled for ${nextMaintenances[i].mileage} mileage`
            + ` and now mileage of your car is ${vehicle.mileage} ,so you have ${nextMaintenances[i].mileage-vehicle.mileage} mileage to make it.\n`
            + `Date of scheduled maintenance: ${moment(nextMaintenances[i].date).format('DD.MM.YYYY')}\n`
            + `Descpription of maintenance:\n${nextMaintenances[i].description}`;
          }
          //console.log(mailText);
          //mail
          var mailOptions = {
            from: applicationEmail,
            to: user.email, // user.email
            subject: `Your car ${vehicle.name} needs maintenance!`,
            text: mailText
          };
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
              setIsSent(nextMaintenances[i].id, 1);
            }
          });
        }
      }
    }
  }
}, 86400000); //86400000 -> 24h

//--------------------- REMINDER EMAILS FOR MILEAGE UPDATE -----------------

const getUsers = ()=>{
  return new Promise((resolve, reject) => {
    const sqlSelect = "SELECT * FROM user ;"
    db.query(sqlSelect, (err, result) => {
      if (err) reject(err); 
      resolve(result);
    })
  })
}
const getVehicles = (userId)=>{
  return new Promise((resolve, reject) => {
    const sqlSelect = "SELECT * FROM vehicle WHERE user_id = ?;"
    const filter = [userId];
    db.query(sqlSelect, filter, (err, result) => {
      if (err) reject(err); 
      resolve(result);
    })
  })
}

let mileageReminderTimerId = setInterval(async() => {
  const users = await getUsers();

  users.map(async(user)=>{
    let mailText = `Hello ${user.name}!\n`
    + `This email is automatic reminder sent every 2 weeks. Remember to update current mileage of your cars. `
    + `Below you can check current mileage of your cars in app.\n`;

    const vehicles= await getVehicles(user.id);
    vehicles.map((vehicle)=>{
      mailText += `id: ${vehicle.id}, name: ${vehicle.name}, mileage: ${vehicle.mileage}\n`;
    })
    //console.log(mailText)
    //mail
    var mailOptions = {
      from: applicationEmail,
      to: user.email, // user.email
      subject: `Remember to update current mileage of your cars!`,
      text: mailText
    };
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  })
}, 1209600000); //1209600000 -> 14 Days

app.listen(3001, () => {
  console.log("running on port 3001");
})