import axios from "axios";
import { useEffect, useState } from "react";
import io from "socket.io-client";


const BASE_URL = "http://192.168.0.9:3000";
const SOCKET_URL = "http://192.168.0.9:3000";

export default function DriverDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");

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
    setShowForm(true);
  };

  const openEdit = (d) => {
    setEditId(d.id);
    setName(d.name);
    setMobile(d.mobile);
    setLocation(d.location);
    setShowForm(true);
  };

  const submitForm = async () => {
    if (!name || !mobile) return alert("Required fields");

    const body = { name, mobile, location };

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
      d.mobile.includes(search)
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

        <table style={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Mobile</th>
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
                <td>{d.location}</td>
                <td>
                  <button onClick={() => openEdit(d)}>Edit</button>
                  <button onClick={() => deleteDriver(d.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showForm && (
          <div style={styles.modal}>
            <h3>{editId ? "Edit Driver" : "Add Driver"}</h3>
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="Mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <div>
              <button onClick={submitForm}>Save</button>
              <button onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
const styles = {
  container: {
    marginLeft: "240px",
    padding: "100px 30px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "15px",
  },
  input: {
    padding: "8px",
    width: "250px",
  },
  addBtn: {
    padding: "8px 14px",
    background: "#0d6efd",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  modal: {
    position: "fixed",
    top: "30%",
    left: "40%",
    background: "#fff",
    padding: "20px",
    border: "1px solid #ddd",
  },
};
