import React, { useState, useMemo } from "react";
import { Customer, Ticket, TeamMember, Device, Database } from "../types";
import EditProfileModal from "./modals/EditProfileModal";
import TeamMemberDetailsModal from "./modals/TeamMemberDetailsModal";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";
import { useStore } from "../context/StoreContext";

const DeviceDetails: React.FC<{ device: Device }> = ({ device }) => {
  const details = [
    { label: "Type", value: device.type },
    { label: "Brand", value: device.brand },
    { label: "Model", value: device.model },
    { label: "Serial Number", value: device.serialNumber },
    { label: "Brand Service", value: device.brandService },
    { label: "Description", value: device.description },
  ];
  return (
    <div>
      <h4 className="font-semibold text-md text-black mb-2">Device Details</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-white p-3 rounded-lg border">
        {details
          .filter((d) => d.value)
          .map((detail) => (
            <React.Fragment key={detail.label}>
              <span className="font-medium text-gray-600">{detail.label}:</span>
              <span className="text-black">{detail.value}</span>
            </React.Fragment>
          ))}
      </div>
    </div>
  );
};

const TicketProgressTracker: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const stepDefs = [
    {
      status: "NEW",
      title: "Device Received",
      description:
        "We have logged your device into our system and it is awaiting diagnosis.",
    },
    {
      status: "Open",
      title: "Diagnosis in Progress",
      description:
        "A technician is assessing your device to identify the issue.",
    },
    {
      status: "In Progress",
      title: "Repair in Progress",
      description:
        "Our technician is actively working on servicing your device.",
    },
    {
      status: "SERVICE DONE",
      title: "Service Complete",
      description:
        "The service is finished. We are performing final quality checks.",
    },
    {
      status: "Resolved",
      title: "Ready for Collection/Delivery",
      description: "Your device is ready for you. Thank you for choosing us!",
    },
  ];

  const statusOrder = [
    "NEW",
    "Open",
    "In Progress",
    "SERVICE DONE",
    "Resolved",
  ];

  // Map 'Internal Progress' to 'In Progress' so it shows as active on the tracker
  const effectiveStatus =
    ticket.status === "Internal Progress" ? "In Progress" : ticket.status;
  let currentStatusIndex = statusOrder.indexOf(effectiveStatus);

  let displaySteps = [...stepDefs];

  if (ticket.status === "HOLD") {
    currentStatusIndex = 2; // The last completed step is 'In Progress'
    const holdStep = {
      status: "HOLD",
      title: "Service On Hold",
      description:
        ticket.holdReason ||
        "Service is temporarily paused. We will resume as soon as possible.",
    };
    displaySteps.splice(3, 0, holdStep); // Insert HOLD after 'In Progress'
  }

  return (
    <ol className="relative border-l border-gray-300 dark:border-gray-700 ml-3">
      {displaySteps.map((step, index) => {
        const isHoldStep = step.status === "HOLD";
        const isCurrentTicketOnHold = ticket.status === "HOLD";
        let stepState: "completed" | "active" | "pending" | "hold" = "pending";

        if (isCurrentTicketOnHold) {
          if (isHoldStep) stepState = "hold";
          else if (index <= 2) stepState = "completed";
          else stepState = "pending";
        } else {
          if (index < currentStatusIndex) stepState = "completed";
          else if (index === currentStatusIndex) stepState = "active";
          else stepState = "pending";
        }

        const stateStyles = {
          completed: {
            iconBg: "bg-green-500",
            textColor: "text-black",
            lineStyle: "border-gray-300",
          },
          active: {
            iconBg: "bg-blue-500",
            textColor: "text-blue-600 font-bold",
            lineStyle: "border-gray-300",
          },
          hold: {
            iconBg: "bg-yellow-500",
            textColor: "text-yellow-600 font-bold",
            lineStyle: "border-gray-300",
          },
          pending: {
            iconBg: "bg-gray-300",
            textColor: "text-gray-500",
            lineStyle:
              index === 0 ||
              index > currentStatusIndex + (isCurrentTicketOnHold ? 1 : 0)
                ? "border-gray-300"
                : "border-gray-300",
          },
        };

        const currentStyle = stateStyles[stepState];
        const isLastStep = index === displaySteps.length - 1;

        return (
          <li key={step.status} className={`ml-6 ${isLastStep ? "" : "pb-10"}`}>
            <span
              className={`absolute flex items-center justify-center w-6 h-6 ${currentStyle.iconBg} rounded-full -left-3 ring-8 ring-white`}
            >
              {stepState === "completed" && (
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              )}
              {stepState === "active" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              )}
              {stepState === "hold" && (
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm1-4a1 1 0 100 2 1 1 0 000-2z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              )}
            </span>
            <h3 className={`font-semibold ${currentStyle.textColor}`}>
              {step.title}
            </h3>
            <p
              className={`text-sm ${
                stepState === "pending" ? "text-gray-500" : "text-black"
              }`}
            >
              {step.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
};

const Portal: React.FC = () => {
  const {
    currentUser,
    customers,
    tickets,
    setCurrentUser,
    settings,
    logout,
    refreshData,
    isRefreshing,
  } = useStore();
  const customer = currentUser as Customer;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] =
    useState<TeamMember | null>(null);
  const [expandedDoneTicketId, setExpandedDoneTicketId] = useState<
    string | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");

  const teamMemberMap = useMemo(() => {
    if (!settings?.teamMembers) return new Map();
    return new Map(settings.teamMembers.map((m) => [m.name, m]));
  }, [settings?.teamMembers]);

  // Update URL when expanding/collapsing
  const toggleTicketExpansion = (ticketId: string | null) => {
    setExpandedDoneTicketId(ticketId);
  };

  const handleSaveProfile = async (updatedCustomer: Customer) => {
    if (!supabase) return;

    const oldCustomer = customers.find((c) => c.id === updatedCustomer.id);
    if (!oldCustomer) return;

    const customerForDb: Database["public"]["Tables"]["customers"]["Update"] = {
      name: updatedCustomer.name,
      address: updatedCustomer.address,
      email: updatedCustomer.email,
      photo_url: updatedCustomer.photoUrl ?? null,
    };
    const { error } = await (supabase.from("customers") as any)
      .update(customerForDb)
      .eq("id", updatedCustomer.id);

    if (error) {
      console.error("Failed to update profile", error);
      toast.error(`Error: ${error.message}`);
    } else {
      const changes = [];
      if (oldCustomer.name !== updatedCustomer.name)
        changes.push(`name to "${updatedCustomer.name}"`);
      if (oldCustomer.address !== updatedCustomer.address)
        changes.push(`address to "${updatedCustomer.address}"`);
      if (oldCustomer.email !== updatedCustomer.email)
        changes.push(`email to "${updatedCustomer.email}"`);
      if (oldCustomer.photoUrl !== updatedCustomer.photoUrl)
        changes.push(`photo URL`);

      setCurrentUser({ ...updatedCustomer, type: "customer" }); // Update the view immediately

      if (changes.length > 0) {
        const logPayload: Database["public"]["Tables"]["audit_log"]["Insert"] =
          {
            id: `LOG-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            user: updatedCustomer.name, // User updated their own profile
            entity_id: updatedCustomer.id,
            entity_type: "CUSTOMER",
            action: "UPDATE",
            details: `Customer updated their profile: changed ${changes.join(
              " and "
            )}.`,
          };
        const { error: logError } = await (
          supabase.from("audit_log") as any
        ).insert(logPayload);
        if (logError) {
          console.error("Failed to create audit log:", logError);
          toast.error("Profile updated, but failed to save history.");
        }
      }

      setIsEditModalOpen(false);
      toast.success("Profile updated successfully");
    }
  };

  const customerTickets = useMemo(() => {
    if (!customer) return [];

    let userTickets = tickets.filter((t) => t.customerId === customer.id);

    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      userTickets = userTickets.filter(
        (t) =>
          t.id.toLowerCase().includes(lowerTerm) ||
          t.subject.toLowerCase().includes(lowerTerm) ||
          t.status.toLowerCase().includes(lowerTerm) ||
          t.device.type.toLowerCase().includes(lowerTerm) ||
          (t.device.brand &&
            t.device.brand.toLowerCase().includes(lowerTerm)) ||
          (t.device.model && t.device.model.toLowerCase().includes(lowerTerm))
      );
    }

    return userTickets.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [tickets, customer, searchTerm]);

  if (!customer) return null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };
  const greeting = getGreeting();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-black">
          {greeting}, {customer.name.split(" ")[0]}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className={`bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition flex items-center ${
              isRefreshing ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            <svg
              className={`w-5 h-5 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
          <button
            onClick={logout}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md">
          <img
            src={customer.photoUrl || "https://via.placeholder.com/150"}
            alt={`${customer.name}'s profile`}
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/150";
            }}
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
          />
          <h3 className="text-xl font-semibold mb-4 text-black border-b pb-2 text-center">
            {customer.name}
          </h3>
          <div className="space-y-3 text-black">
            <p>
              <strong className="font-medium">Email:</strong> {customer.email}
            </p>
            <p>
              <strong className="font-medium">Phone:</strong> {customer.phone}
            </p>
            <p>
              <strong className="font-medium">Address:</strong>{" "}
              {customer.address}
            </p>
            <p>
              <strong className="font-medium">Member Since:</strong>{" "}
              {new Date(customer.createdAt).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </p>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="mt-6 w-full bg-blue-600 text-white p-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Edit Profile
          </button>
        </div>
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h3 className="text-xl font-semibold text-black">
                Your Service Tickets
              </h3>
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search ID, Issue, Device..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm text-black bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-8">
              {customerTickets.length > 0 ? (
                customerTickets.map((ticket) => {
                  const technician = ticket.assignedTo
                    ? teamMemberMap.get(ticket.assignedTo)
                    : null;
                  const isPending = ticket.status === "Pending Approval";
                  const isServiceDone = ticket.status === "SERVICE DONE";
                  const isRejected = ticket.status.toLowerCase() === "rejected";
                  const isExpanded = ticket.id === expandedDoneTicketId;

                  // Override status display for Internal Progress
                  const displayStatus =
                    ticket.status === "Internal Progress"
                      ? "Repair in Progress"
                      : ticket.status;

                  // If rejected, show a compact card
                  if (isRejected) {
                    return (
                      <div
                        key={ticket.id}
                        className="bg-red-50 p-5 rounded-lg border border-red-200 shadow-sm flex flex-col items-center justify-center text-center"
                      >
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-3">
                          <svg
                            className="h-6 w-6 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <h4 className="text-lg font-bold text-red-800 mb-1">
                          Service Request Rejected
                        </h4>
                        <p className="font-semibold text-black mb-2">
                          {ticket.subject}
                        </p>
                        <p className="text-sm text-gray-500 font-mono mb-3">
                          {ticket.id} &bull;{" "}
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                        <div className="text-sm text-red-700 bg-white p-3 rounded border border-red-100 w-full max-w-md">
                          <strong>Reason:</strong>{" "}
                          {ticket.rejectionReason ||
                            "This request was not accepted."}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={ticket.id}
                      className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-semibold text-lg text-black">
                            {ticket.subject}
                          </p>
                          <p className="text-sm text-gray-500 font-mono">
                            {ticket.id} &bull; Created:{" "}
                            {new Date(ticket.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            isPending
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-blue-200 text-blue-800"
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </div>

                      {isPending ? (
                        <div className="text-center p-6 bg-white rounded-lg border border-dashed">
                          <p className="font-semibold text-black">
                            Request Under Review
                          </p>
                          <p className="text-sm text-gray-600">
                            Your service request is pending approval. Full
                            details and progress tracking will be available here
                            once our team has reviewed and accepted it.
                          </p>
                        </div>
                      ) : (
                        <>
                          {isServiceDone && !isExpanded ? (
                            <div
                              onClick={() => toggleTicketExpansion(ticket.id)}
                              className="text-center p-6 bg-green-50 rounded-lg border border-dashed border-green-300 cursor-pointer hover:bg-green-100 transition-colors"
                            >
                              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                                <svg
                                  className="h-6 w-6 text-green-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <p className="font-semibold text-green-800">
                                Service Complete
                              </p>
                              <p className="text-sm text-green-700">
                                Your device is ready. Click to view full
                                details.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <div className="mb-6">
                                <DeviceDetails device={ticket.device} />
                              </div>

                              <h4 className="font-semibold text-md text-black mb-2">
                                Service Progress
                              </h4>
                              <TicketProgressTracker ticket={ticket} />

                              <div className="mt-6 pt-4 border-t border-gray-200">
                                <h4 className="font-semibold text-md text-black mb-2">
                                  Your Assigned Technician
                                </h4>
                                {technician ? (
                                  <div
                                    className="flex items-center space-x-4 p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() =>
                                      setSelectedTeamMember(technician)
                                    }
                                  >
                                    <img
                                      src={
                                        technician.photoUrl ||
                                        "https://via.placeholder.com/64"
                                      }
                                      alt={technician.name}
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "https://via.placeholder.com/64";
                                      }}
                                      className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div>
                                      <p className="font-bold text-black">
                                        {technician.name}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {technician.details}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-white rounded-lg border text-center">
                                    <p className="text-sm text-gray-500">
                                      A technician will be assigned shortly.
                                    </p>
                                  </div>
                                )}
                              </div>
                              {isServiceDone && isExpanded && (
                                <div className="mt-4 text-center">
                                  <button
                                    onClick={() => toggleTicketExpansion(null)}
                                    className="text-sm font-semibold text-blue-600 hover:underline"
                                  >
                                    Hide Details
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  {searchTerm ? (
                    <>
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-200 mb-3">
                        <svg
                          className="h-6 w-6 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-800 font-medium">
                        No tickets found matching "{searchTerm}"
                      </p>
                      <button
                        onClick={() => setSearchTerm("")}
                        className="mt-2 text-blue-600 hover:underline text-sm"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <p className="text-black">
                      You have no service tickets with us at the moment.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <EditProfileModal
          customer={customer}
          onSave={handleSaveProfile}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {selectedTeamMember && (
        <TeamMemberDetailsModal
          member={selectedTeamMember}
          onClose={() => setSelectedTeamMember(null)}
        />
      )}
    </div>
  );
};

export default Portal;
