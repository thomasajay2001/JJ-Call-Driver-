const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer();
const axios = require("axios");
const http = require("http");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const otpStore = {};
const OTP_EXPIRY_MS = 5 * 60 * 1000;

app.use(cors());

const server = http.createServer(app);
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Gomathi@123",
  database: "jjdrivers",
});

db.connect((err) => {
  if (err) { console.error("Database connection failed:", err); }
  else {
    console.log("Connected to MySQL Database");
    db.query("SHOW COLUMNS FROM DRIVERS LIKE 'PASSWORD'", (showErr, results) => {
      if (showErr) {
        console.warn("Could not verify DRIVERS.PASSWORD column:", showErr.sqlMessage || showErr.message);
        return;
      }
      if (!results || results.length === 0) {
        db.query("ALTER TABLE DRIVERS ADD COLUMN PASSWORD VARCHAR(255) DEFAULT NULL", (alterErr) => {
          if (alterErr) {
            console.warn("Could not add DRIVERS.PASSWORD column:", alterErr.sqlMessage || alterErr.message);
          } else {
            console.log("DRIVERS.PASSWORD column created");
          }
        });
      } else {
        console.log("DRIVERS.PASSWORD column is ready");
      }
    });
  }
});

// ═══ MULTER — logo upload ═══
const logoDir = path.join(__dirname, "uploads/logos");
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `app_logo${ext}`);
  },
});
const logoUpload = multer({
  storage: logoStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only PNG/JPG/SVG/WEBP allowed"));
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

// ═══ HELPERS ═══
const safeMobile = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const n = parseInt(String(val).replace(/\D/g, ""), 10);
  return isNaN(n) ? null : n;
};
const safeDate = (val) => {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s.startsWith("0000") || s === "0000-00-00 00:00:00") return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return s;
};
const safeStr = (val, maxLen = 255) => {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  return s.substring(0, maxLen);
};
const normalizeBlood = (val) => {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (s.length <= 10) return s;
  const map = {
    "AB POSITIVE": "AB+", "AB NEGATIVE": "AB-", "A1 POSITIVE": "A1+", "A1 NEGATIVE": "A1-",
    "B1 POSITIVE": "B1+", "B1 NEGATIVE": "B1-", "A POSITIVE": "A+", "A NEGATIVE": "A-",
    "B POSITIVE": "B+", "B NEGATIVE": "B-", "O POSITIVE": "O+", "O NEGATIVE": "O-",
  };
  for (const [long, short] of Object.entries(map)) { if (s.includes(long)) return short; }
  return s.substring(0, 10);
};

app.get("/", (req, res) => res.send("Server running OK ✅"));
app.get("/test", (req, res) => res.json({ message: "API working" }));

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);
  socket.on("joinAdminRoom", () => { socket.join("admins"); });
  socket.on("joinBookingRoom", ({ bookingId }) => { socket.join(`booking_${bookingId}`); });
  socket.on("joinDriverRoom", ({ driverId }) => { socket.join(`driver_${driverId}`); socket.driverId = driverId; });
  socket.on("joinCustomer", (customerId) => { socket.join(`customer_${customerId}`); });
  socket.on("disconnect", async () => {
    if (socket.driverId) {
      await db.promise().query("UPDATE DRIVERS SET STATUS='offline' WHERE ID=?", [socket.driverId]);
    }
  });
});

// ─── LOGIN ───────────────────────────────────
app.post("/api/login", upload.none(), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: "Username and password are required" });
  db.query("SELECT * FROM SUPPORTTEAM WHERE USERNAME = ? AND PASSWORD = ?", [username, password], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (results.length > 0) return res.json({ success: true, message: "Login successful", user: results[0] });
    return res.json({ success: false, message: "Invalid username or password" });
  });
});

// ─── UPDATE CREDENTIALS ──────────────────────
app.post("/api/support/update-credentials", upload.none(), (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  if (!username || !currentPassword || !newPassword) return res.status(400).json({ success: false, message: "All fields are required" });
  if (newPassword.trim().length < 4) return res.status(400).json({ success: false, message: "New password must be at least 4 characters" });
  db.query("SELECT * FROM SUPPORTTEAM WHERE USERNAME = ? AND PASSWORD = ?", [username.trim(), currentPassword.trim()], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (results.length === 0) return res.json({ success: false, message: "Incorrect current username or password" });
    db.query("UPDATE SUPPORTTEAM SET PASSWORD = ? WHERE ID = ?", [newPassword.trim(), results[0].ID], (updateErr) => {
      if (updateErr) return res.status(500).json({ success: false, message: "Failed to update password" });
      return res.json({ success: true, message: "Credentials updated successfully" });
    });
  });
});

// ─── SEND OTP ────────────────────────────────
app.post("/api/send-otp", (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Invalid phone number" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[phone] = { otp, expiresAt: Date.now() + OTP_EXPIRY_MS };

  db.query("INSERT IGNORE INTO CUSTOMERS (PHONE) VALUES (?)", [phone], async (err) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });

    const apiKey = process.env.FAST2SMS_API_KEY;

    // If no API key, use test mode
    if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
      console.log(`[TEST MODE] OTP for ${phone}: ${otp}`);
      return res.json({ success: true, message: "OTP generated (test mode)", otp });
    }

    try {
      // Fast2SMS API call
      const smsRes = await axios.post("https://www.fast2sms.com/dev/bulkV2", {
        route: "otp",
        variables_values: otp,
        numbers: phone
      }, {
        headers: {
          "authorization": apiKey,
          "Content-Type": "application/json"
        }
      });

      console.log(`SMS Response for ${phone}:`, smsRes.data);

      // Check if SMS was sent successfully
      if (smsRes.data.return === true) {
        return res.json({ success: true, message: "OTP sent to your mobile number" });
      } else {
        console.error(`SMS failed for ${phone}:`, smsRes.data);
        return res.json({ success: true, message: `SMS failed. OTP: ${otp}`, otp });
      }

    } catch (error) {
      console.error(`SMS Error for ${phone}:`, error.response?.data || error.message);
      return res.json({ success: true, message: `SMS service error. OTP: ${otp}`, otp });
    }
  });
});

// ─── VERIFY OTP ──────────────────────────────
app.post("/api/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, message: "Phone and OTP required" });
  const record = otpStore[phone];
  if (!record) return res.status(400).json({ success: false, message: "OTP not found. Request a new one." });
  if (Date.now() > record.expiresAt) { delete otpStore[phone]; return res.status(400).json({ success: false, message: "OTP expired. Request a new one." }); }
  if (String(record.otp) !== String(otp.trim())) return res.status(400).json({ success: false, message: "Invalid OTP. Try again." });
  delete otpStore[phone];
  return res.json({ success: true, message: "OTP verified successfully" });
});

