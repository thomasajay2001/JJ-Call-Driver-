import axios from "axios";
import { useEffect, useState } from "react";
import io from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = "http://localhost:3000";

export default function DriverDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");

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
  const [status, setStatus] = useState("offline"); // ← default offline
  const [payactive, setPayActive] = useState(""); // ← new field

  const [formErrors, setFormErrors] = useState({
    name: "",
    mobile: "",
    gender: "",
    status: "",
    dob: "",
    age: "",
    licenceNo: "",
    car_type: "",
    paymentmode: "",
    feeDetails: "",
    payactive: "",
  });

  useEffect(() => {
    fetchDrivers();
    const socket = io(SOCKET_URL);
    socket.on("newbooking", (data) => alert(`New Booking: ${data.name}`));
    return () => socket.disconnect();
  }, []);

  const fetchDrivers = async () => {
    const res = await axios.get(`${BASE_URL}/api/drivers`);
    setDrivers(res.data || []);
  };

  const resetForm = () => {
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
    setStatus("offline"); // ← always reset to offline
    setPayActive(""); // ← reset payactive
    setFormErrors({
      name: "",
      mobile: "",
      gender: "",
      status: "",
      dob: "",
      age: "",
      licenceNo: "",
      car_type: "",
      paymentmode: "",
      feeDetails: "",
      payactive: "",
    });
  };

  const openCreate = () => {
    resetForm();
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
    setStatus(d.status || "offline"); // ← fallback to offline
    setPayActive(d.payactive || ""); // ← load existing payactive
    setFormErrors({
      name: "",
      mobile: "",
      gender: "",
      status: "",
      dob: "",
      age: "",
      licenceNo: "",
      car_type: "",
      paymentmode: "",
      feeDetails: "",
      payactive: "",
    });
    setShowForm(true);
  };

  const validateForm = () => {
    const errors = {
      name: "",
      mobile: "",
      gender: "",
      status: "",
      dob: "",
      age: "",
      licenceNo: "",
      car_type: "",
      paymentmode: "",
      feeDetails: "",
      payactive: "",
    };
    let isValid = true;

    if (!name.trim()) {
      errors.name = "Full name is required";
      isValid = false;
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
      isValid = false;
    }

    if (!mobile.trim()) {
      errors.mobile = "Mobile number is required";
      isValid = false;
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      errors.mobile = "Enter a valid 10-digit mobile number";
      isValid = false;
    }

    if (!gender) {
      errors.gender = "Please select a gender";
      isValid = false;
    }
    if (!status) {
      errors.status = "Please select a status";
      isValid = false;
    }
    if (!payactive) {
      errors.payactive = "Please select payment activity";
      isValid = false;
    }

    if (dob) {
      if (new Date(dob) >= new Date()) {
        errors.dob = "Date of birth must be in the past";
        isValid = false;
      }
    }
    if (age) {
      const n = parseInt(age);
      if (isNaN(n) || n < 18 || n > 80) {
        errors.age = "Age must be between 18 and 80";
        isValid = false;
      }
    }
    if (licenceNo && licenceNo.trim().length < 5) {
      errors.licenceNo = "Enter a valid licence number";
      isValid = false;
    }
    if (!car_type) {
      errors.car_type = "Please select a car type";
      isValid = false;
    }
    if (!paymentmode) {
      errors.paymentmode = "Please select a payment mode";
      isValid = false;
    }
    if (!feeDetails) {
      errors.feeDetails = "Please select fee status";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const submitForm = async () => {
    if (!validateForm()) return;
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
      payactive, // ← include payactive
    };
    if (editId) await axios.put(`${BASE_URL}/api/updatedriver/${editId}`, body);
    else await axios.post(`${BASE_URL}/api/adddrivers`, body);
    setShowForm(false);
    resetForm();
    fetchDrivers();
  };

  const confirmDelete = (id, driverName) => {
    setDeleteTargetId(id);
    setDeleteTargetName(driverName);
    setShowDeleteModal(true);
  };

  const deleteDriver = async () => {
    await axios.delete(`${BASE_URL}/api/deletedriver/${deleteTargetId}`);
    setShowDeleteModal(false);
    setDeleteTargetId(null);
    setDeleteTargetName("");
    fetchDrivers();
  };

  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.mobile.includes(search),
  );

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(
    (d) => d.status?.toLowerCase() === "active",
  ).length;
  const paidFees = drivers.filter((d) => d.feeDetails === "Paid").length;
  const automaticDrivers = drivers.filter((d) =>
    d.car_type?.toLowerCase().includes("automatic"),
  ).length;

  const ErrorText = ({ error }) =>
    error ? <span style={styles.errorText}>⚠ {error}</span> : null;

  return (
    <div style={styles.container}>
      {/* ── Page Header ── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.mainTitle}>Driver Management</h1>
          <p style={styles.subtitle}>
            Manage and monitor all your drivers in one place
          </p>
        </div>
        <button onClick={openCreate} style={styles.addBtnLarge}>
          <span style={styles.btnIcon}>+</span>Add New Driver
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={styles.statsGrid}>
        {[
          {
            icon: "👥",
            label: "Total Drivers",
            value: totalDrivers,
            grad: "linear-gradient(135deg,#2563eb,#1d4ed8)",
          },
          {
            icon: "✓",
            label: "Active Drivers",
            value: activeDrivers,
            grad: "linear-gradient(135deg,#10b981,#059669)",
          },
          {
            icon: "💳",
            label: "Fees Paid",
            value: paidFees,
            grad: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
          },
          {
            icon: "🚗",
            label: "Automatic",
            value: automaticDrivers,
            grad: "linear-gradient(135deg,#f59e0b,#d97706)",
          },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ ...styles.statIconWrapper, background: s.grad }}>
              <span style={styles.statIcon}>{s.icon}</span>
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>{s.label}</p>
              <h3 style={styles.statValue}>{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
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

      {/* ── Table ── */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>All Drivers</h3>
          <div style={styles.tableBadge}>{filtered.length} Records</div>
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "ID",
                  "Name",
                  "Mobile",
                  "Gender",
                  "Status",
                  "Pay Active",
                  "DOB - Age",
                  "Car Type",
                  "Licence",
                  "Payment",
                  "Fee Status",
                  "Location",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="13" style={styles.noData}>
                    <div style={styles.noDataContent}>
                      <span style={styles.noDataIcon}>📭</span>
                      <p>No drivers found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((d, i) => (
                  <tr
                    key={d.id}
                    style={i % 2 === 0 ? styles.evenRow : styles.oddRow}
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
                            : d.status?.toLowerCase() === "inactive"
                              ? styles.statusInactive
                              : d.status?.toLowerCase() === "on duty"
                                ? styles.statusOnDuty
                                : d.status?.toLowerCase() === "suspend"
                                  ? styles.statusSuspended
                                  : d.status?.toLowerCase() === "offline"
                                    ? styles.statusOffline
                                    : styles.statusInactive
                        }
                      >
                        {d.status?.toLowerCase() === "active"
                          ? "🟢 "
                          : d.status?.toLowerCase() === "inactive"
                            ? "🟡 "
                            : d.status?.toLowerCase() === "on duty"
                              ? "🔵 "
                              : d.status?.toLowerCase() === "suspend"
                                ? "⛔ "
                                : d.status?.toLowerCase() === "offline"
                                  ? "⚫ "
                                  : "🔴 "}
                        {d.status || "N/A"}
                      </span>
                    </td>

                    {/* ── Pay Active column ── */}
                    <td style={styles.td}>
                      <span
                        style={
                          d.payactive?.toLowerCase() === "active"
                            ? styles.payActiveOn
                            : d.payactive?.toLowerCase() === "deactive"
                              ? styles.payActiveOff
                              : styles.payActiveNone
                        }
                      >
                        {d.payactive?.toLowerCase() === "active"
                          ? "✅ Active"
                          : d.payactive?.toLowerCase() === "deactive"
                            ? "🚫 Deactive"
                            : "— N/A"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {d.dob
                        ? new Date(d.dob).toLocaleDateString("en-GB")
                        : "dd-MM-yyyy"}{" "}
                      - {d.age || "-"}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={
                          d.car_type?.toLowerCase() === "automatic"
                            ? styles.badgeAutomatic
                            : d.car_type?.toLowerCase() === "manual"
                              ? styles.badgeManual
                              : styles.badgeBoth
                        }
                      >
                        {d.car_type || "N/A"}
                      </span>
                    </td>
                    <td style={styles.td}>{d.licenceNo || "-"}</td>
                    <td style={styles.td}>
                      <span
                        style={
                          d.paymentmode?.toLowerCase() === "online"
                            ? styles.badgeOnline
                            : d.paymentmode?.toLowerCase() === "offline"
                              ? styles.badgeOffline
                              : styles.badgeBoth
                        }
                      >
                        {d.paymentmode?.toLowerCase() === "online"
                          ? "🌐 "
                          : d.paymentmode?.toLowerCase() === "offline"
                            ? "💵 "
                            : "🔄 "}
                        {d.paymentmode || "N/A"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={
                          d.feeDetails === "Paid"
                            ? styles.badgeGreen
                            : d.feeDetails === "Pending"
                              ? styles.badgePending
                              : styles.badgeRed
                        }
                      >
                        {d.feeDetails === "Paid"
                          ? "✅ "
                          : d.feeDetails === "Pending"
                            ? "⏳ "
                            : "❌ "}
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
                          onClick={() => confirmDelete(d.id, d.name)}
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

      {/* ── Add / Edit Form Modal ── */}
      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modalForm}>
            <div style={styles.modalHeaderForm}>
              <div style={styles.headerContent}>
                <span style={styles.headerIcon}>{editId ? "✏️" : "➕"}</span>
                <span style={styles.headerText}>
                  {editId ? "Edit Driver Details" : "Add New Driver"}
                </span>
              </div>
              <span
                style={styles.closeIconForm}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                ✖
              </span>
            </div>

            <div style={styles.formGrid}>
              {/* ── Personal Info ── */}
              <div style={styles.sectionHeader}>👤 Personal Information</div>
              <div style={styles.sectionDivider} />

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  Full Name <span style={styles.required}>*</span>
                </label>
                <input
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFormErrors((p) => ({ ...p, name: "" }));
                  }}
                  style={{
                    ...styles.formInput,
                    ...(formErrors.name ? styles.inputError : {}),
                  }}
                />
                <ErrorText error={formErrors.name} />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  Mobile Number <span style={styles.required}>*</span>
                </label>
                <input
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  maxLength={10}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, ""));
                    setFormErrors((p) => ({ ...p, mobile: "" }));
                  }}
                  style={{
                    ...styles.formInput,
                    ...(formErrors.mobile ? styles.inputError : {}),
                  }}
                />
                <ErrorText error={formErrors.mobile} />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Blood Group</label>
                <select
                  value={bloodgrp}
                  onChange={(e) => setBloodgrp(e.target.value)}
                  style={styles.formSelect}
                >
                  <option value="">Select Blood Group</option>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
                    (bg) => (
                      <option key={bg}>{bg}</option>
                    ),
                  )}
                </select>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setDob(e.target.value);
                    setFormErrors((p) => ({ ...p, dob: "" }));
                  }}
                  style={{
                    ...styles.formInput,
                    ...(formErrors.dob ? styles.inputError : {}),
                  }}
                />
                <ErrorText error={formErrors.dob} />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Age</label>
                <input
                  placeholder="18 – 80"
                  value={age}
                  maxLength={2}
                  onChange={(e) => {
                    setAge(e.target.value.replace(/\D/g, ""));
                    setFormErrors((p) => ({ ...p, age: "" }));
                  }}
                  style={{
                    ...styles.formInput,
                    ...(formErrors.age ? styles.inputError : {}),
                  }}
                />
                <ErrorText error={formErrors.age} />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  Gender <span style={styles.required}>*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    setFormErrors((p) => ({ ...p, gender: "" }));
                  }}
                  style={{
                    ...styles.formSelect,
                    ...(formErrors.gender ? styles.inputError : {}),
                  }}
                >
                  <option value="">Select Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
                <ErrorText error={formErrors.gender} />
              </div>

              {/* ── Professional Details ── */}
              <div style={styles.sectionHeader}>🚗 Professional Details</div>
              <div style={styles.sectionDivider} />

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Licence Number</label>
                <input
                  placeholder="Enter licence number"
                  value={licenceNo}
                  onChange={(e) => {
                    setLicenceNo(e.target.value);
                    setFormErrors((p) => ({ ...p, licenceNo: "" }));
                  }}
                  style={{
                    ...styles.formInput,
                    ...(formErrors.licenceNo ? styles.inputError : {}),
                  }}
                />
                <ErrorText error={formErrors.licenceNo} />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Experience (Years)</label>
                <input
                  placeholder="Years of driving experience"
                  value={experience}
                  onChange={(e) =>
                    setExperience(e.target.value.replace(/\D/g, ""))
                  }
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  Car Type <span style={styles.required}>*</span>
                </label>
                <select
                  value={car_type}
                  onChange={(e) => {
                    setCarType(e.target.value);
                    setFormErrors((p) => ({ ...p, car_type: "" }));
                  }}
                  style={{
                    ...styles.formSelect,
                    ...(formErrors.car_type ? styles.inputError : {}),
                  }}
                >
                  <option value="">Select Car Type</option>
                  <option>Automatic</option>
                  <option>Manual</option>
                  <option>Both</option>
                </select>
                <ErrorText error={formErrors.car_type} />
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

              {/* ── Status & Pay Active ── */}
              <div style={styles.sectionHeader}>⚙️ Status & Activity</div>
              <div style={styles.sectionDivider} />

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  Status <span style={styles.required}>*</span>
                  <span style={styles.defaultHint}> (default: Offline)</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setFormErrors((p) => ({ ...p, status: "" }));
                  }}
                  style={{
                    ...styles.formSelect,
                    ...(formErrors.status ? styles.inputError : {}),
                  }}
                >
                  <option value="offline">⚫ Offline</option>
                  <option value="active">🟢 Active</option>
                  <option value="inactive">🟡 Inactive</option>
                  <option value="on Duty">🔵 On Duty</option>
                  <option value="suspend">⛔ Suspended</option>
                </select>
                <ErrorText error={formErrors.status} />
              </div>

              {/* ── NEW: Pay Active field ── */}
              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  Pay Active <span style={styles.required}>*</span>
                </label>
                <select
                  value={payactive}
                  onChange={(e) => {
                    setPayActive(e.target.value);
                    setFormErrors((p) => ({ ...p, payactive: "" }));
                  }}
                  style={{
                    ...styles.formSelect,
                    ...(formErrors.payactive ? styles.inputError : {}),
                  }}
                >
                  <option value="">Select Pay Activity</option>
                  <option value="Active">✅ Active</option>
                  <option value="Deactive">🚫 Deactive</option>
                </select>
                <ErrorText error={formErrors.payactive} />
              </div>

              {/* ── Payment Information ── */}
              <div style={styles.sectionHeader}>💳 Payment Information</div>
              <div style={styles.sectionDivider} />

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  Payment Mode <span style={styles.required}>*</span>
                </label>
                <select
                  value={paymentmode}
                  onChange={(e) => {
                    setPaymentmode(e.target.value);
                    setFormErrors((p) => ({ ...p, paymentmode: "" }));
                  }}
                  style={{
                    ...styles.formSelect,
                    ...(formErrors.paymentmode ? styles.inputError : {}),
                  }}
                >
                  <option value="">Select Payment Mode</option>
                  <option>Online</option>
                  <option>Offline</option>
                  <option>Both</option>
                </select>
                <ErrorText error={formErrors.paymentmode} />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  Fee Status <span style={styles.required}>*</span>
                </label>
                <select
                  value={feeDetails}
                  onChange={(e) => {
                    setFeeDetails(e.target.value);
                    setFormErrors((p) => ({ ...p, feeDetails: "" }));
                  }}
                  style={{
                    ...styles.formSelect,
                    ...(formErrors.feeDetails ? styles.inputError : {}),
                  }}
                >
                  <option value="">Select Fee Status</option>
                  <option value="Paid">✅ Paid</option>
                  <option value="Not Paid">❌ Not Paid</option>
                  <option value="Pending">⏳ Pending</option>
                </select>
                <ErrorText error={formErrors.feeDetails} />
              </div>
            </div>

            <div style={styles.btnRowForm}>
              <button
                style={styles.cancelBtnForm}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
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

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div style={styles.deleteOverlay}>
          <div style={styles.deleteModal}>
            <div style={styles.deleteIconWrapper}>
              <span style={styles.deleteModalIcon}>🗑️</span>
            </div>
            <h2 style={styles.deleteTitle}>Delete Driver</h2>
            <p style={styles.deleteMessage}>
              Are you sure you want to delete{" "}
              <strong style={styles.deleteDriverName}>
                "{deleteTargetName}"
              </strong>
              ?
            </p>
            <p style={styles.deleteWarning}>⚠ This action cannot be undone.</p>
            <div style={styles.deleteButtonRow}>
              <button
                style={styles.deleteCancelBtn}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTargetId(null);
                  setDeleteTargetName("");
                }}
              >
                Cancel
              </button>
              <button style={styles.deleteConfirmBtn} onClick={deleteDriver}>
                Yes, Delete
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
    background: "linear-gradient(135deg,#f0f4f8,#e2e8f0)",
    minHeight: "100vh",
  },

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
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
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
    boxShadow: "0 10px 25px rgba(37,99,235,0.3)",
  },
  btnIcon: { fontSize: "20px", fontWeight: 700 },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
    gap: "25px",
    marginBottom: "35px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05),0 10px 20px rgba(0,0,0,0.05)",
    border: "1px solid rgba(255,255,255,0.8)",
  },
  statIconWrapper: {
    width: "60px",
    height: "60px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 16px rgba(37,99,235,0.25)",
  },
  statIcon: { fontSize: "28px" },
  statContent: { flex: 1 },
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

  searchSection: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px 24px",
    marginBottom: "25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
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
    fontFamily: "inherit",
  },
  resultCount: { fontSize: "14px", color: "#64748b", fontWeight: 500 },

  tableCard: {
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05),0 10px 20px rgba(0,0,0,0.05)",
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
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
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
  evenRow: { background: "#fff" },
  oddRow: { background: "#f9fafb" },
  idBadge: {
    background: "#f1f5f9",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#475569",
  },
  nameCell: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "14px",
  },
  nameText: { fontWeight: 600, color: "#1e293b" },

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
  statusOnDuty: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  statusSuspended: {
    background: "#fee2e2",
    color: "#7f1d1d",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    textDecoration: "line-through",
  },
  statusOffline: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },

  /* ── Pay Active badges ── */
  payActiveOn: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  payActiveOff: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  payActiveNone: {
    background: "#f1f5f9",
    color: "#94a3b8",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },

  badgeAutomatic: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  badgeManual: {
    background: "#f3e8ff",
    color: "#7c3aed",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  badgeBoth: {
    background: "#e0f2fe",
    color: "#0369a1",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },

  badgeOnline: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  badgeOffline: {
    background: "#fee2e2",
    color: "#b91c1c",
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
  badgePending: {
    background: "#fef9c3",
    color: "#854d0e",
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

  actionButtons: { display: "flex", gap: "8px" },
  editBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
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
  },
  noData: { padding: "60px 20px", textAlign: "center" },
  noDataContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    color: "#94a3b8",
  },
  noDataIcon: { fontSize: "48px", opacity: 0.5 },

  /* Form modal */
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalForm: {
    width: "850px",
    maxHeight: "90vh",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
  },
  modalHeaderForm: {
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "#fff",
    padding: "28px 35px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: { display: "flex", alignItems: "center", gap: "12px" },
  headerIcon: { fontSize: "28px" },
  headerText: { fontSize: "24px", fontWeight: 700 },
  closeIconForm: {
    cursor: "pointer",
    fontSize: "24px",
    fontWeight: 700,
    opacity: 0.9,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: "20px",
    padding: "35px",
    background: "#fafafa",
    maxHeight: "65vh",
    overflowY: "auto",
  },
  sectionHeader: {
    gridColumn: "1/-1",
    fontSize: "15px",
    fontWeight: 700,
    color: "#1e40af",
    marginTop: "10px",
    marginBottom: "-5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sectionDivider: {
    gridColumn: "1/-1",
    height: "2px",
    background: "linear-gradient(90deg,#2563eb,transparent)",
    marginBottom: "5px",
  },
  inputWrapper: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: 600, color: "#374151" },
  required: { color: "#ef4444" },
  defaultHint: { fontSize: "11px", color: "#94a3b8", fontWeight: 400 },
  formInput: {
    padding: "13px 16px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
    fontFamily: "inherit",
  },
  formSelect: {
    padding: "13px 16px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  inputError: { border: "2px solid #ef4444", background: "#fff5f5" },
  errorText: {
    fontSize: "12px",
    color: "#ef4444",
    fontWeight: 500,
    marginTop: "2px",
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
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "#fff",
    border: "none",
    padding: "14px 32px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
    boxShadow: "0 4px 6px rgba(37,99,235,0.3)",
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
  },

  /* Delete modal */
  deleteOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  deleteModal: {
    background: "#fff",
    borderRadius: "20px",
    padding: "40px 36px",
    width: "420px",
    maxWidth: "90vw",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  deleteIconWrapper: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
  },
  deleteModalIcon: { fontSize: "40px" },
  deleteTitle: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#1e293b",
    margin: "0 0 12px 0",
  },
  deleteMessage: {
    fontSize: "15px",
    color: "#475569",
    margin: "0 0 8px 0",
    lineHeight: "1.6",
  },
  deleteDriverName: { color: "#1e293b", fontWeight: 700 },
  deleteWarning: {
    fontSize: "13px",
    color: "#ef4444",
    fontWeight: 600,
    margin: "0 0 28px 0",
    background: "#fff5f5",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #fecaca",
  },
  deleteButtonRow: { display: "flex", gap: "12px", width: "100%" },
  deleteCancelBtn: {
    flex: 1,
    background: "#fff",
    color: "#6b7280",
    border: "2px solid #e5e7eb",
    padding: "14px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "15px",
  },
  deleteConfirmBtn: {
    flex: 1,
    background: "linear-gradient(135deg,#ef4444,#dc2626)",
    color: "#fff",
    border: "none",
    padding: "14px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
    boxShadow: "0 4px 12px rgba(239,68,68,0.35)",
  },
};
