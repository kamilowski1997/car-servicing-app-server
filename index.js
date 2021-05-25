const express = require('express')
const app = express()
const mysql = require('mysql')

const db = mysql.createPool({
    host: "localhost",
    user: "nodeuser",
    password: "nodeuser@1234",
    database: "car_servicing_db"
})

app.get('/', (req, res) =>{
    const sqlInsert = "insert into user (name, email, password) values('node express2', 'nodeexpress2@gmail.com', 'password2');"
    db.query(sqlInsert, (err, result) => {
        //res.send(err);
        res.send("prawdopodobnie dodano")
    })
    
})

app.listen(3001, () => {
    console.log("running on port 3001");
})