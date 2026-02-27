const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer();
const axios = require("axios");
const http = require("http");
require("dotenv").config();
const otpStore = {};
const OTP_EXPIRY_MS = 5 * 60 * 1000;

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
        .query("UPDATE DRIVERS SET STATUS='offline' WHERE ID=?", [
          socket.driverId,
        ]);
      console.log("Driver offline:", socket.driverId);
    }
  });
});

// ─── LOGIN ───────────────────────────────────
app.post("/api/login", upload.none(), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Username and password are required" });
  }
  const query = "SELECT * FROM SUPPORTTEAM WHERE USERNAME = ? AND PASSWORD = ?";
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error("Login DB error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
    if (results.length > 0) {
      return res.json({
        success: true,
        message: "Login successful",
        user: results[0],
      });
    }
    return res.json({
      success: false,
      message: "Invalid username or password",
    });
  });
});

// ─── UPDATE CREDENTIALS ──────────────────────
app.post("/api/support/update-credentials", upload.none(), (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  if (!username || !currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }
  if (newPassword.trim().length < 4) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 4 characters",
    });
  }
  const verifyQuery =
    "SELECT * FROM SUPPORTTEAM WHERE USERNAME = ? AND PASSWORD = ?";
  db.query(
    verifyQuery,
    [username.trim(), currentPassword.trim()],
    (err, results) => {
      if (err) {
        console.error("Verify DB error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }
      if (results.length === 0) {
        return res.json({
          success: false,
          message: "Incorrect current username or password",
        });
      }
      const userId = results[0].ID;
      const updateQuery = "UPDATE SUPPORTTEAM SET PASSWORD = ? WHERE ID = ?";
      db.query(updateQuery, [newPassword.trim(), userId], (updateErr) => {
        if (updateErr) {
          console.error("Update DB error:", updateErr);
          return res
            .status(500)
            .json({ success: false, message: "Failed to update password" });
        }
        return res.json({
          success: true,
          message: "Credentials updated successfully",
        });
      });
    }
  );
});

// ─── SEND OTP ────────────────────────────────
app.post("/api/send-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone number" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[phone] = {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  };

  db.query(
    "INSERT IGNORE INTO CUSTOMERS (PHONE) VALUES (?)",
    [phone],
    async (err) => {
      if (err) {
        console.error("Customer Insert Error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      const apiKey = process.env.FAST2SMS_API_KEY;

      if (!apiKey) {
        console.log(`[TEST MODE] OTP for ${phone}: ${otp}`);
        return res.json({
          success: true,
          message: "OTP generated (test mode)",
          otp: otp,
        });
      }

      try {
        const smsRes = await axios.post(
          "https://www.fast2sms.com/dev/bulkV2",
          { variables_values: otp, route: "otp", numbers: phone },
          {
            headers: {
              authorization: apiKey,
              "Content-Type": "application/json",
            },
          }
        );

        if (!smsRes.data.return) {
          return res.json({
            success: true,
            message: `SMS unavailable. OTP: ${otp}`,
            otp: otp,
          });
        }

        return res.json({
          success: true,
          message: "OTP sent to your mobile number",
        });
      } catch (smsErr) {
        console.error("Fast2SMS Error:", smsErr.message);
        return res.json({
          success: true,
          message: `SMS unavailable. OTP: ${otp}`,
          otp: otp,
        });
      }
    }
  );
});

// ─── VERIFY OTP ──────────────────────────────
app.post("/api/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Phone and OTP required" });
  }

  const record = otpStore[phone];

  if (!record) {
    return res
      .status(400)
      .json({ success: false, message: "OTP not found. Request a new one." });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[phone];
    return res
      .status(400)
      .json({ success: false, message: "OTP expired. Request a new one." });
  }

  if (String(record.otp) !== String(otp.trim())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid OTP. Try again." });
  }

  delete otpStore[phone];
  return res.json({ success: true, message: "OTP verified successfully" });
});