// ─── TEST SMS ENDPOINT ──────────────────────
app.post("/api/test-sms", async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: "Valid phone number required" });
  }

  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
    return res.json({
      success: false,
      message: "Fast2SMS API key not configured",
      test_mode: true,
      api_key_configured: false
    });
  }

  try {
    const testOtp = "123456"; // Test OTP
    const smsRes = await axios.post("https://www.fast2sms.com/dev/bulkV2", {
      route: "otp",
      variables_values: testOtp,
      numbers: phone
    }, {
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      }
    });

    console.log(`Test SMS Response for ${phone}:`, smsRes.data);

    return res.json({
      success: true,
      message: "Test SMS sent successfully",
      response: smsRes.data,
      test_otp: testOtp
    });

  } catch (error) {
    console.error(`Test SMS Error for ${phone}:`, error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Test SMS failed",
      error: error.response?.data || error.message
    });
  }
});

// ─── DRIVER OTP VERIFICATION ─────────────────
app.post("/api/drivers/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, message: "Phone and OTP required" });
  
  // Verify OTP first
  const record = otpStore[phone];
  if (!record) return res.status(400).json({ success: false, message: "OTP not found. Request a new one." });
  if (Date.now() > record.expiresAt) { delete otpStore[phone]; return res.status(400).json({ success: false, message: "OTP expired. Request a new one." }); }
  if (String(record.otp) !== String(otp.trim())) return res.status(400).json({ success: false, message: "Invalid OTP. Try again." });
  delete otpStore[phone];
  
  // Find driver by phone number
  db.query("SELECT ID as id, NAME as name, MOBILE as mobile, DRIVER_NO as driver_no, STATUS as status FROM DRIVERS WHERE MOBILE = ?", [phone], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (!results || results.length === 0) return res.status(404).json({ success: false, message: "Driver not found with this phone number" });
    
    const driver = results[0];
    return res.json({ success: true, message: "OTP verified successfully", driver });
  });
});

app.post("/api/drivers/login", (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ success: false, message: "Phone and password are required" });
  const mobile = safeMobile(phone);
  if (!mobile) return res.status(400).json({ success: false, message: "Invalid phone number" });
  db.query("SELECT ID as id, NAME as name, MOBILE as mobile, DRIVER_NO as driver_no, STATUS as status FROM DRIVERS WHERE MOBILE = ? AND PASSWORD = ?", [mobile, password.trim()], (err, results) => {
    if (err) {
      console.error("Driver login DB error:", err.sqlMessage || err.message);
      return res.status(500).json({ success: false, message: "Database error", error: err.sqlMessage || err.message });
    }
    if (!results || results.length === 0) return res.status(400).json({ success: false, message: "Invalid phone or password" });
    return res.json({ success: true, message: "Login successful", driver: results[0] });
  });
});

