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

    if (!value) {
      return fallback;
    }

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
  const days = [
    "ΚΥΡ",
    "ΔΕΥ",
    "ΤΡΙ",
    "ΤΕΤ",
    "ΠΕΜ",
    "ΠΑΡ",
    "ΣΑΒ",
  ];

  return days[date.getDay()];
}

function getTodayText() {
  const today = new Date();

  return `${getDayName(today)} ${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getDisplayDate(date) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function getPrice(booking) {
  return Number(
    String(booking?.price || 0)
      .replace("€", "")
      .replace(",", ".")
      .trim()
  ) || 0;
}

function getBookingStatus(booking) {
  const status = normalize(
    booking?.status || "confirmed"
  );

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
  if (status === "cancelled") {
    return "Ακυρωμένο";
  }

  if (status === "completed") {
    return "Ολοκληρωμένο";
  }

  return "Επιβεβαιωμένο";
}

function getBookingDateKey(booking) {
  const raw = String(booking?.date || "");

  const match = raw.match(
    /(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?:\s*[\/.-]\s*(\d{2,4}))?/
  );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);

  let year = Number(match[3]);

  if (!year) {
    year = new Date().getFullYear();
  }

  if (year < 100) {
    year += 2000;
  }

  return `${year}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;
}

function isSameDate(booking, date) {
  return getBookingDateKey(booking) === getDateKey(date);
}

