import React, { useState } from "react";
import { Ticket, TicketStatus } from "../types";
import NewTicketModal from "./modals/NewTicketModal";
import CustomerDetailsModal from "./modals/CustomerDetailsModal";
import TicketDetailsModal from "./modals/TicketDetailsModal";
import ConfirmationModal from "./modals/ConfirmationModal";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";
import { useStore } from "../context/StoreContext";
import { SkeletonList, SkeletonTable } from "./Skeleton";

// Simple Pagination Component
const Pagination: React.FC<{
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, pageSize, totalCount, onPageChange }) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() =>
            onPageChange(Math.min(totalPages - 1, currentPage + 1))
          }
          disabled={currentPage >= totalPages - 1}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">
              {Math.min(currentPage * pageSize + 1, totalCount)}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min((currentPage + 1) * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-medium">{totalCount}</span> results
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            <button
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Previous</span>
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
              Page {currentPage + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() =>
                onPageChange(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Next</span>
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

const getErrorMessage = (error: any): string => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.error_description) return error.error_description;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unexpected error occurred";
  }
};

const Tickets: React.FC = () => {
  const {
    tickets,
    ticketsCount,
    setTickets,
    customers,
    settings,
    auditLog,
    setAuditLog,
    currentUser,
    addAuditLog,
    ticketPage,
    setTicketPage,
    ticketPageSize,
    ticketFilters,
    setTicketFilters,
    ticketsLoading,
  } = useStore();

  if (!settings) return null;

  const [isNewTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isTicketDetailsModalOpen, setTicketDetailsModalOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const canDelete =
    currentUser?.type === "team" && currentUser.role === "ADMIN";

  // Helper to update filters state in Context
  const handleFilterChange = (key: string, value: string) => {
    setTicketFilters((prev) => ({ ...prev, [key]: value }));
    setTicketPage(0); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setTicketFilters({
      status: "ALL",
      priority: "ALL",
      store: "ALL",
      assignedTo: "ALL",
      dateRange: "ALL",
      search: "",
      startDate: "",
      endDate: "",
      deviceType: "ALL",
      warranty: "ALL",
      sortBy: "NEWEST",
    });
    setTicketPage(0);
    toast.success("Filters cleared");
  };

  const applyMyTicketsFilter = () => {
    if (currentUser && currentUser.type === "team") {
      // Toggle logic: if already filtering by me, clear it.
      if (ticketFilters.assignedTo === currentUser.name) {
        handleFilterChange("assignedTo", "ALL");
      } else {
        handleFilterChange("assignedTo", currentUser.name);
        toast.success("Showing tickets assigned to you.");
      }
    }
  };

  // Calculate active filters count
  const activeFiltersCount = [
    ticketFilters.status !== "ALL",
    ticketFilters.priority !== "ALL",
    ticketFilters.store !== "ALL",
    ticketFilters.assignedTo !== "ALL" &&
      ticketFilters.assignedTo !== currentUser?.name, // Don't count My Tickets toggle here
    ticketFilters.deviceType !== "ALL",
    ticketFilters.warranty !== "ALL",
    ticketFilters.dateRange !== "ALL",
  ].filter(Boolean).length;

  const isMyTicketsActive =
    currentUser?.type === "team" &&
    ticketFilters.assignedTo === currentUser.name;

  const handleUpdateTicket = async (
    updatedTicket: Ticket,
    transferNote?: string
  ): Promise<boolean> => {
    if (!supabase) return false;

    const originalTickets = tickets;
    const oldTicket = tickets.find((t) => t.id === updatedTicket.id);

    // Calculate resolvedAt change immediately for optimistic UI update
    let newResolvedAt = updatedTicket.resolvedAt;
    if (
      updatedTicket.status === "Resolved" &&
      oldTicket?.status !== "Resolved"
    ) {
      newResolvedAt = new Date().toISOString();
    }

    const optimisticTicket = { ...updatedTicket, resolvedAt: newResolvedAt };

    // Optimistic update
    setTickets((current) =>
      current.map((t) => (t.id === updatedTicket.id ? optimisticTicket : t))
    );
    setSelectedTicket(optimisticTicket);

    const changes = [];
    if (oldTicket) {
      if (oldTicket.status !== updatedTicket.status)
        changes.push(`status to ${updatedTicket.status}`);
      if (oldTicket.priority !== updatedTicket.priority)
        changes.push(`priority to ${updatedTicket.priority}`);
      if (oldTicket.assignedTo !== updatedTicket.assignedTo)
        changes.push(
          `assignment to ${updatedTicket.assignedTo || "Unassigned"}`
        );
      if (oldTicket.store !== updatedTicket.store)
        changes.push(`store to ${updatedTicket.store}`);
      if (oldTicket.amountEstimate !== updatedTicket.amountEstimate)
        changes.push(`estimate to ${updatedTicket.amountEstimate}`);
    }

    const updatePayload: any = {
      status: updatedTicket.status,
      priority: updatedTicket.priority,
      assigned_to: updatedTicket.assignedTo ?? null,
      subject: updatedTicket.subject,
      device: updatedTicket.device,
      store: updatedTicket.store,
      amount_estimate: updatedTicket.amountEstimate,
      warranty: updatedTicket.warranty,
      bill_number: updatedTicket.billNumber ?? null,
      hold_reason: updatedTicket.holdReason ?? null,
      scheduled_date: updatedTicket.scheduledDate ?? null,
      charger_status: updatedTicket.chargerStatus ?? null,
    };

    if (
      updatedTicket.status === "Resolved" &&
      oldTicket?.status !== "Resolved"
    ) {
      updatePayload.resolved_at = newResolvedAt;
      changes.push("marked as Resolved");
    }

    const { error } = await (supabase.from("tickets") as any)
      .update(updatePayload)
      .eq("id", updatedTicket.id);

    if (error) {
      console.error("Failed to update ticket:", error);
      toast.error(`Database Error: ${getErrorMessage(error)}`);
      setTickets(originalTickets);
      return false;
    } else {
      toast.success("Ticket updated successfully");
      if (changes.length > 0) {
        let details = `Ticket updated: changed ${changes.join(", ")}.`;
        if (transferNote) {
          details += ` Transfer Note: ${transferNote}`;
        }
        addAuditLog({
          entityId: updatedTicket.id,
          entityType: "TICKET",
          action: "UPDATE",
          details: details,
        });
      }
      return true;
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete || !supabase) return;

    const originalTickets = tickets;
    setTickets((current) => current.filter((t) => t.id !== ticketToDelete.id));
    setTicketToDelete(null);

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketToDelete.id);

    if (error) {
      console.error("Failed to delete ticket:", error);
      toast.error(`Database Error: ${getErrorMessage(error)}`);
      setTickets(originalTickets);
    } else {
      toast.success("Ticket deleted successfully");
      addAuditLog({
        entityId: ticketToDelete.id,
        entityType: "TICKET",
        action: "DELETE",
        details: `Ticket ${ticketToDelete.id} deleted.`,
      });
    }
  };

  const openTicketDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketDetailsModalOpen(true);
  };

  const openCustomerDetails = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setCustomerModalOpen(true);
    } else {
      toast.error("Customer details not found in current view.");
    }
  };

  const toggleMobileExpand = (ticketId: string) => {
    setExpandedTicketId((prev) => (prev === ticketId ? null : ticketId));
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("new"))
      return "bg-blue-100 text-blue-800 border border-blue-200";
    if (s.includes("open"))
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    if (s.includes("progress"))
      return "bg-indigo-100 text-indigo-800 border border-indigo-200";
    if (s.includes("hold"))
      return "bg-gray-200 text-gray-800 border border-gray-300";
    if (s.includes("resolved"))
      return "bg-green-100 text-green-800 border border-green-200";
    if (s.includes("rejected"))
      return "bg-red-100 text-red-800 border border-red-200";
    return "bg-gray-50 text-gray-600 border border-gray-200";
  };

  const getPriorityBadgeClass = (priority: string) => {
    const p = priority.toUpperCase();
    if (p.includes("HIGH") || p.includes("URGENT"))
      return "bg-red-50 text-red-700 border border-red-100";
    if (p.includes("MEDIUM"))
      return "bg-orange-50 text-orange-700 border border-orange-100";
    return "bg-green-50 text-green-700 border border-green-100";
  };

  const inputStyles =
    "w-full p-2 border border-gray-300 rounded-md text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow";

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-3xl font-bold text-black">Tickets</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setNewTicketModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center shadow-sm hover:shadow-md transform active:scale-95 duration-200"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            New Ticket
          </button>
        </div>
      </div>

      {/* Refesigned Filtering UI */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden transition-all duration-300">
        {/* Top Toolbar */}
        <div className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between bg-gray-50/50">
          {/* Left: Search */}
          <div className="relative w-full lg:flex-1 lg:max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by ID, Subject, Customer Name, or Serial..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all shadow-sm"
              value={ticketFilters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>

          {/* Right: Controls */}
          <div className="flex w-full lg:w-auto gap-3 items-center justify-end flex-wrap md:flex-nowrap">
            {/* Sort Dropdown */}
            <div className="relative w-40 flex-shrink-0">
              <select
                className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-gray-500 text-sm font-medium cursor-pointer shadow-sm hover:border-gray-400 transition-colors"
                value={ticketFilters.sortBy || "NEWEST"}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>

            {/* My Tickets Toggle */}
            {currentUser?.type === "team" && (
              <button
                onClick={applyMyTicketsFilter}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center border whitespace-nowrap ${
                  isMyTicketsActive
                    ? "bg-blue-100 text-blue-700 border-blue-200 ring-2 ring-blue-500 ring-opacity-20"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <svg
                  className={`w-4 h-4 mr-2 ${
                    isMyTicketsActive ? "text-blue-600" : "text-gray-500"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  ></path>
                </svg>
                My Tickets
              </button>
            )}

            {/* Filter Toggle Button */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center border whitespace-nowrap ${
                filtersExpanded || activeFiltersCount > 0
                  ? "bg-gray-800 text-white border-gray-800 hover:bg-gray-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                ></path>
              </svg>
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
              <svg
                className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                  filtersExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Drawer */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            filtersExpanded
              ? "max-h-[500px] opacity-100 border-t border-gray-200"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-5 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                  Status
                </label>
                <select
                  className={inputStyles}
                  value={ticketFilters.status || "ALL"}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  {settings.statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                  Priority
                </label>
                <select
                  className={inputStyles}
                  value={ticketFilters.priority || "ALL"}
                  onChange={(e) =>
                    handleFilterChange("priority", e.target.value)
                  }
                >
                  <option value="ALL">All Priorities</option>
                  {settings.priorities.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                  Assigned Agent
                </label>
                <select
                  className={inputStyles}
                  value={ticketFilters.assignedTo || "ALL"}
                  onChange={(e) =>
                    handleFilterChange("assignedTo", e.target.value)
                  }
                >
                  <option value="ALL">All Agents</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  {settings.teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                  Store Location
                </label>
                <select
                  className={inputStyles}
                  value={ticketFilters.store || "ALL"}
                  onChange={(e) => handleFilterChange("store", e.target.value)}
                >
                  <option value="ALL">All Stores</option>
                  {settings.stores.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                  Device Type
                </label>
                <select
                  className={inputStyles}
                  value={ticketFilters.deviceType || "ALL"}
                  onChange={(e) =>
                    handleFilterChange("deviceType", e.target.value)
                  }
                >
                  <option value="ALL">All Devices</option>
                  {settings.deviceTypes.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                  Warranty
                </label>
                <select
                  className={inputStyles}
                  value={ticketFilters.warranty || "ALL"}
                  onChange={(e) =>
                    handleFilterChange("warranty", e.target.value)
                  }
                >
                  <option value="ALL">All</option>
                  <option value="YES">Warranty</option>
                  <option value="NO">Non-Warranty</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 pt-4 border-t border-gray-200 mt-2">
              <div className="flex-1 flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-48">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Date Range
                  </label>
                  <select
                    className={inputStyles}
                    value={ticketFilters.dateRange || "ALL"}
                    onChange={(e) =>
                      handleFilterChange("dateRange", e.target.value)
                    }
                  >
                    <option value="ALL">Any Date</option>
                    <option value="TODAY">Today</option>
                    <option value="LAST_7_DAYS">Last 7 Days</option>
                    <option value="LAST_30_DAYS">Last 30 Days</option>
                    <option value="CUSTOM">Custom Range</option>
                  </select>
                </div>
                {ticketFilters.dateRange === "CUSTOM" && (
                  <div className="flex gap-2 items-center w-full md:w-auto bg-white p-1 rounded-md border border-gray-300">
                    <input
                      type="date"
                      className="p-1 text-sm focus:outline-none"
                      value={ticketFilters.startDate || ""}
                      onChange={(e) =>
                        handleFilterChange("startDate", e.target.value)
                      }
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="date"
                      className="p-1 text-sm focus:outline-none"
                      value={ticketFilters.endDate || ""}
                      onChange={(e) =>
                        handleFilterChange("endDate", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors text-sm font-medium flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                  Reset All Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {ticketsLoading ? (
          <SkeletonList count={5} />
        ) : (
          <>
            {tickets.map((ticket) => {

              const isExpanded = expandedTicketId === ticket.id;
              const customerDisplayName =
                ticket.customerName ||
                customers.find((c) => c.id === ticket.customerId)?.name ||
                ticket.customerId;
              return (
                <div
                  key={ticket.id}
                  onClick={() => toggleMobileExpand(ticket.id)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-blue-600 font-bold text-sm">
                      {ticket.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(
                        ticket.status
                      )}`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <div className="mb-2">
                    <h3 className="font-bold text-gray-900 leading-tight">
                      {ticket.subject}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Customer: {customerDisplayName}
                    </p>
                  </div>

                  {!isExpanded && (
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                      <span>{ticket.device?.type}</span>
                      <span>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-gray-100 animate-fade-in">
                      <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700 mb-4">
                        <div>
                          <span className="text-gray-500 text-xs block">
                            Priority
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs ${getPriorityBadgeClass(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">
                            Device
                          </span>{" "}
                          {ticket.device?.type}
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">
                            Created
                          </span>{" "}
                          {new Date(ticket.createdAt).toLocaleDateString(
                            "en-GB"
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">
                            Store
                          </span>{" "}
                          {ticket.store}
                        </div>
                        {ticket.resolvedAt && (
                          <div>
                            <span className="text-gray-500 text-xs block">
                              Resolved
                            </span>{" "}
                            {new Date(ticket.resolvedAt).toLocaleDateString()}
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-gray-500 text-xs block">
                            Assigned To
                          </span>{" "}
                          {ticket.assignedTo || "Unassigned"}
                        </div>
                      </div>

                      <div className="flex space-x-3 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTicketDetails(ticket);
                          }}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
                        >
                          View Full Details
                        </button>
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTicketToDelete(ticket);
                            }}
                            className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.143A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.857L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              ></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center mt-2 text-gray-300">
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </div>
                </div>
              );
            })}
            {tickets.length === 0 && (
              <div className="p-8 text-center text-gray-500 italic bg-gray-50 rounded-lg">
                No tickets found.
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {ticketsLoading ? (
          <SkeletonTable
            rows={10}
            columnWidths={[
              "w-16",
              "w-48",
              "w-32",
              "w-24",
              "w-24",
              "w-32",
              "w-32",
              "w-16",
            ]}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4 border-b border-gray-200">ID</th>
                  <th className="p-4 border-b border-gray-200">Subject</th>
                  <th className="p-4 border-b border-gray-200">Customer</th>
                  <th className="p-4 border-b border-gray-200">Status</th>
                  <th className="p-4 border-b border-gray-200">Priority</th>
                  <th className="p-4 border-b border-gray-200">Date</th>
                  <th className="p-4 border-b border-gray-200">Store</th>
                  <th className="p-4 border-b border-gray-200 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {tickets.map((ticket) => {
                  const customerDisplayName =
                    ticket.customerName ||
                    customers.find((c) => c.id === ticket.customerId)?.name ||
                    ticket.customerId;
                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="p-4">
                        <button
                          onClick={() => openTicketDetails(ticket)}
                          className="font-mono text-blue-600 hover:text-blue-800 hover:underline font-bold"
                          title="View Timeline & Details"
                        >
                          {ticket.id}
                        </button>
                      </td>
                      <td className="p-4 font-medium text-gray-900">
                        {ticket.subject}
                        <div className="text-xs text-gray-500 mt-1">
                          {ticket.device?.type}{" "}
                          {ticket.device?.model
                            ? `- ${ticket.device.model}`
                            : ""}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => openCustomerDetails(ticket.customerId)}
                          className="text-blue-600 hover:underline"
                        >
                          {customerDisplayName}
                        </button>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                            ticket.status
                          )}`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${getPriorityBadgeClass(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 whitespace-nowrap">
                        <div
                          title={`Created: ${new Date(
                            ticket.createdAt
                          ).toLocaleDateString("en-GB")}`}
                        >
                          {new Date(ticket.createdAt).toLocaleDateString(
                            "en-GB"
                          )}
                          <div className="text-xs text-gray-400">
                            {new Date(ticket.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        {ticket.resolvedAt &&
                          (ticket.status === "Resolved" ||
                            ticket.status === "SERVICE DONE") && (
                            <div
                              className="text-xs text-green-600 mt-1 font-medium"
                              title={`Resolved: ${new Date(
                                ticket.resolvedAt
                              ).toLocaleString()}`}
                            >
                              Res:{" "}
                              {new Date(ticket.resolvedAt).toLocaleDateString(
                                "en-GB"
                              )}
                            </div>
                          )}
                      </td>
                      <td className="p-4 text-gray-600">{ticket.store}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() => openTicketDetails(ticket)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition"
                            title="View Details"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              ></path>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              ></path>
                            </svg>
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setTicketToDelete(ticket)}
                              className="p-1 text-gray-400 hover:text-red-600 transition"
                              title="Delete Ticket"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.143A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.857L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                ></path>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tickets.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-gray-500 italic bg-gray-50"
                    >
                      No tickets found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        currentPage={ticketPage}
        pageSize={ticketPageSize}
        totalCount={ticketsCount}
        onPageChange={setTicketPage}
      />

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setNewTicketModalOpen(true)}
        className="md:hidden fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition-all duration-200 z-30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="Create New Ticket"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 4v16m8-8H4"
          ></path>
        </svg>
      </button>

      {isNewTicketModalOpen && (
        <NewTicketModal
          onClose={() => setNewTicketModalOpen(false)}
          customers={customers}
          setCustomers={useStore().setCustomers}
          setTickets={setTickets}
          settings={settings}
          setAuditLog={setAuditLog}
        />
      )}

      {isTicketDetailsModalOpen && selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          customer={customers.find((c) => c.id === selectedTicket.customerId)}
          settings={settings}
          auditLog={auditLog}
          onSave={handleUpdateTicket}
          onClose={() => setTicketDetailsModalOpen(false)}
        />
      )}

      {isCustomerModalOpen && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setCustomerModalOpen(false)}
        />
      )}

      {ticketToDelete && (
        <ConfirmationModal
          message={`Are you sure you want to delete Ticket ${ticketToDelete.id}? This action cannot be undone.`}
          onConfirm={handleDeleteTicket}
          onCancel={() => setTicketToDelete(null)}
        />
      )}
    </div>
  );
};

export default Tickets;
