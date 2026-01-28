const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer();
const axios = require("axios");
const http = require("http");

app.use(cors());

const server = http.createServer(app);
const BASE_URL = "http://192.168.0.9:3000";
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const mysql = require("mysql2");

const db = mysql.createConnection({

  host: 'localhost',      
  user: 'root',            
  password: 'Gomathi@123',            
  database: 'jjdrivers'         
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL Database");
  }
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("joinAdminRoom", () => {
    socket.join("admins");
    console.log("👑 Admin joined admins room");
  });

  socket.on("joinBookingRoom", ({ bookingId }) => {
    socket.join(`booking_${bookingId}`);
    console.log("Customer joined booking room:", bookingId);
  });

  socket.on("joinDriverRoom", ({ driverId }) => {
    socket.join(`driver_${driverId}`);
    socket.driverId = driverId;
    console.log("Driver joined:", driverId);
  });

  socket.on("joinCustomer", (customerId) => {
    socket.join(`customer_${customerId}`);
    console.log("Customer joined:", customerId);
  });

  socket.on("disconnect", async () => {
    console.log("❌ Socket disconnected:", socket.id);

    if (socket.driverId) {
      await db
        .promise()
        .query("UPDATE drivers SET status='offline' WHERE id=?", [
          socket.driverId,
        ]);
      console.log("Driver offline:", socket.driverId);
    }
  });
});

app.post("/api/login", upload.none(), (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const query = "SELECT * FROM supportTeam WHERE username = ? AND password = ?";
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error("Error during login:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
    if (results.length > 0) {
      res.json({
        success: true,
        message: "Login successful",
        user: results[0],
      });
    } else {
      res.json({ success: false, message: "Invalid username or password" });
    }
  });
});

app.post("/api/send-otp", async (req, res) => {
  const phone = req.body.phone;

  // Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  try {
    console.log(`Generated OTP for ${phone}: ${otp}`);

    const query =
      "INSERT INTO otp_verification (phone, otp, created_at) VALUES (?, ?, NOW())";
    db.query(query, [phone, otp], (err) => {
      if (err) {
        console.error("DB Insert Error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      res.json({ success: true, message: "OTP generated successfully", otp });
    });
  } catch (error) {
    console.error("Error generating OTP:", error);
    res.status(500).json({ success: false, message: "Error generating OTP" });
  }
});

app.post("/api/verify-otp", (req, res) => {
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

app.post("/api/trip-booking", (req, res) => {
  const { name, phone, pickup, pickupLat, pickupLng, drop, driverId } =
    req.body;

  if (!name || !phone || !pickup || !drop) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  const sql = `
    INSERT INTO bookings
    (customer_name, customer_mobile, pickup, pickup_lat, pickup_lng, drop_location, driver_id, status)
    VALUES (?,?,?,?,?,?,?, 'pending')
  `;

  db.query(
    sql,
    [name, phone, pickup, pickupLat, pickupLng, drop, driverId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false });
      }

      const booking = {
        bookingId: result.insertId,
        name,
        phone,
        pickup,
        drop,
        driverId,
      };

      // ✅ Emit to driver
      io.to(`driver_${driverId}`).emit("newBooking", booking);

      // ✅ Emit to admin
      io.to("admins").emit("newBooking", booking);

      console.log("📢 New booking emitted:", booking);

      res.json({ success: true, bookingId: booking.bookingId });
    },
  );
});




app.put("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const { driver, status } = req.body;

  await db.promise().query(
    "UPDATE bookings SET driver_id=?, status=? WHERE id=?",
    [driver, status, id]
  );

  res.json({ success: true });
});


/* ================= ACCEPT BOOKING ================= */
app.post("/api/accept-booking", async (req, res) => {
  const { bookingId, driverId } = req.body;

  try {
    // 1️⃣ Get booking + customer socket room
    const [bookings] = await db
      .promise()
      .query("SELECT * FROM bookings WHERE id=? AND status='pending'", [
        bookingId,
      ]);

    if (!bookings.length) {
      return res.json({ success: false, message: "Already accepted" });
    }

    // 2️⃣ Get driver details
    const [drivers] = await db
      .promise()
      .query("SELECT name, mobile FROM drivers WHERE id=?", [driverId]);

    const driver = drivers[0];
    console.log(driver);

    // 3️⃣ Update booking
    await db
      .promise()
      .query("UPDATE bookings SET status='accepted', driver_id=? WHERE id=?", [
        driverId,
        bookingId,
      ]);

    // 4️⃣ Save accept history
    await db.promise().query(
      `INSERT INTO accept_booking 
       (booking_id, driver_id, driver_name, driver_mobile)
       VALUES (?,?,?,?)`,
      [bookingId, driverId, driver.name, driver.mobile],
    );

    // 5️⃣ Driver status
    await db
      .promise()
      .query("UPDATE drivers SET status='inride' WHERE id=?", [driverId]);

    // 🔔 6️⃣ SOCKET → CUSTOMER
    io.to(`booking_${bookingId}`).emit("driverAssigned", {
      bookingId,
      driverName: driver.name,
      driverMobile: driver.mobile,
    });
    console.log(bookingId, driver.name, driver.mobile);

    // 🔔 7️⃣ SOCKET → DRIVER
    io.to(`driver_${driverId}`).emit("bookingConfirmed", {
      bookingId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, bookingId: result.insertId });
  }
});