function getInitials(name = "") {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export default function Admin() {
  const [activePage, setActivePage] =
    useState("dashboard");

  const [bookings, setBookings] = useState(() =>
    safeStorageGet("nelaBookings", [])
  );

  const [search, setSearch] = useState("");

  const [selectedBooking, setSelectedBooking] =
    useState(null);

  const [selectedClient, setSelectedClient] =
    useState(null);

  const [calendarDate, setCalendarDate] =
    useState(new Date());

  const [appointmentFilter, setAppointmentFilter] =
    useState("all");

  const [settings, setSettings] = useState(() =>
    safeStorageGet("nelaBusinessSettings", {
      businessName: "NELA",
      phone: "",
      email: "",
      address: "",
      cancellationPolicy:
        "Οι ακυρώσεις γίνονται κατόπιν επικοινωνίας.",
    })
  );

  /* =====================================================
     REFRESH
  ===================================================== */

  function refreshBookings() {
    setBookings(
      safeStorageGet("nelaBookings", [])
    );
  }

  /* =====================================================
     DELETE BOOKING
  ===================================================== */

  function deleteBooking(id) {
    const confirmed = window.confirm(
      "Θέλετε σίγουρα να διαγράψετε αυτό το ραντεβού;"
    );

    if (!confirmed) {
      return;
    }

    const updated = bookings.filter(
      (booking) => booking.id !== id
    );

    setBookings(updated);

    safeStorageSet(
      "nelaBookings",
      updated
    );

    setSelectedBooking(null);
  }

  /* =====================================================
     EDIT BOOKING
  ===================================================== */

  function editBooking(booking) {
    const newTime = window.prompt(
      "Νέα ώρα:",
      booking.time || ""
    );

    if (newTime === null) {
      return;
    }

    const newDate = window.prompt(
      "Νέα ημέρα:",
      booking.date || ""
    );

    if (newDate === null) {
      return;
    }

    const updated = bookings.map(
      (item) =>
        item.id === booking.id
          ? {
              ...item,
              time: newTime.trim(),
              date: newDate.trim(),
            }
          : item
    );

    setBookings(updated);

    safeStorageSet(
      "nelaBookings",
      updated
    );

    setSelectedBooking(
      updated.find(
        (item) =>
          item.id === booking.id
      )
    );
  }

  /* =====================================================
     UPDATE STATUS
  ===================================================== */

  function updateBookingStatus(
    booking,
    status
  ) {
    const updated = bookings.map(
      (item) =>
        item.id === booking.id
          ? {
              ...item,
              status,
            }
          : item
    );

    setBookings(updated);

    safeStorageSet(
      "nelaBookings",
      updated
    );

    setSelectedBooking(
      updated.find(
        (item) =>
          item.id === booking.id
      )
    );
  }

  /* =====================================================
     BASIC STATS
  ===================================================== */

  const statistics = useMemo(() => {
    const total = bookings.length;

    const activeBookings = bookings.filter(
      (booking) =>
        getBookingStatus(booking) !==
        "cancelled"
    );

    const revenue = activeBookings.reduce(
      (sum, booking) =>
        sum + getPrice(booking),
      0
    );

    const cancelled = bookings.filter(
      (booking) =>
        getBookingStatus(booking) ===
        "cancelled"
    ).length;

    const completed = bookings.filter(
      (booking) =>
        getBookingStatus(booking) ===
        "completed"
    ).length;

    const confirmed = bookings.filter(
      (booking) =>
        getBookingStatus(booking) ===
        "confirmed"
    ).length;

    const services = {};

    bookings.forEach((booking) => {
      if (
        getBookingStatus(booking) ===
        "cancelled"
      ) {
        return;
      }

      const service =
        booking.service ||
        "Άγνωστη υπηρεσία";

      services[service] =
        (services[service] || 0) + 1;
    });

    let popularService = "—";
    let highest = 0;

    Object.entries(services).forEach(
      ([service, count]) => {
        if (count > highest) {
          highest = count;
          popularService = service;
        }
      }
    );

    const clients = new Set(
      bookings
        .map(
          (booking) =>
            normalize(
              booking.phone ||
                booking.email ||
                booking.name ||
                ""
            )
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
      const key =
        normalize(
          booking.phone ||
            booking.email ||
            booking.name ||
            `client-${booking.id}`
        );

      if (!map[key]) {
        map[key] = {
          id: key,
          name:
            booking.name ||
            "Άγνωστος",
          phone:
            booking.phone ||
            "—",
          email:
            booking.email ||
            "—",
          bookings: [],
          totalSpent: 0,
          lastVisit:
            booking.date || "—",
        };
      }

      map[key].bookings.push(
        booking
      );

      if (booking.email) {
        map[key].email =
          booking.email;
      }

      map[key].totalSpent +=
        getPrice(booking);

      if (
        booking.date
      ) {
        map[key].lastVisit =
          booking.date;
      }
    });

    return Object.values(map).sort(
      (a, b) =>
        b.totalSpent -
        a.totalSpent
    );
  }, [bookings]);

  /* =====================================================
     DATE DATA
  ===================================================== */

  const today = useMemo(
    () => new Date(),
    []
  );

  const todayBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          isSameDate(
            booking,
            today
          )
      ),
    [bookings, today]
  );

  const selectedDayBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            isSameDate(
              booking,
              calendarDate
            )
        ),
      [bookings, calendarDate]
    );

  const upcomingBookings =
    useMemo(() => {
      return bookings
        .filter(
          (booking) =>
            getBookingStatus(
              booking
            ) !== "cancelled"
        )
        .sort((a, b) =>
          String(a.date).localeCompare(
            String(b.date)
          )
        );
    }, [bookings]);

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredBookings =
    useMemo(() => {
      const query =
        normalize(search);

      let result =
        [...bookings];

      if (
        appointmentFilter !==
        "all"
      ) {
        result =
          result.filter(
            (booking) =>
              getBookingStatus(
                booking
              ) ===
              appointmentFilter
          );
      }

      if (!query) {
        return result;
      }

      return result.filter(
        (booking) =>
          normalize(
            booking.name
          ).includes(query) ||
          normalize(
            booking.phone
          ).includes(query) ||
          normalize(
            booking.email
          ).includes(query) ||
          normalize(
            booking.service
          ).includes(query) ||
          normalize(
            booking.date
          ).includes(query) ||
          normalize(
            booking.time
          ).includes(query)
      );
    }, [
      bookings,
      search,
      appointmentFilter,
    ]);

  /* =====================================================
     ANALYTICS
  ===================================================== */

  const analytics = useMemo(() => {
    const dayCounts = {};
    const hourCounts = {};
    const serviceCounts = {};

    bookings.forEach((booking) => {
      if (
        getBookingStatus(
          booking
        ) === "cancelled"
      ) {
        return;
      }

      const dateKey =
        getBookingDateKey(
          booking
        );

      if (dateKey) {
        const date =
          new Date(
            `${dateKey}T12:00:00`
          );

        const day =
          getDayName(date);

        dayCounts[day] =
          (dayCounts[day] || 0) +
          1;
      }

      const time =
        String(
          booking.time || ""
        );

      const hourMatch =
        time.match(
          /(\d{1,2})/
        );

      if (hourMatch) {
        const hour =
          Number(
            hourMatch[1]
          );

        const label = `${String(
          hour
        ).padStart(
          2,
          "0"
        )}:00`;

        hourCounts[label] =
          (hourCounts[label] ||
            0) + 1;
      }

      const service =
        booking.service ||
        "Άγνωστη υπηρεσία";

      serviceCounts[service] =
        (serviceCounts[service] ||
          0) + 1;
    });

    const busiestDay =
      Object.entries(
        dayCounts
      ).sort(
        (a, b) =>
          b[1] - a[1]
      )[0] || null;

    const busiestHour =
      Object.entries(
        hourCounts
      ).sort(
        (a, b) =>
          b[1] - a[1]
      )[0] || null;

    const popularServices =
      Object.entries(
        serviceCounts
      )
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 5);

    const totalClients =
      clients.length;

    const returningClients =
      clients.filter(
        (client) =>
          client.bookings.length >
          1
      ).length;

    const newClients =
      clients.filter(
        (client) =>
          client.bookings.length ===
          1
      ).length;

    const cancellationRate =
      bookings.length
        ? (
            (statistics.cancelled /
              bookings.length) *
            100
          ).toFixed(1)
        : "0.0";

    const averageTicket =
      statistics.completed +
      statistics.confirmed
        ? (
            statistics.revenue /
            (statistics.completed +
              statistics.confirmed)
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
  }, [
    bookings,
    clients,
    statistics,
  ]);

  /* =====================================================
     NEXT DAYS
  ===================================================== */

  const daySelector = useMemo(() => {
    const result = [];

    for (
      let i = 0;
      i < 7;
      i++
    ) {
      const date =
        new Date();

      date.setDate(
        date.getDate() + i
      );

      result.push({
        date,
        key: getDateKey(date),
        bookings:
          bookings.filter(
            (booking) =>
              isSameDate(
                booking,
                date
              )
          ),
      });
    }

    return result;
  }, [bookings]);

  /* =====================================================
     SAVE SETTINGS
  ===================================================== */

  function saveSettings() {
    safeStorageSet(
      "nelaBusinessSettings",
      settings
    );

    window.alert(
      "Οι ρυθμίσεις αποθηκεύτηκαν."
    );
  }

  /* =====================================================
     NAVIGATION
  ===================================================== */

  function goTo(page) {
    setActivePage(page);
    setSearch("");
    setAppointmentFilter(
      "all"
    );
  }

  function changeDay(amount) {
    const next =
      new Date(
        calendarDate
      );

    next.setDate(
      next.getDate() +
        amount
    );

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
        radial-gradient(
          circle at 10% 0%,
          rgba(214,183,106,.13),
          transparent 28%
        ),
        radial-gradient(
          circle at 90% 100%,
          rgba(53,85,110,.14),
          transparent 32%
        ),
        linear-gradient(
          135deg,
          #010203 0%,
          #071018 45%,
          #020406 100%
        )
      `,

      color: COLORS.text,

      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

      display: "flex",
    },

    sidebar: {
      width: "245px",
      flexShrink: 0,
      height: "100vh",

      background:
        "rgba(3,6,10,.94)",

      borderRight:
        `1px solid ${COLORS.border}`,

      display: "flex",
      flexDirection: "column",

      padding: "28px 18px",

      boxSizing: "border-box",
    },

    brand: {
      display: "flex",
      alignItems: "center",
      gap: "13px",

      padding:
        "0 8px 28px",

      borderBottom:
        `1px solid ${COLORS.border}`,
    },

    logo: {
      width: "48px",
      height: "48px",
      borderRadius: "16px",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      background:
        "linear-gradient(145deg,#fff4c9,#d6b66a,#916c27)",

      color: "#08090b",

      fontFamily:
        "Georgia, serif",

      fontSize: "25px",
      fontWeight: "900",

      boxShadow:
        "0 15px 35px rgba(214,183,106,.16)",
    },

    brandName: {
      color: COLORS.goldLight,
      fontFamily:
        "Georgia, serif",
      fontSize: "22px",
      letterSpacing: "4px",
    },

    brandSub: {
      marginTop: "3px",
      color: "#6d746f",
      fontSize: "7px",
      letterSpacing: "1.8px",
      fontWeight: "800",
    },

    nav: {
      marginTop: "28px",

      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },

    navSection: {
      margin:
        "15px 10px 5px",

      color: "#4e565d",

      fontSize: "7px",
      fontWeight: "800",
      letterSpacing: "1.7px",
    },

    navButton: {
      width: "100%",

      border: "none",
      outline: "none",

      borderRadius: "13px",

      padding:
        "11px 13px",

      background:
        "transparent",

      color: COLORS.muted,

      textAlign: "left",

      cursor: "pointer",

      fontSize: "11px",
      fontWeight: "700",

      transition:
        "all .2s ease",
    },

    navActive: {
      background:
        "linear-gradient(135deg,rgba(214,183,106,.18),rgba(214,183,106,.05))",

      color: COLORS.goldLight,

      border:
        "1px solid rgba(214,183,106,.18)",

      boxShadow:
        "0 10px 30px rgba(0,0,0,.18)",
    },

    sidebarBottom: {
      marginTop: "auto",

      padding:
        "16px 10px",

      borderTop:
        `1px solid ${COLORS.border}`,

      color: "#555e64",

      fontSize: "7px",
      letterSpacing: "1.4px",
      lineHeight: "1.7",
    },

    main: {
      flex: 1,
      minWidth: 0,
      height: "100vh",
      overflowY: "auto",

      padding:
        "34px 38px 60px",

      boxSizing: "border-box",
    },

    topbar: {
      display: "flex",
      justifyContent:
        "space-between",
      alignItems: "center",

      marginBottom: "25px",
    },

    heading: {
      margin: 0,

      color: COLORS.goldLight,

      fontFamily:
        "Georgia, serif",

      fontSize: "30px",
      fontWeight: "500",
      letterSpacing: "1px",
    },

    headingSub: {
      marginTop: "7px",
      color: COLORS.muted,
      fontSize: "11px",
    },

    topActions: {
      display: "flex",
      gap: "8px",
    },

    smallButton: {
      border:
        `1px solid ${COLORS.border}`,

      background:
        "rgba(15,22,29,.75)",

      color: COLORS.goldLight,

      borderRadius: "11px",

      padding:
        "10px 14px",

      cursor: "pointer",

      fontSize: "10px",
      fontWeight: "700",
    },

    stats: {
      display: "grid",

      gridTemplateColumns:
        "repeat(4, minmax(0, 1fr))",

      gap: "15px",

      marginBottom: "20px",
    },

    stat: {
      padding: "19px",

      borderRadius: "20px",

      background:
        "linear-gradient(145deg,rgba(17,26,35,.9),rgba(7,12,17,.9))",

      border:
        `1px solid ${COLORS.border}`,

      boxShadow:
        "0 20px 50px rgba(0,0,0,.22)",
    },

    statIcon: {
      fontSize: "17px",
      marginBottom: "11px",
    },

    statLabel: {
      color: "#777f85",
      fontSize: "8px",
      letterSpacing: "1.4px",
      fontWeight: "800",
    },

    statValue: {
      marginTop: "6px",
      color: COLORS.goldLight,

      fontFamily:
        "Georgia, serif",

      fontSize: "27px",
    },

    statExtra: {
      marginTop: "6px",
      color: "#687278",
      fontSize: "8px",
    },

    panel: {
      background:
        "linear-gradient(145deg,rgba(14,21,29,.92),rgba(6,10,14,.92))",

      border:
        `1px solid ${COLORS.border}`,

      borderRadius: "23px",

      boxShadow:
        "0 25px 70px rgba(0,0,0,.28)",

      overflow: "hidden",
    },

    panelHeader: {
      padding:
        "19px 21px",

      display: "flex",
      alignItems: "center",
      justifyContent:
        "space-between",

      borderBottom:
        `1px solid ${COLORS.border}`,
    },

    panelTitle: {
      color: COLORS.goldLight,

      fontFamily:
        "Georgia, serif",

      fontSize: "17px",
    },

    panelSub: {
      color: "#6f787e",
      fontSize: "9px",
      marginTop: "4px",
    },

    search: {
      width: "100%",
      boxSizing: "border-box",

      padding:
        "13px 15px",

      borderRadius: "13px",

      outline: "none",

      border:
        `1px solid ${COLORS.border}`,

      background:
        "rgba(2,5,8,.72)",

      color: COLORS.text,

      fontSize: "11px",
    },

    bookingList: {
      display: "flex",
      flexDirection: "column",
    },

    booking: {
      padding: "16px 21px",

      display: "flex",
      alignItems: "center",

      gap: "17px",

      borderBottom:
        `1px solid rgba(243,223,170,.07)`,
    },

    time: {
      width: "67px",
      flexShrink: 0,

      color: COLORS.gold,

      fontFamily:
        "Georgia, serif",

      fontSize: "17px",
    },

    bookingInfo: {
      flex: 1,
      minWidth: 0,
    },

    bookingName: {
      color: "#eee9dc",

      fontSize: "13px",
      fontWeight: "700",
    },

    bookingMeta: {
      marginTop: "5px",

      color: "#737d84",

      fontSize: "9px",
    },

    price: {
      color: COLORS.goldLight,

      fontSize: "12px",
      fontWeight: "800",
    },

    status: {
      borderRadius: "20px",
      padding:
        "5px 8px",

      fontSize: "7px",
      fontWeight: "800",
      letterSpacing: ".4px",
    },

    statusConfirmed: {
      color: COLORS.green,
      background:
        "rgba(143,207,155,.08)",
      border:
        "1px solid rgba(143,207,155,.16)",
    },

    statusCancelled: {
      color: COLORS.red,
      background:
        "rgba(217,135,135,.08)",
      border:
        "1px solid rgba(217,135,135,.16)",
    },

    statusCompleted: {
      color: COLORS.blue,
      background:
        "rgba(145,184,214,.08)",
      border:
        "1px solid rgba(145,184,214,.16)",
    },

    bookingActions: {
      display: "flex",
      gap: "5px",
    },

    iconButton: {
      border:
        `1px solid ${COLORS.border}`,

      background:
        "rgba(255,255,255,.025)",

      color: COLORS.goldLight,

      borderRadius: "9px",

      width: "33px",
      height: "33px",

      cursor: "pointer",
    },

    empty: {
      padding: "55px 20px",

      textAlign: "center",

      color: "#687177",

      fontSize: "11px",
    },

    dayStrip: {
      display: "flex",
      gap: "8px",

      padding: "16px",

      overflowX: "auto",

      borderBottom:
        `1px solid ${COLORS.border}`,
    },

    dayCard: {
      minWidth: "88px",

      padding:
        "12px 10px",

      borderRadius: "14px",

      border:
        "1px solid rgba(243,223,170,.08)",

      background:
        "rgba(255,255,255,.025)",

      cursor: "pointer",

      textAlign: "center",
    },

    dayCardActive: {
      background:
        "linear-gradient(145deg,rgba(214,183,106,.19),rgba(214,183,106,.05))",

      border:
        "1px solid rgba(214,183,106,.3)",

      boxShadow:
        "0 12px 35px rgba(214,183,106,.08)",
    },

    dayName: {
      color: "#777f85",
      fontSize: "7px",
      fontWeight: "800",
      letterSpacing: "1px",
    },

    dayNumber: {
      marginTop: "5px",

      color: COLORS.goldLight,

      fontFamily:
        "Georgia, serif",

      fontSize: "18px",
    },

    dayCount: {
      marginTop: "5px",
      color: "#737d84",
      fontSize: "7px",
    },

    grid2: {
      display: "grid",

      gridTemplateColumns:
        "minmax(0,1.5fr) minmax(280px,1fr)",

      gap: "18px",

      marginBottom: "18px",
    },

    grid3: {
      display: "grid",

      gridTemplateColumns:
        "repeat(3,minmax(0,1fr))",

      gap: "15px",

      marginBottom: "18px",
    },

    miniPanel: {
      padding: "19px",

      borderRadius: "20px",

      background:
        "linear-gradient(145deg,rgba(17,26,35,.9),rgba(7,12,17,.9))",

      border:
        `1px solid ${COLORS.border}`,
    },

    miniTitle: {
      color: COLORS.goldLight,

      fontFamily:
        "Georgia, serif",

      fontSize: "15px",
    },

    miniSub: {
      color: "#6f787e",
      fontSize: "8px",
      marginTop: "5px",
    },

    analyticsRow: {
      display: "flex",
      justifyContent:
        "space-between",
      alignItems: "center",

      padding:
        "12px 0",

      borderBottom:
        "1px solid rgba(243,223,170,.07)",
    },

    analyticsLabel: {
      color: "#aeb3b5",
      fontSize: "10px",
    },

    analyticsValue: {
      color: COLORS.goldLight,
      fontSize: "11px",
      fontWeight: "800",
    },

    barRow: {
      marginTop: "13px",
    },

    barTop: {
      display: "flex",
      justifyContent:
        "space-between",

      color: "#8a9297",
      fontSize: "8px",
    },

    barTrack: {
      height: "5px",

      marginTop: "7px",

      borderRadius: "20px",

      background:
        "rgba(255,255,255,.06)",

      overflow: "hidden",
    },

    barFill: {
      height: "100%",

      borderRadius: "20px",

      background:
        "linear-gradient(90deg,#8f6b2b,#f4e3b0)",
    },

    clientGrid: {
      display: "grid",

      gridTemplateColumns:
        "repeat(3, minmax(0, 1fr))",

      gap: "14px",

      padding: "18px",
    },

    clientCard: {
      padding: "18px",

      borderRadius: "17px",

      background:
        "rgba(255,255,255,.025)",

      border:
        "1px solid rgba(243,223,170,.09)",

      cursor: "pointer",

      transition:
        "transform .2s ease",
    },

    clientAvatar: {
      width: "42px",
      height: "42px",

      borderRadius: "14px",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      background:
        "linear-gradient(145deg,#f0d994,#a77d32)",

      color: "#11100c",

      fontFamily:
        "Georgia, serif",

      fontWeight: "900",

      marginBottom: "12px",
    },

    clientName: {
      color: COLORS.goldLight,
      fontSize: "13px",
      fontWeight: "700",
    },

    clientPhone: {
      color: "#737d84",
      fontSize: "9px",
      marginTop: "5px",
    },

    clientStats: {
      display: "flex",
      justifyContent:
        "space-between",

      marginTop: "15px",

      paddingTop: "12px",

      borderTop:
        "1px solid rgba(243,223,170,.07)",

      color: "#7d858a",

      fontSize: "8px",
    },

    filterRow: {
      display: "flex",
      gap: "7px",
      flexWrap: "wrap",
    },

    filterButton: {
      border:
        "1px solid rgba(243,223,170,.1)",

      background:
        "rgba(255,255,255,.025)",

      color: "#858d92",

      borderRadius: "9px",

      padding:
        "8px 11px",

      cursor: "pointer",

      fontSize: "8px",
      fontWeight: "800",
    },

    filterActive: {
      color: COLORS.goldLight,

      background:
        "rgba(214,183,106,.12)",

      border:
        "1px solid rgba(214,183,106,.22)",
    },

    settingsGrid: {
      display: "grid",

      gridTemplateColumns:
        "repeat(2,minmax(0,1fr))",

      gap: "15px",

      padding: "20px",
    },

    field: {
      display: "flex",
      flexDirection: "column",
      gap: "7px",
    },

    fieldFull: {
      gridColumn:
        "1 / -1",
    },

    fieldLabel: {
      color: "#747d83",

      fontSize: "8px",
      fontWeight: "800",
      letterSpacing: "1px",
    },

    input: {
      width: "100%",

      boxSizing: "border-box",

      padding:
        "12px 13px",

      borderRadius: "11px",

      border:
        `1px solid ${COLORS.border}`,

      outline: "none",

      background:
        "rgba(2,5,8,.72)",

      color: COLORS.text,

      fontSize: "10px",
    },

    textarea: {
      minHeight: "100px",
      resize: "vertical",
    },

    serviceCard: {
      padding: "18px",

      borderBottom:
        "1px solid rgba(243,223,170,.07)",

      display: "flex",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    serviceName: {
      color: COLORS.goldLight,
      fontSize: "13px",
      fontWeight: "700",
    },

    serviceMeta: {
      marginTop: "5px",
      color: "#707a80",
      fontSize: "9px",
    },

    servicePrice: {
      color: COLORS.goldLight,

      fontFamily:
        "Georgia, serif",

      fontSize: "20px",
    },

    modalOverlay: {
      position: "fixed",
      inset: 0,

      background:
        "rgba(0,0,0,.72)",

      backdropFilter:
        "blur(12px)",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      zIndex: 100,
    },

    modal: {
      width:
        "min(560px, calc(100vw - 30px))",

      maxHeight:
        "calc(100vh - 40px)",

      overflowY: "auto",

      borderRadius: "25px",

      background:
        "linear-gradient(145deg,#111922,#05080c)",

      border:
        "1px solid rgba(243,223,170,.2)",

      boxShadow:
        "0 50px 120px rgba(0,0,0,.7)",

      padding: "25px",
    },

    modalTitle: {
      color: COLORS.goldLight,

      fontFamily:
        "Georgia, serif",

      fontSize: "22px",

      marginBottom: "20px",
    },

    modalRow: {
      display: "flex",
      justifyContent:
        "space-between",

      gap: "15px",

      padding:
        "11px 0",

      borderBottom:
        "1px solid rgba(243,223,170,.07)",

      fontSize: "11px",
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

      padding: "13px",

      borderRadius: "12px",

      border:
        "1px solid rgba(243,223,170,.17)",

      background:
        "linear-gradient(145deg,#f0d994,#a77d32)",

      color: "#12100b",

      fontWeight: "800",

      cursor: "pointer",
    },

    secondaryButton: {
      flex: 1,

      padding: "13px",

      borderRadius: "12px",

      border:
        `1px solid ${COLORS.border}`,

      background:
        "rgba(255,255,255,.035)",

      color: COLORS.goldLight,

      fontWeight: "800",

      cursor: "pointer",
    },
  };

  /* =====================================================
     BOOKING COMPONENT
  ===================================================== */

  function renderBooking(booking) {
    const status =
      getBookingStatus(
        booking
      );

    return (
      <div
        key={booking.id}
        style={styles.booking}
      >
        <div style={styles.time}>
          {booking.time || "—"}
        </div>

        <div
          style={
            styles.bookingInfo
          }
        >
          <div
            style={
              styles.bookingName
            }
          >
            {booking.name ||
              "Χωρίς όνομα"}
          </div>

          <div
            style={
              styles.bookingMeta
            }
          >
            {booking.service ||
              "Υπηρεσία"}{" "}
            •{" "}
            {booking.date ||
              "Χωρίς ημέρα"}{" "}
            •{" "}
            {booking.phone ||
              "Χωρίς τηλέφωνο"}
          </div>
        </div>

        <div
          style={{
            ...styles.status,
            ...(status ===
            "cancelled"
              ? styles.statusCancelled
              : status ===
                "completed"
              ? styles.statusCompleted
              : styles.statusConfirmed),
          }}
        >
          {getStatusLabel(
            status
          )}
        </div>

        <div style={styles.price}>
          €{getPrice(booking).toFixed(2)}
        </div>

        <div
          style={
            styles.bookingActions
          }
        >
          <button
            style={
              styles.iconButton
            }
            onClick={() =>
              setSelectedBooking(
                booking
              )
            }
            title="Προβολή"
          >
            👁
          </button>

          <button
            style={
              styles.iconButton
            }
            onClick={() =>
              editBooking(booking)
            }
            title="Αλλαγή"
          >
            ✎
          </button>

          <button
            style={{
              ...styles.iconButton,
              color: COLORS.red,
            }}
            onClick={() =>
              deleteBooking(
                booking.id
              )
            }
            title="Διαγραφή"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     DASHBOARD
  ===================================================== */

  function Dashboard() {
    const maxService =
      analytics.popularServices[0]?.[1] ||
      1;

    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>
              Dashboard
            </h1>

            <div
              style={
                styles.headingSub
              }
            >
              Η συνολική εικόνα της
              επιχείρησής σας
            </div>
          </div>

          <div
            style={
              styles.topActions
            }
          >
            <button
              style={
                styles.smallButton
              }
              onClick={
                refreshBookings
              }
            >
              ↻ Ανανέωση
            </button>

            <button
              style={
                styles.smallButton
              }
              onClick={() =>
                goTo(
                  "appointments"
                )
              }
            >
              Όλα τα ραντεβού →
            </button>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div
              style={
                styles.statIcon
              }
            >
              📅
            </div>

            <div
              style={
                styles.statLabel
              }
            >
              ΣΗΜΕΡΙΝΑ ΡΑΝΤΕΒΟΥ
            </div>

            <div
              style={
                styles.statValue
              }
            >
              {
                todayBookings.length
              }
            </div>

            <div
              style={
                styles.statExtra
              }
            >
              {statistics.confirmed}{" "}
              ενεργά συνολικά
            </div>
          </div>

          <div style={styles.stat}>
            <div
              style={
                styles.statIcon
              }
            >
              👥
            </div>

            <div
              style={
                styles.statLabel
              }
            >
              ΠΕΛΑΤΕΣ
            </div>

            <div
              style={
                styles.statValue
              }
            >
              {statistics.clients}
            </div>

            <div
              style={
                styles.statExtra
              }
            >
              {analytics.returningClients}{" "}
              επαναλαμβανόμενοι
            </div>
          </div>

          <div style={styles.stat}>
            <div
              style={
                styles.statIcon
              }
            >
              €
            </div>

            <div
              style={
                styles.statLabel
              }
            >
              ΣΥΝΟΛΙΚΑ ΕΣΟΔΑ
            </div>

            <div
              style={
                styles.statValue
              }
            >
              €
              {statistics.revenue.toFixed(
                2
              )}
            </div>

            <div
              style={
                styles.statExtra
              }
            >
              Μέσο ticket €
              {analytics.averageTicket}
            </div>
          </div>

          <div style={styles.stat}>
            <div
              style={
                styles.statIcon
              }
            >
              ✦
            </div>

            <div
              style={
                styles.statLabel
              }
            >
              ΔΗΜΟΦΙΛΕΣΤΕΡΗ ΥΠΗΡΕΣΙΑ
            </div>

            <div
              style={{
                ...styles.statValue,
                fontSize: "16px",
              }}
            >
              {
                statistics.popularService
              }
            </div>

            <div
              style={
                styles.statExtra
              }
            >
              {statistics.total}{" "}
              συνολικά ραντεβού
            </div>
          </div>
        </div>

        <div
          style={styles.grid2}
        >
          <div style={styles.panel}>
            <div
              style={
                styles.panelHeader
              }
            >
              <div>
                <div
                  style={
                    styles.panelTitle
                  }
                >
                  Σημερινό πρόγραμμα
                </div>

                <div
                  style={
                    styles.panelSub
                  }
                >
                  {getTodayText()}
                </div>
              </div>

              <button
                style={
                  styles.smallButton
                }
                onClick={() => {
                  setCalendarDate(
                    new Date()
                  );
                  goTo(
                    "calendar"
                  );
                }}
              >
                Πλήρες πρόγραμμα →
              </button>
            </div>

            {todayBookings.length ===
            0 ? (
              <div
                style={
                  styles.empty
                }
              >
                Δεν υπάρχουν
                ραντεβού για σήμερα.
              </div>
            ) : (
              <div
                style={
                  styles.bookingList
                }
              >
                {todayBookings
                  .slice()
                  .sort((a, b) =>
                    String(
                      a.time
                    ).localeCompare(
                      String(
                        b.time
                      )
                    )
                  )
                  .slice(0, 6)
                  .map(
                    renderBooking
                  )}
              </div>
            )}
          </div>

          <div
            style={
              styles.miniPanel
            }
          >
            <div
              style={
                styles.miniTitle
              }
            >
              Γρήγορη εικόνα
            </div>

            <div
              style={
                styles.miniSub
              }
            >
              Βασικοί δείκτες
              λειτουργίας
            </div>

            <div
              style={
                styles.analyticsRow
              }
            >
              <span
                style={
                  styles.analyticsLabel
                }
              >
                Επιβεβαιωμένα
              </span>

              <span
                style={
                  styles.analyticsValue
                }
              >
                {
                  statistics.confirmed
                }
              </span>
            </div>

            <div
              style={
                styles.analyticsRow
              }
            >
              <span
                style={
                  styles.analyticsLabel
                }
              >
                Ολοκληρωμένα
              </span>

              <span
                style={
                  styles.analyticsValue
                }
              >
                {
                  statistics.completed
                }
              </span>
            </div>

            <div
              style={
                styles.analyticsRow
              }
            >
              <span
                style={
                  styles.analyticsLabel
                }
              >
                Ακυρώσεις
              </span>

              <span
                style={{
                  ...styles.analyticsValue,
                  color: COLORS.red,
                }}
              >
                {
                  statistics.cancelled
                }
              </span>
            </div>

            <div
              style={
                styles.analyticsRow
              }
            >
              <span
                style={
                  styles.analyticsLabel
                }
              >
                Cancellation rate
              </span>

              <span
                style={
                  styles.analyticsValue
                }
              >
                {
                  analytics.cancellationRate
                }
                %
              </span>
            </div>

            <div
              style={
                styles.analyticsRow
              }
            >
              <span
                style={
                  styles.analyticsLabel
                }
              >
                Πιο busy ημέρα
              </span>

              <span
                style={
                  styles.analyticsValue
                }
              >
                {analytics
                  .busiestDay
                  ? `${analytics.busiestDay[0]}`
                  : "—"}
              </span>
            </div>

            <div
              style={
                styles.analyticsRow
              }
            >
              <span
                style={
                  styles.analyticsLabel
                }
              >
                Πιο busy ώρα
              </span>

              <span
                style={
                  styles.analyticsValue
                }
              >
                {analytics
                  .busiestHour
                  ? analytics
                      .busiestHour[0]
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div
          style={styles.grid3}
        >
          <div
            style={
              styles.miniPanel
            }
          >
            <div
              style={
                styles.miniTitle
              }
            >
              Πελάτες
            </div>

            <div
              style={
                styles.miniSub
              }
            >
              Ανάλυση πελατολογίου
            </div>

            <div
              style={
                styles.analyticsRow
              }
            >
              <span
                style={
                  styles.analyticsLabel
                }
              >
                Νέοι
              </span>

              <span
                style={
                  styles.analyticsValue
                }
              >
                {
                  analytics.newClients
                }
              </span>
            </div>

            <div
              style={
                styles.analyticsRow
              }
            >
              <span
                style={
                  styles.analyticsLabel
                }
              >
                Επαναλαμβανόμενοι
              </span>

              <span
                style={
                  styles.analyticsValue
                }
              >
                {
                  analytics.returningClients
                }
              </span>
            </div>

            <button
              style={{
                ...styles.smallButton,
                width: "100%",
                marginTop: "14px",
              }}
              onClick={() =>
                goTo("clients")
              }
            >
              Πελατολόγιο →
            </button>
          </div>

          <div
            style={
              styles.miniPanel
            }
          >
            <div
              style={
                styles.miniTitle
              }
            >
              Δημοφιλείς υπηρεσίες
            </div>

            <div
              style={
                styles.miniSub
              }
            >
              Με βάση τα ραντεβού
            </div>

            {analytics
              .popularServices
              .slice(0, 4)
              .map(
                ([name, count]) => (
                  <div
                    key={name}
                    style={
                      styles.barRow
                    }
                  >
                    <div
                      style={
                        styles.barTop
                      }
                    >
                      <span>
                        {name}
                      </span>

                      <span>
                        {count}
                      </span>
                    </div>

                    <div
                      style={
                        styles.barTrack
                      }
                    >
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${Math.max(
                            8,
                            (count /
                              maxService) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}

            {analytics
              .popularServices
              .length === 0 && (
              <div
                style={{
                  ...styles.empty,
                  padding:
                    "25px 0",
                }}
              >
                Δεν υπάρχουν
                δεδομένα.
              </div>
            )}
          </div>

          <div
            style={
              styles.miniPanel
            }
          >
            <div
              style={
                styles.miniTitle
              }
            >
              Επόμενα ραντεβού
            </div>

            <div
              style={
                styles.miniSub
              }
            >
              Οι επόμενες κρατήσεις
            </div>

            {upcomingBookings
              .slice(0, 4)
              .map(
                (booking) => (
                  <div
                    key={
                      booking.id
                    }
                    style={
                      styles.analyticsRow
                    }
                  >
                    <div>
                      <div
                        style={{
                          color:
                            COLORS.goldLight,
                          fontSize:
                            "9px",
                          fontWeight:
                            "700",
                        }}
                      >
                        {
                          booking.name
                        }
                      </div>

                      <div
                        style={{
                          color:
                            "#69737a",
                          fontSize:
                            "7px",
                          marginTop:
                            "3px",
                        }}
                      >
                        {
                          booking.date
                        }{" "}
                        •{" "}
                        {
                          booking.time
                        }
                      </div>
                    </div>

                    <span
                      style={
                        styles.analyticsValue
                      }
                    >
                      €
                      {
                        booking.price ||
                        0
                      }
                    </span>
                  </div>
                )
              )}

            {upcomingBookings
              .length === 0 && (
              <div
                style={{
                  ...styles.empty,
                  padding:
                    "25px 0",
                }}
              >
                Δεν υπάρχουν
                επόμενες κρατήσεις.
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  /* =====================================================
     CALENDAR
  ===================================================== */

  function Calendar() {
    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>
              Calendar
            </h1>

            <div
              style={
                styles.headingSub
              }
            >
              Το ημερήσιο πρόγραμμα
              της επιχείρησης
            </div>
          </div>

          <button
            style={
              styles.smallButton
            }
            onClick={() =>
              setCalendarDate(
                new Date()
              )
            }
          >
            Σήμερα
          </button>
        </div>

        <div style={styles.panel}>
          <div
            style={
              styles.dayStrip
            }
          >
            {daySelector.map(
              (item, index) => (
                <div
                  key={item.key}
                  style={{
                    ...styles.dayCard,
                    ...(getDateKey(
                      calendarDate
                    ) ===
                    item.key
                      ? styles.dayCardActive
                      : {}),
                  }}
                  onClick={() =>
                    setCalendarDate(
                      item.date
                    )
                  }
                >
                  <div
                    style={
                      styles.dayName
                    }
                  >
                    {index === 0
                      ? "ΣΗΜΕΡΑ"
                      : index ===
                        1
                      ? "ΑΥΡΙΟ"
                      : getShortDayName(
                          item.date
                        )}
                  </div>

                  <div
                    style={
                      styles.dayNumber
                    }
                  >
                    {
                      item.date.getDate()
                    }
                  </div>

                  <div
                    style={
                      styles.dayCount
                    }
                  >
                    {
                      item.bookings
                        .length
                    }{" "}
                    ραντεβού
                  </div>
                </div>
              )
            )}
          </div>

          <div
            style={
              styles.panelHeader
            }
          >
            <div
              style={
                styles.calendarControls
              }
            >
              <button
                style={
                  styles.smallButton
                }
                onClick={() =>
                  changeDay(-1)
                }
              >
                ←
              </button>

              <div
                style={
                  styles.calendarDate
                }
              >
                {getDayName(
                  calendarDate
                )}{" "}
                {getDisplayDate(
                  calendarDate
                )}
              </div>

              <button
                style={
                  styles.smallButton
                }
                onClick={() =>
                  changeDay(1)
                }
              >
                →
              </button>
            </div>

            <div
              style={{
                color:
                  COLORS.muted,
                fontSize:
                  "9px",
              }}
            >
              {
                selectedDayBookings.length
              }{" "}
              ραντεβού
            </div>
          </div>

          {selectedDayBookings.length ===
          0 ? (
            <div
              style={
                styles.empty
              }
            >
              Δεν υπάρχουν ραντεβού
              για αυτή την ημέρα.
            </div>
          ) : (
            <div
              style={
                styles.bookingList
              }
            >
              {selectedDayBookings
                .slice()
                .sort((a, b) =>
                  String(
                    a.time
                  ).localeCompare(
                    String(
                      b.time
                    )
                  )
                )
                .map(
                  renderBooking
                )}
            </div>
          )}
        </div>
      </>
    );
  }

  /* =====================================================
     APPOINTMENTS
  ===================================================== */

  function Appointments() {
    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>
              Ραντεβού
            </h1>

            <div
              style={
                styles.headingSub
              }
            >
              Όλες οι κρατήσεις της
              επιχείρησης
            </div>
          </div>

          <button
            style={
              styles.smallButton
            }
            onClick={
              refreshBookings
            }
          >
            ↻ Ανανέωση
          </button>
        </div>

        <div
          style={{
            ...styles.panel,
            marginBottom: "18px",
            padding: "15px",
          }}
        >
          <input
            style={styles.search}
            placeholder="🔎 Αναζήτηση πελάτη, τηλεφώνου, υπηρεσίας, ημερομηνίας..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          <div
            style={{
              ...styles.filterRow,
              marginTop: "10px",
            }}
          >
            {[
              ["all", "Όλα"],
              [
                "confirmed",
                "Επιβεβαιωμένα",
              ],
              [
                "completed",
                "Ολοκληρωμένα",
              ],
              [
                "cancelled",
                "Ακυρωμένα",
              ],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  style={{
                    ...styles.filterButton,
                    ...(appointmentFilter ===
                    value
                      ? styles.filterActive
                      : {}),
                  }}
                  onClick={() =>
                    setAppointmentFilter(
                      value
                    )
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>

        <div style={styles.panel}>
          <div
            style={
              styles.panelHeader
            }
          >
            <div>
              <div
                style={
                  styles.panelTitle
                }
              >
                Όλες οι κρατήσεις
              </div>

              <div
                style={
                  styles.panelSub
                }
              >
                {
                  filteredBookings.length
                }{" "}
                αποτελέσματα
              </div>
            </div>
          </div>

          {filteredBookings.length ===
          0 ? (
            <div
              style={
                styles.empty
              }
            >
              Δεν βρέθηκαν ραντεβού.
            </div>
          ) : (
            <div
              style={
                styles.bookingList
              }
            >
              {filteredBookings
                .slice()
                .reverse()
                .map(
                  renderBooking
                )}
            </div>
          )}
        </div>
      </>
    );
  }

  /* =====================================================
     CANCELLATIONS
  ===================================================== */

  function Cancellations() {
    const cancellations =
      bookings.filter(
        (booking) =>
          getBookingStatus(
            booking
          ) === "cancelled"
      );

    const cancellationRevenue =
      cancellations.reduce(
        (sum, booking) =>
          sum + getPrice(booking),
        0
      );

    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>
              Ακυρώσεις
            </h1>

            <div
              style={
                styles.headingSub
              }
            >
              Ιστορικό ακυρωμένων
              ραντεβού
            </div>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div
              style={
                styles.statIcon
              }
            >
              ×
            </div>

            <div
              style={
                styles.statLabel
              }
            >
              ΣΥΝΟΛΙΚΕΣ ΑΚΥΡΩΣΕΙΣ
            </div>

            <div
              style={{
                ...styles.statValue,
                color: COLORS.red,
              }}
            >
              {
                cancellations.length
              }
            </div>
          </div>

          <div style={styles.stat}>
            <div
              style={
                styles.statIcon
              }
            >
              %
            </div>

            <div
              style={
                styles.statLabel
              }
            >
              CANCELLATION RATE
            </div>

            <div
              style={styles.statValue}
            >
              {
                analytics.cancellationRate
              }
              %
            </div>
          </div>

          <div style={styles.stat}>
            <div
              style={
                styles.statIcon
              }
            >
              €
            </div>

            <div
              style={
                styles.statLabel
              }
            >
              ΑΞΙΑ ΑΚΥΡΩΜΕΝΩΝ
            </div>

            <div
              style={styles.statValue}
            >
              €
              {cancellationRevenue.toFixed(
                2
              )}
            </div>
          </div>

          <div style={styles.stat}>
            <div
              style={
                styles.statIcon
              }
            >
              📊
            </div>

            <div
              style={
                styles.statLabel
              }
            >
              ΕΝΕΡΓΑ ΡΑΝΤΕΒΟΥ
            </div>

            <div
              style={styles.statValue}
            >
              {
                statistics.confirmed +
                statistics.completed
              }
            </div>
          </div>
        </div>

        <div style={styles.panel}>
          <div
            style={
              styles.panelHeader
            }
          >
            <div>
              <div
                style={
                  styles.panelTitle
                }
              >
                Ιστορικό ακυρώσεων
              </div>

              <div
                style={
                  styles.panelSub
                }
              >
                Όλα τα ακυρωμένα
                ραντεβού
              </div>
            </div>
          </div>

          {cancellations.length ===
          0 ? (
            <div
              style={
                styles.empty
              }
            >
              Δεν υπάρχουν
              ακυρωμένα ραντεβού.
            </div>
          ) : (
            <div
              style={
                styles.bookingList
              }
            >
              {cancellations
                .slice()
                .reverse()
                .map(
                  renderBooking
                )}
            </div>
          )}
        </div>
      </>
    );
  }

  /* =====================================================
     CLIENTS
  ===================================================== */

  function Clients() {
    const filteredClients =
      clients.filter(
        (client) =>
          normalize(
            client.name
          ).includes(
            normalize(search)
          ) ||
          normalize(
            client.phone
          ).includes(
            normalize(search)
          ) ||
          normalize(
            client.email
          ).includes(
            normalize(search)
          )
      );

    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>
              Πελατολόγιο
            </h1>

            <div
              style={
                styles.headingSub
              }
            >
              Όλοι οι πελάτες που έχουν
              αλληλεπιδράσει με τη NELA
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.panel,
            marginBottom: "18px",
            padding: "15px",
          }}
        >
          <input
            style={styles.search}
            placeholder="🔎 Αναζήτηση ονόματος, τηλεφώνου ή email..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>

        <div style={styles.panel}>
          {filteredClients.length ===
          0 ? (
            <div
              style={
                styles.empty
              }
            >
              Δεν βρέθηκαν πελάτες.
            </div>
          ) : (
            <div
              style={
                styles.clientGrid
              }
            >
              {filteredClients.map(
                (client) => (
                  <div
                    key={
                      client.id
                    }
                    style={
                      styles.clientCard
                    }
                    onClick={() =>
                      setSelectedClient(
                        client
                      )
                    }
                  >
                    <div
                      style={
                        styles.clientAvatar
                      }
                    >
                      {getInitials(
                        client.name
                      )}
                    </div>

                    <div
                      style={
                        styles.clientName
                      }
                    >
                      {client.name}
                    </div>

                    <div
                      style={
                        styles.clientPhone
                      }
                    >
                      {client.phone}
                    </div>

                    <div
                      style={{
                        ...styles.clientPhone,
                        marginTop:
                          "3px",
                      }}
                    >
                      {client.email}
                    </div>

                    <div
                      style={
                        styles.clientStats
                      }
                    >
                      <span>
                        {
                          client
                            .bookings
                            .length
                        }{" "}
                        ραντεβού
                      </span>

                      <span>
                        €
                        {
                          client.totalSpent
                        }
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  /* =====================================================
     ANALYTICS
  ===================================================== */

  function Analytics() {
    const maxDay = Math.max(
      ...Object.values(
        analytics.dayCounts
      ),
      1
    );

    const maxHour = Math.max(
      ...Object.values(
        analytics.hourCounts
      ),
      1
    );

    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>
              Analytics
            </h1>

            <div
              style={
                styles.headingSub
              }
            >
              Αναλυτικά στοιχεία
              λειτουργίας της
              επιχείρησης
            </div>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div
              style={
                styles.statLabel
              }
            >
              ΣΥΝΟΛΙΚΑ ΡΑΝΤΕΒΟΥ
            </div>

            <div
              style={styles.statValue}
            >
              {
                statistics.total
              }
            </div>
          </div>

          <div style={styles.stat}>
            <div
              style={
                styles.statLabel
              }
            >
              ΝΕΟΙ ΠΕΛΑΤΕΣ
            </div>

            <div
              style={styles.statValue}
            >
              {
                analytics.newClients
              }
            </div>
          </div>

          <div style={styles.stat}>
            <div
              style={
                styles.statLabel
              }
            >
              ΕΠΑΝΑΛΑΜΒΑΝΟΜΕΝΟΙ
            </div>

            <div
              style={styles.statValue}
            >
              {
                analytics.returningClients
              }
            </div>
          </div>

          <div style={styles.stat}>
            <div
              style={
                styles.statLabel
              }
            >
              ΜΕΣΟ TICKET
            </div>

            <div
              style={styles.statValue}
            >
              €{analytics.averageTicket}
            </div>
          </div>
        </div>

        <div
          style={styles.grid2}
        >
          <div
            style={
              styles.miniPanel
            }
          >
            <div
              style={
                styles.miniTitle
              }
            >
              Ραντεβού ανά ημέρα
            </div>

            <div
              style={
                styles.miniSub
              }
            >
              Ποια ημέρα εμφανίζει
              μεγαλύτερη κίνηση
            </div>

            {Object.entries(
              analytics.dayCounts
            ).map(
              ([day, count]) => (
                <div
                  key={day}
                  style={
                    styles.barRow
                  }
                >
                  <div
                    style={
                      styles.barTop
                    }
                  >
                    <span>
                      {day}
                    </span>

                    <span>
                      {count}
                    </span>
                  </div>

                  <div
                    style={
                      styles.barTrack
                    }
                  >
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${Math.max(
                          5,
                          (count /
                            maxDay) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )
            )}

            {Object.keys(
              analytics.dayCounts
            ).length === 0 && (
              <div
                style={{
                  ...styles.empty,
                  padding:
                    "35px 0",
                }}
              >
                Δεν υπάρχουν
                αρκετά δεδομένα.
              </div>
            )}
          </div>

          <div
            style={
              styles.miniPanel
            }
          >
            <div
              style={
                styles.miniTitle
              }
            >
              Δημοφιλέστερες ώρες
            </div>

            <div
              style={
                styles.miniSub
              }
            >
              Ώρες με τις περισσότερες
              κρατήσεις
            </div>

            {Object.entries(
              analytics.hourCounts
            )
              .sort(
                (a, b) =>
                  b[1] - a[1]
              )
              .slice(0, 8)
              .map(
                ([hour, count]) => (
                  <div
                    key={hour}
                    style={
                      styles.barRow
                    }
                  >
                    <div
                      style={
                        styles.barTop
                      }
                    >
                      <span>
                        {hour}
                      </span>

                      <span>
                        {count}
                      </span>
                    </div>

                    <div
                      style={
                        styles.barTrack
                      }
                    >
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${Math.max(
                            5,
                            (count /
                              maxHour) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}

            {Object.keys(
              analytics.hourCounts
            ).length === 0 && (
              <div
                style={{
                  ...styles.empty,
                  padding:
                    "35px 0",
                }}
              >
                Δεν υπάρχουν
                δεδομένα.
              </div>
            )}
          </div>
        </div>

        <div
          style={styles.panel}
        >
          <div
            style={
              styles.panelHeader
            }
          >
            <div>
              <div
                style={
                  styles.panelTitle
                }
              >
                Υπηρεσίες
              </div>

              <div
                style={
                  styles.panelSub
                }
              >
                Ποιες υπηρεσίες
                ζητούν περισσότερο οι
                πελάτες
              </div>
            </div>
          </div>

          {analytics
            .popularServices
            .map(
              ([service, count]) => (
                <div
                  key={service}
                  style={
                    styles.serviceCard
                  }
                >
                  <div>
                    <div
                      style={
                        styles.serviceName
                      }
                    >
                      {service}
                    </div>

                    <div
                      style={
                        styles.serviceMeta
                      }
                    >
                      {count}{" "}
                      ραντεβού
                    </div>
                  </div>

                  <div
                    style={
                      styles.servicePrice
                    }
                  >
                    {Math.round(
                      (count /
                        Math.max(
                          statistics
                            .total,
                          1
                        )) *
                        100
                    )}
                    %
                  </div>
                </div>
              )
            )}
        </div>
      </>
    );
  }

  /* =====================================================
     SERVICES
  ===================================================== */

  function Services() {
    const services = {};

    bookings.forEach(
      (booking) => {
        const name =
          booking.service ||
          "Άγνωστη υπηρεσία";

        if (!services[name]) {
          services[name] = {
            name,
            count: 0,
            revenue: 0,
          };
        }

        services[name].count +=
          1;

        if (
          getBookingStatus(
            booking
          ) !== "cancelled"
        ) {
          services[name].revenue +=
            getPrice(booking);
        }
      }
    );

    const serviceList =
      Object.values(
        services
      );

    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>
              Υπηρεσίες
            </h1>

            <div
              style={
                styles.headingSub
              }
            >
              Η απόδοση των υπηρεσιών
              σας
            </div>
          </div>
        </div>

        <div style={styles.panel}>
          <div
            style={
              styles.panelHeader
            }
          >
            <div>
              <div
                style={
                  styles.panelTitle
                }
              >
                Υπηρεσίες της NELA
              </div>

              <div
                style={
                  styles.panelSub
                }
              >
                Υπηρεσίες που
                εμφανίζονται στα
                ραντεβού
              </div>
            </div>
          </div>

          {serviceList.length ===
          0 ? (
            <div
              style={
                styles.empty
              }
            >
              Δεν υπάρχουν ακόμα
              δεδομένα υπηρεσιών.
            </div>
          ) : (
            serviceList
              .sort(
                (a, b) =>
                  b.count -
                  a.count
              )
              .map(
                (service) => (
                  <div
                    key={
                      service.name
                    }
                    style={
                      styles.serviceCard
                    }
                  >
                    <div>
                      <div
                        style={
                          styles.serviceName
                        }
                      >
                        {
                          service.name
                        }
                      </div>

                      <div
                        style={
                          styles.serviceMeta
                        }
                      >
                        {
                          service.count
                        }{" "}
                        κρατήσεις
                        {" • "}
                        €{" "}
                        {service.revenue.toFixed(
                          2
                        )}{" "}
                        έσοδα
                      </div>
                    </div>

                    <div
                      style={
                        styles.servicePrice
                      }
                    >
                      {
                        service.count
                      }
                    </div>
                  </div>
                )
              )
          )}
        </div>
      </>
    );
  }

  /* =====================================================
     SETTINGS
  ===================================================== */

  function Settings() {
    return (
      <>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.heading}>
              Ρυθμίσεις
            </h1>

            <div
              style={
                styles.headingSub
              }
            >
              Στοιχεία και ρυθμίσεις
              επιχείρησης
            </div>
          </div>
        </div>

        <div style={styles.panel}>
          <div
            style={
              styles.panelHeader
            }
          >
            <div>
              <div
                style={
                  styles.panelTitle
                }
              >
                Business profile
              </div>

              <div
                style={
                  styles.panelSub
                }
              >
                Οι βασικές πληροφορίες
                της επιχείρησης
              </div>
            </div>
          </div>

          <div
            style={
              styles.settingsGrid
            }
          >
            <div style={styles.field}>
              <label
                style={
                  styles.fieldLabel
                }
              >
                ΟΝΟΜΑ ΕΠΙΧΕΙΡΗΣΗΣ
              </label>

              <input
                style={styles.input}
                value={
                  settings.businessName
                }
                onChange={(event) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      businessName:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </div>

            <div style={styles.field}>
              <label
                style={
                  styles.fieldLabel
                }
              >
                ΤΗΛΕΦΩΝΟ
              </label>

              <input
                style={styles.input}
                value={
                  settings.phone
                }
                onChange={(event) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      phone:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </div>

            <div style={styles.field}>
              <label
                style={
                  styles.fieldLabel
                }
              >
                EMAIL
              </label>

              <input
                style={styles.input}
                value={
                  settings.email
                }
                onChange={(event) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      email:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </div>

            <div style={styles.field}>
              <label
                style={
                  styles.fieldLabel
                }
              >
                ΔΙΕΥΘΥΝΣΗ
              </label>

              <input
                style={styles.input}
                value={
                  settings.address
                }
                onChange={(event) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      address:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </div>

            <div
              style={{
                ...styles.field,
                ...styles.fieldFull,
              }}
            >
              <label
                style={
                  styles.fieldLabel
                }
              >
                ΠΟΛΙΤΙΚΗ ΑΚΥΡΩΣΕΩΝ
              </label>

              <textarea
                style={{
                  ...styles.input,
                  ...styles.textarea,
                }}
                value={
                  settings.cancellationPolicy
                }
                onChange={(event) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      cancellationPolicy:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </div>

            <div
              style={{
                ...styles.field,
                ...styles.fieldFull,
              }}
            >
              <button
                style={
                  styles.close
                }
                onClick={
                  saveSettings
                }
              >
                ΑΠΟΘΗΚΕΥΣΗ ΡΥΘΜΙΣΕΩΝ
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* =====================================================
     PAGE CONTENT
  ===================================================== */

  function renderPage() {
    if (
      activePage ===
      "calendar"
    ) {
      return Calendar();
    }

    if (
      activePage ===
      "appointments"
    ) {
      return Appointments();
    }

    if (
      activePage ===
      "cancellations"
    ) {
      return Cancellations();
    }

    if (
      activePage ===
      "clients"
    ) {
      return Clients();
    }

    if (
      activePage ===
      "analytics"
    ) {
      return Analytics();
    }

    if (
      activePage ===
      "services"
    ) {
      return Services();
    }

    if (
      activePage ===
      "settings"
    ) {
      return Settings();
    }

    return Dashboard();
  }

  /* =====================================================
     MAIN UI
  ===================================================== */

  return (
    <div style={styles.page}>
      {/* SIDEBAR */}

      <aside
        style={styles.sidebar}
      >
        <div style={styles.brand}>
          <div
            style={styles.logo}
          >
            N
          </div>

          <div>
            <div
              style={
                styles.brandName
              }
            >
              NELA
            </div>

            <div
              style={
                styles.brandSub
              }
            >
              BUSINESS CENTER
            </div>
          </div>
        </div>

        <nav style={styles.nav}>
          <div
            style={
              styles.navSection
            }
          >
            OVERVIEW
          </div>

          <button
            style={{
              ...styles.navButton,
              ...(activePage ===
              "dashboard"
                ? styles.navActive
                : {}),
            }}
            onClick={() =>
              goTo(
                "dashboard"
              )
            }
          >
            ◈ &nbsp; Dashboard
          </button>

          <button
            style={{
              ...styles.navButton,
              ...(activePage ===
              "calendar"
                ? styles.navActive
                : {}),
            }}
            onClick={() =>
              goTo("calendar")
            }
          >
            ◷ &nbsp; Calendar
          </button>

          <div
            style={
              styles.navSection
            }
          >
            MANAGEMENT
          </div>

          <button
            style={{
              ...styles.navButton,
              ...(activePage ===
              "appointments"
                ? styles.navActive
                : {}),
            }}
            onClick={() =>
              goTo(
                "appointments"
              )
            }
          >
            ◉ &nbsp; Ραντεβού
          </button>

          <button
            style={{
              ...styles.navButton,
              ...(activePage ===
              "cancellations"
                ? styles.navActive
                : {}),
            }}
            onClick={() =>
              goTo(
                "cancellations"
              )
            }
          >
            × &nbsp; Ακυρώσεις
          </button>

          <button
            style={{
              ...styles.navButton,
              ...(activePage ===
              "clients"
                ? styles.navActive
                : {}),
            }}
            onClick={() =>
              goTo("clients")
            }
          >
            ◉ &nbsp; Πελατολόγιο
          </button>

          <div
            style={
              styles.navSection
            }
          >
            BUSINESS
          </div>

          <button
            style={{
              ...styles.navButton,
              ...(activePage ===
              "analytics"
                ? styles.navActive
                : {}),
            }}
            onClick={() =>
              goTo("analytics")
            }
          >
            ◌ &nbsp; Analytics
          </button>

          <button
            style={{
              ...styles.navButton,
              ...(activePage ===
              "services"
                ? styles.navActive
                : {}),
            }}
            onClick={() =>
              goTo("services")
            }
          >
            ✦ &nbsp; Υπηρεσίες
          </button>

          <button
            style={{
              ...styles.navButton,
              ...(activePage ===
              "settings"
                ? styles.navActive
                : {}),
            }}
            onClick={() =>
              goTo("settings")
            }
          >
            ⚙ &nbsp; Ρυθμίσεις
          </button>
        </nav>

        <div
          style={
            styles.sidebarBottom
          }
        >
          NELA BUSINESS CENTER
          <br />
          PRIVATE AI RECEPTION
          <br />
          <br />
          {getTodayText()}
        </div>
      </aside>

      {/* MAIN */}

      <main style={styles.main}>
        {renderPage()}
      </main>

      {/* BOOKING MODAL */}

      {selectedBooking && (
        <div
          style={
            styles.modalOverlay
          }
          onClick={() =>
            setSelectedBooking(
              null
            )
          }
        >
          <div
            style={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              style={
                styles.modalTitle
              }
            >
              Στοιχεία ραντεβού
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Όνομα
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedBooking.name ||
                  "—"
                }
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Τηλέφωνο
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedBooking.phone ||
                  "—"
                }
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Email
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedBooking.email ||
                  "—"
                }
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Υπηρεσία
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedBooking.service ||
                  "—"
                }
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Ημέρα
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedBooking.date ||
                  "—"
                }
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Ώρα
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedBooking.time ||
                  "—"
                }
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Τιμή
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                €{getPrice(
                  selectedBooking
                ).toFixed(2)}
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Κατάσταση
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {getStatusLabel(
                  getBookingStatus(
                    selectedBooking
                  )
                )}
              </span>
            </div>

            <div
              style={{
                marginTop:
                  "20px",
                color:
                  COLORS.goldLight,
                fontFamily:
                  "Georgia, serif",
                fontSize:
                  "14px",
              }}
            >
              Αλλαγή κατάστασης
            </div>

            <div
              style={{
                ...styles.filterRow,
                marginTop:
                  "10px",
              }}
            >
              <button
                style={
                  styles.filterButton
                }
                onClick={() =>
                  updateBookingStatus(
                    selectedBooking,
                    "confirmed"
                  )
                }
              >
                Επιβεβαιωμένο
              </button>

              <button
                style={
                  styles.filterButton
                }
                onClick={() =>
                  updateBookingStatus(
                    selectedBooking,
                    "completed"
                  )
                }
              >
                Ολοκληρωμένο
              </button>

              <button
                style={{
                  ...styles.filterButton,
                  color:
                    COLORS.red,
                }}
                onClick={() =>
                  updateBookingStatus(
                    selectedBooking,
                    "cancelled"
                  )
                }
              >
                Ακυρωμένο
              </button>
            </div>

            <div
              style={
                styles.modalActions
              }
            >
              <button
                style={
                  styles.secondaryButton
                }
                onClick={() =>
                  editBooking(
                    selectedBooking
                  )
                }
              >
                Αλλαγή
              </button>

              <button
                style={
                  styles.close
                }
                onClick={() =>
                  setSelectedBooking(
                    null
                  )
                }
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT MODAL */}

      {selectedClient && (
        <div
          style={
            styles.modalOverlay
          }
          onClick={() =>
            setSelectedClient(
              null
            )
          }
        >
          <div
            style={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              style={
                styles.modalTitle
              }
            >
              {selectedClient.name}
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Τηλέφωνο
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedClient.phone
                }
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Email
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedClient.email
                }
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Ραντεβού
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedClient
                    .bookings
                    .length
                }
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Συνολικές αγορές
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                €
                {selectedClient.totalSpent.toFixed(
                  2
                )}
              </span>
            </div>

            <div
              style={
                styles.modalRow
              }
            >
              <span
                style={
                  styles.modalLabel
                }
              >
                Τελευταία επίσκεψη
              </span>

              <span
                style={
                  styles.modalValue
                }
              >
                {
                  selectedClient.lastVisit
                }
              </span>
            </div>

            <div
              style={{
                marginTop:
                  "22px",
                color:
                  COLORS.goldLight,
                fontFamily:
                  "Georgia, serif",
                fontSize:
                  "15px",
              }}
            >
              Ιστορικό ραντεβού
            </div>

            <div
              style={{
                marginTop:
                  "10px",
              }}
            >
              {selectedClient.bookings
                .slice()
                .reverse()
                .map(
                  (booking) => (
                    <div
                      key={
                        booking.id
                      }
                      style={{
                        padding:
                          "11px 0",
                        borderBottom:
                          "1px solid rgba(243,223,170,.07)",
                        fontSize:
                          "10px",
                      }}
                    >
                      <span
                        style={{
                          color:
                            COLORS.gold,
                        }}
                      >
                        {
                          booking.date
                        }
                      </span>

                      {" • "}

                      {
                        booking.time
                      }

                      {" • "}

                      {
                        booking.service
                      }

                      {" • €"}

                      {
                        booking.price ||
                        0
                      }

                      <div
                        style={{
                          marginTop:
                            "5px",
                          color:
                            "#69737a",
                          fontSize:
                            "8px",
                        }}
                      >
                        {getStatusLabel(
                          getBookingStatus(
                            booking
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
            </div>

            <button
              style={{
                ...styles.close,
                marginTop:
                  "20px",
              }}
              onClick={() =>
                setSelectedClient(
                  null
                )
              }
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      )}
    </div>
  );
}