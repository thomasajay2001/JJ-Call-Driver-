import { useState } from "react";

/**
 * usePagination — shared pagination hook
 * @param {any[]} data     - full filtered dataset
 * @param {number} defSize - default rows per page
 */
export function usePagination(data, defSize = 10) {
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(defSize);

  const total      = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const startIdx   = (safePage - 1) * pageSize;
  const slice      = data.slice(startIdx, startIdx + pageSize);

  /** Build page-number array with ellipsis markers ("…") */
  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 2;
    const range = [];
    let prev = 0;
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || i === totalPages ||
        (i >= safePage - delta && i <= safePage + delta)
      ) {
        if (prev && i - prev > 1) range.push("…");
        range.push(i);
        prev = i;
      }
    }
    return range;
  };

  return {
    page: safePage, setPage, pageSize, setPageSize,
    total, totalPages, slice, pageNumbers,
    startDisplay: total === 0 ? 0 : startIdx + 1,
    endDisplay:   Math.min(startIdx + pageSize, total),
  };
}

/**
 * Pagination UI component
 */
export function PaginationBar({ pg, onPageChange, onSizeChange }) {
  const { page, pageSize, total, totalPages, startDisplay, endDisplay, pageNumbers } = pg;

  return (
    <div className="pagination-bar">
      <div className="pagination-info-group">
        <span className="pagination-text">Rows per page:</span>
        <select
          className="page-size-select"
          value={pageSize}
          onChange={(e) => { onSizeChange(Number(e.target.value)); onPageChange(1); }}
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="pagination-text">
          <strong>{startDisplay}–{endDisplay}</strong> of <strong>{total}</strong>
        </span>
      </div>

      <div className="pagination-controls">
        <button
          className="page-btn"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          title="First"
        >«</button>
        <button
          className="page-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          title="Previous"
        >‹</button>

        {pageNumbers().map((n, i) =>
          n === "…" ? (
            <span key={`dots-${i}`} className="page-btn-dots">…</span>
          ) : (
            <button
              key={n}
              className={`page-btn${n === page ? " active" : ""}`}
              onClick={() => onPageChange(n)}
            >{n}</button>
          )
        )}

        <button
          className="page-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          title="Next"
        >›</button>
        <button
          className="page-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          title="Last"
        >»</button>
      </div>
    </div>
  );
}