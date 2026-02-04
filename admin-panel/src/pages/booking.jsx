import axios from "axios";
import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_BASE_URL;


const Booking = () => {
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [status, setStatus] = useState("");
  const [driver, setDriver] = useState("");

  useEffect(() => {
    fetchBookings();
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (driver !== "") setStatus("Assigned");
  }, [driver]);

  const fetchDrivers = async () => {
    const res = await axios.get(`${BASE_URL}/api/drivers`);
    const onlineDrivers = res.data.filter((d) => d.status === "online");
    setDrivers(onlineDrivers);
  };

  const fetchBookings = async () => {
    const res = await axios.get(`${BASE_URL}/api/bookings`);
    setBookings(res.data || []);
  };

  const openEdit = (b) => {
    setEditId(b.id);
    setName(b.name);
    setMobile(b.mobile);
    setPickup(b.pickup);
    setDrop(b.drop);
    setStatus(b.status);
    setDriver(b.driver || "");
    setShowForm(true);
  };

  const filtered = bookings.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.mobile.toString().includes(search),
  );

  const submitForm = async () => {
    await axios.put(`${BASE_URL}/api/bookings/${editId}`, { driver, status });
    setShowForm(false);
    fetchBookings();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Booking Management</h2>

      <div style={styles.topBar}>
        <input
          style={styles.input}
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Pickup</th>
              <th>Drop</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.name}</td>
                <td>{b.mobile}</td>
                <td>{b.pickup}</td>
                <td>{b.drop}</td>
                <td>{b.driver || "Not Assigned"}</td>
                <td>{b.status}</td>
                <td>
                  <button style={styles.editBtn} onClick={() => openEdit(b)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL ================= */}
      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modalModern}>
            {/* Header */}
            <div style={styles.modalHeader}>
              <h3>{editId ? "Assign Driver" : "Add Driver"}</h3>
              <span style={styles.closeIcon} onClick={() => setShowForm(false)}>
                ✖
              </span>
            </div>

            {/* Form Grid */}
            <div style={styles.formGrid}>
              <input
                value={name}
                readOnly
                style={{ ...styles.field, ...styles.fullWidth }}
                placeholder="Name"
              />
              <input
                value={mobile}
                readOnly
                style={{ ...styles.field, ...styles.fullWidth }}
                placeholder="Mobile"
              />
              <input
                value={pickup}
                readOnly
                style={{ ...styles.field, ...styles.fullWidth }}
                placeholder="Pickup"
              />
              <input
                value={drop}
                readOnly
                style={{ ...styles.field, ...styles.fullWidth }}
                placeholder="Drop"
              />

              <select
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                style={{ ...styles.field, ...styles.fullWidth }}
              >
                <option value="">Select Driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <input
                value={status}
                readOnly
                style={{ ...styles.field, ...styles.fullWidth }}
                placeholder="Status"
              />
            </div>

            {/* Buttons */}
            <div style={styles.btnRow}>
              <button style={styles.saveBtn} onClick={submitForm}>
                Save
              </button>
              <button
                style={styles.cancelBtn}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ===================== STYLES ===================== */
const styles = {
  container: {
    marginLeft: "260px",
    padding: "50px 30px 30px",
    background: "#f3f4f6",
    minHeight: "100vh",
  },

  heading: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: "20px",
  },

  topBar: {
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: "15px",
  },

  input: {
    padding: "12px 14px",
    width: "320px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "15px",
    background: "#fff",
  },

  tableCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },

  editBtn: {
    padding: "6px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  modalModern: {
    width: "600px",
    background: "#fff",
    borderRadius: "12px",
    padding: "25px 30px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  closeIcon: {
    cursor: "pointer",
    fontSize: "20px",
    color: "#666",
    fontWeight: "bold",
  },

  formGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  field: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "#f9fafb",
    outline: "none",
    fontSize: "15px",
    color: "#1e293b",
    boxSizing: "border-box",
  },

  fullWidth: {
    width: "100%",
  },

  btnRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "20px",
  },

  saveBtn: {
    padding: "10px 22px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },

  cancelBtn: {
    padding: "10px 22px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
  },
};

export default Booking;
