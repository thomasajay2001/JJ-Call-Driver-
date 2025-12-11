const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const axios = require('axios');
const http = require('http');

app.use(cors());

const server = http.createServer(app);
const BASE_URL = "http://192.168.0.105:3000";
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',      
  user: 'root',            
  password: 'Gomathi@123',            
  database: 'jjdrivers'         
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL Database');
  }
});


io.on("connection", (socket) => {
  console.log("Driver or customer connected:", socket.id);

  // Driver sends live location
  socket.on("driverLocation", (data) => {
    // data = { driverId, lat, lng }

    // update database also
    db.query(
      "UPDATE DRIVERS SET LAT=?, LNG=? WHERE ID=?",
      [data.lat, data.lng, data.driverId]
    );

    // send to all customers
    io.emit("updateDriverLocation", data);
  });

  // Driver online/offline
  socket.on("driverStatus", (data) => {
    // data = { driverId, status }

    db.query(
      "UPDATE DRIVERS SET STATUS=? WHERE ID=?",
      [data.status, data.driverId]
    );

    io.emit("updateDriverStatus", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
  });
});


app.post('/api/login', upload.none(),(req, res) => {
  const username = req.body.username;
  const password= req.body.password;
  const query = "SELECT * FROM supportTeam WHERE username = ? AND password = ?";
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error during login:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.length > 0) {
      res.json({ success: true, message: 'Login successful', user: results[0] });
    } else {
      res.json({ success: false, message: 'Invalid username or password' });
    }
  });
});


app.post("/api/send-otp", async (req, res) => {
  const  phone  = req.body.phone;

  // Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  try {
    console.log(`Generated OTP for ${phone}: ${otp}`);

    const query = "INSERT INTO otp_verification (phone, otp, created_at) VALUES (?, ?, NOW())";
    db.query(query, [phone, otp], (err) => {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      res.json({ success: true, message: "OTP generated successfully", otp });
    });
  } catch (error) {
    console.error("Error generating OTP:", error);
    res.status(500).json({ success: false, message: "Error generating OTP" });
  }
});


app.post("/api/verify-otp",(req, res) => {
  const { phone, otp } = req.body;

  const query =
    "SELECT * FROM otp_verification WHERE phone = ? ORDER BY created_at DESC LIMIT 1";

  db.query(query, [phone], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0)
      return res.status(400).json({ message: "No OTP found for this number" });

    const validOtp = results[0].otp;

    if (validOtp == otp) {

      // Optional: delete OTP after verification
      db.query("DELETE FROM otp_verification WHERE phone = ?", [phone]);

      res.json({ success: true, message: "OTP verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  });
});

app.post('/api/trip-booking',upload.none(),(req,res)=>{

  const booking = req.body;

  io.emit("newbooking",booking);
  console.log(booking)
  res.json({ status: true, message: "Booking Added" });

 
})


app.get('/api/customer', async (req, res) => {
    var result = [];
    db.query('SELECT ID, NAME,PHONE,AREA,TRIPTYPE,DATEOFTRAVEL,CREATED_TIME FROM CUSTOMERS ORDER BY ID DESC', function (error, results, fields) {
        if (error) {
             logger.error(`Error fetching customers: ${error.message}`);
            res.send(JSON.stringify({status: false}));
            return; 
        }
        for(i = 0; i < results.length; i++) {
            result.push({'id': results[i].ID, 'Name': results[i].NAME, 'phone': results[i].PHONE, 'area': results[i].AREA, 'triptype': results[i].TRIPTYPE, 'dateoftravel': results[i].DATEOFTRAVEL,'createdtime': results[i].CREATED_TIME});
        }
        console.log(`Fetched ${results.length} customer records`);
        res.send(JSON.stringify(result));
    });
})



app.post('/api/adddrivers', upload.none(), (req, res) => {
  const name = req.body.name;
  const mobile = parseInt(req.body.mobile);
  const location = req.body.location;
  
  const lat = req.body.lat;
  const lng = req.body.lng;

  const sql = "INSERT INTO DRIVERS (NAME, MOBILE, LOCATION, LAT, LNG) VALUES (?,?, ?, ?, ?)";
  db.query(sql, [name, mobile, location, lat, lng], (err, results) => {
    if (err) {
      console.error("error inserting data:", err);
      return res.status(500).send({ message: "Database Error" });
    }
    console.log("Driver added successfully");
    return res.status(200).send({ message: "Driver added successfully" });
  });
});


app.get('/api/drivers', (req, res) => {
  db.query('SELECT ID, NAME, MOBILE, LOCATION, STATUS, VEHICLE, LAT, LNG  FROM drivers ORDER BY ID DESC',
    function (error, results) {
      if (error) {
        console.log(`Error fetching drivers: ${error.message}`);
        return res.send(JSON.stringify({ status: false }));
      }

      const result = results.map(r => ({
        id: r.ID,
        name: r.NAME,
        mobile: r.MOBILE,
        location: r.LOCATION,
        vehicle:r.VEHICLE,
        status:r.STATUS,
              lat: parseFloat(r.LAT),
      lng: parseFloat(r.LNG)
      }));
     console.log("data",result)
      res.send(JSON.stringify(result));
    }
  );
});

app.put('/api/updatedriver/:id', upload.none(), (req, res) => {
  const driverId = req.params.id;
  const name = req.body.name;
  const mobile = req.body.mobile;
  const location = req.body.location;
  const lat = req.body.lat;
  const lng = req.body.lng;

  const sql = "UPDATE DRIVERS SET NAME=?, MOBILE=?, LOCATION=?, LAT=?, LNG=? WHERE ID=?";
  db.query(sql, [name,mobile, location, lat, lng, driverId], (err, result) => {
    if (err) {
      console.error("error updating driver:", err);
      return res.status(500).send({ message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Driver not found" });
    }

    console.log(`Driver with ID ${driverId} updated successfully`);
    return res.status(200).send({ message: "Driver updated successfully" });
  });
});


app.delete('/api/deletedriver/:id', (req, res) => {
  const driverId = req.params.id; // get driver id from URL
  const sql = "DELETE FROM DRIVERS WHERE ID = ?";
  db.query(sql, [driverId], (err, result) => {
    if (err) {
      console.error("Error deleting driver:", err);
      return res.status(500).send({ message: "Database Error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Driver not found" });
    }
    console.log(`Driver with ID ${driverId} deleted successfully`);
    return res.status(200).send({ message: "Driver deleted successfully" });
  });
});

app.post('/api/driver/updateLocation', (req, res) => {
  const { driverId, lat, lng } = req.body;

  const sql = "UPDATE DRIVERS SET LAT = ?, LNG = ? WHERE ID = ?";
  db.query(sql, [lat, lng, driverId], (err, result) => {
    if (err) {
      console.error("Error updating location:", err);
      return res.status(500).send({ success: false, message: "DB error" });
    }
    res.send({ success: true, message: "Location updated" });
  });
});

app.post('/api/driver/updateStatus', (req, res) => {
  const { driverId, status } = req.body;

  const sql = "UPDATE DRIVERS SET STATUS = ? WHERE ID = ?";
  db.query(sql, [status, driverId], (err) => {
    if (err) {
      console.error("Error updating status:", err);
      return res.status(500).send({ success: false });
    }
    res.send({ success: true, message: "Status updated" });
  });
});



const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

