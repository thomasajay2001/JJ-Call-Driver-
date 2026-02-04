import { Outlet } from "react-router-dom";
import Navbar from "../src/components/navbar";
import Sidebar from "../src/components/sidebar";

const AdminLayout = () => {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main area: includes navbar + content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Navbar */}
        <Navbar />

        {/* Page content */}
        <div
          style={{
            flex: 1,
            padding: "20px",
            paddingTop: "60px", // same as navbar height
            background: "#f3f4f6",
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
