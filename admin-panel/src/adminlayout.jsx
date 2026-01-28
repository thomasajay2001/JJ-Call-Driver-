import { Outlet } from "react-router-dom";
import Navbar from "../src/components/navbar";
import Sidebar from "../src/components/sidebar";

const AdminLayout = () => {
  return (
    <>
      <Sidebar />
      <Navbar />

      <div style={{ marginLeft: "40px", paddingTop: "30px" }}>
        <Outlet />
      </div>
    </>
  );
};

export default AdminLayout;
