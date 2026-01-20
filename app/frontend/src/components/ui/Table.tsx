import { useState, useEffect } from "react";
import Searchbar from "./SearchBar";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";

interface Column {
    key: string;
    label: string;
    width?: string;
    textAlign?: React.CSSProperties['textAlign'];
    render?: (row: any) => React.ReactNode;
}

interface TableData {
    [key: string]: string | number | null | undefined;
}

interface UniversalTableProps {
    columns: Column[];
    data: TableData[];
    loading?: boolean;
    emptyMessage?: string;
}

function UniversalTable({ columns, data, loading = false, emptyMessage = "No data available" }: UniversalTableProps) {
    const [sortedData, setSortedData] = useState(data);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState("asc");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 20;

    useEffect(() => {
        setSortedData(data);
    }, [data]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortOrder("asc");
        }

        const sortedData = [...data].sort((a, b) => {
            const aValue = a[column];
            const bValue = b[column];

            // Handle null/undefined values
            if (aValue == null) return 1;
            if (bValue == null) return -1;

            if (typeof aValue === "string" && typeof bValue === "string") {
                return aValue.localeCompare(bValue, undefined, { sensitivity: "base" });
            } else if (typeof aValue === "number" && typeof bValue === "number") {
                return aValue - bValue;
            } else {
                return 0;
            }
        });

        if (sortOrder === "desc") {
            sortedData.reverse();
        }

        setSortedData(sortedData);
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);

        const filteredData = data.filter((row) => {
            const searchValue = event.target.value.toLowerCase();
            return Object.values(row).some(
                (value) =>
                    typeof value === "string" && value.toLowerCase().includes(searchValue)
            );
        });

        setSortedData(filteredData);
        setCurrentPage(1); // Reset to the first page after a search
    };

    const handleNextPage = () => {
        if (currentPage < Math.ceil(sortedData.length / recordsPerPage)) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handlePageClick = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const paginatedData = sortedData.slice(
        (currentPage - 1) * recordsPerPage,
        currentPage * recordsPerPage
    );

    const totalPages = Math.ceil(sortedData.length / recordsPerPage);
    const pageNumbers = [];

    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    /** ========== EXPORT FUNCTIONS ========== **/
    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(sortedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "TableData");
        XLSX.writeFile(workbook, "table-data.xlsx");
    };

    const exportToCSV = () => {
        const header = columns.map((col) => col.label).join(",") + "\n";
        const rows = sortedData
            .map((row) => columns.map((col) => row[col.key]).join(","))
            .join("\n");
        const csv = header + rows;

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "table-data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        const tableColumn = columns.map((col) => col.label);
        const tableRows = sortedData.map((row) =>
            columns.map((col) => {
                const value = row[col.key];
                if (value === null || value === undefined) return ""; // ensure valid type
                return String(value); // force everything into a string for safety
            })
        );

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
        });

        doc.save("table-data.pdf");
    };

    return (
        <div className="w-full space-y-6">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30"></div>
                <div className="relative p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-1.5 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-xl">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-md font-bold text-gray-900">Data Table</h3>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-2 mb-6">
                        <p className="text-sm font-medium text-blue-800">
                            💡 <strong>Tip:</strong>{" "}
                            <span className="text-blue-700">
                                Click on any column header to sort in{" "}
                                <strong>ascending</strong> and <strong>descending</strong> order.
                                Default is unsorted.
                            </span>
                        </p>
                    </div>

                    {/* Search + Export Buttons */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                        <div className="w-full lg:w-auto text-sm">
                            <Searchbar
                                type={"text"}
                                placeholder={"Search by keyword"}
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={exportToExcel}
                                className="group flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Excel
                            </button>
                            <button
                                onClick={exportToCSV}
                                className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                CSV
                            </button>
                            <button
                                onClick={exportToPDF}
                                className="group flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                PDF
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200/50 relative min-h-[200px]">
                        {loading && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                            </div>
                        )}
                        <table className="min-w-full divide-y divide-gray-200/50">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                                <tr>
                                    {columns.map((column, index) => (
                                        <th
                                            key={index}
                                            onClick={() => handleSort(column.key)}
                                            style={{ width: column.width, textAlign: column.textAlign }}
                                            className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-2">
                                                {column.label}
                                                {sortColumn === column.key && (
                                                    <span className="text-blue-600 group-hover:scale-110 transition-transform duration-200">
                                                        {sortOrder === "asc" ? "▲" : "▼"}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-gray-200/50">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((row, index) => (
                                        <tr key={index} className="hover:bg-blue-50/50 transition-all duration-200 group">
                                            {columns.map((column, colIndex) => (
                                                <td
                                                    key={colIndex}
                                                    className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 group-hover:text-gray-700"
                                                >
                                                    {column.render ? column.render(row) : row[column.key]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                                            {emptyMessage}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 border-t border-gray-200/50 py-6">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className={`group flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl transition-all duration-200 ${currentPage === 1
                                ? "text-gray-400 cursor-not-allowed bg-gray-100/50"
                                : "text-gray-700 hover:bg-blue-50 border border-gray-300/50 hover:border-blue-300/50 hover:text-blue-700"
                                }`}
                        >
                            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                        </button>

                        <div className="flex gap-2">
                            {pageNumbers.map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    onClick={() => handlePageClick(pageNumber)}
                                    className={`px-2 py-1 text-xs font-medium rounded-xl transition-all duration-200 ${pageNumber === currentPage
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                                        : "text-gray-700 hover:bg-blue-50 border border-gray-300/50 hover:border-blue-300/50 hover:text-blue-700"
                                        }`}
                                >
                                    {pageNumber}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className={`group flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl transition-all duration-200 ${currentPage === totalPages
                                ? "text-gray-400 cursor-not-allowed bg-gray-100/50"
                                : "text-gray-700 hover:bg-blue-50 border border-gray-300/50 hover:border-blue-300/50 hover:text-blue-700"
                                }`}
                        >
                            Next
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UniversalTable;
