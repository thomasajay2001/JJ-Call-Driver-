import axios from "axios";
import { useEffect, useState } from "react";
import io from "socket.io-client";

const BASE_URL = "http://192.168.0.5:3000";
const SOCKET_URL = "http://192.168.0.5:3000";

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
    setShowForm(true);
  };

  const openEdit = (d) => {
    setEditId(d.id);
    setName(d.name);
    setMobile(d.mobile);
    setLocation(d.location);
    setBloodgrp(d.bloodgrp);
    setDob(d.dob);
    setAge(d.age);
    setGender(d.gender);
    setCarType(d.car_type);
    setLicenceNo(d.licenceNo);
    setFeeDetails(d.feeDetails);
    setExperience(d.experience);
    setPaymentmode(d.paymentmode);
    setShowForm(true);
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

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Driver Management</h2>

      <div style={styles.topBar}>
        <input
          placeholder="Search drivers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />
        <button onClick={openCreate} style={styles.addBtn}>
          + Add Driver
        </button>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.tableModern}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Gender</th>
              <th>Status</th>
              <th>DOB - Age</th>
              <th>Car</th>
              <th>Licence</th>
              <th>Payment</th>
              <th>Fee</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.name}</td>
                <td>{d.mobile}</td>
                <td>{d.gender}</td>
                <td>{d.status}</td>
                <td>
                  {d.dob
                    ? new Date(d.dob).toLocaleDateString("en-GB")
                    : "dd-MM-yyyy"}{" "}
                  - {d.age}
                </td>
                <td>
                  <span style={styles.badgeBlue}>{d.car_type}</span>
                </td>
                <td>{d.licenceNo}</td>
                <td>
                  <span style={styles.badgePurple}>{d.paymentmode}</span>
                </td>
                <td>
                  <span
                    style={
                      d.feeDetails === "Paid"
                        ? styles.badgeGreen
                        : styles.badgeRed
                    }
                  >
                    {d.feeDetails}
                  </span>
                </td>
                <td>{d.location}</td>
                <td>
                  <button style={styles.editBtn} onClick={() => openEdit(d)}>
                    Edit
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => deleteDriver(d.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modalForm}>
            {/* Header */}
            <div style={styles.modalHeaderForm}>
              <span>{editId ? "Edit Driver" : "Add Driver"}</span>
              <span
                style={styles.closeIconForm}
                onClick={() => setShowForm(false)}
              >
                ✖
              </span>
            </div>

            {/* Form Grid */}
            <div style={styles.formGridForm}>
              <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input} // ✅ Apply the new style
              />
              <input
                placeholder="Mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={styles.input}
              />
              <input
                placeholder="Blood Group"
                value={bloodgrp}
                onChange={(e) => setBloodgrp(e.target.value)}
                style={styles.input}
              />
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={styles.input}
              />
              <input
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                style={styles.input}
              />
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={styles.select} // ✅ Apply select style
              >
                <option value="">Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              <input
                placeholder="Licence No"
                value={licenceNo}
                onChange={(e) => setLicenceNo(e.target.value)}
                style={styles.input}
              />
              <select
                value={car_type}
                onChange={(e) => setCarType(e.target.value)}
                style={styles.select}
              >
                <option value="">Car Type</option>
                <option>Automatic</option>
                <option>Manual</option>
                <option>Both</option>
              </select>
              <select
                value={paymentmode}
                onChange={(e) => setPaymentmode(e.target.value)}
                style={styles.select}
              >
                <option value="">Payment Mode</option>
                <option>Online</option>
                <option>Offline</option>
              </select>
              <select
                value={feeDetails}
                onChange={(e) => setFeeDetails(e.target.value)}
                style={styles.select}
              >
                <option value="">Fee Status</option>
                <option>Paid</option>
                <option>Not Paid</option>
              </select>
              <input
                placeholder="Experience"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                style={styles.input}
              />
              <input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={styles.input}
              />
            </div>

            {/* Buttons */}
            <div style={styles.btnRowForm}>
              <button style={styles.saveBtnForm} onClick={submitForm}>
                Save
              </button>
              <button
                style={styles.cancelBtnForm}
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
}

const styles = {
  container: {
    marginLeft: "260px",
    padding: "50px 30px",
    background: "#f3f4f6",
    minHeight: "100vh",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
    marginBottom: "20px",
    color: "#111827",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "10px",
  },
  input: {
    width: "260px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
  },
  addBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    transition: "0.3s",
  },
  tableCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    overflowX: "auto",
  },
  tableModern: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  tableModernTh: {
    background: "#e0e7ff",
    textAlign: "left",
    padding: "12px",
    fontWeight: 600,
    borderBottom: "1px solid #cbd5e1",
  },
  tableModernTd: {
    padding: "10px",
    borderBottom: "1px solid #e5e7eb",
  },
  badgeBlue: {
    background: "#e0f2fe",
    color: "#0284c7",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 500,
  },
  badgePurple: {
    background: "#ede9fe",
    color: "#7c3aed",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 500,
  },
  badgeGreen: {
    background: "#d1fae5",
    color: "#15803d",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 500,
  },
  badgeRed: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 500,
  },
  editBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginRight: "6px",
    fontWeight: 500,
  },
  deleteBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 500,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalForm: {
    width: "750px", // slightly wider
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    background: "#f9fafb",
    display: "flex",
    flexDirection: "column",
  },
  modalHeaderForm: {
    background: "linear-gradient(90deg, #2563eb, #3b82f6)",
    color: "#fff",
    padding: "25px 30px", // more padding
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "22px",
    fontWeight: 700,
  },
  closeIconForm: {
    cursor: "pointer",
    fontSize: "20px",
    fontWeight: 700,
  },
  formGridForm: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "22px", // more spacing between fields
    padding: "30px", // more inner padding
    background: "#fff",
  },
  input: {
    padding: "14px 16px", // bigger inputs
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
    transition: "0.3s",
  },
  inputFocus: {
    border: "1px solid #2563eb",
    boxShadow: "0 0 8px rgba(37,99,235,0.4)",
  },
  select: {
    padding: "14px 16px", // bigger select
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
    transition: "0.3s",
  },
  btnRowForm: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "16px", // more space between buttons
    padding: "25px 30px", // more padding
    background: "#f3f4f6",
  },
  saveBtnForm: {
    background: "linear-gradient(90deg, #2563eb, #3b82f6)",
    color: "#fff",
    border: "none",
    padding: "14px 28px", // bigger button
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
    transition: "0.3s",
  },
  cancelBtnForm: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    padding: "14px 28px", // bigger button
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
    transition: "0.3s",
  },
};
