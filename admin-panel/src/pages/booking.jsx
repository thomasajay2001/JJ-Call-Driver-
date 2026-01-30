import axios from "axios";
import { useEffect, useState } from "react";

const BASE_URL = "http://192.168.0.3:3000";

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
        if (driver !== "") {
            setStatus("Assigned");
        }
    }, [driver]);



    const fetchDrivers = async () => {
        const res = await axios.get(`${BASE_URL}/api/drivers`);

        const onlineDrivers = res.data.filter(
            (d) => d.status === "online"
        );

        setDrivers(onlineDrivers);
        console.log("Online Drivers:",onlineDrivers)
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
            b.mobile.toString().includes(search)
    );

    const submitForm = async () => {
        await axios.put(`${BASE_URL}/api/bookings/${editId}`, {
            driver,
            status
        });

        setShowForm(false);
        fetchBookings();
    };


    return (
        <div style={styles.container}>
            <h2>Booking Management</h2>

            <div style={styles.topBar}>
                <input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {/* <button style={styles.addBtn}>+ Add Dri</button> */}
            </div>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Pickup</th>
                        <th>Drop</th>
                        <th>Driver Id</th>
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
                            <td>{b.driver ? b.driver : "Not Assigned"}</td>
                            <td>{b.status}</td>
                            <td>
                                <button onClick={() => openEdit(b)}>Edit</button>
                                {/* <button onClick={() => deleteBooking(b.id)}>Delete</button> */}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showForm && (
                <div style={styles.modal}>
                    <h3>{editId ? "Edit Driver" : "Add Driver"}</h3>
                    <input value={name} readOnly />
                    <input value={mobile} readOnly />
                    <input value={pickup} readOnly />
                    <input value={drop} readOnly />

                    <select value={driver} onChange={(e) => setDriver(e.target.value)}>
                        <option value="">Select Driver</option>

                        {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>



                    <input value={status} readOnly />



                    <div>
                        <button onClick={submitForm}>Save</button>
                        <button onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

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
export default Booking;
