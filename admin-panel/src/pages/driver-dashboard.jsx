import axios from "axios";
import { useEffect, useState } from "react";
import io from "socket.io-client";



const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = "http://192.168.0.9:3000";

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

  // 🔹 Load drivers + socket
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
    setDob(d.dob ? d.dob.split("T")[0] : "");
    setAge(d.age);
    setGender(d.gender);
    setCarType(d.car_type);
    setLicenceNo(d.licenceNo);
    setFeeDetails(d.feeDetails);
    setExperience(d.experience);
    setPaymentmode(d.paymentmode);
    setStatus(d.status)
    setShowForm(true);
    console.log(d)
  };

  const submitForm = async () => {
    if (!name || !mobile) return alert("Required fields");

    const body = { name, mobile, location, experience, feeDetails, dob, bloodgrp, age, gender, car_type, licenceNo, paymentmode, status };

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
    <>


      <div style={styles.container}>
        <h2>Drivers Management</h2>

        <div style={styles.topBar}>
          <input
            placeholder="Search..."
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
            <button
              style={styles.editBtn}
              onClick={() => openEdit(d)}
            >
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
    <div style={styles.modalModern}>

      {/* Header */}
      <div style={styles.modalHeader}>
        <h3>{editId ? "Edit Driver" : "Add Driver"}</h3>
        <span
          style={styles.closeIcon}
          onClick={() => setShowForm(false)}
        >
          ✖
        </span>
      </div>

      {/* Form Grid */}
      <div style={styles.formGrid}>

        <input placeholder="Name" value={name}
          onChange={(e) => setName(e.target.value)} />

        <input placeholder="Mobile" value={mobile}
          onChange={(e) => setMobile(e.target.value)} />

        <input placeholder="Blood Group" value={bloodgrp}
          onChange={(e) => setBloodgrp(e.target.value)} />

        <input type="date" value={dob}
          onChange={(e) => setDob(e.target.value)} />

        <input placeholder="Age" value={age}
          onChange={(e) => setAge(e.target.value)} />

        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input placeholder="status" 
        value={status} 
          onChange={(e) => setStatus(e.target.value)} />

        <input placeholder="Licence No"
          value={licenceNo}
          onChange={(e) => setLicenceNo(e.target.value)} />

        <select value={car_type} onChange={(e) => setCarType(e.target.value)}>
          <option value="">Car Type</option>
          <option value="auto">Automatic</option>
          <option value="manual">Manual</option>
          <option value="both">Both</option>
        </select>

        <select value={paymentmode} onChange={(e) => setPaymentmode(e.target.value)}>
          <option value="">Payment Mode</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>

        <select value={feeDetails} onChange={(e) => setFeeDetails(e.target.value)}>
          <option value="">Fee Status</option>
          <option value="paid">Paid</option>
          <option value="not Paid">Not Paid</option>
        </select>

        <input placeholder="Experience"
          value={experience}
          onChange={(e) => setExperience(e.target.value)} />

        <input placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)} />

      </div>

      {/* Buttons */}
      <div style={styles.btnRow}>
        <button style={styles.saveBtn} onClick={submitForm}>Save</button>
        <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
      </div>

    </div>
  </div>
)}

      </div>
    </>
  );
}
const styles = {
 overlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
},
container: {
        marginLeft: "240px",
        padding: "100px 30px",
    },
modalModern: {
  width: "650px",
  background: "#fff",
  borderRadius: "12px",
  padding: "20px 25px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
},

modalHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "15px",
},

closeIcon: {
  cursor: "pointer",
  fontSize: "18px",
  fontWeight: "bold",
  color: "#666",
},

formGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
},

btnRow: {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
},

saveBtn: {
  background: "#0d6efd",
  color: "#fff",
  border: "none",
  padding: "8px 18px",
  borderRadius: "6px",
  cursor: "pointer",
},

cancelBtn: {
  background: "#dc3545",
  color: "#fff",
  border: "none",
  padding: "8px 18px",
  borderRadius: "6px",
  cursor: "pointer",
},
tableCard: {
  background: "#fff",
  borderRadius: "12px",
  padding: "30px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
  overflowX: "auto",
},

tableModern: {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
},

tableModernTh: {
  background: "#f8f9fa",
  textAlign: "left",
  padding: "12px",
  fontWeight: "600",
  borderBottom: "1px solid #ddd",
},

tableModernTd: {
  padding: "10px",
  borderBottom: "1px solid #eee",
},

badgeBlue: {
  background: "#e7f1ff",
  color: "#0d6efd",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
},

badgePurple: {
  background: "#f3e8ff",
  color: "#198754",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
},

badgeGreen: {
  background: "#e6f4ea",
  color: "#198754",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
},

badgeRed: {
  background: "#fdecea",
  color: "#dc3545",
  padding: "4px 10px",
  borderRadius: "20px",
},

editBtn: {
  background: "#0d6efd",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "6px",
  marginRight: "6px",
  cursor: "pointer",
},

deleteBtn: {
  background: "#dc3545",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "6px",
  cursor: "pointer",
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
  border: "1px solid #ccc",
  outline: "none",
  fontSize: "14px",
},

addBtn: {
  background: "#0d6efd",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  whiteSpace: "nowrap",
},

};
