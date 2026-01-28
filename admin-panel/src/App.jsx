import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "./adminlayout";
import Booking from "./pages/booking";
import Dashboard from "./pages/dashboard";
import DriverDashboard from "./pages/driver-dashboard";
import Login from "./pages/login";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/driver-dashboard" element={<DriverDashboard/>}/>
        </Route>
        
     </Routes>
    </BrowserRouter>
  );
}
