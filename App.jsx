import { useEffect, useMemo, useRef, useState } from "react";
import Admin from "./Admin";
import businessData from "./businessData";
import LandingPage from "./LandingPage.jsx";
import { NELA_LOGO_DATA } from "./NelaLogo.js";

/* =========================================================
   NELA — PREMIUM AI RECEPTIONIST
   Persistent customer memory
   Smart booking engine
   Premium dark / gold interface
   ========================================================= */

function getBusinessConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("nelaBusinessSettings") || "null");
    return saved && typeof saved === "object" ? { ...businessData, ...saved } : businessData;
  } catch {
    return businessData;
  }
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname) ? "http://localhost:3001" : "")
).replace(/\/+$/, "").replace(/\/chat$/i, "");

const CHAT_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/chat` : null;

const COLORS = {
  gold: "#d6b76a",
  goldLight: "#f4e3b0",
  goldDark: "#9d762d",

  black: "#020304",
  dark: "#0b0806",
  panel: "#15100b",
  panel2: "#1d160f",

  text: "#eee9dc",
  muted: "#8d969d",

  green: "#8fcf9b",
  red: "#d98787",
};



/* =========================================================
   STORAGE KEYS
   ========================================================= */

const BOOKINGS_KEY = "nelaBookings";
const CLIENTS_KEY = "nelaClients";
const HISTORY_KEY = "nelaConversationHistory";
const CONTEXT_HISTORY_KEY = "nelaConversationContext";
const MEMORY_KEY = "nelaClientMemory";

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

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
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {
    console.warn(
      "NELA: localStorage unavailable."
    );
  }
}

function createId() {
  return (
    Date.now() +
    Math.random()
      .toString(36)
      .slice(2)
  );
}

/* =========================================================
   DATE ENGINE
   ========================================================= */

const WEEKDAYS = [
  "κυριακη",
  "δευτερα",
  "τριτη",
  "τεταρτη",
  "πεμπτη",
  "παρασκευη",
  "σαββατο",
];

const WEEKDAY_DISPLAY = {
  κυριακη: "Κυριακή",
  δευτερα: "Δευτέρα",
  τριτη: "Τρίτη",
  τεταρτη: "Τετάρτη",
  πεμπτη: "Πέμπτη",
  παρασκευη: "Παρασκευή",
  σαββατο: "Σάββατο",
};

function getDateFromText(text) {
  const normalized = normalizeText(text);

  if (normalized.includes("μεθαυριο")) {
    return "Μεθαύριο";
  }

  if (normalized.includes("αυριο")) {
    return "Αύριο";
  }

  if (normalized.includes("σημερα")) {
    return "Σήμερα";
  }

  for (const day of WEEKDAYS) {
    if (normalized.includes(day)) {
      return WEEKDAY_DISPLAY[day];
    }
  }

  return null;
}

/* =========================================================
   TIME ENGINE
   ========================================================= */

function extractTime(text) {
  const value = cleanText(text);

  const colonMatch = value.match(
    /(?:στις|στη|ωρα|ώρα)?\s*([0-2]?\d)\s*[:.]\s*([0-5]\d)/i
  );

  if (colonMatch) {
    const hour = Number(colonMatch[1]);
    const minute = Number(colonMatch[2]);

    if (
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return `${String(hour).padStart(
        2,
        "0"
      )}:${String(minute).padStart(2, "0")}`;
    }
  }

  const hourMatch = value.match(
    /(?:στις|στη|ωρα|ώρα)\s*([0-2]?\d)\b/i
  );

  if (hourMatch) {
    const hour = Number(hourMatch[1]);

    if (hour >= 0 && hour <= 23) {
      return `${String(hour).padStart(
        2,
        "0"
      )}:00`;
    }
  }

  const periodMatch = value.match(
    /\b([0-2]?\d)\s*(το πρωι|το πρωί|το μεσημερι|το μεσημέρι|το απογευμα|το απόγευμα|το βραδυ|το βράδυ)\b/i
  );

  if (periodMatch) {
    let hour = Number(periodMatch[1]);

    const normalized = normalizeText(
      periodMatch[2]
    );

    if (
      hour <= 11 &&
      (
        normalized.includes("απογευμα") ||
        normalized.includes("βραδυ")
      )
    ) {
      hour += 12;
    }

    if (hour >= 0 && hour <= 23) {
      return `${String(hour).padStart(
        2,
        "0"
      )}:00`;
    }
  }

  const simpleHour = value.match(
    /^\s*([0-2]?\d)\s*$/
  );

  if (simpleHour) {
    const hour = Number(simpleHour[1]);

    if (hour >= 0 && hour <= 23) {
      return `${String(hour).padStart(
        2,
        "0"
      )}:00`;
    }
  }

  return null;
}

/* =========================================================
   PHONE ENGINE
   ========================================================= */

function extractPhone(text) {
  const raw = String(text);

  const normalized = raw.replace(
    /[()\-\s]/g,
    ""
  );

  const plus30 = normalized.match(
    /\+30(69\d{8})/
  );

  if (plus30) {
    return plus30[1];
  }

  const digits = raw.replace(/\D/g, "");

  const direct = digits.match(
    /69\d{8}/
  );

  if (direct) {
    return direct[0];
  }

  return null;
}

/* =========================================================
   SERVICES
   ========================================================= */

function getServices() {
  if (
    !Array.isArray(
      getBusinessConfig()?.services
    )
  ) {
    return [];
  }

  return getBusinessConfig().services;
}

function findService(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return null;
  }

  const services = getServices();

  const exact = services.find(
    (service) => {
      const name = normalizeText(
        service?.name || ""
      );

      return (
        name &&
        (
          normalized.includes(name) ||
          name.includes(normalized)
        )
      );
    }
  );

  if (exact) {
    return exact;
  }

  return (
    services.find((service) => {
      const name = normalizeText(
        service?.name || ""
      );

      if (!name) {
        return false;
      }

      const words = name
        .split(" ")
        .filter(Boolean);

      return words.some(
        (word) =>
          word.length >= 3 &&
          normalized.includes(word)
      );
    }) || null
  );
}

/* =========================================================
   NAME ENGINE
   ========================================================= */

const NAME_PREFIXES = [
  "με λενε",
  "ονομαζομαι",
  "το ονομα μου ειναι",
  "ονομα μου ειναι",
  "ειμαι ο",
  "ειμαι η",
  "ειμαι",
  "ονομα:",
  "ονομα",
];

function containsBookingNoise(text) {
  const normalized =
    normalizeText(text);

  const forbidden = [
    "ραντεβου",
    "κρατηση",
    "τηλεφωνο",
    "τιμη",
    "τιμες",
    "ωρα",
    "σημερα",
    "αυριο",
    "μεθαυριο",
    "κουρεμα",
    "υπηρεσια",
    "υπηρεσιες",
    "ναι",
    "οχι",
    "θελω",
    "κλεισε",
    "κλεισω",
    "διαθεσιμοτητα",
    "appointment",
    "booking",
  ];

  return forbidden.some(
    (word) =>
      normalized === word ||
      normalized.includes(`${word} `) ||
      normalized.includes(` ${word}`)
  );
}

function isValidName(value) {
  const name = cleanText(value);

  if (!name) return false;

  if (
    name.length < 2 ||
    name.length > 80
  ) {
    return false;
  }

  if (/\d/.test(name)) {
    return false;
  }

  if (/@/.test(name)) {
    return false;
  }

  if (extractPhone(name)) {
    return false;
  }

  if (extractTime(name)) {
    return false;
  }

  if (getDateFromText(name)) {
    return false;
  }

  if (findService(name)) {
    return false;
  }

  if (containsBookingNoise(name)) {
    return false;
  }

  const words = name.split(" ");

  if (words.length > 5) {
    return false;
  }

  return true;
}

function extractName(text) {
  const original = cleanText(text);

  if (!original) {
    return null;
  }

  const normalized =
    normalizeText(original);

  for (const prefix of NAME_PREFIXES) {
    if (
      normalized.startsWith(prefix)
    ) {
      const startIndex =
        normalized.indexOf(prefix) +
        prefix.length;

      const name = original
        .slice(startIndex)
        .replace(
          /^[,:;\-\s]+/,
          ""
        )
        .trim();

      if (isValidName(name)) {
        return name;
      }
    }
  }

  if (isValidName(original)) {
    return original;
  }

  return null;
}

/* =========================================================
   INTENT
   ========================================================= */

function wantsBooking(text) {
  const normalized =
    normalizeText(text);

  const words = [
    "ραντεβου",
    "κρατηση",
    "κλεισω",
    "κλεισε",
    "κλεισουμε",
    "appointment",
    "booking",
    "διαθεσιμοτητα",
  ];

  return words.some(
    (word) =>
      normalized.includes(word)
  );
}

function wantsCancel(text) {
  const normalized =
    normalizeText(text);

  return (
    normalized.includes("ακυρωση") ||
    normalized.includes("ακυρωσε") ||
    normalized.includes("ακυρωσω")
  );
}

function wantsChange(text) {
  const normalized =
    normalizeText(text);

  return (
    normalized.includes("αλλαξε") ||
    normalized.includes("αλλαγη") ||
    normalized.includes("τελικα") ||
    normalized.includes("διορθωσε")
  );
}

function isYes(text) {
  const normalized =
    normalizeText(text);

  return [
    "ναι",
    "ναι σωστα",
    "σωστα",
    "σωστο",
    "σωστο ειναι",
    "επιβεβαιωνω",
    "επιβεβαιωση",
    "οκ",
    "ok",
    "yes",
    "βεβαια",
  ].includes(normalized);
}

function isNo(text) {
  const normalized =
    normalizeText(text);

  return [
    "οχι",
    "λαθος",
    "no",
  ].includes(normalized);
}

/* =========================================================
   BUSINESS HOURS
   ========================================================= */

function getTodayName() {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return days[
    new Date().getDay()
  ];
}

function toLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDateKey(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const normalized = normalizeText(raw);
  const date = new Date();
  if (normalized === "σημερα") return toLocalDateKey(date);
  if (normalized === "αυριο" || normalized === "μεθαυριο") {
    date.setDate(date.getDate() + (normalized === "αυριο" ? 1 : 2));
    return toLocalDateKey(date);
  }
  const weekday = WEEKDAYS.indexOf(normalized);
  if (weekday >= 0) {
    let delta = (weekday - date.getDay() + 7) % 7;
    if (!delta) delta = 7;
    date.setDate(date.getDate() + delta);
    return toLocalDateKey(date);
  }
  return raw;
}

function isTimeUnavailable(dateKey, time, duration = 30, currentBookings = []) {
  const minutes = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
  };
  const start = minutes(time);
  if (!Number.isFinite(start)) return false;
  const end = start + Math.max(15, Number(duration) || 30);
  return (Array.isArray(currentBookings) ? currentBookings : []).some((item) => {
    if (item.cancelled || normalizeText(item.status || "") === "cancelled") return false;
    if (getDateKey(item.date) !== dateKey) return false;
    const existingStart = minutes(item.time);
    if (!Number.isFinite(existingStart)) return false;
    const existingEnd = existingStart + Math.max(15, Number(item.duration || item.serviceDuration || 30));
    return start < existingEnd && existingStart < end;
  });
}

function getAvailableTimes(dateValue, currentBookings = [], duration = 30) {
  const dateKey = getDateKey(dateValue);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return [];
  const date = new Date(`${dateKey}T12:00:00`);
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const hours = getBusinessConfig()?.openingHours?.[dayNames[date.getDay()]];
  if (!hours || (typeof hours === "string" && normalizeText(hours).includes("κλειστα"))) return [];
  const isInFuture = (time) => {
    if (dateKey !== toLocalDateKey(new Date())) return true;
    const [hour, minute] = String(time).split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(hour, minute, 0, 0);
    return slotTime.getTime() > Date.now();
  };
  if (Array.isArray(hours)) {
    return hours.filter((time) => /^\d{1,2}:\d{2}$/.test(String(time)) && isInFuture(time) && !isTimeUnavailable(dateKey, time, duration, currentBookings));
  }
  if (typeof hours !== "string" || !hours.includes("-")) return [];
  const [opening, closing] = hours.split("-").map((value) => value.trim());
  const toMinutes = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
  };
  const start = toMinutes(opening);
  const end = toMinutes(closing);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const slots = [];
  for (let minute = start; minute + Math.max(15, Number(duration) || 30) <= end; minute += 30) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    if (isInFuture(time) && !isTimeUnavailable(dateKey, time, duration, currentBookings)) slots.push(time);
  }
  return slots;
}

/* =========================================================
   CUSTOMER MEMORY
   ========================================================= */

function loadClients() {
  return safeStorageGet(
    CLIENTS_KEY,
    []
  );
}

function findClient(
  clients,
  phone,
  name
) {
  const normalizedName =
    normalizeText(name || "");

  return clients.find(
    (client) => {
      if (
        phone &&
        client.phone === phone
      ) {
        return true;
      }

      if (
        normalizedName &&
        normalizeText(
          client.name || ""
        ) === normalizedName
      ) {
        return true;
      }

      return false;
    }
  );
}

function rememberClient(
  booking,
  existingClients
) {
  const clients = [
    ...existingClients,
  ];

  const existing = findClient(
    clients,
    booking.phone,
    booking.name
  );

  if (existing) {
    const index =
      clients.findIndex(
        (client) =>
          client.id ===
          existing.id
      );

    const history = Array.isArray(
      existing.bookingHistory
    )
      ? existing.bookingHistory
      : [];

    const services = Array.isArray(
      existing.services
    )
      ? existing.services
      : [];

    const updated = {
      ...existing,

      name:
        booking.name ||
        existing.name,

      phone:
        booking.phone ||
        existing.phone,

      visits:
        Number(existing.visits || 0) +
        1,

      lastVisit:
        new Date().toISOString(),

      lastBooking: booking,

      services: [
        ...new Set([
          ...services,
          booking.service,
        ]),
      ],

      bookingHistory: [
        ...history,
        booking,
      ].slice(-50),
    };

    clients[index] = updated;

    return clients;
  }

  clients.push({
    id: createId(),

    name:
      booking.name || "",

    phone:
      booking.phone || "",

    visits: 1,

    firstVisit:
      new Date().toISOString(),

    lastVisit:
      new Date().toISOString(),

    lastBooking: booking,

    services: booking.service
      ? [booking.service]
      : [],

    preferences: [],

    bookingHistory: [
      booking,
    ],
  });

  return clients;
}

/* =========================================================
   GLOBAL MEMORY
   ========================================================= */

function loadGlobalMemory() {
  return safeStorageGet(
    MEMORY_KEY,
    {
      name: null,
      phone: null,
      visits: 0,
      lastBooking: null,
      preferences: [],
    }
  );
}

/* =========================================================
   BOOKING
   ========================================================= */

function createEmptyBooking() {
  return {
    active: false,

    step: "idle",

    date: null,
    time: null,

    service: null,

    name: null,
    phone: null,

    confirm: false,
  };
}

function bookingProgress(data) {
  let completed = 0;

  if (data.service) completed++;
  if (data.date) completed++;
  if (data.time) completed++;
  if (data.name) completed++;
  if (data.phone) completed++;

  return completed;
}

/* =========================================================
   AI
   ========================================================= */

async function askNelaAI(
  message,
  memory,
  booking,
  clients
) {
  try {
    if (!CHAT_ENDPOINT) {
      throw new Error("NELA AI server is not configured. Set VITE_API_URL in the frontend environment.");
    }

    const response = await fetch(
      CHAT_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          memory,
          booking,
          clients,
          history: safeStorageGet(CONTEXT_HISTORY_KEY, []).map((item) => ({ role: item.role, content: item.content || item.text || "" })),
          business: getBusinessConfig(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "AI server error"
      );
    }

    const data =
      await response.json();

    return (
      data?.answer ||
      "Δεν κατάφερα να απαντήσω αυτή τη στιγμή."
    );
  } catch (error) {
    console.error(
      "NELA AI error:",
      error
    );

    return (
      "Δεν μπορώ να συνδεθώ με το AI αυτή τη στιγμή.\n\n" +
      "Μπορώ όμως να σας βοηθήσω άμεσα με ραντεβού, υπηρεσίες και ώρες λειτουργίας."
    );
  }
}

/* =========================================================
   APP
   ========================================================= */

function ChatApp() {
  const isAdmin =
    window.location.pathname === "/admin" ||
    new URLSearchParams(window.location.search).get("admin") === "true";

  const businessName =
    getBusinessConfig()?.businessName ||
    "NELA";

  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    try { localStorage.setItem("nelaTheme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event) => {
      if (event.key === "nelaTheme") {
        setTheme(event.newValue === "light" ? "light" : "dark");
      }
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);
  const lightTheme = theme === "light";

  /* =======================================================
     MESSAGES
     ======================================================= */

  const [messages, setMessages] = useState([]);

  const [input, setInput] =
    useState("");

  const [typing, setTyping] =
    useState(false);

  const [booking, setBooking] =
    useState(
      createEmptyBooking()
    );

  const [bookings, setBookings] =
    useState(() =>
      safeStorageGet(
        BOOKINGS_KEY,
        []
      )
    );

  const [clients, setClients] =
    useState(loadClients);

  const [memory, setMemory] =
    useState(loadGlobalMemory);

  const [currentClient, setCurrentClient] =
    useState(null);

  const chatRef =
    useRef(null);

  /* =======================================================
     SAVE CONTEXT WITHOUT RESTORING THE OLD CHAT WINDOW
     ======================================================= */

  function saveContextMessage(role, text) {
    const existingContext = safeStorageGet(CONTEXT_HISTORY_KEY, null);
    const legacyHistory = existingContext === null ? safeStorageGet(HISTORY_KEY, []) : existingContext;
    const stored = (Array.isArray(legacyHistory) ? legacyHistory : []).map((item) => ({
      role: item.role,
      content: item.content || item.text || item.message || "",
      timestamp: item.timestamp || new Date().toISOString(),
    })).filter((item) => ["user", "assistant"].includes(item.role) && item.content);
    const next = [...stored, {
      role,
      content: text,
      timestamp: new Date().toISOString(),
    }].slice(-30);
    safeStorageSet(CONTEXT_HISTORY_KEY, next);
  }

  /* =======================================================
     SAVE CLIENTS
     ======================================================= */

  useEffect(() => {
    safeStorageSet(
      CLIENTS_KEY,
      clients
    );
  }, [clients]);

  /* =======================================================
     SAVE GLOBAL MEMORY
     ======================================================= */

  useEffect(() => {
    safeStorageSet(
      MEMORY_KEY,
      memory
    );
  }, [memory]);

  /* =======================================================
     AUTO SCROLL
     ======================================================= */

  useEffect(() => {
    if (!chatRef.current) {
      return;
    }

    chatRef.current.scrollTo({
      top:
        chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [
    messages,
    typing,
  ]);

  /* =======================================================
     SERVICE BUTTONS
     ======================================================= */

  const serviceNames = useMemo(
    () =>
      getServices()
        .slice(0, 4)
        .map(
          (service) =>
            service?.name
        )
        .filter(Boolean),
    []
  );

  /* =======================================================
     ADD MESSAGE
     ======================================================= */

  function addMessage(role, text) {
    setMessages((current) => [...current, { id: createId(), role, text }]);
    saveContextMessage(role, text);
  }

  /* =======================================================
     IDENTIFY CLIENT
     ======================================================= */

  function identifyClient(
    phone,
    name
  ) {
    const found =
      findClient(
        clients,
        phone,
        name
      );

    if (found) {
      setCurrentClient(found);

      setMemory({
        name:
          found.name || null,

        phone:
          found.phone || null,

        visits:
          found.visits || 0,

        lastBooking:
          found.lastBooking ||
          null,

        preferences:
          found.preferences ||
          [],
      });

      return found;
    }

    return null;
  }

  /* =======================================================
     UPDATE MEMORY
     ======================================================= */

  function updateMemoryFromBooking(
    data
  ) {
    const bookingMemory = {
      name:
        data.name || null,

      phone:
        data.phone || null,

      service:
        data.service?.name ||
        null,

      date:
        data.date || null,

      time:
        data.time || null,

      price:
        data.service?.price ??
        null,

      timestamp:
        new Date().toISOString(),
    };

    setMemory(
      (current) => ({
        ...current,

        name:
          data.name ||
          current.name ||
          null,

        phone:
          data.phone ||
          current.phone ||
          null,

        visits:
          Number(
            current.visits || 0
          ) + 1,

        lastBooking:
          bookingMemory,
      })
    );
  }

  /* =======================================================
     CHECK AVAILABILITY
     ======================================================= */

  function isTimeBooked(
    date,
    time
  ) {
    if (!date || !time) {
      return false;
    }

    return isTimeUnavailable(
      getDateKey(date),
      time,
      booking.service?.duration || 30,
      bookings
    );
  }

  /* =======================================================
     SAVE BOOKING
     ======================================================= */

  function saveBooking(data) {
    const newBooking = {
      id: createId(),

      name:
        data.name || "",

      phone:
        data.phone || "",

      date:
        data.date || "",

      time:
        data.time || "",

      service:
        data.service?.name ||
        "",

      duration:
        Number(data.service?.duration || 30),

      price:
        data.service?.price ??
        "",

      createdAt:
        new Date().toISOString(),
    };

    if (
      isTimeBooked(
        newBooking.date,
        newBooking.time
      )
    ) {
      addMessage(
        "assistant",
        "⚠️ Η συγκεκριμένη ώρα φαίνεται ήδη κατειλημμένη.\n\n" +
          "Πείτε μου μία άλλη ώρα και θα συνεχίσουμε."
      );

      setBooking({
        ...data,
        confirm: false,
      });

      return;
    }

    const updatedBookings = [
      ...bookings,
      newBooking,
    ];

    setBookings(
      updatedBookings
    );

    safeStorageSet(
      BOOKINGS_KEY,
      updatedBookings
    );

    const updatedClients =
      rememberClient(
        newBooking,
        clients
      );

    setClients(
      updatedClients
    );

    const remembered =
      findClient(
        updatedClients,
        newBooking.phone,
        newBooking.name
      );

    setCurrentClient(
      remembered || null
    );

    updateMemoryFromBooking(
      data
    );

    setBooking(
      createEmptyBooking()
    );

    addMessage(
      "assistant",
      "✦ Η κράτησή σας ολοκληρώθηκε επιτυχώς.\n\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        `Υπηρεσία  ${newBooking.service}\n` +
        `Ημέρα     ${newBooking.date}\n` +
        `Ώρα       ${newBooking.time}\n` +
        `Όνομα     ${newBooking.name}\n` +
        `Τηλέφωνο  ${newBooking.phone}\n` +
        `Τιμή      €${newBooking.price}\n` +
        "━━━━━━━━━━━━━━━━━━━━\n\n" +
        `Σας ευχαριστούμε που επιλέξατε ${businessName}. ✦`
    );
  }

  /* =======================================================
     BOOKING SUMMARY
     ======================================================= */

  function getBookingSummary(
    data
  ) {
    return (
      "✦ Τελικός έλεγχος κράτησης\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      `Υπηρεσία   ${
        data.service?.name || "—"
      }\n` +
      `Ημέρα      ${
        data.date || "—"
      }\n` +
      `Ώρα        ${
        data.time || "—"
      }\n` +
      `Όνομα      ${
        data.name || "—"
      }\n` +
      `Τηλέφωνο   ${
        data.phone || "—"
      }\n` +
      `Τιμή       €${
        data.service?.price ??
        "—"
      }\n` +
      "━━━━━━━━━━━━━━━━━━━━\n\n" +
      "Είναι όλα σωστά;\n\n" +
      "Απαντήστε «ναι» για επιβεβαίωση ή πείτε μου τι θέλετε να αλλάξω."
    );
  }

  /* =======================================================
     BEGIN BOOKING
     ======================================================= */

  function beginBooking() {
    const remembered =
      memory;

    const initial = {
      ...createEmptyBooking(),

      active: true,

      name:
        remembered.name ||
        null,

      phone:
        remembered.phone ||
        null,
    };

    setBooking(initial);

    if (remembered.name) {
      addMessage(
        "assistant",
        `Βλέπω ότι έχουμε ξαναμιλήσει, ${remembered.name}. ✦\n\n` +
          `Έχω ήδη τα στοιχεία σας στη μνήμη μου${
            remembered.visits
              ? ` και βλέπω ${remembered.visits} προηγούμενες επισκέψεις`
              : ""
          }.\n\n` +
          "Μπορείτε να μου πείτε την υπηρεσία, την ημέρα και την ώρα που θέλετε."
      );
    } else {
      addMessage(
        "assistant",
        "Φυσικά. ✦\n\n" +
          "Πείτε μου την υπηρεσία, την ημέρα και την ώρα που θέλετε.\n\n" +
          "Για παράδειγμα:\n" +
          "«Κούρεμα Τρίτη στις 11»"
      );
    }
  }

  /* =======================================================
     CHANGE FIELD INTELLIGENCE
     ======================================================= */

  function applyChange(
    current,
    text
  ) {
    const updated = {
      ...current,
    };

    const service =
      findService(text);

    const time =
      extractTime(text);

    const date =
      getDateFromText(text);

    const phone =
      extractPhone(text);

    const name =
      extractName(text);

    if (service) {
      updated.service =
        service;
    }

    if (time) {
      updated.time =
        time;
    }

    if (date) {
      updated.date =
        date;
    }

    if (phone) {
      updated.phone =
        phone;

      const found =
        identifyClient(
          phone,
          null
        );

      if (found) {
        updated.name =
          found.name;
      }
    }

    if (
      name &&
      !service &&
      !time &&
      !date &&
      !phone
    ) {
      updated.name =
        name;

      const found =
        identifyClient(
          null,
          name
        );

      if (found) {
        updated.phone =
          found.phone ||
          updated.phone;
      }
    }

    return updated;
  }

  /* =======================================================
     SMART BOOKING PROCESSOR
     ======================================================= */

  function processBooking(
    text
  ) {
    let current = {
      ...booking,
      active: true,
    };

    if (wantsCancel(text)) {
      setBooking(
        createEmptyBooking()
      );

      addMessage(
        "assistant",
        "Η διαδικασία κράτησης ακυρώθηκε. ✦\n\n" +
          "Όποτε θέλετε, μπορούμε να ξεκινήσουμε μία νέα κράτηση."
      );

      return;
    }

    if (current.confirm) {
      if (isYes(text)) {
        saveBooking(current);
        return;
      }

      if (isNo(text)) {
        setBooking({
          ...current,
          confirm: false,
        });

        addMessage(
          "assistant",
          "Κανένα πρόβλημα. ✦\n\n" +
            "Πείτε μου τι θέλετε να αλλάξουμε.\n\n" +
            "Παράδειγμα:\n" +
            "«Τελικά στις 12»"
        );

        return;
      }

      current.confirm =
        false;
    }

    if (wantsChange(text)) {
      current.confirm =
        false;
    }

    current =
      applyChange(
        current,
        text
      );

    setBooking(current);

    if (!current.service) {
      addMessage(
        "assistant",
        "Βεβαίως. ✦\n\n" +
          "Ποια υπηρεσία θα θέλατε να κλείσετε;"
      );

      return;
    }

    if (!current.date) {
      addMessage(
        "assistant",
        `Έχω κρατήσει «${current.service.name}». ✓\n\n` +
          "Για ποια ημέρα θα θέλατε το ραντεβού;"
      );

      return;
    }

    if (!current.time) {
      const times =
        getAvailableTimes(current.date, bookings, current.service?.duration || 30);

      addMessage(
        "assistant",
        times.length
          ? "Επιλέξτε μία από τις διαθέσιμες ώρες παρακάτω. ✦"
          : "Δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημέρα. Επιλέξτε άλλη ημερομηνία."
      );

      return;
    }

    if (
      isTimeBooked(
        current.date,
        current.time
      )
    ) {
      addMessage(
        "assistant",
        `⚠️ Η ώρα ${current.time} για ${current.date} φαίνεται ήδη κατειλημμένη.\n\n` +
          "Δώστε μου μία άλλη ώρα."
      );

      setBooking({
        ...current,
        time: null,
      });

      return;
    }

    if (!current.name) {
      addMessage(
        "assistant",
        "Τέλεια. ✓\n\n" +
          "Ποιο είναι το ονοματεπώνυμό σας;"
      );

      return;
    }

    if (!current.phone) {
      addMessage(
        "assistant",
        `Ευχαριστώ, ${current.name}. ✓\n\n` +
          "Ποιο είναι το τηλέφωνό σας;"
      );

      return;
    }

    identifyClient(
      current.phone,
      current.name
    );

    const finalBooking = {
      ...current,
      confirm: true,
    };

    setBooking(
      finalBooking
    );

    addMessage(
      "assistant",
      getBookingSummary(
        finalBooking
      )
    );
  }

  /* =======================================================
     SEND MESSAGE
     ======================================================= */

  async function sendMessage(
    overrideText = null
  ) {
    const raw =
      overrideText !== null
        ? overrideText
        : input;

    const text =
      cleanText(raw);

    if (
      !text ||
      typing
    ) {
      return;
    }

    addMessage(
      "user",
      text
    );

    setInput("");

    if (booking.active) {
      processBooking(text);
      return;
    }

    if (wantsBooking(text)) {
      let firstBooking = {
        ...createEmptyBooking(),

        active: true,

        name:
          memory.name ||
          null,

        phone:
          memory.phone ||
          null,
      };

      firstBooking =
        applyChange(
          firstBooking,
          text
        );

      setBooking(
        firstBooking
      );

      if (
        !firstBooking.service
      ) {
        addMessage(
          "assistant",
          "Φυσικά. ✦\n\n" +
            "Ποια υπηρεσία θα θέλατε;"
        );

        return;
      }

      if (
        !firstBooking.date
      ) {
        addMessage(
          "assistant",
          `Κρατήθηκε «${firstBooking.service.name}». ✓\n\n` +
            "Για ποια ημέρα;"
        );

        return;
      }

      if (
        !firstBooking.time
      ) {
        addMessage(
          "assistant",
          "Τέλεια. ✓\n\n" +
            "Ποια ώρα σας εξυπηρετεί;"
        );

        return;
      }

      if (
        isTimeBooked(
          firstBooking.date,
          firstBooking.time
        )
      ) {
        addMessage(
          "assistant",
          "⚠️ Αυτή η ώρα φαίνεται ήδη κατειλημμένη.\n\n" +
            "Δώστε μου μία άλλη ώρα."
        );

        setBooking({
          ...firstBooking,
          time: null,
        });

        return;
      }

      if (
        !firstBooking.name
      ) {
        addMessage(
          "assistant",
          "Ποιο είναι το ονοματεπώνυμό σας;"
        );

        return;
      }

      if (
        !firstBooking.phone
      ) {
        addMessage(
          "assistant",
          `Ευχαριστώ, ${firstBooking.name}. ✓\n\n` +
            "Ποιο είναι το τηλέφωνό σας;"
        );

        return;
      }

      const finalBooking = {
        ...firstBooking,
        confirm: true,
      };

      setBooking(
        finalBooking
      );

      addMessage(
        "assistant",
        getBookingSummary(
          finalBooking
        )
      );

      return;
    }

    if (
      wantsCancel(text)
    ) {
      addMessage(
        "assistant",
        "Δεν υπάρχει ενεργή κράτηση προς ακύρωση.\n\n" +
          "Αν θέλετε, μπορώ να ξεκινήσω μία νέα κράτηση."
      );

      return;
    }

    const normalized =
      normalizeText(text);

    if (
      normalized.includes(
        "τι θυμασαι"
      ) ||
      normalized.includes(
        "με θυμασαι"
      ) ||
      normalized.includes(
        "τι ξερεις για μενα"
      )
    ) {
      if (
        memory.name ||
        memory.phone ||
        memory.lastBooking
      ) {
        addMessage(
          "assistant",
          "✦ Ναι, σας θυμάμαι.\n\n" +
            `Όνομα: ${
              memory.name ||
              "—"
            }\n` +
            `Τηλέφωνο: ${
              memory.phone ||
              "—"
            }\n` +
            `Επισκέψεις: ${
              memory.visits ||
              0
            }\n` +
            `Τελευταία υπηρεσία: ${
              memory.lastBooking
                ?.service ||
              "—"
            }\n\n` +
            "Η NELA κρατάει τα στοιχεία σας ώστε η επόμενη εξυπηρέτηση να είναι πιο γρήγορη."
        );
      } else {
        addMessage(
          "assistant",
          "✦ Δεν έχω αποθηκευμένα στοιχεία σας ακόμη.\n\n" +
            "Μετά την πρώτη σας κράτηση θα μπορώ να σας αναγνωρίζω."
        );
      }

      return;
    }

    setTyping(true);

    const answer =
      await askNelaAI(
        text,
        memory,
        booking,
        clients
      );

    setTyping(false);

    addMessage(
      "assistant",
      answer
    );
  }

  /* =======================================================
     ADMIN
     ======================================================= */

  if (isAdmin) {
    return <Admin />;
  }

  /* =======================================================
     UI
     ======================================================= */

  const progress =
    booking.active
      ? bookingProgress(
          booking
        )
      : 0;

  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() + index);
    const key = toLocalDateKey(date);
    const isPast = key < toLocalDateKey(new Date());
    return { key, date, isPast, slots: isPast ? [] : getAvailableTimes(key, bookings, booking.service?.duration || 30) };
  });

  function chooseBookingDate(dateKey) {
    setBooking({ ...booking, date: dateKey, time: null, confirm: false });
    addMessage("assistant", "Η ημέρα επιλέχθηκε. ✦ Τώρα διαλέξτε μία διαθέσιμη ώρα.");
  }

  function chooseBookingTime(time) {
    if (!booking.date || isTimeUnavailable(booking.date, time, booking.service?.duration || 30, bookings)) {
      addMessage("assistant", "Αυτή η ώρα δεν είναι πλέον διαθέσιμη. Επιλέξτε μία άλλη.");
      return;
    }
    const next = { ...booking, time, confirm: false };
    setBooking(next);
    if (!next.name) addMessage("assistant", "Τέλεια επιλογή. ✦ Ποιο είναι το ονοματεπώνυμό σας;");
    else if (!next.phone) addMessage("assistant", `Ευχαριστώ, ${next.name}. ✦ Ποιο είναι το τηλέφωνό σας;`);
    else {
      const finalBooking = { ...next, confirm: true };
      setBooking(finalBooking);
      addMessage("assistant", getBookingSummary(finalBooking));
    }
  }

  const styles = {
    page: {
      position: "fixed",
      inset: 0,

      width: "100vw",
      height: "100vh",

      overflow: "hidden",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      background: lightTheme
        ? "radial-gradient(circle at 15% 5%,rgba(190,145,55,.16),transparent 28%),linear-gradient(135deg,#f7f2e7,#e9dfca)"
        : "radial-gradient(circle at 15% 5%,rgba(214,183,106,.22),transparent 28%),radial-gradient(circle at 90% 95%,rgba(91,55,23,.24),transparent 30%),linear-gradient(135deg,#020304 0%,#100b07 45%,#030405 100%)",


      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },

    glowOne: {
      position: "absolute",

      width: "520px",
      height: "520px",

      borderRadius: "50%",

      background:
        "rgba(214,183,106,.055)",

      filter: "blur(110px)",

      top: "-250px",
      left: "-220px",

      pointerEvents: "none",
    },

    glowTwo: {
      position: "absolute",

      width: "500px",
      height: "500px",

      borderRadius: "50%",

      background:
        "rgba(93,62,27,.07)",

      filter: "blur(110px)",

      right: "-230px",
      bottom: "-230px",

      pointerEvents: "none",
    },

    shell: {
      position: "relative",

      width:
        "min(620px, calc(100vw - 20px))",

      height:
        "min(940px, calc(100vh - 20px))",

      display: "flex",
      flexDirection: "column",

      overflow: "hidden",

      borderRadius: "38px",

      /*
       * IMPORTANT:
       * Το shell είναι πλέον πιο διάφανο,
       * ώστε να περνάει το background.
       */

      background: lightTheme
        ? "linear-gradient(145deg,rgba(255,253,247,.98),rgba(246,239,222,.97))"
        : "linear-gradient(145deg,rgba(20,14,8,.98),rgba(4,3,2,.99))",

      backdropFilter:
        "blur(28px)",

      WebkitBackdropFilter:
        "blur(28px)",

      border: lightTheme ? "1px solid rgba(173,126,38,.52)" : "1px solid rgba(232,190,91,.62)",

      boxShadow: lightTheme
        ? "0 35px 90px rgba(85,61,20,.18), inset 0 1px rgba(255,255,255,.9), 0 0 55px rgba(184,137,43,.14)"
        : "0 60px 160px rgba(0,0,0,.82), inset 0 1px rgba(255,255,255,.07), 0 0 90px rgba(214,183,106,.14)",
    },

    header: {
      padding:
        "25px 27px 20px",

      background: lightTheme ? "linear-gradient(135deg,#fffdf7,#eee2c6)" : "linear-gradient(135deg,#030201,#24180b)",

      borderBottom:
        "1px solid rgba(243,223,170,.12)",

      backdropFilter:
        "blur(20px)",

      WebkitBackdropFilter:
        "blur(20px)",
    },

    brand: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
    },

    logo: {
      width: "62px",
      height: "62px",

      flexShrink: 0,

      borderRadius: "20px",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      overflow: "hidden",

      background: "#050505",

      boxShadow:
        "0 18px 45px rgba(214,183,106,.22), inset 0 1px rgba(255,255,255,.9)",
    },

    title: {
      color:
        COLORS.goldLight,

      fontFamily:
        "Georgia, serif",

      fontSize: "30px",

      letterSpacing: "5px",

      fontWeight: "500",
    },

    subtitle: {
      marginTop: "5px",

      color: lightTheme ? "#786039" : "#c9b477",

      fontSize: "8px",

      letterSpacing:
        "2.8px",

      fontWeight: "800",
    },

    online: {
      marginLeft: "auto",

      display: "flex",
      alignItems: "center",

      gap: "7px",

      color: lightTheme ? "#75613c" : "#d2c5a5",

      fontSize: "8px",

      letterSpacing:
        "1.5px",

      fontWeight: "800",
    },

    logout: {
      marginLeft: "10px",
      flexShrink: 0,
      border: "1px solid rgba(243,223,170,.28)",
      borderRadius: "999px",
      padding: "9px 13px",
      background: lightTheme ? "rgba(255,250,237,.94)" : "rgba(3,6,10,.92)",
      color: lightTheme ? "#795817" : "#f5d98e",
      fontSize: "9px",
      fontWeight: "700",
      letterSpacing: ".4px",
      cursor: "pointer",
    },

    onlineDot: {
      width: "7px",
      height: "7px",

      borderRadius: "50%",

      background:
        COLORS.gold,

      boxShadow:
        "0 0 15px rgba(215,181,94,.95)",
    },

    business: {
      padding:
        "12px 24px",

      color: lightTheme ? "#715b32" : "#e0d0aa",

      background: lightTheme ? "rgba(238,226,202,.9)" : "rgba(2,6,10,.92)",

      borderBottom:
        "1px solid rgba(243,223,170,.07)",

      fontSize: "10px",

      letterSpacing: ".6px",

      backdropFilter:
        "blur(18px)",

      WebkitBackdropFilter:
        "blur(18px)",
    },

    memoryBadge: {
      display: "inline-flex",

      alignItems: "center",

      gap: "5px",

      marginLeft: "10px",

      padding:
        "5px 9px",

      borderRadius:
        "999px",

      color: "#c8bb96",

      background:
        "rgba(214,183,106,.07)",

      border:
        "1px solid rgba(214,183,106,.13)",

      fontSize: "7px",

      letterSpacing: "1px",
    },

    progressBox: {
      padding:
        "10px 22px 11px",

      background: lightTheme ? "rgba(237,226,204,.92)" : "rgba(3,6,9,.94)",

      borderBottom:
        "1px solid rgba(243,223,170,.07)",

      backdropFilter:
        "blur(18px)",

      WebkitBackdropFilter:
        "blur(18px)",
    },

    progressTop: {
      display: "flex",

      justifyContent:
        "space-between",

      alignItems: "center",

      color: lightTheme ? "#765c2c" : "#d9bd78",

      fontSize: "8px",

      letterSpacing:
        "1.2px",

      fontWeight: "800",

      marginBottom: "7px",
    },

    progressTrack: {
      height: "3px",

      width: "100%",

      borderRadius: "99px",

      background:
        "rgba(255,255,255,.06)",

      overflow: "hidden",
    },

    progressFill: {
      height: "100%",

      borderRadius: "99px",

      width:
        `${Math.min(
          100,
          progress * 20
        )}%`,

      background:
        "linear-gradient(90deg,#9c762f,#f1d992,#fff1bd)",

      boxShadow:
        "0 0 12px rgba(214,183,106,.45)",

      transition:
        "width .35s ease",
    },

    /* =====================================================
       CHAT — ΠΛΗΡΩΣ ΔΙΑΦΑΝΟ
       ===================================================== */

    chat: {
      position: "relative",

      flex: 1,

      overflowY: "auto",

      padding:
        "27px 20px 20px",

      /*
       * ΠΟΛΥ ΣΗΜΑΝΤΙΚΟ:
       * Δεν υπάρχει πλέον background εδώ.
       * Το chat είναι πραγματικά transparent.
       */

      background:
        "transparent",

      scrollbarWidth: "thin",

      isolation: "isolate",
    },

    /* =====================================================
       NELA LOGO WATERMARK
       ===================================================== */

    logoBackdrop: {
      position: "absolute",

      left: "50%",
      top: "50%",

      transform:
        "translate(-50%, -50%)",

      /*
       * Μεγαλύτερο logo
       */

      width:
        "min(520px, 86%)",

      height:
        "auto",

      objectFit: "contain",

      /*
       * Αυτό είναι το σημαντικό opacity.
       * Το logo φαίνεται αλλά δεν ενοχλεί το chat.
       */

      opacity: 0.26,

      /*
       * Ελαφρύ χρυσό/φωτεινό αποτέλεσμα
       */

      filter:
        "brightness(1.15) contrast(1.05) saturate(.85)",

      pointerEvents:
        "none",

      userSelect:
        "none",

      zIndex: 0,

      display: "block",

      /*
       * Το logo δεν θα πιάνει clicks.
       */

      mixBlendMode:
        "screen",
    },

    /* Ελαφρύ σκοτεινό πέπλο πάνω από το logo */
    logoOverlay: {
      position: "absolute",

      inset: 0,

      zIndex: 1,

      pointerEvents: "none",

      background:
        "radial-gradient(circle at center, transparent 0%, rgba(2,4,7,.12) 55%, rgba(2,4,7,.28) 100%)",
    },

    messageRow: {
      position: "relative",

      zIndex: 3,

      display: "flex",

      width: "100%",

      marginBottom: "15px",
    },

    assistantBubble: {
      maxWidth: "87%",

      padding:
        "15px 18px",

      borderRadius:
        "22px 22px 22px 7px",

      color: lightTheme ? "#332712" : "#fff5dc",

      /*
       * Τα bubbles επίσης είναι διάφανα.
       */

      background: lightTheme
        ? "linear-gradient(145deg,#fffdf7,#f1e5ca)"
        : "linear-gradient(145deg,#2a1d0e,#100b06)",

      border: lightTheme ? "1px solid rgba(174,128,40,.52)" : "1px solid rgba(226,183,82,.5)",

      boxShadow:
        "0 16px 38px rgba(0,0,0,.27)",

      backdropFilter:
        "blur(16px)",

      WebkitBackdropFilter:
        "blur(16px)",

      whiteSpace:
        "pre-line",

      fontSize: "13.5px",

      lineHeight: "1.65",
    },

    userBubble: {
      maxWidth: "84%",

      padding:
        "14px 18px",

      borderRadius:
        "22px 22px 7px 22px",

      color: "#141109",

      background:
        "linear-gradient(145deg,#f7e8b5,#d9ba6b,#a77d31)",

      boxShadow:
        "0 16px 38px rgba(0,0,0,.32)",

      whiteSpace:
        "pre-line",

      fontSize: "13.5px",

      lineHeight: "1.6",
    },

    footer: {
      padding:
        "12px 14px 16px",

      background: lightTheme ? "rgba(250,246,235,.99)" : "rgba(2,3,4,.98)",

      borderTop: lightTheme ? "1px solid rgba(174,128,40,.5)" : "1px solid rgba(226,183,82,.5)",

      backdropFilter:
        "blur(25px)",

      WebkitBackdropFilter:
        "blur(25px)",
    },

    actions: {
      display: "flex",

      gap: "7px",

      overflowX: "auto",

      paddingBottom:
        "10px",

      scrollbarWidth:
        "none",
    },

    action: {
      flexShrink: 0,

      borderRadius:
        "999px",

      padding:
        "9px 14px",

      border: lightTheme ? "1px solid rgba(174,128,40,.58)" : "1px solid rgba(226,183,82,.58)",

      background: lightTheme ? "linear-gradient(145deg,#fffaf0,#f0e3c5)" : "linear-gradient(145deg,#2a1d0e,#100b06)",

      color: lightTheme ? "#76551a" : "#f3d990",

      fontSize: "9px",

      fontWeight: "700",

      cursor: "pointer",

      backdropFilter:
        "blur(12px)",
    },

    inputBox: {
      display: "flex",

      alignItems: "center",

      gap: "8px",

      padding:
        "5px 5px 5px 17px",

      borderRadius:
        "21px",

      background: lightTheme ? "rgba(255,252,243,.99)" : "rgba(12,12,10,.98)",

      border: lightTheme ? "1px solid rgba(174,128,40,.62)" : "1px solid rgba(226,183,82,.62)",

      boxShadow:
        "inset 0 1px rgba(255,255,255,.025), 0 12px 35px rgba(0,0,0,.22)",

      backdropFilter:
        "blur(18px)",

      WebkitBackdropFilter:
        "blur(18px)",
    },

    input: {
      flex: 1,

      minWidth: 0,

      border: "none",

      outline: "none",

      background:
        "transparent",

      color:
        COLORS.text,

      fontSize: "13px",

      padding:
        "12px 0",
    },

    send: {
      width: "49px",

      height: "49px",

      flexShrink: 0,

      borderRadius:
        "17px",

      border: "none",

      background:
        "linear-gradient(145deg,#f8e9b6,#d3ae59,#9c742c)",

      color: "#11100c",

      fontSize: "21px",

      fontWeight: "900",

      cursor: "pointer",

      boxShadow:
        "0 10px 29px rgba(205,169,80,.18)",
    },

    powered: {
      marginTop: "9px",

      textAlign: "center",

      color: lightTheme ? "#81652e" : "#d4b76c",

      fontSize: "7px",

      letterSpacing:
        "2.4px",

      fontWeight: "800",
    },
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      style={styles.page}
    >
      <div
        style={styles.glowOne}
      />

      <div
        style={styles.glowTwo}
      />

      <section
        style={styles.shell}
      >

        {/* HEADER */}

        <header
          style={styles.header}
        >
          <div
            style={styles.brand}
          >
            <div
              style={styles.logo}
            >
              <img
                src={NELA_LOGO_DATA}
                alt="NELA"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <div>
              <div
                style={styles.title}
              >
                NELA
              </div>

              <div
                style={
                  styles.subtitle
                }
              >
                PRIVATE AI RECEPTIONIST
              </div>
            </div>

            <div
              style={styles.online}
            >
              <span
                style={
                  styles.onlineDot
                }
              />

              ONLINE
            </div>



            {!isAdmin && (
              <button
                type="button"
                style={styles.logout}
                onClick={() => {
                  const confirmed = window.confirm("Θέλετε να αποσυνδεθείτε από τη NELA;");
                  if (!confirmed) return;
                  localStorage.removeItem("nelaUser");
                  localStorage.removeItem("nelaActiveClient");
                  window.location.replace("/");
                }}
                aria-label="Αποσύνδεση"
                title="Αποσύνδεση"
              >
                Αποσύνδεση
              </button>
            )}
          </div>
        </header>

        {/* BUSINESS */}

        <div
          style={styles.business}
        >
          <span
            style={{
              color:
                COLORS.gold,

              marginRight: "8px",
            }}
          >
            ◆
          </span>

          {businessName}

          {memory.name && (
            <span
              style={
                styles.memoryBadge
              }
            >
              ✦ MEMORY ACTIVE
            </span>
          )}
        </div>

        {/* PROGRESS */}

        {booking.active && (
          <div
            style={
              styles.progressBox
            }
          >
            <div
              style={
                styles.progressTop
              }
            >
              <span>
                BOOKING PROGRESS
              </span>

              <span>
                {progress}/5
              </span>
            </div>

            <div
              style={
                styles.progressTrack
              }
            >
              <div
                style={
                  styles.progressFill
                }
              />
            </div>
          </div>
        )}

        {/* =================================================
            CHAT
            ================================================= */}

        <main
          ref={chatRef}
          style={styles.chat}
        >

          {/* NELA LOGO WATERMARK */}

          <img
            src={NELA_LOGO_DATA}
            alt=""
            aria-hidden="true"
            style={
              styles.logoBackdrop
            }
          />

          {/* LOGO OVERLAY */}

          <div
            style={
              styles.logoOverlay
            }
          />

          {/* MESSAGES */}

          {messages.map(
            (message) => {
              const isUser =
                message.role ===
                "user";

              return (
                <div
                  key={
                    message.id
                  }
                  style={{
                    ...styles.messageRow,

                    justifyContent:
                      isUser
                        ? "flex-end"
                        : "flex-start",
                  }}
                >
                  <div
                    style={
                      isUser
                        ? styles.userBubble
                        : styles.assistantBubble
                    }
                  >
                    {
                      message.text
                    }
                  </div>
                </div>
              );
            }
          )}

          {/* VISUAL DATE AND TIME PICKER */}
          {booking.active && booking.service && !booking.date && (
            <div style={{ position: "relative", zIndex: 3, margin: "12px 0 22px", padding: "18px", borderRadius: "20px", border: "1px solid rgba(214,183,106,.32)", background: "linear-gradient(145deg,rgba(42,29,14,.97),rgba(10,8,5,.99))", boxShadow: "0 16px 38px rgba(0,0,0,.28)" }}>
              <div style={{ color: "#f0d99f", fontFamily: "Georgia,serif", fontSize: "20px", marginBottom: "5px" }}>Επιλέξτε ημέρα</div>
              <div style={{ color: "#9e8a67", fontSize: "10px", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: "8px" }}>{new Date().toLocaleDateString("el-GR", { month: "long", year: "numeric" })}</div>
              <div style={{ color: "#b9aa88", fontSize: "11px", marginBottom: "14px" }}>Επιλέξτε μία ημέρα. Οι μη διαθέσιμες ημέρες είναι απενεργοποιημένες.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: "8px" }}>
                {["Κυ","Δε","Τρ","Τε","Πε","Πα","Σα"].map((day) => <div key={day} style={{ textAlign: "center", color: "#9c8968", fontSize: "10px", padding: "4px 0" }}>{day}</div>)}
                {calendarDays.map((item) => (
                  <button key={item.key} type="button" onClick={() => chooseBookingDate(item.key)} disabled={!item.slots.length} style={{ border: "1px solid rgba(214,183,106,.35)", borderRadius: "10px", padding: "9px 3px", minWidth: 0, background: item.slots.length ? "linear-gradient(145deg,#302314,#100b06)" : "rgba(255,255,255,.025)", color: item.slots.length ? "#f2dfb2" : "#655c4c", cursor: item.slots.length ? "pointer" : "not-allowed", opacity: item.slots.length ? 1 : .45, textAlign: "center" }}>
                    <span style={{ display: "block", fontSize: "10px", color: "#c7a96a", textTransform: "capitalize" }}>{item.date.toLocaleDateString("el-GR", { weekday: "short" })}</span>
                    <strong style={{ display: "block", fontSize: "16px", marginTop: "3px" }}>{item.date.toLocaleDateString("el-GR", { day: "numeric", month: "short" })}</strong>
                    <span style={{ display: "block", fontSize: "9px", color: "#9e906f", marginTop: "4px" }}>{item.slots.length ? `${item.slots.length} ώρες` : "Κλειστά"}</span>
                  </button>
                ))}
              </div>
              
            </div>
          )}

          {booking.active && booking.service && booking.date && !booking.time && (
            <div style={{ position: "relative", zIndex: 3, margin: "12px 0 22px", padding: "18px", borderRadius: "20px", border: "1px solid rgba(214,183,106,.32)", background: "linear-gradient(145deg,rgba(42,29,14,.97),rgba(10,8,5,.99))", boxShadow: "0 16px 38px rgba(0,0,0,.28)" }}>
              <div style={{ color: "#f0d99f", fontFamily: "Georgia,serif", fontSize: "20px", marginBottom: "5px" }}>Επιλέξτε ώρα</div>
              <div style={{ color: "#b9aa88", fontSize: "11px", marginBottom: "14px" }}>{new Date(`${booking.date}T12:00:00`).toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(76px,1fr))", gap: "8px" }}>
                {getAvailableTimes(booking.date, bookings, booking.service?.duration || 30).map((time) => (
                  <button key={time} type="button" onClick={() => chooseBookingTime(time)} style={{ border: "1px solid rgba(214,183,106,.4)", borderRadius: "11px", padding: "12px 8px", background: "linear-gradient(145deg,#302314,#100b06)", color: "#f6e5bd", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>{time}</button>
                ))}
              </div>
              <button type="button" onClick={() => setBooking({ ...booking, date: null, time: null })} style={{ marginTop: "13px", border: 0, background: "transparent", color: "#c5a76a", cursor: "pointer", fontSize: "11px" }}>← Αλλαγή ημέρας</button>
            </div>
          )}

          {/* TYPING */}

          {typing && (
            <div
              style={
                styles.messageRow
              }
            >
              <div
                style={{
                  ...styles.assistantBubble,

                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap: "6px",
                }}
              >
                <span
                  style={{
                    ...styles.onlineDot,
                    width: "5px",
                    height: "5px",
                  }}
                />

                <span
                  style={{
                    ...styles.onlineDot,
                    width: "5px",
                    height: "5px",
                    opacity: 0.55,
                  }}
                />

                <span
                  style={{
                    ...styles.onlineDot,
                    width: "5px",
                    height: "5px",
                    opacity: 0.25,
                  }}
                />

                <span
                  style={{
                    marginLeft:
                      "4px",

                    color:
                      "#aaa69d",

                    fontSize:
                      "11px",
                  }}
                >
                  NELA is thinking...
                </span>
              </div>
            </div>
          )}

        </main>

        {/* FOOTER */}

        <footer
          style={styles.footer}
        >
          <div
            style={
              styles.actions
            }
          >
            <button
              type="button"
              style={
                styles.action
              }
              onClick={
                beginBooking
              }
            >
              ✦ Κλείσε ραντεβού
            </button>

            <button
              type="button"
              style={
                styles.action
              }
              onClick={() =>
                sendMessage(
                  "Ποιες υπηρεσίες προσφέρετε;"
                )
              }
            >
              Υπηρεσίες
            </button>

            <button
              type="button"
              style={
                styles.action
              }
              onClick={() =>
                sendMessage(
                  "Ποιες είναι οι ώρες λειτουργίας σας;"
                )
              }
            >
              Ώρες λειτουργίας
            </button>

            <button
              type="button"
              style={
                styles.action
              }
              onClick={() =>
                sendMessage(
                  "Τι θυμάσαι για μένα;"
                )
              }
            >
              ✦ Η μνήμη μου
            </button>

            {serviceNames
              .slice(0, 2)
              .map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    style={
                      styles.action
                    }
                    onClick={() =>
                      sendMessage(
                        `Θέλω πληροφορίες για ${name}`
                      )
                    }
                  >
                    {name}
                  </button>
                )
              )}
          </div>

          <div
            style={
              styles.inputBox
            }
          >
            <input
              style={styles.input}
              value={input}
              disabled={typing}
              placeholder="Πώς μπορώ να σας εξυπηρετήσω;"
              autoComplete="off"
              onChange={(
                event
              ) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  event.preventDefault();

                  sendMessage();
                }
              }}
            />

            <button
              type="button"
              style={{
                ...styles.send,

                opacity:
                  typing
                    ? 0.5
                    : 1,
              }}
              disabled={typing}
              onClick={() =>
                sendMessage()
              }
            >
              ↑
            </button>
          </div>

          <div
            style={
              styles.powered
            }
          >
            NELA INTELLIGENCE • PREMIUM AI RECEPTION
          </div>
        </footer>
      </section>
    </div>
  );
}

function readSession(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export default function App() {
  const isAdminRoute = window.location.pathname === "/admin" ||
    new URLSearchParams(window.location.search).get("admin") === "true";
  const businessSession = readSession("nelaBusinessUser");
  const customerSession = readSession("nelaUser");

  if (isAdminRoute && businessSession?.id) return <ChatApp />;
  if (isAdminRoute) return <LandingPage defaultMode="business" />;
  if (customerSession?.id) return <LandingPage defaultMode="chat" />;
  return <LandingPage />;
}
