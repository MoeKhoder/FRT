import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiChevronUp, FiChevronDown, FiChevronRight, FiChevronLeft } from "react-icons/fi";
import { Input, Select } from "./Primitives";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function DataTable({ columns, data, searchKeys = [], emptyLabel = "لا توجد بيانات" }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    let rows = data;
    if (query.trim() && searchKeys.length) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [data, query, searchKeys, sortKey, sortDir]);

  const effectivePageSize = pageSize === "all" ? Math.max(filtered.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectivePageSize));

  // keep current page valid if pageSize/filter shrinks the result set
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pageRows = filtered.slice((page - 1) * effectivePageSize, page * effectivePageSize);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {searchKeys.length > 0 ? (
          <div className="relative max-w-xs flex-1 min-w-[160px]">
            <FiSearch className="absolute top-1/2 -translate-y-1/2 right-3 text-mist-400" size={16} />
            <Input
              placeholder="بحث..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="pr-9"
            />
          </div>
        ) : (
          <div />
        )}
        <label className="flex items-center gap-2 text-sm text-mist-400 shrink-0">
          عرض
          <Select
            value={pageSize}
            onChange={(e) => {
              const v = e.target.value === "all" ? "all" : Number(e.target.value);
              setPageSize(v);
              setPage(1);
            }}
            className="w-auto py-1.5"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value="all">الكل</option>
          </Select>
          سجل
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-night-700 [body.light_&]:border-mist-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-night-800 text-mist-400 [body.light_&]:bg-mist-100 [body.light_&]:text-night-600">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                  className={`px-4 py-3 text-start font-semibold whitespace-nowrap ${
                    col.sortable !== false ? "cursor-pointer select-none" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key &&
                      (sortDir === "asc" ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-mist-400">
                  {emptyLabel}
                </td>
              </tr>
            )}
            {pageRows.map((row, i) => (
              <tr
                key={row.id || i}
                className="border-t border-night-700 hover:bg-night-700/40 [body.light_&]:border-mist-200 [body.light_&]:hover:bg-mist-100"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-mist-400">
          <span>
            صفحة {page} من {totalPages} — {filtered.length} سجل
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-night-600 disabled:opacity-40 hover:bg-night-700 [body.light_&]:border-mist-300 [body.light_&]:hover:bg-mist-100"
            >
              <FiChevronRight size={16} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-night-600 disabled:opacity-40 hover:bg-night-700 [body.light_&]:border-mist-300 [body.light_&]:hover:bg-mist-100"
            >
              <FiChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
