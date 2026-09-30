import { useMemo, useState } from "react";

const COLORS = {
  gold: "#d6b76a",
  goldLight: "#f4e3b0",
  goldDark: "#9d762d",
  black: "#020305",
  dark: "#070b10",
  panel: "#0c1219",
  panel2: "#111922",
  border: "rgba(243,223,170,.14)",
  text: "#eee9dc",
  muted: "#8d969d",
  green: "#8fcf9b",
  red: "#d98787",
  blue: "#91b8d6",
};

function safeStorageGet(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCustomerName(booking) {
  if (booking?.name && String(booking.name).trim()) {
    return String(booking.name).trim();
  }
  const combined = `${booking?.firstName || ""} ${booking?.surname || ""}`.trim();
  return combined || "Χωρίς όνομα";
}

function getDayName(date) {
  const days = [
    "Κυριακή",
    "Δευτέρα",
    "Τρίτη",
    "Τετάρτη",
    "Πέμπτη",
    "Παρασκευή",
    "Σάββατο",
  ];
  return days[date.getDay()];
}

function getShortDayName(date) {
  const days = ["ΚΥΡ", "ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ"];
  return days[date.getDay()];
}

function getTodayText() {
  const today = new Date();
  return `${getDayName(today)} ${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDisplayDate(date) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function getPrice(booking) {
  return (
    Number(
      String(booking?.price || 0)
        .replace("€", "")
        .replace(",", ".")
        .trim()
    ) || 0
  );
}

function getBookingStatus(booking) {
  const status = normalize(booking?.status || "confirmed");

  if (
    status.includes("cancel") ||
    status.includes("akyro") ||
    status.includes("canceled")
  ) {
    return "cancelled";
  }

  if (
    status.includes("complete") ||
    status.includes("completed") ||
    status.includes("olokl")
  ) {
    return "completed";
  }

  return "confirmed";
}

function getStatusLabel(status) {
  if (status === "cancelled") return "Ακυρωμένο";
  if (status === "completed") return "Ολοκληρωμένο";
  return "Επιβεβαιωμένο";
}

/* =====================================================
   ΕΝΙΣΧΥΜΕΝΟΣ DATE PARSER (Υποστηρίζει ISO και DD/MM/YYYY)
===================================================== */
function getBookingDateKey(booking) {
  const raw = String(booking?.date || "").trim();
  if (!raw) return null;

  // Μορφή YYYY-MM-DD (από App.jsx)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // Μορφή DD/MM/YYYY ή DD-MM-YYYY
  const match = raw.match(
    /^(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?:\s*[\/.-]\s*(\d{2,4}))?$/
  );

  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]) || new Date().getFullYear();

  if (year < 100) year += 2000;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isSameDate(booking, date) {
  return getBookingDateKey(booking) === getDateKey(date);
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Admin() {
  const [activePage, setActivePage] = useState("dashboard");
  const [bookings, setBookings] = useState(() => safeStorageGet("nelaBookings", []));
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [appointmentFilter, setAppointmentFilter] = useState("all");

  const [settings, setSettings] = useState(() =>
    safeStorageGet("nelaBusinessSettings", {
      businessName: "NELA",
      phone: "",
      email: "",
      address: "",
      cancellationPolicy: "Οι ακυρώσεις γίνονται κατόπιν επικοινωνίας.",
    })
  );

  /* =====================================================
     LOGOUT
  ===================================================== */
  function logoutAdmin() {
    localStorage.removeItem("nelaBusinessUser");
    window.location.replace("/");
  }

  function goToSite() {
    window.location.replace("/");
  }

  /* =====================================================
     REFRESH
  ===================================================== */
  function refreshBookings() {
    setBookings(safeStorageGet("nelaBookings", []));
  }

  /* =====================================================
     DELETE BOOKING
  ===================================================== */
  function deleteBooking(id) {
    const confirmed = window.confirm("Θέλετε σίγουρα να διαγράψετε αυτό το ραντεβού;");
    if (!confirmed) return;

    const updated = bookings.filter((booking) => booking.id !== id);
    setBookings(updated);
    safeStorageSet("nelaBookings", updated);
    setSelectedBooking(null);
  }

  /* =====================================================
     EDIT BOOKING
  ===================================================== */
  function editBooking(booking) {
    const newTime = window.prompt("Νέα ώρα:", booking.time || "");
    if (newTime === null) return;

    const newDate = window.prompt("Νέα ημέρα (π.χ. 2026-10-01 ή 01/10/2026):", booking.date || "");
    if (newDate === null) return;

    const updated = bookings.map((item) =>
      item.id === booking.id
        ? {
            ...item,
            time: newTime.trim(),
            date: newDate.trim(),
          }
        : item
    );

    setBookings(updated);
    safeStorageSet("nelaBookings", updated);
    setSelectedBooking(updated.find((item) => item.id === booking.id));
  }

  /* =====================================================
     UPDATE STATUS
  ===================================================== */
  function updateBookingStatus(booking, status) {
    const updated = bookings.map((item) =>
      item.id === booking.id ? { ...item, status } : item
    );

    setBookings(updated);
    safeStorageSet("nelaBookings", updated);
    setSelectedBooking(updated.find((item) => item.id === booking.id));
  }

  /* =====================================================
     BASIC STATS
  ===================================================== */
  const statistics = useMemo(() => {
    const total = bookings.length;
    const activeBookings = bookings.filter(
      (booking) => getBookingStatus(booking) !== "cancelled"
    );

    const revenue = activeBookings.reduce(
      (sum, booking) => sum + getPrice(booking),
      0
    );

    const cancelled = bookings.filter(
      (booking) => getBookingStatus(booking) === "cancelled"
    ).length;

    const completed = bookings.filter(
      (booking) => getBookingStatus(booking) === "completed"
    ).length;

    const confirmed = bookings.filter(
      (booking) => getBookingStatus(booking) === "confirmed"
    ).length;

    const services = {};

    bookings.forEach((booking) => {
      if (getBookingStatus(booking) === "cancelled") return;
      const service = booking.serviceName || booking.service || "Άγνωστη υπηρεσία";
      services[service] = (services[service] || 0) + 1;
    });

    let popularService = "—";
    let highest = 0;

    Object.entries(services).forEach(([service, count]) => {
      if (count > highest) {
        highest = count;
        popularService = service;
      }
    });

    const clients = new Set(
      bookings
        .map((booking) =>
          normalize(booking.phone || booking.email || getCustomerName(booking) || "")
        )
        .filter(Boolean)
    );

    return {
      total,
      revenue,
      cancelled,
      completed,
      confirmed,
      clients: clients.size,
      popularService,
    };
  }, [bookings]);

  /* =====================================================
     CLIENTS
  ===================================================== */
  const clients = useMemo(() => {
    const map = {};

    bookings.forEach((booking) => {
      const name = getCustomerName(booking);
      const key = normalize(
        booking.phone || booking.email || name || `client-${booking.id}`
      );

      if (!map[key]) {
        map[key] = {
          id: key,
          name: name,
          phone: booking.phone || "—",
          email: booking.email || "—",
          bookings: [],
          totalSpent: 0,
          lastVisit: booking.date || "—",
        };
      }

      map[key].bookings.push(booking);

      if (booking.email) map[key].email = booking.email;
      map[key].totalSpent += getPrice(booking);
      if (booking.date) map[key].lastVisit = booking.date;
    });

    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [bookings]);

  /* =====================================================
     DATE DATA
  ===================================================== */
  const today = useMemo(() => new Date(), []);

  const todayBookings = useMemo(
    () => bookings.filter((booking) => isSameDate(booking, today)),
    [bookings, today]
  );

  const selectedDayBookings = useMemo(
    () => bookings.filter((booking) => isSameDate(booking, calendarDate)),
    [bookings, calendarDate]
  );

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((booking) => getBookingStatus(booking) !== "cancelled")
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [bookings]);

  /* =====================================================
     SEARCH
  ===================================================== */
  const filteredBookings = useMemo(() => {
    const query = normalize(search);
    let result = [...bookings];

    if (appointmentFilter !== "all") {
      result = result.filter(
        (booking) => getBookingStatus(booking) === appointmentFilter
      );
    }

    if (!query) return result;

    return result.filter(
      (booking) =>
        normalize(getCustomerName(booking)).includes(query) ||
        normalize(booking.phone).includes(query) ||
        normalize(booking.email).includes(query) ||
        normalize(booking.serviceName || booking.service).includes(query) ||
        normalize(booking.date).includes(query) ||
        normalize(booking.time).includes(query)
    );
  }, [bookings, search, appointmentFilter]);

  /* =====================================================
     ANALYTICS
  ===================================================== */
  const analytics = useMemo(() => {
    const dayCounts = {};
    const hourCounts = {};
    const serviceCounts = {};

    bookings.forEach((booking) => {
      if (getBookingStatus(booking) === "cancelled") return;

      const dateKey = getBookingDateKey(booking);
      if (dateKey) {
        const date = new Date(`${dateKey}T12:00:00`);
        const day = getDayName(date);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }

      const time = String(booking.time || "");
      const hourMatch = time.match(/(\d{1,2})/);

      if (hourMatch) {
        const hour = Number(hourMatch[1]);
        const label = `${String(hour).padStart(2, "0")}:00`;
        hourCounts[label] = (hourCounts[label] || 0) + 1;
      }

      const service = booking.serviceName || booking.service || "Άγνωστη υπηρεσία";
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });

    const busiestDay =
      Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0] || null;

    const busiestHour =
      Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0] || null;

    const popularServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const totalClients = clients.length;
    const returningClients = clients.filter((client) => client.bookings.length > 1).length;
    const newClients = clients.filter((client) => client.bookings.length === 1).length;

    const cancellationRate = bookings.length
      ? ((statistics.cancelled / bookings.length) * 100).toFixed(1)
      : "0.0";

    const averageTicket =
      statistics.completed + statistics.confirmed
        ? (
            statistics.revenue /
            (statistics.completed + statistics.confirmed)
          ).toFixed(2)
        : "0.00";

    return {
      busiestDay,
      busiestHour,
      popularServices,
      totalClients,
      returningClients,
      newClients,
      cancellationRate,
      averageTicket,
      dayCounts,
      hourCounts,
    };
  }, [bookings, clients, statistics]);

  /* =====================================================
     NEXT DAYS
  ===================================================== */
  const daySelector = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      result.push({
        date,
        key: getDateKey(date),
        bookings: bookings.filter((booking) => isSameDate(booking, date)),
      });
    }
    return result;
  }, [bookings]);

  function saveSettings() {
    safeStorageSet("nelaBusinessSettings", settings);
    window.alert("Οι ρυθμίσεις αποθηκεύτηκαν.");
  }

  function goTo(page) {
    setActivePage(page);
    setSearch("");
    setAppointmentFilter("all");
  }

  function changeDay(amount) {
    const next = new Date(calendarDate);
    next.setDate(next.getDate() + amount);
    setCalendarDate(next);
  }

  /* =====================================================
     STYLES
  ===================================================== */
  const styles = {
    page: {
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      background: `
        radial-gradient(circle at 10% 0%, rgba(214,183,106,.13), transparent 28%),
        radial-gradient(circle at 90% 100%, rgba(53,85,110,.14), transparent 32%),
        linear-gradient(135deg, #010203 0%, #071018 45%, #020406 100%)
      `,
      color: COLORS.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: "flex",
    },
    sidebar: {
      width: "250px",
      flexShrink: 0,
      height: "100vh",
      background: "rgba(3,6,10,.94)",
      borderRight: `1px solid ${COLORS.border}`,
      display: "flex",
      flexDirection: "column",
      padding: "24px 18px",
      boxSizing: "border-box",
    },
    brand: {
      display: "flex",
      alignItems: "center",
      gap: "13px",
      padding: "0 8px 24px",
      borderBottom: `1px solid ${COLORS.border}`,
    },
    logo: {
      width: "44px",
      height: "44px",
      borderRadius: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(145deg,#fff4c9,#d6b66a,#916c27)",
      color: "#08090b",
      fontFamily: "Georgia, serif",
      fontSize: "23px",
      fontWeight: "900",
      boxShadow: "0 15px 35px rgba(214,183,106,.16)",
    },
    brandName: {
      color: COLORS.goldLight,
      fontFamily: "Georgia, serif",
      fontSize: "20px",
      letterSpacing: "3px",
    },
    brandSub: {
      marginTop: "3px",
      color: "#6d746f",
      fontSize: "8px",
      letterSpacing: "1.5px",
      fontWeight: "800",
    },
    nav: {
      marginTop: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "5px",
      overflowY: "auto",
    },
    navSection: {
      margin: "12px 10px 4px",
      color: "#4e565d",
      fontSize: "8px",
      fontWeight: "800",
      letterSpacing: "1.5px",
    },
    navButton: {
      width: "100%",
      border: "none",
      outline: "none",
      borderRadius: "12px",
      padding: "10px 12px",
      background: "transparent",
      color: COLORS.muted,
      textAlign: "left",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "700",
      transition: "all .2s ease",
    },
    navActive: {
      background:
        "linear-gradient(135deg,rgba(214,183,106,.18),rgba(214,183,106,.05))",
      color: COLORS.goldLight,
      border: "1px solid rgba(214,183,106,.18)",
      boxShadow: "0 10px 30px rgba(0,0,0,.18)",
    },
    sidebarBottom: {
      marginTop: "auto",
      paddingTop: "14px",
      borderTop: `1px solid ${COLORS.border}`,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    sidebarBtn: {
      width: "100%",
      padding: "10px",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.02)",
      color: COLORS.text,
      fontSize: "11px",
      cursor: "pointer",
      textAlign: "center",
      transition: "all .2s",
    },
    logoutBtn: {
      borderColor: "rgba(217,135,135,0.25)",
      color: COLORS.red,
      background: "rgba(217,135,135,0.05)",
    },
    main: {
      flex: 1,
      minWidth: 0,
      height: "100vh",
      overflowY: "auto",
      padding: "32px 36px 60px",
      boxSizing: "border-box",
    },
    topbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "25px",
    },
    heading: {
      margin: 0,
      color: COLORS.goldLight,
      fontFamily: "Georgia, serif",
      fontSize: "28px",
      fontWeight: "500",
      letterSpacing: "1px",
    },
    headingSub: {
      marginTop: "5px",
      color: COLORS.muted,
      fontSize: "12px",
    },
    topActions: {
      display: "flex",
      gap: "8px",
    },
    smallButton: {
      border: `1px solid ${COLORS.border}`,
      background: "rgba(15,22,29,.75)",
      color: COLORS.goldLight,
      borderRadius: "10px",
      padding: "9px 13px",
      cursor: "pointer",
      fontSize: "11px",
      fontWeight: "700",
    },
    stats: {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: "15px",
      marginBottom: "20px",
    },
    stat: {
      padding: "18px",
      borderRadius: "18px",
      background: "linear-gradient(145deg,rgba(17,26,35,.9),rgba(7,12,17,.9))",
      border: `1px solid ${COLORS.border}`,
      boxShadow: "0 20px 50px rgba(0,0,0,.22)",
    },
    statIcon: {
      fontSize: "18px",
      marginBottom: "8px",
    },
    statLabel: {
      color: "#777f85",
      fontSize: "9px",
      letterSpacing: "1.4px",
      fontWeight: "800",
    },
    statValue: {
      marginTop: "6px",
      color: COLORS.goldLight,
      fontFamily: "Georgia, serif",
      fontSize: "26px",
    },
    statExtra: {
      marginTop: "6px",
      color: "#687278",
      fontSize: "9px",
    },
    panel: {
      background: "linear-gradient(145deg,rgba(14,21,29,.92),rgba(6,10,14,.92))",
      border: `1px solid ${COLORS.border}`,
      borderRadius: "22px",
      boxShadow: "0 25px 70px rgba(0,0,0,.28)",
      overflow: "hidden",
    },
    panelHeader: {
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid ${COLORS.border}`,
    },
    panelTitle: {
      color: COLORS.goldLight,
      fontFamily: "Georgia, serif",
      fontSize: "17px",
    },
    panelSub: {
      color: "#6f787e",
      fontSize: "10px",
      marginTop: "4px",
    },
    search: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      borderRadius: "12px",
      outline: "none",
      border: `1px solid ${COLORS.border}`,
      background: "rgba(2,5,8,.72)",
      color: COLORS.text,
      fontSize: "12px",
    },
    bookingList: {
      display: "flex",
      flexDirection: "column",
    },
    booking: {
      padding: "15px 20px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      borderBottom: `1px solid rgba(243,223,170,.07)`,
    },
    time: {
      width: "65px",
      flexShrink: 0,
      color: COLORS.gold,
      fontFamily: "Georgia, serif",
      fontSize: "17px",
    },
    bookingInfo: {
      flex: 1,
      minWidth: 0,
    },
    bookingName: {
      color: "#eee9dc",
      fontSize: "14px",
      fontWeight: "700",
    },
    bookingMeta: {
      marginTop: "4px",
      color: "#737d84",
      fontSize: "10px",
    },
    price: {
      color: COLORS.goldLight,
      fontSize: "13px",
      fontWeight: "800",
    },
    status: {
      borderRadius: "20px",
      padding: "5px 10px",
      fontSize: "8px",
      fontWeight: "800",
      letterSpacing: ".4px",
    },
    statusConfirmed: {
      color: COLORS.green,
      background: "rgba(143,207,155,.08)",
      border: "1px solid rgba(143,207,155,.16)",
    },
    statusCancelled: {
      color: COLORS.red,
      background: "rgba(217,135,135,.08)",
      border: "1px solid rgba(217,135,135,.16)",
    },
    statusCompleted: {
      color: COLORS.blue,
      background: "rgba(145,184,214,.08)",
      border: "1px solid rgba(145,184,214,.16)",
    },
    bookingActions: {
      display: "flex",
      gap: "6px",
    },
    iconButton: {
      border: `1px solid ${COLORS.border}`,
      background: "rgba(255,255,255,.025)",
      color: COLORS.goldLight,
      borderRadius: "8px",
      width: "32px",
      height: "32px",
      cursor: "pointer",
    },
    empty: {
      padding: "50px 20px",
      textAlign: "center",
      color: "#687177",
      fontSize: "12px",
    },
    dayStrip: {
      display: "flex",
      gap: "8px",
      padding: "16px",
      overflowX: "auto",
      borderBottom: `1px solid ${COLORS.border}`,
    },
    dayCard: {
      minWidth: "85px",
      padding: "12px 10px",
      borderRadius: "14px",
      border: "1px solid rgba(243,223,170,.08)",
      background: "rgba(255,255,255,.025)",
      cursor: "pointer",
      textAlign: "center",
    },
    dayCardActive: {
      background:
        "linear-gradient(145deg,rgba(214,183,106,.19),rgba(214,183,106,.05))",
      border: "1px solid rgba(214,183,106,.3)",
      boxShadow: "0 12px 35px rgba(214,183,106,.08)",
    },
    dayName: {
      color: "#777f85",
      fontSize: "8px",
      fontWeight: "800",
      letterSpacing: "1px",
    },
    dayNumber: {
      marginTop: "4px",
      color: COLORS.goldLight,
      fontFamily: "Georgia, serif",
      fontSize: "18px",
    },
    dayCount: {
      marginTop: "4px",
      color: "#737d84",
      fontSize: "8px",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "minmax(0,1.5fr) minmax(280px,1fr)",
      gap: "18px",
      marginBottom: "18px",
    },
    grid3: {
      display: "grid",
      gridTemplateColumns: "repeat(3,minmax(0,1fr))",
      gap: "15px",
      marginBottom: "18px",
    },
    miniPanel: {
      padding: "18px",
      borderRadius: "18px",
      background: "linear-gradient(145deg,rgba(17,26,35,.9),rgba(7,12,17,.9))",
      border: `1px solid ${COLORS.border}`,
    },
    miniTitle: {
      color: COLORS.goldLight,
      fontFamily: "Georgia, serif",
      fontSize: "15px",
    },
    miniSub: {
      color: "#6f787e",
      fontSize: "9px",
      marginTop: "4px",
    },
    analyticsRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "11px 0",
      borderBottom: "1px solid rgba(243,223,170,.07)",
    },
    analyticsLabel: {
      color: "#aeb3b5",
      fontSize: "11px",
    },
    analyticsValue: {
      color: COLORS.goldLight,
      fontSize: "12px",
      fontWeight: "800",
    },
    barRow: {
      marginTop: "12px",
    },
    barTop: {
      display: "flex",
      justifyContent: "space-between",
      color: "#8a9297",
      fontSize: "9px",
    },
    barTrack: {
      height: "5px",
      marginTop: "6px",
      borderRadius: "20px",
      background: "rgba(255,255,255,.06)",
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: "20px",
      background: "linear-gradient(90deg,#8f6b2b,#f4e3b0)",
    },
    clientGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "14px",
      padding: "18px",
    },
    clientCard: {
      padding: "16px",
      borderRadius: "16px",
      background: "rgba(255,255,255,.025)",
      border: "1px solid rgba(243,223,170,.09)",
      cursor: "pointer",
      transition: "transform .2s ease",
    },
    clientAvatar: {
      width: "40px",
      height: "40px",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(145deg,#f0d994,#a77d32)",
      color: "#11100c",
      fontFamily: "Georgia, serif",
      fontWeight: "900",
      marginBottom: "10px",
    },
    clientName: {
      color: COLORS.goldLight,
      fontSize: "14px",
      fontWeight: "700",
    },
    clientPhone: {
      color: "#737d84",
      fontSize: "10px",
      marginTop: "4px",
    },
    clientStats: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "14px",
      paddingTop: "10px",
      borderTop: "1px solid rgba(243,223,170,.07)",
      color: "#7d858a",
      fontSize: "9px",
    },
    filterRow: {
      display: "flex",
      gap: "7px",
      flexWrap: "wrap",
    },
    filterButton: {
      border: "1px solid rgba(243,223,170,.1)",
      background: "rgba(255,255,255,.025)",
      color: "#858d92",
      borderRadius: "9px",
      padding: "7px 11px",
      cursor: "pointer",
      fontSize: "9px",
      fontWeight: "800",
    },
    filterActive: {
      color: COLORS.goldLight,
      background: "rgba(214,183,106,.12)",
      border: "1px solid rgba(214,183,106,.22)",
    },
    settingsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2,minmax(0,1fr))",
      gap: "15px",
      padding: "20px",
    },
    field: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    fieldFull: {
      gridColumn: "1 / -1",
    },
    fieldLabel: {
      color: "#747d83",
      fontSize: "9px",
      fontWeight: "800",
      letterSpacing: "1px",
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "11px 13px",
      borderRadius: "10px",
      border: `1px solid ${COLORS.border}`,
      outline: "none",
      background: "rgba(2,5,8,.72)",
      color: COLORS.text,
      fontSize: "11px",
    },
    textarea: {
      minHeight: "90px",
      resize: "vertical",
    },
    serviceCard: {
      padding: "16px 20px",
      borderBottom: "1px solid rgba(243,223,170,.07)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    serviceName: {
      color: COLORS.goldLight,
      fontSize: "14px",
      fontWeight: "700",
    },
    serviceMeta: {
      marginTop: "4px",
      color: "#707a80",
      fontSize: "10px",
    },
    servicePrice: {
      color: COLORS.goldLight,
      fontFamily: "Georgia, serif",
      fontSize: "19px",
    },
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.72)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
    },
    modal: {
      width: "min(560px, calc(100vw - 30px))",
      maxHeight: "calc(100vh - 40px)",
      overflowY: "auto",
      borderRadius: "24px",
      background: "linear-gradient(145deg,#111922,#05080c)",
      border: "1px solid rgba(243,223,170,.2)",
      boxShadow: "0 50px 120px rgba(0,0,0,.7)",
      padding: "24px",
    },
    modalTitle: {
      color: COLORS.goldLight,
      fontFamily: "Georgia, serif",
      fontSize: "21px",
      marginBottom: "18px",
    },
    modalRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "15px",
      padding: "10px 0",
      borderBottom: "1px solid rgba(243,223,170,.07)",
      fontSize: "12px",
    },
    modalLabel: {
      color: "#6f787e",
    },
    modalValue: {
      color: COLORS.text,
      textAlign: "right",
      maxWidth: "65%",
      wordBreak: "break-word",
    },
    modalActions: {
      display: "flex",
      gap: "8px",
      marginTop: "20px",
    },
    close: {
      flex: 1,
      padding: "12px",
      borderRadius: "11px",
      border: "1px solid rgba(243,223,170,.17)",
      background: "linear-gradient(145deg,#f0d994,#a77d32)",
      color: "#12100b",
      fontWeight: "800",
      cursor: "pointer",
    },
    secondaryButton: {
      flex: 1,
      padding: "12px",
      borderRadius: "11px",
      border: `1px solid ${COLORS.border}`,
      background: "rgba(255,255,255,.035)",
      color: COLORS.goldLight,
      fontWeight: "800",
      cursor: "pointer",
    },
    calendarControls: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    calendarDate: {
      color: COLORS.goldLight,
      fontFamily: "Georgia, serif",
      fontSize: "15px",
    },
  };

  /* =====================================================
     RENDER BOOKING
  ===================================================== */
  function renderBooking(booking) {
    const status = getBookingStatus(booking);
    const customerName = getCustomerName(booking);

    return (
      <div key={booking.id} style={styles.booking}>
        <div style={styles.time}>{booking.time || "—"}</div>

        <div style={styles.bookingInfo}>
          <div style={styles.bookingName}>{customerName}</div>
          <div style={styles.bookingMeta}>
            {booking.serviceName || booking.service || "Υπηρεσία"} •{" "}
            {booking.date || "Χωρίς ημέρα"} • {booking.phone || "Χωρίς τηλέφωνο"}
          </div>
        </div>

        <div
          style={{
            ...styles.status,
            ...(status === "cancelled"
              ? styles.statusCancelled
              : status === "completed"
              ? styles.statusCompleted
              : styles.statusConfirmed),
          }}
        >
          {getStatusLabel(status)}
        </div>

        <div style={styles.price}>€{getPrice(booking).toFixed(2)}</div>

        <div style={styles.bookingActions}>
          <button
            style={styles.iconButton}
            onClick={() => setSelectedBooking(booking)}
            title="Προβολή"
          >
            👁
          </button>
          <button
            style={styles.iconButton}
            onClick={() => editBooking(booking)}
            title="Αλλαγή"
          >
            ✎
          </button>
          <button
            style={{ ...styles.iconButton, color: COLORS.red }}
            onClick={() => deleteBooking(booking.id)}
            title="Διαγραφή"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     PAGES (Dashboard, Calendar, Appointments, etc.)
  ===================================================== */
  function Dashboard() {
    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>Dashboard</h1>
            <div style={styles.headingSub}>
              Η συνολική εικόνα της επιχείρησής σας
            </div>
          </div>

          <div style={styles.topActions}>
            <button style={styles.smallButton} onClick={refreshBookings}>
              ↻ Ανανέωση
            </button>
            <button
              style={styles.smallButton}
              onClick={() => goTo("appointments")}
            >
              Όλα τα ραντεβού →
            </button>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statIcon}>📅</div>
            <div style={styles.statLabel}>ΣΗΜΕΡΙΝΑ ΡΑΝΤΕΒΟΥ</div>
            <div style={styles.statValue}>{todayBookings.length}</div>
            <div style={styles.statExtra}>
              {statistics.confirmed} ενεργά συνολικά
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statLabel}>ΠΕΛΑΤΕΣ</div>
            <div style={styles.statValue}>{statistics.clients}</div>
            <div style={styles.statExtra}>
              {analytics.returningClients} επαναλαμβανόμενοι
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statIcon}>€</div>
            <div style={styles.statLabel}>ΣΥΝΟΛΙΚΑ ΕΣΟΔΑ</div>
            <div style={styles.statValue}>
              €{statistics.revenue.toFixed(2)}
            </div>
            <div style={styles.statExtra}>
              Μέσο ticket €{analytics.averageTicket}
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statIcon}>✦</div>
            <div style={styles.statLabel}>ΔΗΜΟΦΙΛΕΣΤΕΡΗ ΥΠΗΡΕΣΙΑ</div>
            <div style={{ ...styles.statValue, fontSize: "16px" }}>
              {statistics.popularService}
            </div>
            <div style={styles.statExtra}>
              {statistics.total} συνολικά ραντεβού
            </div>
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelTitle}>Σημερινό πρόγραμμα</div>
                <div style={styles.panelSub}>{getTodayText()}</div>
              </div>

              <button
                style={styles.smallButton}
                onClick={() => {
                  setCalendarDate(new Date());
                  goTo("calendar");
                }}
              >
                Πλήρες πρόγραμμα →
              </button>
            </div>

            {todayBookings.length === 0 ? (
              <div style={styles.empty}>Δεν υπάρχουν ραντεβού για σήμερα.</div>
            ) : (
              <div style={styles.bookingList}>
                {todayBookings
                  .slice()
                  .sort((a, b) => String(a.time).localeCompare(String(b.time)))
                  .slice(0, 6)
                  .map(renderBooking)}
              </div>
            )}
          </div>

          <div style={styles.miniPanel}>
            <div style={styles.miniTitle}>Γρήγορη εικόνα</div>
            <div style={styles.miniSub}>Βασικοί δείκτες λειτουργίας</div>

            <div style={styles.analyticsRow}>
              <span style={styles.analyticsLabel}>Επιβεβαιωμένα</span>
              <span style={styles.analyticsValue}>{statistics.confirmed}</span>
            </div>

            <div style={styles.analyticsRow}>
              <span style={styles.analyticsLabel}>Ολοκληρωμένα</span>
              <span style={styles.analyticsValue}>{statistics.completed}</span>
            </div>

            <div style={styles.analyticsRow}>
              <span style={styles.analyticsLabel}>Ακυρώσεις</span>
              <span style={{ ...styles.analyticsValue, color: COLORS.red }}>
                {statistics.cancelled}
              </span>
            </div>

            <div style={styles.analyticsRow}>
              <span style={styles.analyticsLabel}>Cancellation rate</span>
              <span style={styles.analyticsValue}>
                {analytics.cancellationRate}%
              </span>
            </div>

            <div style={styles.analyticsRow}>
              <span style={styles.analyticsLabel}>Πιο busy ημέρα</span>
              <span style={styles.analyticsValue}>
                {analytics.busiestDay ? `${analytics.busiestDay[0]}` : "—"}
              </span>
            </div>

            <div style={styles.analyticsRow}>
              <span style={styles.analyticsLabel}>Πιο busy ώρα</span>
              <span style={styles.analyticsValue}>
                {analytics.busiestHour ? analytics.busiestHour[0] : "—"}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  function Calendar() {
    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>Calendar</h1>
            <div style={styles.headingSub}>Το ημερήσιο πρόγραμμα της επιχείρησης</div>
          </div>

          <button
            style={styles.smallButton}
            onClick={() => setCalendarDate(new Date())}
          >
            Σήμερα
          </button>
        </div>

        <div style={styles.panel}>
          <div style={styles.dayStrip}>
            {daySelector.map((item, index) => (
              <div
                key={item.key}
                style={{
                  ...styles.dayCard,
                  ...(getDateKey(calendarDate) === item.key
                    ? styles.dayCardActive
                    : {}),
                }}
                onClick={() => setCalendarDate(item.date)}
              >
                <div style={styles.dayName}>
                  {index === 0
                    ? "ΣΗΜΕΡΑ"
                    : index === 1
                    ? "ΑΥΡΙΟ"
                    : getShortDayName(item.date)}
                </div>
                <div style={styles.dayNumber}>{item.date.getDate()}</div>
                <div style={styles.dayCount}>{item.bookings.length} ραντεβού</div>
              </div>
            ))}
          </div>

          <div style={styles.panelHeader}>
            <div style={styles.calendarControls}>
              <button style={styles.smallButton} onClick={() => changeDay(-1)}>
                ←
              </button>
              <div style={styles.calendarDate}>
                {getDayName(calendarDate)} {getDisplayDate(calendarDate)}
              </div>
              <button style={styles.smallButton} onClick={() => changeDay(1)}>
                →
              </button>
            </div>

            <div style={{ color: COLORS.muted, fontSize: "11px" }}>
              {selectedDayBookings.length} ραντεβού
            </div>
          </div>

          {selectedDayBookings.length === 0 ? (
            <div style={styles.empty}>
              Δεν υπάρχουν ραντεβού για αυτή την ημέρα.
            </div>
          ) : (
            <div style={styles.bookingList}>
              {selectedDayBookings
                .slice()
                .sort((a, b) => String(a.time).localeCompare(String(b.time)))
                .map(renderBooking)}
            </div>
          )}
        </div>
      </>
    );
  }

  function Appointments() {
    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>Ραντεβού</h1>
            <div style={styles.headingSub}>Όλες οι κρατήσεις της επιχείρησης</div>
          </div>

          <button style={styles.smallButton} onClick={refreshBookings}>
            ↻ Ανανέωση
          </button>
        </div>

        <div style={{ ...styles.panel, marginBottom: "18px", padding: "15px" }}>
          <input
            style={styles.search}
            placeholder="🔎 Αναζήτηση πελάτη, τηλεφώνου, υπηρεσίας, ημερομηνίας..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div style={{ ...styles.filterRow, marginTop: "10px" }}>
            {[
              ["all", "Όλα"],
              ["confirmed", "Επιβεβαιωμένα"],
              ["completed", "Ολοκληρωμένα"],
              ["cancelled", "Ακυρωμένα"],
            ].map(([value, label]) => (
              <button
                key={value}
                style={{
                  ...styles.filterButton,
                  ...(appointmentFilter === value ? styles.filterActive : {}),
                }}
                onClick={() => setAppointmentFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelTitle}>Όλες οι κρατήσεις</div>
              <div style={styles.panelSub}>
                {filteredBookings.length} αποτελέσματα
              </div>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div style={styles.empty}>Δεν βρέθηκαν ραντεβού.</div>
          ) : (
            <div style={styles.bookingList}>
              {filteredBookings.slice().reverse().map(renderBooking)}
            </div>
          )}
        </div>
      </>
    );
  }

  function Cancellations() {
    const cancellations = bookings.filter(
      (booking) => getBookingStatus(booking) === "cancelled"
    );

    const cancellationRevenue = cancellations.reduce(
      (sum, booking) => sum + getPrice(booking),
      0
    );

    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>Ακυρώσεις</h1>
            <div style={styles.headingSub}>Ιστορικό ακυρωμένων ραντεβού</div>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statIcon}>×</div>
            <div style={styles.statLabel}>ΣΥΝΟΛΙΚΕΣ ΑΚΥΡΩΣΕΙΣ</div>
            <div style={{ ...styles.statValue, color: COLORS.red }}>
              {cancellations.length}
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statIcon}>%</div>
            <div style={styles.statLabel}>CANCELLATION RATE</div>
            <div style={styles.statValue}>{analytics.cancellationRate}%</div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statIcon}>€</div>
            <div style={styles.statLabel}>ΑΞΙΑ ΑΚΥΡΩΜΕΝΩΝ</div>
            <div style={styles.statValue}>
              €{cancellationRevenue.toFixed(2)}
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statLabel}>ΕΝΕ
