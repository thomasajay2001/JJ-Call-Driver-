import axios from "axios";
import { useEffect, useState } from "react";
import io from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = "http://192.168.0.7:3000";

export default function DriverDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");
  const [bloodgrp, setBloodgrp] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [licenceNo, setLicenceNo] = useState("");
  const [feeDetails, setFeeDetails] = useState("");
  const [experience, setExperience] = useState("");
  const [car_type, setCarType] = useState("");
  const [paymentmode, setPaymentmode] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchDrivers();

    const socket = io(SOCKET_URL);
    socket.on("newbooking", (data) => {
      alert(`New Booking: ${data.name}`);
    });

    return () => socket.disconnect();
  }, []);

  const fetchDrivers = async () => {
    const res = await axios.get(`${BASE_URL}/api/drivers`);
    setDrivers(res.data || []);
  };

  const openCreate = () => {
    setEditId(null);
    setName("");
    setMobile("");
    setLocation("");
    setAge("");
    setDob("");
    setGender("");
    setBloodgrp("");
    setLicenceNo("");
    setFeeDetails("");
    setExperience("");
    setCarType("");
    setPaymentmode("");
    setStatus("");
    setShowForm(true);
  };

  const openEdit = (d) => {
    setEditId(d.id);
    setName(d.name);
    setMobile(d.mobile);
    setLocation(d.location);
    setBloodgrp(d.bloodgrp);
    setDob(d.dob ? d.dob.split("T")[0] : "");
    setAge(d.age);
    setGender(d.gender);
    setCarType(d.car_type);
    setLicenceNo(d.licenceNo);
    setFeeDetails(d.feeDetails);
    setExperience(d.experience);
    setPaymentmode(d.paymentmode);
    setStatus(d.status);
    setShowForm(true);
    console.log(d);
  };

  const submitForm = async () => {
    if (!name || !mobile) return alert("Required fields");

    const body = {
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
      status,
    };

    if (editId) {
      await axios.put(`${BASE_URL}/api/updatedriver/${editId}`, body);
    } else {
      await axios.post(`${BASE_URL}/api/adddrivers`, body);
    }

    setShowForm(false);
    fetchDrivers();
  };

  const deleteDriver = async (id) => {
    if (!window.confirm("Delete driver?")) return;
    await axios.delete(`${BASE_URL}/api/deletedriver/${id}`);
    fetchDrivers();
  };

  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.mobile.includes(search),
  );

  // Calculate statistics
  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(
    (d) => d.status?.toLowerCase() === "active",
  ).length;
  const paidFees = drivers.filter((d) => d.feeDetails === "Paid").length;
  const automaticDrivers = drivers.filter((d) =>
    d.car_type?.toLowerCase().includes("automatic"),
  ).length;

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.mainTitle}>Driver Management</h1>
          <p style={styles.subtitle}>
            Manage and monitor all your drivers in one place
          </p>
        </div>
        <button onClick={openCreate} style={styles.addBtnLarge}>
          <span style={styles.btnIcon}>+</span>
          Add New Driver
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIconWrapper}>
            <span style={styles.statIcon}>👥</span>
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Total Drivers</p>
            <h3 style={styles.statValue}>{totalDrivers}</h3>
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
            <p style={styles.statLabel}>Active Drivers</p>
            <h3 style={styles.statValue}>{activeDrivers}</h3>
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIconWrapper,
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            }}
          >
            <span style={styles.statIcon}>💳</span>
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Fees Paid</p>
            <h3 style={styles.statValue}>{paidFees}</h3>
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIconWrapper,
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            }}
          >
            <span style={styles.statIcon}>🚗</span>
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Automatic</p>
            <h3 style={styles.statValue}>{automaticDrivers}</h3>
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
          <strong>{totalDrivers}</strong> drivers
        </div>
      </div>

      {/* Table Card */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>All Drivers</h3>
          <div style={styles.tableBadge}>{filtered.length} Records</div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Mobile</th>
                <th style={styles.th}>Gender</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>DOB - Age</th>
                <th style={styles.th}>Car Type</th>
                <th style={styles.th}>Licence</th>
                <th style={styles.th}>Payment</th>
                <th style={styles.th}>Fee Status</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="12" style={styles.noData}>
                    <div style={styles.noDataContent}>
                      <span style={styles.noDataIcon}>📭</span>
                      <p>No drivers found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((d, index) => (
                  <tr
                    key={d.id}
                    style={index % 2 === 0 ? styles.evenRow : styles.oddRow}
                  >
                    <td style={styles.td}>
                      <span style={styles.idBadge}>{d.id}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>
                          {d.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={styles.nameText}>{d.name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>{d.mobile}</td>
                    <td style={styles.td}>{d.gender || "-"}</td>
                    <td style={styles.td}>
                      <span
                        style={
                          d.status?.toLowerCase() === "active"
                            ? styles.statusActive
                            : styles.statusInactive
                        }
                      >
                        {d.status || "N/A"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {d.dob
                        ? new Date(d.dob).toLocaleDateString("en-GB")
                        : "dd-MM-yyyy"}{" "}
                      - {d.age || "-"}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badgeBlue}>
                        {d.car_type || "N/A"}
                      </span>
                    </td>
                    <td style={styles.td}>{d.licenceNo || "-"}</td>
                    <td style={styles.td}>
                      <span style={styles.badgePurple}>
                        {d.paymentmode || "N/A"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={
                          d.feeDetails === "Paid"
                            ? styles.badgeGreen
                            : styles.badgeRed
                        }
                      >
                        {d.feeDetails || "N/A"}
                      </span>
                    </td>
                    <td style={styles.td}>{d.location || "-"}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          style={styles.editBtn}
                          onClick={() => openEdit(d)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          style={styles.deleteBtn}
                          onClick={() => deleteDriver(d.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
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
                <span style={styles.headerIcon}>{editId ? "✏️" : "➕"}</span>
                <span style={styles.headerText}>
                  {editId ? "Edit Driver Details" : "Add New Driver"}
                </span>
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
              {/* Personal Information Section */}
              <div style={styles.sectionHeader}>Personal Information</div>
              <div style={styles.sectionDivider}></div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Full Name *</label>
                <input
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Mobile Number *</label>
                <input
                  placeholder="Enter mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Blood Group</label>
                <input
                  placeholder="e.g., A+, B-, O+"
                  value={bloodgrp}
                  onChange={(e) => setBloodgrp(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Age</label>
                <input
                  placeholder="Enter age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={styles.formSelect}
                >
                  <option value="">Select Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Professional Details Section */}
              <div style={styles.sectionHeader}>Professional Details</div>
              <div style={styles.sectionDivider}></div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Licence Number</label>
                <input
                  placeholder="Enter licence number"
                  value={licenceNo}
                  onChange={(e) => setLicenceNo(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Experience (Years)</label>
                <input
                  placeholder="Years of driving experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Car Type</label>
                <select
                  value={car_type}
                  onChange={(e) => setCarType(e.target.value)}
                  style={styles.formSelect}
                >
                  <option value="">Select Car Type</option>
                  <option>Automatic</option>
                  <option>Manual</option>
                  <option>Both</option>
                </select>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Status</label>
                <input
                  placeholder="e.g., Active, Inactive"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Location</label>
                <input
                  placeholder="Current location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              {/* Payment Information Section */}
              <div style={styles.sectionHeader}>Payment Information</div>
              <div style={styles.sectionDivider}></div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Payment Mode</label>
                <select
                  value={paymentmode}
                  onChange={(e) => setPaymentmode(e.target.value)}
                  style={styles.formSelect}
                >
                  <option value="">Select Payment Mode</option>
                  <option>Online</option>
                  <option>Offline</option>
                  <option>Both</option>
                </select>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Fee Status</label>
                <select
                  value={feeDetails}
                  onChange={(e) => setFeeDetails(e.target.value)}
                  style={styles.formSelect}
                >
                  <option value="">Select Fee Status</option>
                  <option>Paid</option>
                  <option>Not Paid</option>
                  <option>Pending</option>
                </select>
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
                {editId ? "Update Driver" : "Add Driver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  addBtnLarge: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    border: "none",
    padding: "14px 28px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 10px 25px rgba(37, 99, 235, 0.3)",
    transition: "all 0.3s ease",
  },
  btnIcon: {
    fontSize: "20px",
    fontWeight: 700,
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
  statusActive: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  statusInactive: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  badgeBlue: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  badgePurple: {
    background: "#f3e8ff",
    color: "#7c3aed",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  badgeGreen: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  badgeRed: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
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
  deleteBtn: {
    background: "#dc2626",
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
    width: "850px",
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
