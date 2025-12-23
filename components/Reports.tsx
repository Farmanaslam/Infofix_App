import React, { useEffect, useRef, useState, useMemo } from "react";
import { Chart, registerables, ChartOptions } from "chart.js";
import { GoogleGenAI, Type } from "@google/genai";
import { useStore } from "../context/StoreContext";
import { supabase } from "../lib/supabaseClient";
import { Ticket, Device } from "../types";
import { SkeletonCard, Skeleton } from "./Skeleton";

Chart.register(...registerables);

const KpiCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center transition-transform hover:-translate-y-1 duration-300">
    <div className={`p-4 rounded-full mr-5 ${color}`}>{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        {title}
      </p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const mapReportTicket = (t: any): Ticket => ({
  id: t.id,
  customerId: t.customer_id,
  customerName: t.customers?.name,
  subject: t.subject,
  status: t.status,
  priority: t.priority,
  assignedTo: t.assigned_to,
  createdAt: t.created_at,
  resolvedAt: t.resolved_at,
  device: t.device as Device,
  store: t.store,
  amountEstimate: t.amount_estimate,
  warranty: t.warranty,
  holdReason: t.hold_reason,
  billNumber: t.bill_number,
  scheduledDate: t.scheduled_date,
  chargerStatus: t.charger_status,
  internalProgressReason: t.internal_progress_reason,
  internalProgressNote: t.internal_progress_note,
});

const Reports: React.FC = () => {
  const { settings, ticketFilters } = useStore();

  const [dateRangeFilter, setDateRangeFilter] = useState("LAST_30_DAYS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Local state for report data to bypass pagination
  const [reportTickets, setReportTickets] = useState<Ticket[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const ticketVolumeChartRef = useRef<HTMLCanvasElement>(null);
  const statusChartRef = useRef<HTMLCanvasElement>(null);
  const agentChartRef = useRef<HTMLCanvasElement>(null);
  const deviceTypeChartRef = useRef<HTMLCanvasElement>(null);
  const priorityChartRef = useRef<HTMLCanvasElement>(null);
  const storeChartRef = useRef<HTMLCanvasElement>(null);

  const [insights, setInsights] = useState<string[] | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Calculate date range values
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    switch (dateRangeFilter) {
      case "TODAY":
        setStartDate(todayStr);
        setEndDate(todayStr);
        break;
      case "LAST_7_DAYS":
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        setStartDate(sevenDaysAgo.toISOString().split("T")[0]);
        setEndDate(todayStr);
        break;
      case "LAST_30_DAYS":
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
        setEndDate(todayStr);
        break;
      case "ALL":
        setStartDate("");
        setEndDate("");
        break;
      case "CUSTOM":
        // Keep manual inputs
        break;
    }
  }, [dateRangeFilter]);

  // Fetch Report Data
  useEffect(() => {
    const fetchReportData = async () => {
      if (!supabase) return;
      setLoadingReports(true);

      try {
        let query = supabase.from("tickets").select("*");

        // 1. Apply Global Ticket Filters (from StoreContext)
        if (ticketFilters.status && ticketFilters.status !== "ALL")
          query = query.eq("status", ticketFilters.status);
        if (ticketFilters.priority && ticketFilters.priority !== "ALL")
          query = query.eq("priority", ticketFilters.priority);
        if (ticketFilters.store && ticketFilters.store !== "ALL")
          query = query.eq("store", ticketFilters.store);

        if (ticketFilters.assignedTo && ticketFilters.assignedTo !== "ALL") {
          if (ticketFilters.assignedTo === "UNASSIGNED")
            query = query.is("assigned_to", null);
          else query = query.eq("assigned_to", ticketFilters.assignedTo);
        }

        if (ticketFilters.deviceType && ticketFilters.deviceType !== "ALL") {
          // Note: contains on JSONB might be slower, but standard for this size
          query = query.contains("device", { type: ticketFilters.deviceType });
        }

        if (ticketFilters.warranty && ticketFilters.warranty !== "ALL")
          query = query.eq("warranty", ticketFilters.warranty);

        // 2. Apply Local Date Range Filters
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          query = query.gte("created_at", start.toISOString());
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query = query.lte("created_at", end.toISOString());
        }

        // Fetch all matching records (up to a reasonable limit for reports)
        // We do NOT paginate here to ensure totals are accurate
        const { data, error } = await query.limit(2000);

        if (error) throw error;
        if (data) {
          setReportTickets(data.map(mapReportTicket));
        }
      } catch (err) {
        console.error("Error fetching report data:", err);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchReportData();
  }, [ticketFilters, startDate, endDate, dateRangeFilter]); // Re-fetch when any filter changes

  if (!settings) return null;

  // Calculate KPIs derived from fetched reportTickets
  const kpis = useMemo(() => {
    const totalTickets = reportTickets.length;
    const resolvedTicketsInPeriod = reportTickets.filter((t) => t.resolvedAt);
    const avgResolutionTimeMs =
      resolvedTicketsInPeriod.length > 0
        ? resolvedTicketsInPeriod.reduce((acc, t) => {
            if (!t.resolvedAt) return acc;
            const created = new Date(t.createdAt).getTime();
            const resolved = new Date(t.resolvedAt).getTime();
            return acc + (resolved - created);
          }, 0) / resolvedTicketsInPeriod.length
        : 0;

    return {
      total: totalTickets,
      open: reportTickets.filter(
        (t) => t.status !== "Resolved" && t.status !== "SERVICE DONE"
      ).length,
      resolved: resolvedTicketsInPeriod.length,
      resolutionRate:
        totalTickets > 0
          ? `${((resolvedTicketsInPeriod.length / totalTickets) * 100).toFixed(
              1
            )}%`
          : "N/A",
      avgResolutionTime: `${(avgResolutionTimeMs / (1000 * 3600 * 24)).toFixed(
        1
      )} days`,
      highPriorityOpen: reportTickets.filter(
        (t) =>
          t.priority.toUpperCase().includes("HIGH") &&
          t.status !== "Resolved" &&
          t.status !== "SERVICE DONE"
      ).length,
    };
  }, [reportTickets]);

  const generateInsights = async () => {
    setIsLoadingInsights(true);
    setInsightsError(null);
    setInsights(null);

    if (
      !process.env.API_KEY ||
      process.env.API_KEY === "your_gemini_api_key_here"
    ) {
      setInsightsError(
        "Gemini API Key is missing or invalid in environment variables."
      );
      setIsLoadingInsights(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const statusCounts = reportTickets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityCounts = reportTickets.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const agentCounts = reportTickets
        .filter((t) => t.resolvedAt)
        .reduce((acc, t) => {
          const agent = t.assignedTo || "Unassigned";
          acc[agent] = (acc[agent] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const dataSummary = {
        timePeriod: `From ${startDate || "Start"} to ${endDate || "Now"}`,
        activeFilters: ticketFilters,
        totalTickets: kpis.total,
        resolvedTickets: kpis.resolved,
        averageResolutionDays: kpis.avgResolutionTime,
        ticketsByStatus: statusCounts,
        ticketsByPriority: priorityCounts,
        ticketsClosedPerAgent: agentCounts,
      };

      const prompt = `You are an expert service management analyst. Based on the following CRM data summary, provide 3-5 strategic, actionable suggestions to improve our service operations. Focus on efficiency, customer satisfaction, and identifying potential bottlenecks. 
            
            Data Summary: ${JSON.stringify(dataSummary, null, 2)}
            
            Return the suggestions as a structured JSON array of strings. Each string should be a complete, well-formatted sentence. Use **Markdown** formatting (like bolding key metrics or terms) within the strings to enhance readability.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
            },
          },
        },
      });

      const resultJson = JSON.parse(response.text || "{}");

      if (resultJson && Array.isArray(resultJson.suggestions)) {
        setInsights(resultJson.suggestions);
      } else {
        setInsightsError("Could not generate insights from the data.");
      }
    } catch (error: any) {
      console.error("Error generating insights:", error);
      setInsightsError(
        `An error occurred while generating insights: ${error.message}`
      );
    } finally {
      setIsLoadingInsights(false);
    }
  };

  useEffect(() => {
    const chartInstances: Chart[] = [];
    const chartRefs = [
      ticketVolumeChartRef,
      statusChartRef,
      agentChartRef,
      deviceTypeChartRef,
      priorityChartRef,
      storeChartRef,
    ];

    chartRefs.forEach((ref) => {
      if (ref.current) {
        const chartInstance = Chart.getChart(ref.current);
        if (chartInstance) chartInstance.destroy();
      }
    });

    if (reportTickets.length === 0) return;

    // --- Shared Chart Options ---
    const commonOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            padding: 20,
            font: { size: 12 },
            color: "#4B5563",
          },
        },
        title: {
          display: true,
          font: { size: 16, weight: "bold" },
          padding: { bottom: 25 },
          color: "#111827",
          align: "start",
        },
      },
      layout: { padding: 10 },
    };

    // 1. Ticket Volume vs Resolved (Line Chart)
    if (ticketVolumeChartRef.current) {
      const dateMap = new Map<string, { created: number; resolved: number }>();

      // Use fetched data range or default to last 30 days for axis generation
      const sDate = startDate
        ? new Date(startDate)
        : new Date(new Date().setDate(new Date().getDate() - 30));
      const eDate = endDate ? new Date(endDate) : new Date();

      if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
        for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
          dateMap.set(d.toISOString().split("T")[0], {
            created: 0,
            resolved: 0,
          });
        }
      }

      reportTickets.forEach((t) => {
        const createdDate = t.createdAt.split("T")[0];
        if (dateMap.has(createdDate)) dateMap.get(createdDate)!.created++;
        else if (!startDate) {
          // If ALL time, allow dynamic keys
          if (!dateMap.has(createdDate))
            dateMap.set(createdDate, { created: 1, resolved: 0 });
          else dateMap.get(createdDate)!.created++;
        }

        if (t.resolvedAt) {
          const resolvedDate = t.resolvedAt.split("T")[0];
          if (dateMap.has(resolvedDate)) dateMap.get(resolvedDate)!.resolved++;
          else if (!startDate) {
            if (!dateMap.has(resolvedDate))
              dateMap.set(resolvedDate, { created: 0, resolved: 1 });
            else dateMap.get(resolvedDate)!.resolved++;
          }
        }
      });

      // Sort by date
      const sortedLabels = Array.from(dateMap.keys()).sort();
      const createdData = sortedLabels.map(
        (label) => dateMap.get(label)!.created
      );
      const resolvedData = sortedLabels.map(
        (label) => dateMap.get(label)!.resolved
      );

      chartInstances.push(
        new Chart(ticketVolumeChartRef.current, {
          type: "line",
          data: {
            labels: sortedLabels.map((d) =>
              new Date(d).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            ),
            datasets: [
              {
                label: "Created",
                data: createdData,
                borderColor: "#3B82F6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                borderWidth: 3,
                tension: 0.4,
                fill: true,
              },
              {
                label: "Resolved",
                data: resolvedData,
                borderColor: "#10B981",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                borderWidth: 3,
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: {
                ...commonOptions.plugins?.title,
                text: "Ticket Volume Trends",
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
              y: {
                grid: { color: "#F3F4F6" },
                border: { display: false },
                ticks: { precision: 0 },
              },
            },
          },
        })
      );
    }

    // 2. Tickets by Status (Doughnut)
    if (statusChartRef.current) {
      const statusCounts = reportTickets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      chartInstances.push(
        new Chart(statusChartRef.current, {
          type: "doughnut",
          data: {
            labels: Object.keys(statusCounts),
            datasets: [
              {
                data: Object.values(statusCounts),
                backgroundColor: [
                  "#3B82F6",
                  "#F59E0B",
                  "#24b910ff",
                  "#10B981",
                  "#8B5CF6",
                  "#EF4444",
                  "#6B7280",
                ],
                borderWidth: 0,
              },
            ],
          },
          options: {
            ...commonOptions,
            cutout: "70%",
            plugins: {
              ...commonOptions.plugins,
              title: {
                ...commonOptions.plugins?.title,
                text: "Status Distribution",
              },
              legend: { position: "right" },
            },
          } as ChartOptions<"doughnut">,
        })
      );
    }

    // 3. Tickets Closed Per Agent (Bar)
    if (agentChartRef.current) {
      const agentCounts = reportTickets
        .filter((t) => t.resolvedAt)
        .reduce((acc, t) => {
          const agent = t.assignedTo || "Unassigned";
          acc[agent] = (acc[agent] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      chartInstances.push(
        new Chart(agentChartRef.current, {
          type: "bar",
          data: {
            labels: Object.keys(agentCounts),
            datasets: [
              {
                label: "Tickets Closed",
                data: Object.values(agentCounts),
                backgroundColor: "rgba(16, 185, 129, 0.7)",
                borderRadius: 6,
              },
            ],
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: {
                ...commonOptions.plugins?.title,
                text: "Performance by Agent",
              },
              legend: { display: false },
            },
            scales: {
              x: { grid: { display: false } },
              y: {
                grid: { color: "#F3F4F6" },
                border: { display: false },
                ticks: { precision: 0 },
              },
            },
          },
        })
      );
    }

    // 4. Tickets by Device Type (Doughnut)
    if (deviceTypeChartRef.current) {
      const deviceCounts = reportTickets.reduce((acc, t) => {
        acc[t.device.type] = (acc[t.device.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      chartInstances.push(
        new Chart(deviceTypeChartRef.current, {
          type: "doughnut",
          data: {
            labels: Object.keys(deviceCounts),
            datasets: [
              {
                data: Object.values(deviceCounts),
                backgroundColor: [
                  "#EC4899",
                  "#3B82F6",
                  "#F59E0B",
                  "#10B981",
                  "#8B5CF6",
                  "#6366F1",
                ],
                borderWidth: 0,
              },
            ],
          },
          options: {
            ...commonOptions,
            cutout: "70%",
            plugins: {
              ...commonOptions.plugins,
              title: {
                ...commonOptions.plugins?.title,
                text: "Device Breakdown",
              },
              legend: { position: "right" },
            },
          } as ChartOptions<"doughnut">,
        })
      );
    }

    // 5. Tickets by Priority (Doughnut)
    if (priorityChartRef.current) {
      const priorityCounts = reportTickets.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const colors = Object.keys(priorityCounts).map((p) => {
        const pUpper = p.toUpperCase();
        if (pUpper.includes("HIGH") || pUpper.includes("URGENT"))
          return "#EF4444";
        if (pUpper.includes("MEDIUM")) return "#F59E0B";
        return "#10B981";
      });

      chartInstances.push(
        new Chart(priorityChartRef.current, {
          type: "doughnut",
          data: {
            labels: Object.keys(priorityCounts),
            datasets: [
              {
                data: Object.values(priorityCounts),
                backgroundColor: colors,
                borderWidth: 0,
              },
            ],
          },
          options: {
            ...commonOptions,
            cutout: "70%",
            plugins: {
              ...commonOptions.plugins,
              title: {
                ...commonOptions.plugins?.title,
                text: "Priority Distribution",
              },
              legend: { position: "right" },
            },
          } as ChartOptions<"doughnut">,
        })
      );
    }

    // 6. Tickets by Store (Bar)
    if (storeChartRef.current) {
      const storeCounts = reportTickets.reduce((acc, t) => {
        acc[t.store] = (acc[t.store] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      chartInstances.push(
        new Chart(storeChartRef.current, {
          type: "bar",
          data: {
            labels: Object.keys(storeCounts),
            datasets: [
              {
                label: "Tickets Created",
                data: Object.values(storeCounts),
                backgroundColor: "rgba(99, 102, 241, 0.7)",
                borderRadius: 6,
              },
            ],
          },
          options: {
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: {
                ...commonOptions.plugins?.title,
                text: "Volume by Store",
              },
              legend: { display: false },
            },
            scales: {
              x: { grid: { display: false } },
              y: {
                grid: { color: "#F3F4F6" },
                border: { display: false },
                ticks: { precision: 0 },
              },
            },
          },
        })
      );
    }

    return () => chartInstances.forEach((chart) => chart.destroy());
  }, [reportTickets, startDate, endDate]);

  const inputStyles =
    "w-full p-2 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm";

  // Build list of active global filters for display
  const activeFilters = [
    ticketFilters.status !== "ALL" && `Status: ${ticketFilters.status}`,
    ticketFilters.priority !== "ALL" && `Priority: ${ticketFilters.priority}`,
    ticketFilters.store !== "ALL" && `Store: ${ticketFilters.store}`,
    ticketFilters.assignedTo !== "ALL" && `Agent: ${ticketFilters.assignedTo}`,
    ticketFilters.deviceType !== "ALL" && `Device: ${ticketFilters.deviceType}`,
    ticketFilters.warranty !== "ALL" && `Warranty: ${ticketFilters.warranty}`,
  ].filter(Boolean);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Reports & Insights
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Analyze service performance using filtered data.
          </p>
        </div>

        {/* Active Filters Indicator */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center bg-blue-50 border border-blue-100 p-2 rounded-lg max-w-full md:max-w-md">
            <span className="text-xs font-bold text-blue-800 uppercase mr-1">
              Active Filters:
            </span>
            {activeFilters.map((f, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-white text-blue-600 text-xs font-semibold rounded border border-blue-200 shadow-sm"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-grow" style={{ minWidth: "200px" }}>
            <label
              htmlFor="date-range-filter"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Report Period
            </label>
            <select
              id="date-range-filter"
              className={inputStyles}
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
            >
              <option value="TODAY">Today</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="ALL">All Time</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>
          {dateRangeFilter === "CUSTOM" && (
            <>
              <div className="flex-grow" style={{ minWidth: "200px" }}>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                  className={inputStyles}
                />
              </div>
              <div className="flex-grow" style={{ minWidth: "200px" }}>
                <label
                  htmlFor="endDate"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className={inputStyles}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {loadingReports ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="h-32 bg-gray-200 animate-pulse rounded-xl"></div>
          <div className="h-32 bg-gray-200 animate-pulse rounded-xl"></div>
          <div className="h-32 bg-gray-200 animate-pulse rounded-xl"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <KpiCard
              title="Total Tickets"
              value={kpis.total}
              color="bg-blue-50 text-blue-600"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              }
            />
            <KpiCard
              title="Open Tickets"
              value={kpis.open}
              color="bg-yellow-50 text-yellow-600"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <KpiCard
              title="Resolved Tickets"
              value={kpis.resolved}
              color="bg-green-50 text-green-600"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <KpiCard
              title="Resolution Rate"
              value={kpis.resolutionRate}
              color="bg-purple-50 text-purple-600"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              }
            />
            <KpiCard
              title="Avg. Resolution Time"
              value={kpis.avgResolutionTime}
              color="bg-indigo-50 text-indigo-600"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <KpiCard
              title="High Priority Open"
              value={kpis.highPriorityOpen}
              color="bg-red-50 text-red-600"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
              <canvas ref={ticketVolumeChartRef} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
              <canvas ref={statusChartRef} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
              <canvas ref={agentChartRef} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
              <canvas ref={priorityChartRef} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
              <canvas ref={storeChartRef} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
              <canvas ref={deviceTypeChartRef} />
            </div>
          </div>
        </>
      )}

      {/* AI Insights Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 shadow-lg text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center">
              <svg
                className="w-8 h-8 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              AI Business Insights
            </h3>
            <p className="text-blue-100 mt-2 max-w-2xl">
              Generate strategic recommendations based on your current filtered
              dataset ({kpis.total} tickets).
            </p>
          </div>
          <button
            onClick={generateInsights}
            disabled={isLoadingInsights || loadingReports}
            className="mt-4 md:mt-0 bg-white text-blue-600 px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-50 transition flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoadingInsights ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Analyzing Data...
              </>
            ) : (
              "Generate Pro Report"
            )}
          </button>
        </div>

        {insightsError && (
          <div className="bg-red-500/20 border border-red-400/30 p-4 rounded-lg text-white mb-4">
            <p className="font-bold flex items-center">
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
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              {insightsError}
            </p>
          </div>
        )}

        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm p-5 rounded-xl border border-white/10 hover:bg-white/20 transition"
              >
                <div className="flex items-start">
                  <span className="bg-white/20 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                    {index + 1}
                  </span>
                  <p
                    className="text-lg leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: insight.replace(
                        /\*\*(.*?)\*\*/g,
                        "<strong>$1</strong>"
                      ),
                    }}
                  ></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
