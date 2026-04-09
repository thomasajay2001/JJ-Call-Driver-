import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PaginationBar, usePagination } from "../hooks/Usepagination";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

/* ── star row ── */
const StarRow = ({ value = 0, size = 16 }) => (
  <span className="ds-stars" style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={i <= Math.round(value) ? "ds-star ds-star-filled" : "ds-star ds-star-empty"}>
        ★
      </span>
    ))}
  </span>
);

const STATUS_BADGE = {
  active: "badge badge-green", inactive: "badge badge-amber",
  "on duty": "badge badge-blue", suspend: "badge badge-red",
  offline: "badge badge-gray", online: "badge badge-teal",
};
const STATUS_LABEL = {
  active: "🟢 Active", inactive: "🟡 Inactive", "on duty": "🔵 On Duty",
  suspend: "⛔ Suspended", offline: "⚫ Offline", online: "🟢 Online",
};
const statusBadgeClass = (s) => STATUS_BADGE[s?.toLowerCase()] || "badge badge-gray";
const statusLabel      = (s) => STATUS_LABEL[s?.toLowerCase()] || s || "N/A";

const DATE_FILTERS = [
  { key: "all",       label: "All Time"   },
  { key: "today",     label: "Today"      },
  { key: "yesterday", label: "Yesterday"  },
  { key: "thisweek",  label: "This Week"  },
  { key: "thismonth", label: "This Month" },
  { key: "custom",    label: "📅 Custom"  },
];

