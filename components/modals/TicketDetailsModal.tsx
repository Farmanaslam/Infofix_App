import React, { useState, useMemo } from "react";
import {
  Customer,
  Ticket,
  AppSettings,
  TicketStatus,
  AuditLogEntry,
} from "../../types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useStore } from "../../context/StoreContext";
import toast from "react-hot-toast";

interface TicketDetailsModalProps {
  ticket: Ticket;
  customer: Customer | undefined;
  settings: AppSettings;
  auditLog: AuditLogEntry[];
  onSave: (updatedTicket: Ticket, transferNote?: string) => Promise<boolean>;
  onClose: () => void;
}

const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  ticket,
  customer,
  settings,
  onSave,
  onClose,
  auditLog,
}) => {
  const { currentUser } = useStore();

  // Permission Checks
  const isTeamMember = currentUser?.type === "team";
  const canEditRestrictedFields =
    isTeamMember &&
    (currentUser.role === "ADMIN" || currentUser.role === "MANAGEMENT");

  const [formData, setFormData] = useState<Ticket>(ticket);
  const [transferNote, setTransferNote] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");

  const history = useMemo(() => {
    return auditLog
      .filter((l) => l.entityId === ticket.id)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [auditLog, ticket.id]);

  // Check if store has changed to trigger mandatory note
  const hasStoreChanged = formData.store !== ticket.store;

  const handleSave = async () => {
    if (hasStoreChanged && !transferNote.trim()) {
      toast.error("A Transfer Note is required when changing the Store.");
      return;
    }

    const success = await onSave(
      formData,
      hasStoreChanged ? transferNote : undefined
    );
    if (success) onClose();
  };

  const downloadHistoryPdf = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(`Ticket History: ${ticket.id}`, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Subject: ${ticket.subject}`, 14, 30);
    doc.text(
      `Customer: ${customer?.name || "Unknown"} (${customer?.phone || "N/A"})`,
      14,
      35
    );

    // Include Brand Service in device details string
    const brandInfo = ticket.device.brand || ticket.device.brandService || "";
    doc.text(
      `Device: ${ticket.device.type} ${brandInfo} ${ticket.device.model || ""}`,
      14,
      40
    );
    doc.text(`Status: ${ticket.status} | Priority: ${ticket.priority}`, 14, 45);

    // Prepare table data
    const tableColumn = ["Date/Time", "User", "Action", "Details"];
    const tableRows = history.map((log) => [
      new Date(log.timestamp).toLocaleString(),
      log.user,
      log.action,
      log.details,
    ]);

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] }, // Blue-600
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: "auto" },
      },
    });

    doc.save(`Ticket_History_${ticket.id}.pdf`);
  };

  const inputClasses =
    "w-full p-2 border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500";
  const disabledInputClasses =
    "w-full p-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed";

  // Helper to check for hold status robustly (handling case and whitespace)
  const isHoldStatus = (status: string) =>
    status.trim().toUpperCase() === "HOLD";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40 p-4">
      <div className="bg-white p-0 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-black">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold">Ticket {ticket.id}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="flex border-b bg-white">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-6 py-3 font-medium text-sm capitalize ${
              activeTab === "details"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 font-medium text-sm capitalize ${
              activeTab === "history"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject
                  </label>
                  <input
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as TicketStatus;
                      setFormData((prev) => ({
                        ...prev,
                        status: newStatus,
                        // Clear hold reason if moving away from HOLD
                        holdReason: isHoldStatus(newStatus)
                          ? prev.holdReason
                          : undefined,
                      }));
                    }}
                    className={inputClasses}
                  >
                    {settings.statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {isHoldStatus(formData.status) && (
                  <div className="animate-fade-in bg-orange-50 p-3 rounded-md border border-orange-200 md:col-span-2">
                    <label className="block text-sm font-bold mb-1 text-orange-800">
                      Hold Reason <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.holdReason || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            holdReason: e.target.value,
                          })
                        }
                        className={`${inputClasses} border-orange-300 text-orange-900 focus:ring-orange-500`}
                        required={isHoldStatus(formData.status)}
                      >
                        <option value="">-- Select Reason --</option>
                        {settings.holdReasons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    {settings.holdReasons.length === 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        No hold reasons configured. Go to Settings to add them.
                      </p>
                    )}
                  </div>
                )}

                {/* Rejection Reason */}
                {formData.status === "Rejected" && (
                  <div className="animate-fade-in bg-red-50 p-3 rounded-md border border-red-200 md:col-span-2">
                    <label className="block text-sm font-bold mb-1 text-red-800">
                      Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.rejectionReason || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rejectionReason: e.target.value,
                        })
                      }
                      placeholder="Enter reason for rejection..."
                      className="w-full p-2 border border-red-300 rounded text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      rows={3}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className={inputClasses}
                  >
                    {settings.priorities.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Assigned To
                  </label>
                  <select
                    value={formData.assignedTo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedTo: e.target.value })
                    }
                    className={
                      canEditRestrictedFields
                        ? inputClasses
                        : disabledInputClasses
                    }
                    disabled={!canEditRestrictedFields}
                    title={
                      !canEditRestrictedFields
                        ? "Only Admin and Management can change assignment"
                        : "Assign to team member"
                    }
                  >
                    <option value="">Unassigned</option>
                    {settings.teamMembers.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Store
                  </label>
                  <select
                    value={formData.store}
                    onChange={(e) =>
                      setFormData({ ...formData, store: e.target.value })
                    }
                    className={
                      canEditRestrictedFields
                        ? inputClasses
                        : disabledInputClasses
                    }
                    disabled={!canEditRestrictedFields}
                    title={
                      !canEditRestrictedFields
                        ? "Only Admin and Management can change store"
                        : "Select Store"
                    }
                  >
                    {settings.stores.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Total Estimate
                  </label>
                  <input
                    type="number"
                    value={formData.amountEstimate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amountEstimate: parseFloat(e.target.value),
                      })
                    }
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Scheduled Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.scheduledDate || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheduledDate: e.target.value,
                      })
                    }
                    className={inputClasses}
                  />
                </div>
              </div>

              {hasStoreChanged && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md animate-fade-in">
                  <label className="block text-sm font-bold text-yellow-800 mb-1">
                    Transfer Note (Required)
                  </label>
                  <textarea
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="Please explain why this ticket is being moved to a different store..."
                    className="w-full p-2 border border-yellow-300 rounded text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="flex flex-col h-full">
              <div className="flex justify-end mb-4">
                <button
                  onClick={downloadHistoryPdf}
                  className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-md hover:bg-blue-100 transition-colors font-medium text-sm border border-blue-200"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  Download History PDF
                </button>
              </div>
              <ul className="space-y-4">
                {history.map((log) => {
                  // Highlight Transfer Notes
                  const transferNotePrefix = "Transfer Note:";
                  const hasTransferNote =
                    log.details.includes(transferNotePrefix);
                  let content;

                  if (hasTransferNote) {
                    const parts = log.details.split(transferNotePrefix);
                    content = (
                      <>
                        <span>{parts[0]}</span>
                        <div className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900 rounded-r-md">
                          <span className="font-bold text-yellow-700 text-xs uppercase tracking-wide block mb-1">
                            Transfer Note
                          </span>
                          {parts[1]}
                        </div>
                      </>
                    );
                  } else {
                    content = log.details;
                  }

                  return (
                    <li
                      key={log.id}
                      className="text-sm border-l-2 border-gray-300 pl-4"
                    >
                      <p className="font-bold">
                        {log.user}{" "}
                        <span className="font-normal text-gray-500 text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </p>
                      <div className="text-gray-700 mt-1">{content}</div>
                    </li>
                  );
                })}
                {history.length === 0 && (
                  <p className="text-gray-500 italic">
                    No history available for this ticket.
                  </p>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border rounded text-black hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsModal;