app.post("/api/drivers/reset-password", (req, res) => {
  const { phone, otp, newPassword } = req.body;
  console.log("Reset-password request:", { phone, otp: otp ? "<redacted>" : undefined, hasOtp: !!otp, newPassword: newPassword ? "<provided>" : undefined });
  if (!phone || !newPassword) return res.status(400).json({ success: false, message: "Phone and new password are required" });
  if (String(newPassword).trim().length < 4) return res.status(400).json({ success: false, message: "New password must be at least 4 characters" });

  const mobile = safeMobile(phone);
  if (!mobile) return res.status(400).json({ success: false, message: "Invalid phone number" });

  db.query("UPDATE DRIVERS SET PASSWORD = ? WHERE MOBILE = ?", [newPassword.trim(), mobile], (err, result) => {
    if (err) {
      console.error("Reset password DB error:", err.sqlMessage || err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Driver not found" });
    return res.json({ success: true, message: "Password reset successfully" });
  });
});

// ─── TRIP BOOKING ────────────────────────────
app.post("/api/trip-booking", async (req, res) => {
  try {
    const { name, phone, pickup, pickupLat, pickupLng, drop, bookingphnno, triptype, carType, recommended_driver_id, scheduled_at, is_scheduled } = req.body;
    if (!name || !phone || !pickup || !drop || !bookingphnno)
      return res.status(400).json({ success: false, error: "All fields are required" });
    const scheduledDate = scheduled_at ? new Date(scheduled_at) : null;
    if (scheduledDate && scheduledDate < new Date(Date.now() + 29 * 60 * 1000))
      return res.status(400).json({ success: false, message: "Scheduled time must be at least 30 minutes from now" });
    const isScheduledBool = !!(is_scheduled && scheduledDate);
    const status = isScheduledBool ? "scheduled" : "pending";
    const [result] = await db.promise().query(
      `INSERT INTO bookings (customer_name, customer_mobile, booking_phnno, pickup, pickup_lat, pickup_lng, drop_location, triptype, car_type, status, recommended_driver_id, is_scheduled, scheduled_at, scheduled_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, bookingphnno, pickup, pickupLat || null, pickupLng || null, drop, triptype || "local", carType || null, status, recommended_driver_id || null, isScheduledBool ? 1 : 0, scheduledDate, isScheduledBool ? "pending" : null]
    );
    if (!isScheduledBool && global.io) {
      global.io.to("admins").emit("newBooking", { bookingId: result.insertId, name, phone, pickup, drop, triptype: triptype || "local" });
    }
    res.json({ success: true, message: "Booking created successfully", bookingId: result.insertId });
  } catch (error) {
    console.error("Trip booking error:", error);
    res.status(500).json({ success: false, error: "Failed to create booking", message: error.message });
  }
});

// ─── CANCEL BOOKING ──────────────────────────
app.post("/api/bookings/:id/cancel", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query("SELECT status FROM bookings WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Booking not found" });
    const cancelable = ["pending", "wait5", "wait10", "wait30", "allbusy"];
    if (!cancelable.includes(rows[0].status)) return res.json({ success: false, message: "Cannot cancel booking at this stage" });
    await db.promise().query("UPDATE bookings SET status = 'cancelled', driver_id = NULL WHERE id = ?", [id]);
    io.to("admins").emit("bookingCancelled", { bookingId: id, message: "Customer cancelled the booking" });
    res.json({ success: true, message: "Booking cancelled" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── CANCEL SCHEDULED BOOKING ────────────────
app.post("/api/bookings/:id/cancel-scheduled", async (req, res) => {
  const { id } = req.params;
  const PENALTY_AMOUNT = 200;
  try {
    const [rows] = await db.promise().query(`SELECT id, status, is_scheduled, scheduled_at, customer_mobile, customer_name FROM bookings WHERE id = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Booking not found" });
    const booking = rows[0];
    const cancelable = ["scheduled", "pending", "wait5", "wait10", "wait30", "allbusy"];
    if (!cancelable.includes(booking.status?.toLowerCase()))
      return res.status(400).json({ success: false, message: `Cannot cancel booking with status: ${booking.status}` });
    let hasPenalty = false, newStatus = "cancelled";
    if (booking.is_scheduled && booking.scheduled_at) {
      const minsUntil = (new Date(booking.scheduled_at) - new Date()) / (1000 * 60);
      if (minsUntil < 60 && minsUntil > 0) { hasPenalty = true; newStatus = "cancelled_with_penalty"; }
    }
    await db.promise().query(`UPDATE bookings SET status = ?, driver_id = NULL, cancellation_penalty = ?, cancelled_at = NOW() WHERE id = ?`, [newStatus, hasPenalty ? PENALTY_AMOUNT : 0, id]);
    if (hasPenalty) {
      try { await db.promise().query(`INSERT INTO cancellation_penalties (booking_id, customer_mobile, customer_name, amount, penalty_reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())`, [id, booking.customer_mobile, booking.customer_name, PENALTY_AMOUNT, "Cancelled within 1 hour of scheduled ride"]); }
      catch (penaltyErr) { console.warn("Could not record penalty:", penaltyErr.message); }
    }
    if (global.io) global.io.to("admins").emit("bookingCancelled", { bookingId: id, hasPenalty, penaltyAmount: hasPenalty ? PENALTY_AMOUNT : 0 });
    return res.json({ success: true, hasPenalty, penaltyAmount: hasPenalty ? PENALTY_AMOUNT : 0, message: hasPenalty ? `Booking cancelled. A ₹${PENALTY_AMOUNT} fee will be charged.` : "Booking cancelled successfully. No charge." });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ─── EDIT BOOKING (admin / customer) ─────────
// Editable fields: customer_name, customer_mobile, pickup, drop_location, triptype, scheduled_at
// Only allowed when status is: pending, scheduled, wait5, wait10, wait30, allbusy, completed
app.put("/api/bookings/:id/edit", async (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_mobile, pickup, drop_location, triptype, carType, scheduled_at } = req.body;

  try {
    const [rows] = await db.promise().query(
      "SELECT id, status, is_scheduled FROM bookings WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Booking not found" });

    const booking = rows[0];
    const editable = ["pending", "scheduled", "wait5", "wait10", "wait30", "allbusy", "completed"];
    if (!editable.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit booking with status: ${booking.status}`,
      });
    }

    const fields = [];
    const values = [];

    if (customer_name !== undefined) {
      const n = safeStr(customer_name, 100);
      if (!n) return res.status(400).json({ success: false, message: "customer_name cannot be empty" });
      fields.push("customer_name = ?");
      values.push(n);
    }
    if (customer_mobile !== undefined) {
      const m = safeStr(customer_mobile, 15);
      if (!m || !/^[6-9]\d{9}$/.test(m)) return res.status(400).json({ success: false, message: "customer_mobile must be a valid 10-digit number" });
      fields.push("customer_mobile = ?");
      values.push(m);
    }
    if (pickup !== undefined) {
      const p = safeStr(pickup, 255);
      if (!p) return res.status(400).json({ success: false, message: "pickup cannot be empty" });
      fields.push("pickup = ?");
      values.push(p);
    }
    if (drop_location !== undefined) {
      const d = safeStr(drop_location, 255);
      if (!d) return res.status(400).json({ success: false, message: "drop_location cannot be empty" });
      fields.push("drop_location = ?");
      values.push(d);
    }
    if (triptype !== undefined) {
      if (!["local", "outstation"].includes(triptype)) {
        return res.status(400).json({ success: false, message: "triptype must be 'local' or 'outstation'" });
      }
      fields.push("triptype = ?");
      values.push(triptype);
    }
    if (carType !== undefined) {
      const ct = safeStr(carType, 50);
      fields.push("car_type = ?");
      values.push(ct);
    }
    if (scheduled_at !== undefined) {
      if (!booking.is_scheduled) {
        return res.status(400).json({ success: false, message: "Cannot set scheduled_at on a non-scheduled booking" });
      }
      const scheduledDate = new Date(scheduled_at);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid scheduled_at date" });
      }
      if (scheduledDate < new Date(Date.now() + 29 * 60 * 1000)) {
        return res.status(400).json({ success: false, message: "Scheduled time must be at least 30 minutes from now" });
      }
      fields.push("scheduled_at = ?");
      values.push(scheduledDate);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No fields provided to update" });
    }

    values.push(id);
    await db.promise().query(`UPDATE bookings SET ${fields.join(", ")} WHERE id = ?`, values);

    // Notify admin panel of the edit
    io.to("admins").emit("bookingUpdated", { bookingId: id, edited: true });

    // Return updated booking
    const [updated] = await db.promise().query(
      "SELECT id, customer_name, customer_mobile, pickup, drop_location, triptype, car_type, status, scheduled_at, is_scheduled FROM bookings WHERE id = ?",
      [id]
    );
    return res.json({ success: true, message: "Booking updated successfully", booking: updated[0] });
  } catch (err) {
    console.error("Edit booking error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ADMIN CANCEL BOOKING ────────────────────
// Admin can cancel any non-terminal booking and optionally free the driver
app.post("/api/bookings/:id/admin-cancel", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const [rows] = await db.promise().query(
      "SELECT id, status, driver_id FROM bookings WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Booking not found" });

    const booking = rows[0];
    const terminal = ["completed", "cancelled", "cancelled_with_penalty"];
    if (terminal.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status} — cannot cancel`,
      });
    }

    // Cancel the booking
    await db.promise().query(
      "UPDATE bookings SET status = 'cancelled', driver_id = NULL, cancelled_at = NOW() WHERE id = ?",
      [id]
    );

    // Free the driver if one was assigned
    if (booking.driver_id) {
      await db.promise().query(
        "UPDATE DRIVERS SET STATUS = 'online', ENGAGED = 'No' WHERE ID = ? AND STATUS != 'offline'",
        [booking.driver_id]
      );
    }

    // Notify sockets
    io.to("admins").emit("bookingCancelled", {
      bookingId: id,
      message: reason || "Admin cancelled the booking",
    });
    io.to(`booking_${id}`).emit("bookingCancelledByAdmin", {
      bookingId: id,
      reason: reason || "Booking was cancelled by admin",
    });
    if (booking.driver_id) {
      io.to(`driver_${booking.driver_id}`).emit("bookingCancelledByAdmin", {
        bookingId: id,
      });
    }

    return res.json({ success: true, message: "Booking cancelled by admin" });
  } catch (err) {
    console.error("Admin cancel error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET ALL BOOKINGS (admin) ─────────────────
// Supports date filtering via query params:
//   ?filter=today|yesterday|thisweek|thismonth|custom
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD  (used when filter=custom)
//   ?status=pending,assigned,...    (comma-separated list to filter by status)
app.get("/api/bookings", (req, res) => {
  const { filter, from, to, status } = req.query;

  let dateClause = "";
  switch (filter) {
    case "today":
      dateClause = "AND DATE(created_at) = CURDATE()";
      break;
    case "yesterday":
      dateClause = "AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
      break;
    case "thisweek":
      dateClause = "AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
      break;
    case "thismonth":
      dateClause = "AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())";
      break;
    case "custom":
      if (from && to) {
        // Sanitize: only allow YYYY-MM-DD format to prevent SQL injection
        const dateRe = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRe.test(from) || !dateRe.test(to)) {
          return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        }
        dateClause = `AND DATE(created_at) BETWEEN '${from}' AND '${to}'`;
      }
      break;
  }

  let statusClause = "";
  if (status) {
    // Accept comma-separated statuses, whitelist against known values
    const allowed = ["pending","assigned","accepted","inride","completed","cancelled","cancelled_with_penalty","wait5","wait10","wait30","allbusy","scheduled","preferred_query"];
    const requested = status.split(",").map(s => s.trim()).filter(s => allowed.includes(s));
    if (requested.length > 0) {
      const placeholders = requested.map(() => "?").join(",");
      statusClause = `AND status IN (${placeholders})`;
    }
  }

  // Build final query — date and status params injected safely
  const query = `
    SELECT id, customer_name, customer_mobile, pickup, drop_location, status, driver_id,
           pickup_lat, pickup_lng, triptype, recommended_driver_id, is_scheduled,
           scheduled_at, scheduled_status, offline_assigned, created_at
    FROM bookings
    WHERE 1=1 ${dateClause} ${statusClause}
    ORDER BY id DESC
  `;

  const statusValues = status
    ? status.split(",").map(s => s.trim()).filter(s => ["pending","assigned","accepted","inride","completed","cancelled","cancelled_with_penalty","wait5","wait10","wait30","allbusy","scheduled","preferred_query"].includes(s))
    : [];

  db.query(query, statusValues, (error, results) => {
    if (error) return res.status(500).send({ message: "Database error" });
    res.send(JSON.stringify(results.map((r) => ({
      id: r.id,
      name: r.customer_name,
      mobile: r.customer_mobile,
      pickup: r.pickup,
      drop: r.drop_location,
      status: r.status,
      driver: r.driver_id,
      pickup_lat: r.pickup_lat,
      pickup_lng: r.pickup_lng,
      triptype: r.triptype,
      recommended_driver_id: r.recommended_driver_id,
      is_scheduled: r.is_scheduled === 1,
      scheduled_at: r.scheduled_at,
      scheduled_status: r.scheduled_status,
      offline_assigned: r.offline_assigned === 1,
      created_at: r.created_at,
    }))));
  });
});

// ─── BOOKING STATUS ───────────────────────────
app.get("/api/bookings/status/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query(
      `SELECT b.id, b.customer_name, b.pickup, b.drop_location, b.triptype, b.status, b.driver_id, b.scheduled_at, b.is_scheduled,
              b.ride_hours, b.ride_minutes, b.base_hours_used, b.base_fare_used, b.extra_per_hr_used, b.amount, b.payment_status,
              b.created_at,
              CASE WHEN b.status IN ('accepted','inride','completed') THEN d.NAME  ELSE NULL END AS driver_name,
              CASE WHEN b.status IN ('accepted','inride','completed') THEN d.MOBILE ELSE NULL END AS driver_phone
       FROM bookings b LEFT JOIN DRIVERS d ON b.driver_id = d.ID WHERE b.id = ? LIMIT 1`, [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Booking not found" });
    return res.json({ success: true, booking: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
});

// ─── UPDATE BOOKING (admin assigns/updates) ──
app.put("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const { driver, status } = req.body;
  try {
    if (driver !== undefined && driver !== null) {
      const newStatus = status || "assigned";
      const isOfflineAssign = newStatus === "accepted";
      await db.promise().query(
        "UPDATE bookings SET driver_id = ?, status = ?, offline_assigned = ? WHERE id = ?",
        [driver, newStatus, isOfflineAssign ? 1 : 0, id]
      );
      if (newStatus === "completed") {
        await db.promise().query("UPDATE DRIVERS SET STATUS = 'offline', ENGAGED = 'No' WHERE ID = ?", [driver]);
      } else if (newStatus === "accepted" || newStatus === "inride") {
        await db.promise().query("UPDATE DRIVERS SET STATUS = 'inride', ENGAGED = 'Yes' WHERE ID = ?", [driver]);
      } else {
        await db.promise().query("UPDATE DRIVERS SET STATUS = 'assigned' WHERE ID = ?", [driver]);
      }
    } else if (status === "completed") {
      const [rows] = await db.promise().query("SELECT driver_id FROM bookings WHERE id = ?", [id]);
      await db.promise().query("UPDATE bookings SET status = 'completed' WHERE id = ?", [id]);
      if (rows.length && rows[0].driver_id) {
        await db.promise().query("UPDATE DRIVERS SET STATUS = 'offline', ENGAGED = 'No' WHERE ID = ?", [rows[0].driver_id]);
      }
    } else {
      await db.promise().query("UPDATE bookings SET driver_id = NULL, status = ? WHERE id = ?", [status, id]);
    }
    io.to("admins").emit("bookingUpdated", { bookingId: id, status });
    res.json({ success: true });
  } catch (error) {
    console.error("Booking update error:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// ─── ACCEPT BOOKING ──────────────────────────
app.post("/api/accept-booking", async (req, res) => {
  const { bookingId, driverId } = req.body;
  try {
    const [bookings] = await db.promise().query("SELECT * FROM bookings WHERE id=? AND status='assigned'", [bookingId]);
    if (!bookings.length) return res.json({ success: false, message: "Booking not available or already accepted" });
    const [drivers] = await db.promise().query("SELECT NAME, MOBILE FROM DRIVERS WHERE ID=?", [driverId]);
    const driver = drivers[0];
    if (!driver) return res.json({ success: false, message: "Driver not found" });
    await db.promise().query("UPDATE bookings SET status='accepted', driver_id=? WHERE id=?", [driverId, bookingId]);
    try { await db.promise().query(`INSERT IGNORE INTO accept_booking (booking_id, driver_id, driver_name, driver_mobile) VALUES (?,?,?,?)`, [bookingId, driverId, driver.NAME, driver.MOBILE]); } catch { }
    await db.promise().query("UPDATE DRIVERS SET STATUS='inride', ENGAGED='Yes' WHERE ID=?", [driverId]);
    io.to(`booking_${bookingId}`).emit("driverAssigned", { bookingId, driverName: driver.NAME, driverMobile: driver.MOBILE });
    io.to(`driver_${driverId}`).emit("bookingConfirmed", { bookingId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── DECLINE BOOKING ─────────────────────────
app.post("/api/decline-booking", async (req, res) => {
  const { bookingId, driverId } = req.body;
  if (!bookingId) return res.status(400).json({ success: false, message: "bookingId required" });
  try {
    const [rows] = await db.promise().query("SELECT id, driver_id, status FROM bookings WHERE id=?", [bookingId]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Booking not found" });
    const booking = rows[0];
    if (booking.status !== "assigned") return res.json({ success: false, message: `Cannot decline: ${booking.status}` });
    if (driverId && String(booking.driver_id) !== String(driverId)) return res.status(403).json({ success: false, message: "Not assigned to you" });
    await db.promise().query("UPDATE bookings SET driver_id = NULL, status = 'pending' WHERE id = ?", [bookingId]);
    if (driverId) await db.promise().query("UPDATE DRIVERS SET STATUS = 'online', ENGAGED = 'No' WHERE ID = ? AND STATUS != 'offline'", [driverId]);
    io.to("admins").emit("bookingDeclined", { bookingId, message: "Driver declined — needs reassignment" });
    res.json({ success: true, message: "Booking returned to pending" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── RECOMMENDED DRIVERS ─────────────────────
app.get("/recommended-drivers/:phone", async (req, res) => {
  const { phone } = req.params;
  if (!phone) return res.status(400).json({ success: false, message: "Phone number required" });
  try {
    const [active] = await db.promise().query(`SELECT id FROM bookings WHERE booking_phnno = ? AND status IN ('pending','accepted','assigned','inride') LIMIT 1`, [phone]);
    if (active.length > 0) return res.json({ success: true, drivers: [] });
    const [drivers] = await db.promise().query(
      `SELECT d.ID as id, d.NAME as name, d.STATUS as status, COUNT(b.id) AS total_rides FROM bookings b JOIN DRIVERS d ON b.driver_id = d.ID WHERE b.booking_phnno = ? AND b.status = 'completed' AND b.driver_id IS NOT NULL GROUP BY d.ID, d.NAME, d.STATUS HAVING COUNT(b.id) >= 1 ORDER BY total_rides DESC`, [phone]
    );
    return res.json({ success: true, drivers });
  } catch { return res.status(500).json({ success: false, message: "Server error" }); }
});

// ─── CUSTOMER BOOKINGS ───────────────────────
app.get("/api/bookings/customer", async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, error: "Phone number is required" });
    const [bookings] = await db.promise().query(
      `SELECT b.id, b.customer_name, b.customer_mobile, b.booking_phnno, b.pickup, b.pickup_lat, b.pickup_lng, b.drop_location,
              b.driver_id, b.status, b.created_at, b.amount, b.is_scheduled, b.scheduled_at, b.rating, b.feedback,
              b.cancellation_penalty, b.ride_hours, b.ride_minutes, b.triptype,
              CASE WHEN b.status IN ('accepted','inride','completed') THEN d.NAME  ELSE NULL END AS driver_name,
              CASE WHEN b.status IN ('accepted','inride','completed') THEN d.MOBILE ELSE NULL END AS driver_phone
       FROM bookings b LEFT JOIN DRIVERS d ON b.driver_id = d.ID WHERE b.booking_phnno = ? ORDER BY b.created_at DESC`, [phone]
    );
    res.json(bookings);
  } catch (error) { res.status(500).json({ success: false, error: "Failed to fetch bookings", message: error.message }); }
});

// ─── DRIVER BOOKINGS (active) ─────────────────
app.get("/api/bookings/driver", (req, res) => {
  const { driverId } = req.query;
  db.query(`SELECT * FROM bookings WHERE driver_id = ? AND status IN ('assigned','accepted','inride') ORDER BY id DESC`, [driverId], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ─── DRIVER BOOKINGS (assigned only) ──────────
app.get("/api/bookings/driver/assigned", async (req, res) => {
  const { driverId } = req.query;
  if (!driverId) return res.status(400).json([]);
  try {
    const [rows] = await db.promise().query(
      `SELECT b.id, b.customer_name AS name, b.customer_mobile AS mobile, b.pickup, b.drop_location AS drop, b.triptype, b.status, b.driver_id AS driver, b.pickup_lat, b.pickup_lng FROM bookings b WHERE b.driver_id = ? AND b.status = 'assigned' ORDER BY b.created_at DESC`, [driverId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json([]); }
});

// ─── DRIVER BOOKINGS (all history) ────────────
app.get("/api/bookings/driver/all", async (req, res) => {
  const { driverId, filter } = req.query;
  if (!driverId) return res.status(400).json({ success: false, error: "driverId is required" });
  let dateClause = "";
  switch (filter) {
    case "today": dateClause = "AND DATE(b.created_at) = CURDATE()"; break;
    case "yesterday": dateClause = "AND DATE(b.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"; break;
    case "thisweek": dateClause = "AND YEARWEEK(b.created_at, 1) = YEARWEEK(CURDATE(), 1)"; break;
    case "thismonth": dateClause = "AND MONTH(b.created_at) = MONTH(CURDATE()) AND YEAR(b.created_at) = YEAR(CURDATE())"; break;
  }
  try {
    const [results] = await db.promise().query(
      `SELECT b.id, b.customer_name, b.customer_mobile, b.pickup, b.drop_location, b.triptype, b.status, b.amount, b.created_at FROM bookings b WHERE b.driver_id = ? ${dateClause} ORDER BY b.created_at DESC`, [driverId]
    );
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, error: "Failed to fetch bookings" }); }
});

// ─── SUBMIT RATING ────────────────────────────
app.post("/api/submit-rating", async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    await db.promise().query(`UPDATE bookings SET rating = ?, feedback = ? WHERE id = ?`, [rating, comment, bookingId]);
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

// ─── DRIVER RATING ────────────────────────────
app.get("/api/driver-rating/:driverId", async (req, res) => {
  try {
    const [result] = await db.promise().query(`SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(rating) AS total_ratings FROM bookings WHERE driver_id = ? AND rating IS NOT NULL`, [req.params.driverId]);
    res.json(result[0]);
  } catch { res.status(500).json({ error: "Failed to fetch rating" }); }
});

// ─── START RIDE ───────────────────────────────
app.post("/api/bookings/start", (req, res) => {
  const { bookingId, driverId } = req.body;
  db.query("UPDATE bookings SET status='inride' WHERE id=?", [bookingId], (err) => {
    if (err) return res.status(500).send({ success: false });
    db.query("UPDATE DRIVERS SET STATUS='inride', ENGAGED='Yes' WHERE ID=?", [driverId], (err2) => {
      if (err2) return res.status(500).send({ success: false });
      res.send({ success: true });
    });
  });
});

// ─── COMPLETE RIDE ────────────────────────────
app.post("/api/complete-ride", async (req, res) => {
  const { bookingId, driverId, amount, ride_hours, ride_minutes } = req.body;
  try {
    const [settings] = await db.promise().query("SELECT base_hours, base_fare, extra_per_hr FROM master_settings WHERE id = 1").catch(() => [[]]);
    const cfg = settings[0] || {};
    if (amount != null) {
      await db.promise().query(
        `UPDATE bookings SET status='completed', ride_hours=?, ride_minutes=?, amount=?, base_hours_used=?, base_fare_used=?, extra_per_hr_used=?, payment_status='pending' WHERE id=?`,
        [ride_hours ?? 0, ride_minutes ?? 0, amount, cfg.base_hours ?? null, cfg.base_fare ?? null, cfg.extra_per_hr ?? null, bookingId]
      );
    } else {
      await db.promise().query("UPDATE bookings SET status='completed' WHERE id=?", [bookingId]);
    }
    await db.promise().query("UPDATE DRIVERS SET STATUS='online', ENGAGED='No' WHERE ID=?", [driverId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Complete ride error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/completes-ride", async (req, res) => {
  const { bookingId, driverId, amount, ride_hours, ride_minutes } = req.body;
  try {
    const [settings] = await db.promise()
      .query("SELECT base_hours, base_fare, extra_per_hr FROM master_settings WHERE id = 1")
      .catch(() => [[]]);
    const cfg = settings[0] || {};
    if (amount != null) {
      await db.promise().query(
        `UPDATE bookings SET status='completed', ride_hours=?, ride_minutes=?, amount=?, base_hours_used=?, base_fare_used=?, extra_per_hr_used=?, payment_status='pending' WHERE id=?`,
        [ride_hours ?? 0, ride_minutes ?? 0, amount, cfg.base_hours ?? null, cfg.base_fare ?? null, cfg.extra_per_hr ?? null, bookingId]
      );
    } else {
      await db.promise().query("UPDATE bookings SET status='completed' WHERE id=?", [bookingId]);
    }
    await db.promise().query("UPDATE DRIVERS SET STATUS='offline', ENGAGED='No' WHERE ID=?", [driverId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Complete ride error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MARK PAYMENT AS PAID ─────────────────────
app.post("/api/bookings/:id/mark-paid", async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query("UPDATE bookings SET payment_status = 'paid' WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── DRIVER PROFILE ───────────────────────────
app.get("/api/drivers/profile", (req, res) => {
  const { driverId } = req.query;
  db.query(`SELECT d.ID, d.NAME, d.MOBILE, d.BLOODGRP, d.LICENCENO, COUNT(b.id) AS total_rides FROM DRIVERS d LEFT JOIN bookings b ON d.ID = b.driver_id AND b.status = 'completed' WHERE d.ID = ? GROUP BY d.ID`, [driverId], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ─── GET CUSTOMERS ────────────────────────────
app.get("/api/customer", (req, res) => {
  db.query("SELECT ID, NAME, PHONE FROM CUSTOMERS ORDER BY ID DESC", (error, results) => {
    if (error) { res.send(JSON.stringify({ status: false })); return; }
    res.send(JSON.stringify(results.map((r) => ({ id: r.ID, Name: r.NAME, phone: r.PHONE }))));
  });
});

// ─── ADD DRIVER ───────────────────────────────
app.post("/api/adddrivers", upload.none(), (req, res) => {
  const { name, status, paymentmode, location, experience, feeDetails, age, licenceNo, gender, car_type, lat, lng, payactive, driver_no, father_name, qualification, badge_no, alt_no, cur_address, per_address, region, bike_status, driver_status, remarks, engaged, password } = req.body;
  const mobile = safeMobile(req.body.mobile), dob = safeDate(req.body.dob), joinDate = safeDate(req.body.join_date), licExpiry = safeDate(req.body.license_expiry_date), blood = normalizeBlood(req.body.bloodgrp);
  const passwordValue = String(password || "123456").trim();
  db.query(
    `INSERT INTO DRIVERS (NAME,MOBILE,LOCATION,EXPERIENCE,FEES_DETAILS,DOB,BLOODGRP,AGE,GENDER,CAR_TYPE,LICENCENO,LAT,LNG,PAYMENT_METHOD,STATUS,PAYACTIVE,DRIVER_NO,FATHER_NAME,QUALIFICATION,BADGE_NO,JOIN_DATE,ALT_NO,CUR_ADDRESS,PER_ADDRESS,REGION,BIKE_STATUS,DRIVER_STATUS,REMARKS,ENGAGED,PASSWORD,LICENSE_EXPIRY_DATE) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [safeStr(name), safeStr(mobile?.toString()), safeStr(location), safeStr(experience, 50), safeStr(feeDetails, 50), dob, blood, safeStr(age, 10), safeStr(gender, 10), safeStr(car_type, 50), safeStr(licenceNo, 50), lat || null, lng || null, safeStr(paymentmode, 50), status || "offline", safeStr(payactive, 20), safeStr(driver_no, 50), safeStr(father_name), safeStr(qualification, 100), safeStr(badge_no, 50), joinDate, safeStr(alt_no, 50), safeStr(cur_address), safeStr(per_address), safeStr(region, 100), safeStr(bike_status, 20), safeStr(driver_status, 20), safeStr(remarks), safeStr(engaged, 10) || "No", safeStr(passwordValue), licExpiry],
    (err) => {
      if (err) return res.status(500).send({ message: "Database Error", detail: err.sqlMessage });
      return res.status(200).send({ message: "Driver added successfully" });
    }
  );
});

// ─── GET DRIVERS ──────────────────────────────
app.get("/api/drivers", (req, res) => {
  db.query(
    `SELECT ID,NAME,MOBILE,LOCATION,STATUS,CAR_TYPE,EXPERIENCE,FEES_DETAILS,DOB,BLOODGRP,AGE,GENDER,LICENCENO,LAT,LNG,PAYMENT_METHOD,PAYACTIVE,DRIVER_NO,FATHER_NAME,QUALIFICATION,BADGE_NO,JOIN_DATE,ALT_NO,CUR_ADDRESS,PER_ADDRESS,REGION,BIKE_STATUS,DRIVER_STATUS,REMARKS,ENGAGED,LICENSE_EXPIRY_DATE FROM DRIVERS ORDER BY ID DESC`,
    (error, results) => {
      if (error) return res.send(JSON.stringify({ status: false }));
      res.send(JSON.stringify(results.map((r) => ({ id: r.ID, name: r.NAME, mobile: r.MOBILE, location: r.LOCATION, car_type: r.CAR_TYPE, experience: r.EXPERIENCE, feeDetails: r.FEES_DETAILS, dob: r.DOB, bloodgrp: r.BLOODGRP, age: r.AGE, gender: r.GENDER, licenceNo: r.LICENCENO, paymentmode: r.PAYMENT_METHOD, status: r.STATUS, lat: parseFloat(r.LAT), lng: parseFloat(r.LNG), payactive: r.PAYACTIVE, driver_no: r.DRIVER_NO, father_name: r.FATHER_NAME, qualification: r.QUALIFICATION, badge_no: r.BADGE_NO, join_date: r.JOIN_DATE, alt_no: r.ALT_NO, cur_address: r.CUR_ADDRESS, per_address: r.PER_ADDRESS, region: r.REGION, bike_status: r.BIKE_STATUS, driver_status: r.DRIVER_STATUS, remarks: r.REMARKS, engaged: r.ENGAGED, license_expiry_date: r.LICENSE_EXPIRY_DATE }))));
    }
  );
});

// ─── UPDATE DRIVER ────────────────────────────
app.put("/api/updatedriver/:id", upload.none(), (req, res) => {
  const driverId = req.params.id;
  const { name, location, paymentmode, experience, feeDetails, age, licenceNo, gender, car_type, lat, lng, status, payactive, driver_no, father_name, qualification, badge_no, alt_no, cur_address, per_address, region, bike_status, driver_status, remarks, engaged, password } = req.body;
  const mobile = safeMobile(req.body.mobile), dob = safeDate(req.body.dob), joinDate = safeDate(req.body.join_date), licExpiry = safeDate(req.body.license_expiry_date), blood = normalizeBlood(req.body.bloodgrp);
  const passwordValue = password ? String(password).trim() : null;
  const values = [safeStr(name), mobile, safeStr(location), safeStr(experience, 50), safeStr(feeDetails, 50), dob, blood, safeStr(age, 10), safeStr(gender, 10), safeStr(car_type, 50), safeStr(licenceNo, 50), safeStr(paymentmode, 50), lat || null, lng || null, status || "offline", safeStr(payactive, 20), safeStr(driver_no, 50), safeStr(father_name), safeStr(qualification, 100), safeStr(badge_no, 50), joinDate, safeStr(alt_no, 50), safeStr(cur_address), safeStr(per_address), safeStr(region, 100), safeStr(bike_status, 20), safeStr(driver_status, 20), safeStr(remarks), safeStr(engaged, 10) || "No", licExpiry];
  let query = `UPDATE DRIVERS SET NAME=?,MOBILE=?,LOCATION=?,EXPERIENCE=?,FEES_DETAILS=?,DOB=?,BLOODGRP=?,AGE=?,GENDER=?,CAR_TYPE=?,LICENCENO=?,PAYMENT_METHOD=?,LAT=?,LNG=?,STATUS=?,PAYACTIVE=?,DRIVER_NO=?,FATHER_NAME=?,QUALIFICATION=?,BADGE_NO=?,JOIN_DATE=?,ALT_NO=?,CUR_ADDRESS=?,PER_ADDRESS=?,REGION=?,BIKE_STATUS=?,DRIVER_STATUS=?,REMARKS=?,ENGAGED=?,LICENSE_EXPIRY_DATE=?`;
  if (passwordValue) {
    query += ",PASSWORD=?";
    values.push(safeStr(passwordValue));
  }
  query += " WHERE ID=?";
  values.push(driverId);
  db.query(query, values, (err, result) => {
    if (err) return res.status(500).send({ message: "Database error", detail: err.sqlMessage });
    if (result.affectedRows === 0) return res.status(404).send({ message: "Driver not found" });
    return res.status(200).send({ message: "Driver updated successfully" });
  });
});

// ─── DELETE DRIVER ────────────────────────────
app.delete("/api/deletedriver/:id", (req, res) => {
  db.query("DELETE FROM DRIVERS WHERE ID = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).send({ message: "Database Error" });
    if (result.affectedRows === 0) return res.status(404).send({ message: "Driver not found" });
    return res.status(200).send({ message: "Driver deleted successfully" });
  });
});

// ─── UPDATE DRIVER LOCATION ───────────────────
app.post("/api/driver/updateLocation", (req, res) => {
  const { driverId, lat, lng } = req.body;
  db.query("UPDATE DRIVERS SET LAT = ?, LNG = ? WHERE ID = ?", [lat, lng, driverId], (err) => {
    if (err) return res.status(500).send({ success: false, message: "DB error" });
    res.send({ success: true, message: "Location updated" });
  });
});

// ─── UPDATE DRIVER STATUS ─────────────────────
app.post("/api/driver/updateStatus", (req, res) => {
  const { driverId, status } = req.body;
  db.query("UPDATE DRIVERS SET STATUS = ? WHERE ID = ?", [status, driverId], (err) => {
    if (err) return res.status(500).send({ success: false });
    io.to("admins").emit("driverStatusChanged", { driverId: Number(driverId), status });
    res.send({ success: true, message: "Status updated" });
  });
});

// ─── DRIVER STATS ────────────────────────────
const INCOME_PER_RIDE = 350;
app.get("/api/driver-stats/:driverId", async (req, res) => {
  const { driverId } = req.params;
  const { filter = "all", from, to } = req.query;
  let dateClause = "";
  switch (filter) {
    case "today": dateClause = "AND DATE(created_at) = CURDATE()"; break;
    case "yesterday": dateClause = "AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"; break;
    case "thisweek": dateClause = "AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)"; break;
    case "thismonth": dateClause = "AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())"; break;
    case "custom": if (from && to) dateClause = `AND DATE(created_at) BETWEEN '${from}' AND '${to}'`; break;
  }
  try {
    const [summary] = await db.promise().query(
      `SELECT COUNT(*) AS totalRides, ROUND(AVG(rating),1) AS avgRating, COUNT(rating) AS ratingCount,
              SUM(CASE WHEN rating=5 THEN 1 ELSE 0 END) AS r5, SUM(CASE WHEN rating=4 THEN 1 ELSE 0 END) AS r4,
              SUM(CASE WHEN rating=3 THEN 1 ELSE 0 END) AS r3, SUM(CASE WHEN rating=2 THEN 1 ELSE 0 END) AS r2,
              SUM(CASE WHEN rating=1 THEN 1 ELSE 0 END) AS r1, SUM(COALESCE(amount, 0)) AS totalEarnings
       FROM bookings WHERE driver_id = ? AND status = 'completed' ${dateClause}`, [driverId]
    );
    const row = summary[0];
    const totalRides = Number(row.totalRides) || 0;
    const [comments] = await db.promise().query(
      `SELECT b.id, b.customer_name, b.pickup, b.drop_location, b.rating, b.feedback, b.amount, b.created_at FROM bookings b WHERE b.driver_id = ? AND b.status = 'completed' AND b.rating IS NOT NULL ${dateClause} ORDER BY b.created_at DESC LIMIT 50`, [driverId]
    );
    return res.json({
      success: true, totalRides,
      totalIncome: Number(row.totalEarnings),
      avgRating: row.avgRating || 0,
      ratingCount: Number(row.ratingCount) || 0,
      ratingBreakdown: { 5: Number(row.r5) || 0, 4: Number(row.r4) || 0, 3: Number(row.r3) || 0, 2: Number(row.r2) || 0, 1: Number(row.r1) || 0 },
      comments,
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ─── CUSTOMER PROFILE ─────────────────────────
app.get("/api/customers/profile", (req, res) => {
  db.query("SELECT * FROM CUSTOMERS WHERE PHONE = ?", [req.query.phone], (err, results) => {
    if (err) return res.status(500).send({ message: "Database error" });
    if (results.length === 0) return res.status(404).send({ message: "Customer not found" });
    res.send(results);
  });
});

// ─── UPDATE CUSTOMER NAME ─────────────────────
app.put("/api/customers/update-name", async (req, res) => {
  try {
    const { phone, name } = req.body;
    await db.execute("UPDATE CUSTOMERS SET NAME = ? WHERE PHONE = ?", [name, phone]);
    res.json({ success: true, message: "Name updated successfully" });
  } catch { res.status(500).json({ error: "Failed to update name" }); }
});

// ─── PREFERRED DRIVER UNAVAILABLE ────────────
app.post("/api/bookings/:id/preferred-unavailable", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query("SELECT status, booking_phnno FROM bookings WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Booking not found" });
    await db.promise().query("UPDATE bookings SET status = 'preferred_query' WHERE id = ?", [id]);
    io.to(`customer_${rows[0].booking_phnno}`).emit("preferredUnavailable", { bookingId: id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── CUSTOMER RESPONDS TO PREFERRED ──────────
app.post("/api/bookings/:id/preferred-response", async (req, res) => {
  const { id } = req.params;
  const { accept } = req.body;
  try {
    if (accept) {
      await db.promise().query("UPDATE bookings SET status = 'pending' WHERE id = ?", [id]);
      io.to("admins").emit("customerAcceptedAlternate", { bookingId: id });
    } else {
      await db.promise().query("UPDATE bookings SET status = 'cancelled', driver_id = NULL WHERE id = ?", [id]);
      io.to("admins").emit("bookingCancelled", { bookingId: id, message: "Customer declined alternate driver" });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══ MASTER SETTINGS ═══
app.get("/api/admin/master-settings", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT id, logo_url, logo_name, base_hours, base_fare, extra_per_hr, outstation_extra, updated_at FROM master_settings WHERE id = 1");
    if (!rows.length) return res.json({ logo_url: null, logo_name: null, base_hours: null, base_fare: null, extra_per_hr: null, outstation_extra: null, updated_at: null });
    const row = rows[0];
    res.json({
      logo_url: row.logo_url || null,
      logo_name: row.logo_name || null,
      base_hours: row.base_hours ?? null,
      base_fare: row.base_fare != null ? parseFloat(row.base_fare) : null,
      extra_per_hr: row.extra_per_hr != null ? parseFloat(row.extra_per_hr) : null,
      outstation_extra: row.outstation_extra != null ? parseFloat(row.outstation_extra) : null,
      updated_at: row.updated_at || null,
    });
  } catch (err) { res.status(500).json({ message: "Failed to load settings" }); }
});

app.post("/api/admin/master-settings", logoUpload.single("logo"), async (req, res) => {
  try {
    const base_hours = req.body.base_hours !== "" ? parseInt(req.body.base_hours, 10) : null;
    const base_fare = req.body.base_fare !== "" ? parseFloat(req.body.base_fare) : null;
    const extra_per_hr = req.body.extra_per_hr !== "" ? parseFloat(req.body.extra_per_hr) : null;
    const outstation_extra = req.body.outstation_extra !== "" ? parseFloat(req.body.outstation_extra) : null;

    if (base_hours != null && (isNaN(base_hours) || base_hours < 1)) return res.status(400).json({ message: "base_hours must be ≥ 1" });
    if (base_fare != null && (isNaN(base_fare) || base_fare < 0)) return res.status(400).json({ message: "base_fare must be ≥ 0" });
    if (extra_per_hr != null && (isNaN(extra_per_hr) || extra_per_hr < 0)) return res.status(400).json({ message: "extra_per_hr must be ≥ 0" });
    if (outstation_extra != null && (isNaN(outstation_extra) || outstation_extra < 0)) return res.status(400).json({ message: "outstation_extra must be ≥ 0" });

    let logo_url = undefined, logo_name = undefined;
    if (req.file) {
      const serverBase = process.env.EXPO_PUBLIC_BASE_URL || "http://localhost:3000";
      logo_url = `${serverBase}/uploads/logos/${req.file.filename}`;
      logo_name = req.file.originalname;
    }

    const fields = [], values = [];
    if (base_hours != null) { fields.push("base_hours = ?"); values.push(base_hours); }
    if (base_fare != null) { fields.push("base_fare = ?"); values.push(base_fare); }
    if (extra_per_hr != null) { fields.push("extra_per_hr = ?"); values.push(extra_per_hr); }
    if (outstation_extra != null) { fields.push("outstation_extra = ?"); values.push(outstation_extra); }
    if (logo_url !== undefined) { fields.push("logo_url = ?"); values.push(logo_url); }
    if (logo_name !== undefined) { fields.push("logo_name = ?"); values.push(logo_name); }

    if (fields.length === 0) return res.status(400).json({ message: "Nothing to save" });
    values.push(1);

    await db.promise().query(`UPDATE master_settings SET ${fields.join(", ")} WHERE id = 1`, values);

    const [rows] = await db.promise().query("SELECT id, logo_url, logo_name, base_hours, base_fare, extra_per_hr, outstation_extra, updated_at FROM master_settings WHERE id = 1");
    const row = rows[0];
    res.json({
      message: "Settings saved successfully",
      logo_url: row.logo_url || null,
      logo_name: row.logo_name || null,
      base_hours: row.base_hours ?? null,
      base_fare: row.base_fare != null ? parseFloat(row.base_fare) : null,
      extra_per_hr: row.extra_per_hr != null ? parseFloat(row.extra_per_hr) : null,
      outstation_extra: row.outstation_extra != null ? parseFloat(row.outstation_extra) : null,
      updated_at: row.updated_at || null,
    });
  } catch (err) { res.status(500).json({ message: "Failed to save settings" }); }
});

app.delete("/api/admin/master-settings/logo", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT logo_url FROM master_settings WHERE id = 1");
    if (rows.length && rows[0].logo_url) {
      const filePath = path.join(__dirname, "uploads/logos", path.basename(rows[0].logo_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.promise().query("UPDATE master_settings SET logo_url = NULL, logo_name = NULL WHERE id = 1");
    res.json({ success: true, message: "Logo removed successfully" });
  } catch (err) { res.status(500).json({ message: "Failed to remove logo" }); }
});

const PORT = 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server + Socket running on http://0.0.0.0:${PORT}`);
});