export default function DriverStats() {
  const navigate = useNavigate();

  const [drivers,       setDrivers]       = useState([]);
  const [allStats,      setAllStats]      = useState({});
  const [loadingAll,    setLoadingAll]    = useState(true);

  const [selected,      setSelected]      = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab,     setDetailTab]     = useState("overview");

  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [calOpen,    setCalOpen]    = useState(false);
  const calRef = useRef(null);

  const [search,        setSearch]        = useState("");
  const [sortBy,        setSortBy]        = useState("totalRides");
  const [sortDir,       setSortDir]       = useState("desc");
  const [filterStatus,  setFilterStatus]  = useState("all");

  const [showRidesModal, setShowRidesModal] = useState(false);
  const [ridesData,      setRidesData]      = useState([]);
  const [ridesLoading,   setRidesLoading]   = useState(false);

  useEffect(() => {
    const fn = (e) => { if (calRef.current && !calRef.current.contains(e.target)) setCalOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoadingAll(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      const driverList = res.data || [];
      setDrivers(driverList);
      const statsMap = {};
      await Promise.all(
        driverList.map(async (d) => {
          try {
            const r = await axios.get(`${BASE_URL}/api/driver-stats/${d.id}`);
            statsMap[d.id] = r.data;
          } catch {
            statsMap[d.id] = { totalRides: 0, totalIncome: 0, avgRating: 0, ratingCount: 0, ratingBreakdown: {}, comments: [] };
          }
        })
      );
      setAllStats(statsMap);
    } catch (e) { console.error(e); }
    finally { setLoadingAll(false); }
  };

  const fetchDetail = async (driverId, filter, from, to) => {
    setDetailLoading(true);
    try {
      const params = { filter };
      if (filter === "custom" && from && to) { params.from = from; params.to = to; }
      const r = await axios.get(`${BASE_URL}/api/driver-stats/${driverId}`, { params });
      setSelectedStats(r.data);
      if (filter === "all") setAllStats((prev) => ({ ...prev, [driverId]: r.data }));
    } catch {
      setSelectedStats({ totalRides: 0, totalIncome: 0, avgRating: 0, ratingCount: 0, ratingBreakdown: {}, comments: [] });
    } finally { setDetailLoading(false); }
  };

  const fetchRides = async (driverId, filter, from, to) => {
    setRidesLoading(true);
    setShowRidesModal(true);
    try {
      const params = { driverId };
      if (filter && filter !== "all") params.filter = filter;
      if (filter === "custom" && from && to) { params.from = from; params.to = to; }
      const r = await axios.get(`${BASE_URL}/api/bookings/driver/all`, { params });
      const list = Array.isArray(r.data?.data) ? r.data.data : [];
      setRidesData(list);
    } catch { setRidesData([]); }
    finally { setRidesLoading(false); }
  };

  const openDetail = (d) => {
    setSelected(d);
    setDetailTab("overview");
    setDateFilter("all");
    setCustomFrom(""); setCustomTo(""); setCalOpen(false);
    fetchDetail(d.id, "all");
  };

  const changeFilter = (key) => {
    setDateFilter(key);
    setCalOpen(key === "custom");
    if (key !== "custom" && selected) fetchDetail(selected.id, key);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || !selected) return;
    setCalOpen(false);
    fetchDetail(selected.id, "custom", customFrom, customTo);
  };

  const clearFilter = () => {
    setDateFilter("all"); setCustomFrom(""); setCustomTo(""); setCalOpen(false);
    if (selected) fetchDetail(selected.id, "all");
  };

  const filterLabel = () => {
    if (dateFilter === "custom" && customFrom && customTo) return `${customFrom} → ${customTo}`;
    return DATE_FILTERS.find((f) => f.key === dateFilter)?.label || "All Time";
  };

  /* ── FIX: Number() wrap prevents NaN from null/undefined stats ── */
  const enriched = drivers.map((d) => ({
    ...d,
    totalRides:  Number(allStats[d.id]?.totalRides)  || 0,
    totalIncome: Number(allStats[d.id]?.totalIncome) || 0,
    avgRating:   Number(allStats[d.id]?.avgRating)   || 0,
    ratingCount: Number(allStats[d.id]?.ratingCount) || 0,
  }));

  const filtered = enriched.filter((d) => {
    const matchSearch =
      (d.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(d.mobile ?? "").includes(search) ||
      (d.driver_no ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || d.status?.toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    return (a[sortBy] - b[sortBy]) * mul;
  });

  const pg = usePagination(sorted, 12);

  const totalRidesAll  = Object.values(allStats).reduce((s, v) => s + (Number(v.totalRides)  || 0), 0);
  const totalIncomeAll = Object.values(allStats).reduce((s, v) => s + (Number(v.totalIncome) || 0), 0);
  const ratedDrivers   = Object.values(allStats).filter((v) => Number(v.avgRating) > 0);
  const avgRatingAll   = ratedDrivers.length
    ? (ratedDrivers.reduce((s, v) => s + Number(v.avgRating), 0) / ratedDrivers.length).toFixed(1) : "—";
  const totalReviews   = Object.values(allStats).reduce((s, v) => s + (Number(v.ratingCount) || 0), 0);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };
  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="sort-icon-inactive">↕</span>;
    return <span className="sort-icon-active">{sortDir === "desc" ? "↓" : "↑"}</span>;
  };
  const ratingColor = (r) =>
    r >= 4.5 ? "var(--success)" : r >= 3.5 ? "var(--warning)" : r > 0 ? "var(--danger)" : "var(--text-muted)";

  return (
    <div className="dsp-root">

      <div className={`dsp-left${selected ? " dsp-left-narrow" : ""}`}>

        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Driver Performance</h1>
            <p className="page-subtitle">Rides, income, ratings and reviews for every driver</p>
          </div>
          <div className="page-header-right">
            <button className="btn btn-ghost btn-sm" onClick={fetchAll}>↻ Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/driver-dashboard")}>🚗 Manage Drivers</button>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { icon: "🚗", label: "Total Rides",   value: totalRidesAll.toLocaleString(),               cls: "stat-icon-box-blue"   },
            { icon: "💰", label: "Total Income",  value: `₹${totalIncomeAll.toLocaleString("en-IN")}`,  cls: "stat-icon-box-green"  },
            { icon: "⭐", label: "Avg Rating",    value: avgRatingAll,                                  cls: "stat-icon-box-amber"  },
            { icon: "💬", label: "Total Reviews", value: totalReviews.toLocaleString(),                 cls: "stat-icon-box-purple" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon-box ${s.cls}`}><span>{s.icon}</span></div>
              <div><p className="stat-label">{s.label}</p><h3 className="stat-value">{loadingAll ? "…" : s.value}</h3></div>
            </div>
          ))}
        </div>

        <div className="search-bar" style={{ marginBottom: 16 }}>
          <div className="search-wrap">
            <span className="search-icon-pos">🔍</span>
            <input className="search-input" placeholder="Search by name, mobile, driver no..."
              value={search} onChange={(e) => { setSearch(e.target.value); pg.setPage(1); }} />
          </div>
          <div className="dsp-filter-group">
            <select className="page-size-select" value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); pg.setPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option><option value="online">Online</option>
              <option value="offline">Offline</option><option value="inactive">Inactive</option>
              <option value="suspend">Suspended</option>
            </select>
            <select className="page-size-select" value={`${sortBy}-${sortDir}`}
              onChange={(e) => { const [col, dir] = e.target.value.split("-"); setSortBy(col); setSortDir(dir); pg.setPage(1); }}>
              <option value="totalRides-desc">Most Rides</option>
              <option value="totalRides-asc">Least Rides</option>
              <option value="totalIncome-desc">Highest Income</option>
              <option value="avgRating-desc">Best Rating</option>
              <option value="avgRating-asc">Lowest Rating</option>
            </select>
          </div>
          <span className="search-result-count"><strong>{pg.total}</strong> drivers</span>
        </div>

        <div className="table-card">
          <div className="table-card-header">
            <h3 className="table-card-title">Driver Stats</h3>
            <div className="table-card-header-right">
              <span className="table-click-hint">💡 Click a row to see full details</span>
              <span className="table-record-badge">{pg.total} Records</span>
            </div>
          </div>
          <div className="table-wrap">
            {loadingAll ? (
              <div className="ds-loading" style={{ padding: "48px 0" }}>
                <div className="ds-spinner" /><p className="ds-loading-text">Loading driver stats…</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Driver</th><th>Status</th><th>Region</th>
                    <th className="dsp-sortable-th" onClick={() => toggleSort("totalRides")}>Total Rides <SortIcon col="totalRides" /></th>
                    <th className="dsp-sortable-th" onClick={() => toggleSort("totalIncome")}>Est. Income <SortIcon col="totalIncome" /></th>
                    <th className="dsp-sortable-th" onClick={() => toggleSort("avgRating")}>Rating <SortIcon col="avgRating" /></th>
                    <th>Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.slice.length === 0 ? (
                    <tr><td colSpan="7">
                      <div className="empty-state">
                        <span className="empty-state-icon">📭</span>
                        <p className="empty-state-title">No drivers found</p>
                        <p className="empty-state-sub">Try adjusting your search or filter</p>
                      </div>
                    </td></tr>
                  ) : pg.slice.map((d) => (
                    <tr key={d.id}
                      className={`driver-row-clickable${selected?.id === d.id ? " dsp-row-active" : ""}`}
                      onClick={() => openDetail(d)}>
                      <td>
                        <div className="cell-name">
                          <div className="avatar">{d.name?.charAt(0).toUpperCase()}</div>
                          <div>
                            <span className="cell-name-text">{d.name}</span>
                            <div className="dsp-driver-sub">
                              {d.driver_no && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{d.driver_no}</span>}
                              {d.driver_no && d.mobile && <span> · </span>}
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.mobile}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className={statusBadgeClass(d.status)}>{statusLabel(d.status)}</span></td>
                      <td>{d.region || "—"}</td>
                      <td><span className="dsp-number-cell">{d.totalRides}</span></td>
                      <td><span className="dsp-income-cell">₹{d.totalIncome.toLocaleString("en-IN")}</span></td>
                      <td>
                        {/* FIX: guard toFixed with ||0 to prevent NaN */}
                        {d.avgRating > 0 ? (
                          <div className="dsp-rating-cell">
                            <span className="dsp-rating-num" style={{ color: ratingColor(d.avgRating) }}>
                              {(Number(d.avgRating) || 0).toFixed(1)}
                            </span>
                            <StarRow value={d.avgRating} size={13} />
                          </div>
                        ) : <span className="badge badge-gray">No rating</span>}
                      </td>
                      <td><span className="dsp-reviews-badge">{d.ratingCount}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!loadingAll && pg.total > 0 && (
            <PaginationBar pg={pg} onPageChange={pg.setPage}
              onSizeChange={(size) => { pg.setPageSize(size); pg.setPage(1); }} />
          )}
        </div>
      </div>

      {/* RIDES HISTORY MODAL */}
      {showRidesModal && (
        <div style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{backgroundColor:"#fff",borderRadius:20,width:"100%",maxWidth:680,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",borderBottom:"1px solid #F1F5F9"}}>
              <div>
                <h3 style={{margin:0,fontSize:17,fontWeight:800,color:"#0F172A"}}>🚗 Ride History</h3>
                <p style={{margin:"2px 0 0",fontSize:12,color:"#64748B"}}>{selected?.name} · {ridesData.length} rides</p>
              </div>
              <button onClick={()=>setShowRidesModal(false)} style={{width:32,height:32,borderRadius:"50%",background:"#F1F5F9",border:"none",cursor:"pointer",fontSize:16,color:"#64748B"}}>✕</button>
            </div>
            {/* Body */}
            <div style={{overflowY:"auto",flex:1,padding:"12px 0"}}>
              {ridesLoading ? (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:40,gap:12}}>
                  <div style={{width:32,height:32,border:"3px solid #DBEAFE",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                  <p style={{color:"#64748B",fontSize:13}}>Loading rides…</p>
                </div>
              ) : ridesData.length === 0 ? (
                <div style={{textAlign:"center",padding:40}}>
                  <span style={{fontSize:40}}>📭</span>
                  <p style={{color:"#64748B",marginTop:8}}>No rides found</p>
                </div>
              ) : (
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{backgroundColor:"#F8FAFC"}}>
                      {["#","Date","Customer","Pickup → Drop","Status","Amount"].map(h=>(
                        <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748B",textAlign:"left",textTransform:"uppercase",letterSpacing:"0.4px",borderBottom:"1px solid #F1F5F9"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ridesData.map((b,i)=>{
                      const statusColors = {completed:"#16A34A",inride:"#0F766E",assigned:"#1D4ED8",accepted:"#92400E",cancelled:"#9F1239",pending:"#C2410C"};
                      const color = statusColors[b.status] || "#475569";
                      return (
                        <tr key={b.id} style={{borderBottom:"1px solid #F8FAFC"}}>
                          <td style={{padding:"10px 14px",fontSize:12,color:"#94A3B8"}}>{i+1}</td>
                          <td style={{padding:"10px 14px",fontSize:12,color:"#475569",whiteSpace:"nowrap"}}>
                            {b.created_at ? new Date(b.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                          </td>
                          <td style={{padding:"10px 14px",fontSize:12,color:"#1E293B",fontWeight:600}}>{b.customer_name||"—"}</td>
                          <td style={{padding:"10px 14px",fontSize:11,color:"#475569",maxWidth:200}}>
                            <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.pickup||"—"}</div>
                            <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#94A3B8"}}>→ {b.drop_location||"—"}</div>
                          </td>
                          <td style={{padding:"10px 14px"}}>
                            <span style={{fontSize:11,fontWeight:700,color,backgroundColor:color+"15",padding:"3px 8px",borderRadius:20}}>{b.status}</span>
                          </td>
                          <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,color:"#16A34A"}}>
                            {b.amount ? `₹${b.amount}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {/* Footer */}
            <div style={{padding:"12px 20px",borderTop:"1px solid #F1F5F9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:"#64748B"}}>
                Total: <strong>₹{ridesData.filter(b=>b.status==="completed").reduce((s,b)=>s+Number(b.amount||0),0).toLocaleString("en-IN")}</strong> earned from {ridesData.filter(b=>b.status==="completed").length} completed rides
              </span>
              <button onClick={()=>setShowRidesModal(false)} style={{padding:"8px 18px",backgroundColor:"#2563EB",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT PANEL */}
      {selected && (
        <div className="dsp-right">

          <div className="dsp-detail-header">
            <div className="ds-header-identity">
              <div className="ds-header-avatar" style={{ width: 48, height: 48, fontSize: 19 }}>
                {selected.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="ds-header-name" style={{ fontSize: 17 }}>{selected.name}</p>
                <div className="ds-header-meta">
                  <span className="ds-header-mobile">{selected.mobile}</span>
                  <span className="ds-meta-sep">·</span>
                  <span className={statusBadgeClass(selected.status)}>{statusLabel(selected.status)}</span>
                </div>
              </div>
            </div>
            <div className="dsp-detail-actions">
              <button className="btn btn-primary btn-sm" onClick={() => navigate("/driver-dashboard")}>✏️ Edit</button>
              <button className="dsp-close-btn" onClick={() => { setSelected(null); setSelectedStats(null); }}>✕</button>
            </div>
          </div>

          {/* DATE FILTER STRIP */}
          <div className="dsp-date-strip" ref={calRef}>
            <div className="dsp-date-tabs">
              {DATE_FILTERS.map((f) => (
                <button key={f.key}
                  className={`dsp-date-tab${dateFilter === f.key ? " dsp-date-tab-active" : ""}`}
                  onClick={() => changeFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
            {dateFilter !== "all" && (
              <div style={{ padding: "5px 0 1px" }}>
                <span className="dsp-active-filter-pill">
                  <span className="dsp-filter-pill-dot" />
                  {filterLabel()}
                  <button onClick={clearFilter}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 800, fontSize: 13, padding: "0 0 0 4px", lineHeight: 1 }}>
                    ✕
                  </button>
                </span>
              </div>
            )}
            {calOpen && (
              <div className="dsp-calendar-drop">
                <p className="dsp-cal-title">📅 Select Date Range</p>
                <div className="dsp-cal-fields">
                  <div className="form-field">
                    <label className="form-label">From</label>
                    <input type="date" className="form-input" value={customFrom}
                      max={customTo || undefined}
                      onChange={(e) => setCustomFrom(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">To</label>
                    <input type="date" className="form-input" value={customTo}
                      min={customFrom || undefined}
                      onChange={(e) => setCustomTo(e.target.value)} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                      disabled={!customFrom || !customTo}
                      onClick={applyCustom}>
                      Apply
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={clearFilter}>Clear</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="ds-tabs">
            <button className={`ds-tab${detailTab === "overview" ? " ds-tab-active" : ""}`}
              onClick={() => setDetailTab("overview")}>📊 Overview</button>
            <button className={`ds-tab${detailTab === "reviews" ? " ds-tab-active" : ""}`}
              onClick={() => setDetailTab("reviews")}>
              💬 Reviews
              {selectedStats && selectedStats.comments.length > 0 && (
                <span className="ds-tab-pill">{selectedStats.comments.length}</span>
              )}
            </button>
          </div>

          <div className="dsp-detail-body">
            {detailLoading ? (
              <div className="ds-loading">
                <div className="ds-spinner" /><p className="ds-loading-text">Loading…</p>
              </div>

            ) : selectedStats && detailTab === "overview" ? (
              <div>
                <div className="dsp-detail-kpis">
                  <div className="ds-kpi-card ds-kpi-blue" style={{cursor:"pointer"}}
                    onClick={() => fetchRides(selected.id, dateFilter, customFrom, customTo)}
                    title="Click to view ride history">
                    <span className="ds-kpi-icon">🚗</span>
                    <p className="ds-kpi-value">{selectedStats.totalRides}</p>
                    <p className="ds-kpi-label">Total Rides <span style={{fontSize:10,opacity:0.7}}>↗</span></p>
                  </div>
                  <div className="ds-kpi-card ds-kpi-green">
                    <span className="ds-kpi-icon">💰</span>
                    <p className="ds-kpi-value">₹{(Number(selectedStats.totalIncome) || 0).toLocaleString("en-IN")}</p>
                    <p className="ds-kpi-label">Est. Income</p>
                  </div>
                  <div className="ds-kpi-card ds-kpi-amber">
                    <span className="ds-kpi-icon">⭐</span>
                    {/* FIX: guard against NaN */}
                    <p className="ds-kpi-value">
                      {Number(selectedStats.avgRating) > 0 ? (Number(selectedStats.avgRating)).toFixed(1) : "—"}
                    </p>
                    <p className="ds-kpi-label">Avg Rating</p>
                  </div>
                  <div className="ds-kpi-card ds-kpi-purple">
                    <span className="ds-kpi-icon">💬</span>
                    <p className="ds-kpi-value">{selectedStats.ratingCount}</p>
                    <p className="ds-kpi-label">Reviews</p>
                  </div>
                </div>

                {Number(selectedStats.avgRating) > 0 && (
                  <div className="ds-rating-section" style={{ marginBottom: 18 }}>
                    <p className="ds-section-title">Rating Breakdown</p>
                    <div className="ds-rating-summary">
                      {/* FIX: guard toFixed */}
                      <span className="ds-rating-big">{(Number(selectedStats.avgRating) || 0).toFixed(1)}</span>
                      <div>
                        <StarRow value={Number(selectedStats.avgRating) || 0} size={20} />
                        <p className="ds-rating-sub">{selectedStats.ratingCount} review{selectedStats.ratingCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    {selectedStats.ratingBreakdown && (
                      <div className="ds-star-breakdown">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = selectedStats.ratingBreakdown[star] || 0;
                          const pct   = selectedStats.ratingCount > 0 ? (count / selectedStats.ratingCount) * 100 : 0;
                          return (
                            <div key={star} className="ds-star-row">
                              <span className="ds-star-row-label">{star} ★</span>
                              <div className="ds-star-track"><div className="ds-star-fill" style={{ width: `${pct}%` }} /></div>
                              <span className="ds-star-count">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <p className="ds-section-title">Driver Information</p>
                <div className="ds-info-grid">
                  {[
                    ["Car Type",   selected.car_type    || "—"],
                    ["Region",     selected.region      || "—"],
                    ["Location",   selected.location    || "—"],
                    ["Experience", selected.experience  ? `${selected.experience} yrs` : "—"],
                    ["Badge No",   selected.badge_no    || "—"],
                    ["Licence",    selected.licenceNo   || "—"],
                    ["Payment",    selected.paymentmode || "—"],
                    ["Fee Status", selected.feeDetails  || "—"],
                    ["Engaged",    selected.engaged     || "—"],
                    ["Join Date",  selected.join_date ? new Date(selected.join_date).toLocaleDateString("en-GB") : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="ds-info-item">
                      <span className="ds-info-label">{label}</span>
                      <span className="ds-info-value">{value}</span>
                    </div>
                  ))}
                </div>

                {selectedStats.totalRides === 0 && (
                  <div className="ds-empty" style={{ marginTop: 20 }}>
                    <span className="ds-empty-icon">🚖</span>
                    <p>No completed rides {dateFilter !== "all" ? `for ${filterLabel()}` : "yet"}.</p>
                  </div>
                )}
              </div>

            ) : selectedStats && detailTab === "reviews" ? (
              <div>
                {selectedStats.comments.length === 0 ? (
                  <div className="ds-empty">
                    <span className="ds-empty-icon">💬</span>
                    <p>No reviews {dateFilter !== "all" ? `for ${filterLabel()}` : "yet"}.</p>
                  </div>
                ) : (
                  <div className="ds-comments-list">
                    {selectedStats.comments.map((c, i) => (
                      <div key={i} className="ds-comment-card">
                        <div className="ds-comment-top">
                          <div className="ds-comment-avatar">{(c.customer_name || "C").charAt(0).toUpperCase()}</div>
                          <div className="ds-comment-meta">
                            <span className="ds-comment-name">{c.customer_name || "Customer"}</span>
                            <span className="ds-comment-date">{c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB") : ""}</span>
                          </div>
                          <div className="ds-comment-rating-wrap">
                            <StarRow value={Number(c.rating) || 0} size={14} />
                            <span className="ds-comment-rating-num">{c.rating}/5</span>
                          </div>
                        </div>
                        {c.feedback && <p className="ds-comment-text">"{c.feedback}"</p>}
                        <div className="ds-comment-route">
                          <span>📍 {c.pickup}</span>
                          <span className="ds-route-arrow">→</span>
                          <span>🎯 {c.drop_location}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
