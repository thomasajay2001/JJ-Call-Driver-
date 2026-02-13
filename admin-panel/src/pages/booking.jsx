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

  // Calculate statistics
  const totalBookings = bookings.length;
  const assignedBookings = bookings.filter(
    (b) => b.status?.toLowerCase() === "assigned",
  ).length;
  const pendingBookings = bookings.filter(
    (b) => !b.driver || b.driver === "",
  ).length;
  const completedBookings = bookings.filter(
    (b) => b.status?.toLowerCase() === "completed",
  ).length;

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.mainTitle}>Booking Management</h1>
          <p style={styles.subtitle}>Track and manage all customer bookings</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIconWrapper}>
            <span style={styles.statIcon}>📋</span>
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Total Bookings</p>
            <h3 style={styles.statValue}>{totalBookings}</h3>
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIconWrapper,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            }}
          >
            <span style={styles.statIcon}>✓</span>
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Assigned</p>
            <h3 style={styles.statValue}>{assignedBookings}</h3>
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIconWrapper,
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            }}
          >
            <span style={styles.statIcon}>⏳</span>
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Pending</p>
            <h3 style={styles.statValue}>{pendingBookings}</h3>
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIconWrapper,
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            }}
          >
            <span style={styles.statIcon}>🎉</span>
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Completed</p>
            <h3 style={styles.statValue}>{completedBookings}</h3>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchSection}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            placeholder="Search by name or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.resultCount}>
          Showing <strong>{filtered.length}</strong> of{" "}
          <strong>{totalBookings}</strong> bookings
        </div>
      </div>

      {/* Table Card */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>All Bookings</h3>
          <div style={styles.tableBadge}>{filtered.length} Records</div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Customer Name</th>
                <th style={styles.th}>Mobile</th>
                <th style={styles.th}>Pickup Location</th>
                <th style={styles.th}>Drop Location</th>
                <th style={styles.th}>Assigned Driver</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={styles.noData}>
                    <div style={styles.noDataContent}>
                      <span style={styles.noDataIcon}>📭</span>
                      <p>No bookings found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((b, index) => (
                  <tr
                    key={b.id}
                    style={index % 2 === 0 ? styles.evenRow : styles.oddRow}
                  >
                    <td style={styles.td}>
                      <span style={styles.idBadge}>{b.id}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>
                          {b.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={styles.nameText}>{b.name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>{b.mobile}</td>
                    <td style={styles.td}>
                      <div style={styles.locationCell}>
                        <span style={styles.locationIcon}>📍</span>
                        {b.pickup}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.locationCell}>
                        <span style={styles.locationIcon}>🎯</span>
                        {b.drop}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={
                          b.driver
                            ? styles.driverAssigned
                            : styles.driverNotAssigned
                        }
                      >
                        {b.driver || "Not Assigned"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={getStatusStyle(b.status)}>
                        {b.status || "Pending"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.editBtn}
                        onClick={() => openEdit(b)}
                      >
                        ✏️ Assign
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modalForm}>
            {/* Header */}
            <div style={styles.modalHeaderForm}>
              <div style={styles.headerContent}>
                <span style={styles.headerIcon}>🚗</span>
                <span style={styles.headerText}>Assign Driver to Booking</span>
              </div>
              <span
                style={styles.closeIconForm}
                onClick={() => setShowForm(false)}
              >
                ✖
              </span>
            </div>

            {/* Form Grid */}
            <div style={styles.formGrid}>
              {/* Booking Details Section */}
              <div style={styles.sectionHeader}>Booking Details</div>
              <div style={styles.sectionDivider}></div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Customer Name</label>
                <input
                  value={name}
                  readOnly
                  style={styles.formInput}
                  placeholder="Customer Name"
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Mobile Number</label>
                <input
                  value={mobile}
                  readOnly
                  style={styles.formInput}
                  placeholder="Mobile Number"
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Pickup Location</label>
                <input
                  value={pickup}
                  readOnly
                  style={styles.formInput}
                  placeholder="Pickup Location"
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Drop Location</label>
                <input
                  value={drop}
                  readOnly
                  style={styles.formInput}
                  placeholder="Drop Location"
                />
              </div>

              {/* Assignment Section */}
              <div style={styles.sectionHeader}>Driver Assignment</div>
              <div style={styles.sectionDivider}></div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Select Driver *</label>
                <select
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  style={styles.formSelect}
                >
                  <option value="">Choose an available driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} - {d.car_type || "N/A"}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Booking Status</label>
                <input
                  value={status}
                  readOnly
                  style={styles.formInput}
                  placeholder="Status will update automatically"
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={styles.btnRowForm}>
              <button
                style={styles.cancelBtnForm}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button style={styles.saveBtnForm} onClick={submitForm}>
                Assign Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for status styling
const getStatusStyle = (status) => {
  const statusLower = status?.toLowerCase() || "pending";

  if (statusLower === "completed") {
    return styles.statusCompleted;
  } else if (statusLower === "assigned") {
    return styles.statusAssigned;
  } else if (statusLower === "in progress") {
    return styles.statusInProgress;
  } else {
    return styles.statusPending;
  }
};

/* ===================== STYLES ===================== */
const styles = {
  container: {
    marginLeft: "260px",
    padding: "40px",
    background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)",
    minHeight: "100vh",
  },

  // Page Header Styles
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "35px",
    flexWrap: "wrap",
    gap: "20px",
  },
  mainTitle: {
    fontSize: "32px",
    fontWeight: 800,
    color: "#1e293b",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "15px",
    color: "#64748b",
    margin: "5px 0 0 0",
    fontWeight: 400,
  },

  // Statistics Grid
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "25px",
    marginBottom: "35px",
  },
  statCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.05)",
    transition: "all 0.3s ease",
    border: "1px solid rgba(255, 255, 255, 0.8)",
  },
  statIconWrapper: {
    width: "60px",
    height: "60px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 16px rgba(37, 99, 235, 0.25)",
  },
  statIcon: {
    fontSize: "28px",
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: "28px",
    color: "#1e293b",
    margin: "4px 0 0 0",
    fontWeight: 800,
  },

  // Search Section
  searchSection: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px 24px",
    marginBottom: "25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
    flexWrap: "wrap",
    gap: "15px",
  },
  searchWrapper: {
    position: "relative",
    flex: "1",
    minWidth: "300px",
    maxWidth: "500px",
  },
  searchIcon: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "18px",
    opacity: 0.5,
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px 12px 45px",
    borderRadius: "10px",
    border: "2px solid #e2e8f0",
    outline: "none",
    fontSize: "15px",
    background: "#f8fafc",
    transition: "all 0.3s ease",
    fontFamily: "inherit",
  },
  resultCount: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: 500,
  },

  // Table Card
  tableCard: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
  },
  tableHeader: {
    padding: "24px 28px",
    borderBottom: "2px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#1e293b",
    margin: 0,
  },
  tableBadge: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 600,
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    background: "#f8fafc",
    textAlign: "left",
    padding: "16px 20px",
    fontWeight: 700,
    fontSize: "13px",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "2px solid #e2e8f0",
  },
  td: {
    padding: "16px 20px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    fontSize: "14px",
  },
  evenRow: {
    background: "#ffffff",
  },
  oddRow: {
    background: "#f9fafb",
  },

  // Table Cell Styles
  idBadge: {
    background: "#f1f5f9",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#475569",
  },
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "14px",
  },
  nameText: {
    fontWeight: 600,
    color: "#1e293b",
  },
  locationCell: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  locationIcon: {
    fontSize: "14px",
  },
  driverAssigned: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  driverNotAssigned: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  statusCompleted: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  statusAssigned: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  statusInProgress: {
    background: "#fef3c7",
    color: "#b45309",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  statusPending: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  editBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
    transition: "all 0.3s ease",
  },
  noData: {
    padding: "60px 20px",
    textAlign: "center",
  },
  noDataContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    color: "#94a3b8",
  },
  noDataIcon: {
    fontSize: "48px",
    opacity: 0.5,
  },

  // Modal Styles
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    animation: "fadeIn 0.2s ease-in",
  },
  modalForm: {
    width: "700px",
    maxHeight: "90vh",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    animation: "slideUp 0.3s ease-out",
  },
  modalHeaderForm: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    padding: "28px 35px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerIcon: {
    fontSize: "28px",
    animation: "bounce 0.5s ease-in-out",
  },
  headerText: {
    fontSize: "24px",
    fontWeight: 700,
    letterSpacing: "0.3px",
  },
  closeIconForm: {
    cursor: "pointer",
    fontSize: "24px",
    fontWeight: 700,
    transition: "transform 0.2s, opacity 0.2s",
    opacity: 0.9,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "20px",
    padding: "35px",
    background: "#fafafa",
    maxHeight: "65vh",
    overflowY: "auto",
  },
  sectionHeader: {
    gridColumn: "1 / -1",
    fontSize: "16px",
    fontWeight: 700,
    color: "#1e40af",
    marginTop: "15px",
    marginBottom: "-10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  sectionDivider: {
    gridColumn: "1 / -1",
    height: "2px",
    background: "linear-gradient(90deg, #2563eb 0%, transparent 100%)",
    marginBottom: "5px",
  },
  inputWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    letterSpacing: "0.3px",
  },
  formInput: {
    padding: "13px 16px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    fontSize: "15px",
    outline: "none",
    transition: "all 0.3s ease",
    background: "#ffffff",
    fontFamily: "inherit",
  },
  formSelect: {
    padding: "13px 16px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    fontSize: "15px",
    outline: "none",
    background: "#ffffff",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontFamily: "inherit",
  },
  btnRowForm: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "15px",
    padding: "25px 35px",
    background: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
  },
  saveBtnForm: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    border: "none",
    padding: "14px 32px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(37, 99, 235, 0.3)",
    letterSpacing: "0.5px",
  },
  cancelBtnForm: {
    background: "#fff",
    color: "#6b7280",
    border: "2px solid #e5e7eb",
    padding: "14px 32px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "15px",
    transition: "all 0.3s ease",
  },
};

export default Booking;