app.post("/api/complete-ride", async (req, res) => {
  const { bookingId, driverId } = req.body;

  try {
    await db
      .promise()
      .query("UPDATE bookings SET status='completed' WHERE id=?", [bookingId]);

    await db
      .promise()
      .query("UPDATE drivers SET status='online' WHERE id=?", [driverId]);

    io.emit("bookingStatusUpdate", {
      bookingId,
      status: "completed",
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// app.post("/api/bookingaccepted", (req, res) => {
//   const { name, mobile } = req.body;

//   if (!name || !mobile) {
//     return res.status(400).send({ success: false, message: "Missing details" });
//   }

//   // Check if already accepted
//   const checkSql = "SELECT * FROM accepted_bookings WHERE mobile = ?";
//   db.query(checkSql, [mobile], (err, rows) => {
//     if (err) return res.status(500).send(err);

//     if (rows.length > 0) {
//       // already accepted
//       return res.send({
//         success: false,
//         message: "Already accepted by another driver"
//       });
//     }

//     // otherwise save the new accepted booking
//     const insertSql = "INSERT INTO accepted_bookings (name, mobile) VALUES (?, ?)";
//     db.query(insertSql, [name, mobile], (err2) => {
//       if (err2) return res.status(500).send(err2);

//       return res.send({
//         success: true,
//         message: "Booking accepted successfully"
//       });
//     });
//   });
// });

app.get("/api/customer", async (req, res) => {
  var result = [];
  db.query(
    "SELECT ID, NAME,PHONE,AREA,TRIPTYPE,DATEOFTRAVEL,CREATED_TIME FROM CUSTOMERS ORDER BY ID DESC",
    function (error, results, fields) {
      if (error) {
        logger.error(`Error fetching customers: ${error.message}`);
        res.send(JSON.stringify({ status: false }));
        return;
      }
      for (i = 0; i < results.length; i++) {
        result.push({
          id: results[i].ID,
          Name: results[i].NAME,
          phone: results[i].PHONE,
          area: results[i].AREA,
          triptype: results[i].TRIPTYPE,
          dateoftravel: results[i].DATEOFTRAVEL,
          createdtime: results[i].CREATED_TIME,
        });
      }
      console.log(`Fetched ${results.length} customer records`);
      res.send(JSON.stringify(result));
    },
  );
});

app.post("/api/adddrivers", upload.none(), (req, res) => {
  const name = req.body.name;
  const mobile = parseInt(req.body.mobile);
  const location = req.body.location;

  const lat = req.body.lat;
  const lng = req.body.lng;

  const sql =
    "INSERT INTO DRIVERS (NAME, MOBILE, LOCATION, LAT, LNG) VALUES (?,?, ?, ?, ?)";
  db.query(sql, [name, mobile, location, lat, lng], (err, results) => {
    if (err) {
      console.error("error inserting data:", err);
      return res.status(500).send({ message: "Database Error" });
    }
    console.log("Driver added successfully");
    return res.status(200).send({ message: "Driver added successfully" });
  });
});

app.get("/api/drivers", (req, res) => {
  db.query(
    "SELECT ID, NAME, MOBILE, LOCATION, STATUS, VEHICLE, LAT, LNG  FROM drivers ORDER BY ID DESC",
    function (error, results) {
      if (error) {
        console.log(`Error fetching drivers: ${error.message}`);
        return res.send(JSON.stringify({ status: false }));
      }

      const result = results.map((r) => ({
        id: r.ID,
        name: r.NAME,
        mobile: r.MOBILE,
        location: r.LOCATION,
        vehicle: r.VEHICLE,
        status: r.STATUS,
        lat: parseFloat(r.LAT),
        lng: parseFloat(r.LNG),
      }));
      res.send(JSON.stringify(result));
    },
  );
});

app.put("/api/updatedriver/:id", upload.none(), (req, res) => {
  const driverId = req.params.id;
  const name = req.body.name;
  const mobile = req.body.mobile;
  const location = req.body.location;
  const lat = req.body.lat;
  const lng = req.body.lng;

  const sql =
    "UPDATE DRIVERS SET NAME=?, MOBILE=?, LOCATION=?, LAT=?, LNG=? WHERE ID=?";
  db.query(sql, [name, mobile, location, lat, lng, driverId], (err, result) => {
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

app.delete("/api/deletedriver/:id", (req, res) => {
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

app.post("/api/driver/updateLocation", (req, res) => {
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

app.post("/api/driver/updateStatus", (req, res) => {
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

app.get('/api/bookings',(req,res)=>{
  db.query('SELECT ID,CUSTOMER_NAME,CUSTOMER_MOBILE,PICKUP,DROP_LOCATION,STATUS,DRIVER_ID FROM bookings ORDER BY ID DESC',
    function(error,results){
  if (error) {
      console.error("error updating driver:", error);
      return res.status(500).send({ message: "Database error" });
    }

      const result = results.map(r => ({
        id: r.ID,
        name: r.CUSTOMER_NAME,
        mobile: r.CUSTOMER_MOBILE,
        pickup:r.PICKUP,
        drop: r.DROP_LOCATION,
        status:r.STATUS,
        driver:r.DRIVER_ID,
      }));
      res.send(JSON.stringify(result));
    }
  )
})


const PORT = 3000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
