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
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Gomathi@123",
  database: "jjdrivers",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL Database");
  }
});

app.get("/", (req, res) => {
  res.send("Server running OK ✅");
});

app.get("/test", (req, res) => {
  res.json({ message: "API working" });
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

app.post("/api/send-otp", (req, res) => {
  const phone = req.body.phone;

  if (!phone) {
    return res
      .status(400)
      .json({ success: false, message: "Phone is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);

  console.log(`Generated OTP for ${phone}: ${otp}`);

  // 1️⃣ Insert customer if not exists
  const insertCustomerQuery = `
    INSERT IGNORE INTO CUSTOMERS (PHONE)
    VALUES (?)
  `;

  db.query(insertCustomerQuery, [phone], (err) => {
    if (err) {
      console.error("Customer Insert Error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Customer error" });
    }

    // 2️⃣ Insert OTP
    const otpQuery = `
      INSERT INTO otp_verification (phone, otp, created_at)
      VALUES (?, ?, NOW())
    `;

    db.query(otpQuery, [phone, otp], (err2) => {
      if (err2) {
        console.error("OTP Insert Error:", err2);
        return res.status(500).json({ success: false, message: "OTP error" });
      }

      res.json({
        success: true,
        message: "OTP generated successfully",
        otp,
      });
    });
  });
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

app.post("/api/trip-booking", async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      pickup, 
      pickupLat, 
      pickupLng, 
      drop, 
      bookingphnno,
      triptype 
    } = req.body;
    if (!name || !phone || !pickup || !drop || !bookingphnno) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    const [result] = await db.promise().query(
      `INSERT INTO bookings 
        (customer_name, customer_mobile, booking_phnno, pickup, pickup_lat, pickup_lng, drop_location, triptype, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, 
        phone, 
        bookingphnno, 
        pickup, 
        pickupLat || null, 
        pickupLng || null, 
        drop,
        triptype || 'local',
        'pending'
      ]
    );

    res.json({ 
      success: true, 
      message: 'Booking created successfully',
      bookingId: result.insertId
    });
  } catch (error) {
    console.error('Trip booking error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create booking',
      message: error.message 
    });
  }
});

app.put("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const { driver, status } = req.body;

  try {
    // Update booking
    await db
      .promise()
      .query("UPDATE bookings SET driver_id=?, status=? WHERE id=?", [
        driver,
        status,
        id,
      ]);

    // Update driver status in driver table based on booking status
    if (driver) {
      await db
        .promise()
        .query("UPDATE drivers SET STATUS=? WHERE ID=?", [status, driver]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Booking update error:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// Support Team Login API
app.post("/api/support/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    const [result] = await db
      .promise()
      .query("SELECT * FROM SUPPORTTEAM WHERE USERNAME = ? AND PASSWORD = ?", [
        username,
        password,
      ]);

    if (result.length > 0) {
      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: result[0].ID,
          username: result[0].USERNAME,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }
  } catch (error) {
    console.error("Support login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
      message: error.message,
    });
  }
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
// Get customer booking history
app.get("/api/bookings/customer", async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    const [bookings] = await db.promise().query(
      `
      SELECT 
        b.id,
        b.customer_name,
        b.customer_mobile,
        b.booking_phnno,
        b.pickup,
        b.pickup_lat,
        b.pickup_lng,
        b.drop_location,
        b.driver_id,
        b.status,
        b.created_at,
        d.NAME AS driver_name,
        d.MOBILE AS driver_phone
      FROM bookings b
      LEFT JOIN drivers d 
        ON b.driver_id = d.ID
      WHERE b.booking_phnno = ?
      ORDER BY b.created_at DESC
      `,
      [phone]
    );

    res.json(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookings",
      message: error.message,
    });
  }
});

app.get("/api/bookings/driver", (req, res) => {
  const { driverId } = req.query;

  const sql = `
    SELECT *
    FROM bookings
    WHERE driver_id = ?
      AND status IN ('assigned','inride')
    ORDER BY id DESC
  `;

  db.query(sql, [driverId], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
    console.log(result);
  });
});


app.post("/api/submit-rating", async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    await db.promise().query(
      `UPDATE bookings 
       SET rating = ?, feedback = ? 
       WHERE id = ?`,
      [rating, comment, bookingId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Rating error:", error);
    res.status(500).json({ success: false });
  }
});

app.get("/api/driver-rating/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    const [result] = await db.promise().query(
      `
      SELECT 
        ROUND(AVG(rating),1) AS avg_rating,
        COUNT(rating) AS total_ratings
      FROM bookings
      WHERE driver_id = ?
      AND rating IS NOT NULL
      `,
      [driverId]
    );

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rating" });
  }
});
app.post("/api/bookings/start", (req, res) => {
  const { bookingId } = req.body;

  db.query("UPDATE bookings SET status='inride' WHERE id=?", [bookingId], () =>
    res.send({ success: true }),
  );
});

app.post("/api/complete-ride", async (req, res) => {
  const { bookingId } = req.body;

  try {
    await db.query("UPDATE bookings SET status='completed' WHERE id=?", [
      bookingId,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get("/api/drivers/profile", (req, res) => {
  const { driverId } = req.query;

  const sql = `
    SELECT 
      d.ID,
      d.NAME,
      d.MOBILE,
      d.BLOODGRP,
      d.LICENCENO,
      COUNT(b.id) AS total_rides
    FROM drivers d
    LEFT JOIN bookings b 
      ON d.ID = b.driver_id 
      AND b.status = 'completed'
    WHERE d.ID = ?
    GROUP BY d.ID
  `;

  db.query(sql, [driverId], (err, result) => {
    if (err) return res.status(500).send(err);

    res.json(result);
  });
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
  const paymentmode = req.body.paymentmode;
  const mobile = parseInt(req.body.mobile);
  const location = req.body.location;
  const experience = req.body.experience;
  const feeDetails = req.body.feeDetails;
  const dob = req.body.dob;
  const bloodgrp = req.body.bloodgrp;
  const age = req.body.age;
  const licenceNo = req.body.licenceNo;
  const gender = req.body.gender;
  const car_type = req.body.car_type;
  const lat = req.body.lat;
  const lng = req.body.lng;

  const sql =
    "INSERT INTO DRIVERS (NAME, MOBILE, LOCATION, EXPERIENCE, FEES_DETAILS, DOB, BLOODGRP, AGE, GENDER, CAR_TYPE, LICENCENO, LAT, LNG, PAYMENT_METHOD) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
  db.query(
    sql,
    [
      name,
      mobile,
      location,
      experience,
      feeDetails,
      dob,
      bloodgrp,
      age,
      gender,
      car_type,
      licenceNo,
      lat,
      lng,
      paymentmode,
    ],
    (err, results) => {
      if (err) {
        console.error("error inserting data:", err);
        return res.status(500).send({ message: "Database Error" });
      }
      console.log("Driver added successfully");
      return res.status(200).send({ message: "Driver added successfully" });
    },
  );
});

app.get("/api/drivers", (req, res) => {
  db.query(
    "SELECT ID, NAME, MOBILE, LOCATION, STATUS, CAR_TYPE, EXPERIENCE, FEES_DETAILS, DOB, BLOODGRP, AGE, GENDER, LICENCENO, LAT, LNG, PAYMENT_METHOD  FROM drivers ORDER BY ID DESC",
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
        car_type: r.CAR_TYPE,
        experience: r.EXPERIENCE,
        feeDetails: r.FEES_DETAILS,
        dob: r.DOB,
        bloodgrp: r.BLOODGRP,
        age: r.AGE,
        gender: r.GENDER,
        licenceNo: r.LICENCENO,
        paymentmode: r.PAYMENT_METHOD,
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

  const paymentmode = req.body.paymentmode;

  const experience = req.body.experience;
  const feeDetails = req.body.feeDetails;
  const dob = req.body.dob;
  const bloodgrp = req.body.bloodgrp;
  const age = req.body.age;
  const licenceNo = req.body.licenceNo;
  const gender = req.body.gender;
  const car_type = req.body.car_type;
  const lat = req.body.lat;
  const lng = req.body.lng;

  const sql =
    "UPDATE DRIVERS SET NAME=?, MOBILE=?, LOCATION=?, EXPERIENCE=?, FEES_DETAILS=?, DOB=?, BLOODGRP=?, AGE=?, GENDER=?, CAR_TYPE=?, LICENCENO=?, PAYMENT_METHOD=?, LAT=?, LNG=? WHERE ID=?";
  db.query(
    sql,
    [
      name,
      mobile,
      location,
      experience,
      feeDetails,
      dob,
      bloodgrp,
      age,
      gender,
      car_type,
      licenceNo,
      paymentmode,
      lat,
      lng,
      driverId,
    ],
    (err, result) => {
      if (err) {
        console.error("error updating driver:", err);
        return res.status(500).send({ message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).send({ message: "Driver not found" });
      }

      console.log(`Driver with ID ${driverId} updated successfully`);
      return res.status(200).send({ message: "Driver updated successfully" });
    },
  );
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

app.get("/api/bookings", (req, res) => {
  db.query(
    "SELECT ID,CUSTOMER_NAME,CUSTOMER_MOBILE,PICKUP,DROP_LOCATION,STATUS,DRIVER_ID FROM bookings ORDER BY ID DESC",
    function (error, results) {
      if (error) {
        console.error("error updating driver:", error);
        return res.status(500).send({ message: "Database error" });
      }

      const result = results.map((r) => ({
        id: r.ID,
        name: r.CUSTOMER_NAME,
        mobile: r.CUSTOMER_MOBILE,
        pickup: r.PICKUP,
        drop: r.DROP_LOCATION,
        status: r.STATUS,
        driver: r.DRIVER_ID,
      }));
      res.send(JSON.stringify(result));
    },
  );
});

app.get("/api/customers/profile", async (req, res) => {
  const { phone } = req.query;
  const sql = "SELECT * FROM CUSTOMERS WHERE PHONE = ?";
  db.query(sql, [phone], (err, results) => {
    if (err) {
      console.error("Error fetching customer profile:", err);
      return res.status(500).send({ message: "Database error" });
    }
    if (results.length === 0) {
      return res.status(404).send({ message: "Customer not found" });
    }
    res.send(results);
  });
});

// In your customers routes file
app.put("/api/customers/update-name", async (req, res) => {
  try {
    const { phone, name } = req.body;

    const query = "UPDATE customers SET NAME = ? WHERE PHONE = ?";
    await db.execute(query, [name, phone]);

    res.json({ success: true, message: "Name updated successfully" });
  } catch (error) {
    console.error("Update name error:", error);
    res.status(500).json({ error: "Failed to update name" });
  }
});
const PORT = 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server + Socket running on http://0.0.0.0:${PORT}`);
});