// ─── TRIP BOOKING ────────────────────────────
app.post("/api/trip-booking", async (req, res) => {
  try {
    const { name, phone, pickup, pickupLat, pickupLng, drop, bookingphnno, triptype } = req.body;
    if (!name || !phone || !pickup || !drop || !bookingphnno) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }
    const [result] = await db.promise().query(
      `INSERT INTO bookings (customer_name, customer_mobile, booking_phnno, pickup, pickup_lat, pickup_lng, drop_location, triptype, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, bookingphnno, pickup, pickupLat || null, pickupLng || null, drop, triptype || "local", "pending"]
    );
    res.json({ success: true, message: "Booking created successfully", bookingId: result.insertId });
  } catch (error) {
    console.error("Trip booking error:", error);
    res.status(500).json({ success: false, error: "Failed to create booking", message: error.message });
  }
});

// ─── UPDATE BOOKING (admin assigns driver) ───
app.put("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const { driver, status } = req.body;
  try {
    await db.promise().query(
      "UPDATE bookings SET driver_id=?, status=? WHERE id=?",
      [driver, status, id]
    );
    if (driver) {
      await db.promise().query(
        "UPDATE DRIVERS SET STATUS=? WHERE ID=?",
        [status, driver]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Booking update error:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// ─── ACCEPT BOOKING ──────────────────────────
// Admin assigns → status='assigned'. Driver accepts → status='accepted'
app.post("/api/accept-booking", async (req, res) => {
  const { bookingId, driverId } = req.body;
  try {
    // Check for 'assigned' status (admin-assigned flow)
    const [bookings] = await db.promise().query(
      "SELECT * FROM bookings WHERE id=? AND status='assigned'",
      [bookingId]
    );

    if (!bookings.length) {
      return res.json({ success: false, message: "Booking not available or already accepted" });
    }

    const [drivers] = await db.promise().query(
      "SELECT NAME, MOBILE FROM DRIVERS WHERE ID=?",
      [driverId]
    );
    const driver = drivers[0];
    if (!driver) {
      return res.json({ success: false, message: "Driver not found" });
    }

    await db.promise().query(
      "UPDATE bookings SET status='accepted', driver_id=? WHERE id=?",
      [driverId, bookingId]
    );

    try {
      await db.promise().query(
        `INSERT IGNORE INTO accept_booking (booking_id, driver_id, driver_name, driver_mobile) VALUES (?,?,?,?)`,
        [bookingId, driverId, driver.NAME, driver.MOBILE]
      );
    } catch {}

    await db.promise().query(
      "UPDATE DRIVERS SET STATUS='inride' WHERE ID=?",
      [driverId]
    );

    io.to(`booking_${bookingId}`).emit("driverAssigned", {
      bookingId,
      driverName: driver.NAME,
      driverMobile: driver.MOBILE,
    });
    io.to(`driver_${driverId}`).emit("bookingConfirmed", { bookingId });

    res.json({ success: true });
  } catch (err) {
    console.error("Accept booking error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DECLINE BOOKING ─────────────────────────
// Driver declines → reset driver_id=NULL, status='pending'
// Booking reappears in admin panel for reassignment
app.post("/api/decline-booking", async (req, res) => {
  const { bookingId, driverId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ success: false, message: "bookingId required" });
  }

  try {
    // Confirm this booking is actually assigned to this driver
    const [rows] = await db.promise().query(
      "SELECT id, driver_id, status FROM bookings WHERE id=?",
      [bookingId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = rows[0];

    // Only allow decline if booking is in 'assigned' state
    if (booking.status !== "assigned") {
      return res.json({ success: false, message: `Cannot decline booking with status: ${booking.status}` });
    }

    // Verify it's actually assigned to this driver (security check)
    if (driverId && String(booking.driver_id) !== String(driverId)) {
      return res.status(403).json({ success: false, message: "This booking is not assigned to you" });
    }

    // ✅ Reset: driver_id = NULL, status = 'pending'
    // This returns it to admin's unassigned list
    await db.promise().query(
      "UPDATE bookings SET driver_id = NULL, status = 'pending' WHERE id = ?",
      [bookingId]
    );

    // Also reset driver status back to 'online' if they were set to something else
    if (driverId) {
      await db.promise().query(
        "UPDATE DRIVERS SET STATUS = 'online' WHERE ID = ? AND STATUS != 'offline'",
        [driverId]
      );
    }

    console.log(`✅ Booking ${bookingId} declined by driver ${driverId} — reset to pending`);

    // Notify admin via socket that booking needs reassignment
    io.to("admins").emit("bookingDeclined", {
      bookingId,
      message: "Driver declined — needs reassignment",
    });

    res.json({ success: true, message: "Booking returned to pending for reassignment" });
  } catch (err) {
    console.error("Decline booking error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CUSTOMER BOOKINGS ───────────────────────
app.get("/api/bookings/customer", async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone number is required" });
    }
    const [bookings] = await db.promise().query(
      `SELECT b.id, b.customer_name, b.customer_mobile, b.booking_phnno,
              b.pickup, b.pickup_lat, b.pickup_lng, b.drop_location,
              b.driver_id, b.status, b.created_at,
              d.NAME AS driver_name, d.MOBILE AS driver_phone
       FROM bookings b
       LEFT JOIN DRIVERS d ON b.driver_id = d.ID
       WHERE b.booking_phnno = ?
       ORDER BY b.created_at DESC`,
      [phone]
    );
    res.json(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch bookings", message: error.message });
  }
});

// ─── DRIVER BOOKINGS (active) ────────────────
app.get("/api/bookings/driver", (req, res) => {
  const { driverId } = req.query;
  const sql = `SELECT * FROM bookings WHERE driver_id = ? AND status IN ('assigned','accepted','inride') ORDER BY id DESC`;
  db.query(sql, [driverId], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ─── DRIVER BOOKINGS (assigned only - for poll) ─
app.get("/api/bookings/driver/assigned", async (req, res) => {
  const { driverId } = req.query;
  if (!driverId) return res.status(400).json([]);
  try {
    const [rows] = await db.promise().query(
      `SELECT b.id,
              b.customer_name AS name,
              b.customer_mobile AS mobile,
              b.pickup,
              b.drop_location AS drop,
              b.triptype,
              b.status,
              b.driver_id AS driver,
              b.pickup_lat,
              b.pickup_lng
       FROM bookings b
       WHERE b.driver_id = ? AND b.status = 'assigned'
       ORDER BY b.created_at DESC`,
      [driverId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Assigned bookings error:", err);
    res.status(500).json([]);
  }
});

// ─── DRIVER BOOKINGS (all history) ──────────
app.get("/api/bookings/driver/all", async (req, res) => {
  const { driverId, filter } = req.query;
  if (!driverId) {
    return res.status(400).json({ success: false, error: "driverId is required" });
  }
  let dateClause = "";
  switch (filter) {
    case "today":     dateClause = "AND DATE(b.created_at) = CURDATE()"; break;
    case "yesterday": dateClause = "AND DATE(b.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"; break;
    case "thisweek":  dateClause = "AND YEARWEEK(b.created_at, 1) = YEARWEEK(CURDATE(), 1)"; break;
    case "thismonth": dateClause = "AND MONTH(b.created_at) = MONTH(CURDATE()) AND YEAR(b.created_at) = YEAR(CURDATE())"; break;
    default:          dateClause = "";
  }
  const sql = `SELECT b.id, b.customer_name, b.customer_mobile, b.pickup, b.drop_location, b.triptype, b.status, b.created_at
               FROM bookings b
               WHERE b.driver_id = ? ${dateClause}
               ORDER BY b.created_at DESC`;
  try {
    const [results] = await db.promise().query(sql, [driverId]);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error("Driver all bookings error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch bookings" });
  }
});

// ─── SUBMIT RATING ───────────────────────────
app.post("/api/submit-rating", async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    await db.promise().query(
      `UPDATE bookings SET rating = ?, feedback = ? WHERE id = ?`,
      [rating, comment, bookingId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Rating error:", error);
    res.status(500).json({ success: false });
  }
});

// ─── DRIVER RATING ───────────────────────────
app.get("/api/driver-rating/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const [result] = await db.promise().query(
      `SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(rating) AS total_ratings
       FROM bookings WHERE driver_id = ? AND rating IS NOT NULL`,
      [driverId]
    );
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rating" });
  }
});

// ─── START RIDE ──────────────────────────────
app.post("/api/bookings/start", (req, res) => {
  const { bookingId, driverId } = req.body;
  db.query("UPDATE bookings SET status='inride' WHERE id=?", [bookingId], (err) => {
    if (err) return res.status(500).send({ success: false });
    db.query("UPDATE DRIVERS SET STATUS='inride' WHERE ID=?", [driverId], (err2) => {
      if (err2) return res.status(500).send({ success: false });
      res.send({ success: true });
    });
  });
});

// ─── COMPLETE RIDE ───────────────────────────
app.post("/api/complete-ride", async (req, res) => {
  const { bookingId, driverId } = req.body;
  try {
    await db.promise().query(
      "UPDATE bookings SET status='completed' WHERE id=?",
      [bookingId]
    );
    await db.promise().query(
      "UPDATE DRIVERS SET STATUS='online' WHERE ID=?",
      [driverId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ─── DRIVER PROFILE ──────────────────────────
app.get("/api/drivers/profile", (req, res) => {
  const { driverId } = req.query;
  const sql = `SELECT d.ID, d.NAME, d.MOBILE, d.BLOODGRP, d.LICENCENO,
                      COUNT(b.id) AS total_rides
               FROM DRIVERS d
               LEFT JOIN bookings b ON d.ID = b.driver_id AND b.status = 'completed'
               WHERE d.ID = ? GROUP BY d.ID`;
  db.query(sql, [driverId], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ─── GET CUSTOMERS ───────────────────────────
app.get("/api/customer", async (req, res) => {
  db.query("SELECT ID, NAME, PHONE FROM CUSTOMERS ORDER BY ID DESC", function (error, results) {
    if (error) {
      console.error(`Error fetching customers: ${error.message}`);
      res.send(JSON.stringify({ status: false }));
      return;
    }
    const result = results.map((r) => ({ id: r.ID, Name: r.NAME, phone: r.PHONE }));
    res.send(JSON.stringify(result));
  });
});

// ─── ADD DRIVER ──────────────────────────────
app.post("/api/adddrivers", upload.none(), (req, res) => {
  const { name, status, paymentmode, location, experience, feeDetails, dob, bloodgrp, age, licenceNo, gender, car_type, lat, lng, payactive } = req.body;
  const mobile = parseInt(req.body.mobile);
  const sql = "INSERT INTO DRIVERS (NAME, MOBILE, LOCATION, EXPERIENCE, FEES_DETAILS, DOB, BLOODGRP, AGE, GENDER, CAR_TYPE, LICENCENO, LAT, LNG, PAYMENT_METHOD, STATUS, PAYACTIVE) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
  db.query(sql, [name, mobile, location, experience, feeDetails, dob, bloodgrp, age, gender, car_type, licenceNo, lat, lng, paymentmode, status, payactive], (err) => {
    if (err) {
      console.error("error inserting data:", err);
      return res.status(500).send({ message: "Database Error" });
    }
    return res.status(200).send({ message: "Driver added successfully" });
  });
});

// ─── GET DRIVERS ─────────────────────────────
app.get("/api/drivers", (req, res) => {
  db.query(
    "SELECT ID, NAME, MOBILE, LOCATION, STATUS, CAR_TYPE, EXPERIENCE, FEES_DETAILS, DOB, BLOODGRP, AGE, GENDER, LICENCENO, LAT, LNG, PAYMENT_METHOD, PAYACTIVE FROM DRIVERS ORDER BY ID DESC",
    function (error, results) {
      if (error) {
        console.log(`Error fetching drivers: ${error.message}`);
        return res.send(JSON.stringify({ status: false }));
      }
      const result = results.map((r) => ({
        id: r.ID, name: r.NAME, mobile: r.MOBILE, location: r.LOCATION,
        car_type: r.CAR_TYPE, experience: r.EXPERIENCE, feeDetails: r.FEES_DETAILS,
        dob: r.DOB, bloodgrp: r.BLOODGRP, age: r.AGE, gender: r.GENDER,
        licenceNo: r.LICENCENO, paymentmode: r.PAYMENT_METHOD, status: r.STATUS,
        lat: parseFloat(r.LAT), lng: parseFloat(r.LNG), payactive: r.PAYACTIVE,
      }));
      res.send(JSON.stringify(result));
    }
  );
});

// ─── UPDATE DRIVER ───────────────────────────
app.put("/api/updatedriver/:id", upload.none(), (req, res) => {
  const driverId = req.params.id;
  const { name, mobile, location, paymentmode, experience, feeDetails, dob, bloodgrp, age, licenceNo, gender, car_type, lat, lng, status, payactive } = req.body;
  const sql = "UPDATE DRIVERS SET NAME=?, MOBILE=?, LOCATION=?, EXPERIENCE=?, FEES_DETAILS=?, DOB=?, BLOODGRP=?, AGE=?, GENDER=?, CAR_TYPE=?, LICENCENO=?, PAYMENT_METHOD=?, LAT=?, LNG=?, STATUS=?, PAYACTIVE=? WHERE ID=?";
  db.query(sql, [name, mobile, location, experience, feeDetails, dob, bloodgrp, age, gender, car_type, licenceNo, paymentmode, lat, lng, status, payactive, driverId], (err, result) => {
    if (err) {
      console.error("error updating driver:", err);
      return res.status(500).send({ message: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Driver not found" });
    }
    return res.status(200).send({ message: "Driver updated successfully" });
  });
});

// ─── DELETE DRIVER ───────────────────────────
app.delete("/api/deletedriver/:id", (req, res) => {
  const driverId = req.params.id;
  db.query("DELETE FROM DRIVERS WHERE ID = ?", [driverId], (err, result) => {
    if (err) {
      console.error("Error deleting driver:", err);
      return res.status(500).send({ message: "Database Error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Driver not found" });
    }
    return res.status(200).send({ message: "Driver deleted successfully" });
  });
});

// ─── UPDATE DRIVER LOCATION ──────────────────
app.post("/api/driver/updateLocation", (req, res) => {
  const { driverId, lat, lng } = req.body;
  db.query("UPDATE DRIVERS SET LAT = ?, LNG = ? WHERE ID = ?", [lat, lng, driverId], (err) => {
    if (err) {
      console.error("Error updating location:", err);
      return res.status(500).send({ success: false, message: "DB error" });
    }
    res.send({ success: true, message: "Location updated" });
  });
});

// ─── UPDATE DRIVER STATUS ────────────────────
app.post("/api/driver/updateStatus", (req, res) => {
  const { driverId, status } = req.body;
  db.query("UPDATE DRIVERS SET STATUS = ? WHERE ID = ?", [status, driverId], (err) => {
    if (err) {
      console.error("Error updating status:", err);
      return res.status(500).send({ success: false });
    }
    res.send({ success: true, message: "Status updated" });
  });
});

// ─── GET ALL BOOKINGS ────────────────────────
app.get("/api/bookings", (req, res) => {
  db.query(
    `SELECT id, customer_name, customer_mobile, pickup, drop_location,
            status, driver_id, pickup_lat, pickup_lng, triptype
     FROM bookings ORDER BY id DESC`,
    function (error, results) {
      if (error) {
        console.error("error fetching bookings:", error);
        return res.status(500).send({ message: "Database error" });
      }
      const result = results.map((r) => ({
        id:              r.id,
        name:            r.customer_name,
        mobile:          r.customer_mobile,
        pickup:          r.pickup,
        drop:            r.drop_location,
        status:          r.status,
        driver:          r.driver_id,
        pickup_lat:      r.pickup_lat,
        pickup_lng:      r.pickup_lng,
        triptype:        r.triptype,
      }));
      res.send(JSON.stringify(result));
    }
  );
});

// ─── CUSTOMER PROFILE ────────────────────────
app.get("/api/customers/profile", async (req, res) => {
  const { phone } = req.query;
  db.query("SELECT * FROM CUSTOMERS WHERE PHONE = ?", [phone], (err, results) => {
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

// ─── UPDATE CUSTOMER NAME ────────────────────
app.put("/api/customers/update-name", async (req, res) => {
  try {
    const { phone, name } = req.body;
    await db.execute("UPDATE CUSTOMERS SET NAME = ? WHERE PHONE = ?", [name, phone]);
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