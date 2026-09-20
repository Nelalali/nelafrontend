import { useEffect, useMemo, useRef, useState } from "react";

import Admin from "./Admin";
import LandingPage from "./LandingPage";
import businessData from "./businessData";

/* =======================================================
   COLORS
   ======================================================= */

const COLORS = {
  gold: "#d6b76a",
  goldLight: "#f4e3b0",
  goldDark: "#9d762d",
  black: "#020304",
  dark: "#06090d",
  panel: "#0c1218",
  panel2: "#111922",
  text: "#eee9dc",
  muted: "#8d969d",
  green: "#8fcf9b",
  red: "#d98787",
};

/* =======================================================
   STORAGE
   ======================================================= */

const BOOKINGS_KEY = "nelaBookings";
const CLIENTS_KEY = "nelaClients";
const ACTIVE_CLIENT_KEY = "nelaActiveClient";

/* =======================================================
   HELPERS
   ======================================================= */

function normalizeText(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function cleanText(value = "") {
  return value.toString().trim().replace(/\s+/g, " ");
}

function safeStorageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/* =======================================================
   DATE ENGINE
   ======================================================= */

const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const WEEKDAY_DISPLAY = {
  κυριακη: 0,
  δευτερα: 1,
  τριτη: 2,
  τεταρτη: 3,
  πεμπτη: 4,
  παρασκευη: 5,
  σαββατο: 6,

  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function getDateFromText(text = "") {
  const normalized = normalizeText(text);

  const now = new Date();

  if (normalized.includes("today") || normalized.includes("σημερα")) {
    return new Date(now);
  }

  if (
    normalized.includes("tomorrow") ||
    normalized.includes("αυριο")
  ) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return date;
  }

  for (const [dayName, dayNumber] of Object.entries(
    WEEKDAY_DISPLAY
  )) {
    if (normalized.includes(dayName)) {
      const date = new Date(now);
      const currentDay = date.getDay();

      let diff = dayNumber - currentDay;

      if (diff <= 0) {
        diff += 7;
      }

      date.setDate(date.getDate() + diff);

      return date;
    }
  }

  const match = normalized.match(
    /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?(?:\s|$)/
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;

    let year = match[3]
      ? Number(match[3])
      : now.getFullYear();

    if (year < 100) {
      year += 2000;
    }

    const date = new Date(year, month, day);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

/* =======================================================
   TIME ENGINE
   ======================================================= */

function extractTime(text = "") {
  const normalized = normalizeText(text);

  const match = normalized.match(
    /(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(?:am|pm|πμ|μμ)?(?:\s|$)/
  );

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);

  if (
    normalized.includes("pm") ||
    normalized.includes("μμ")
  ) {
    if (hour < 12) {
      hour += 12;
    }
  }

  if (
    normalized.includes("am") ||
    normalized.includes("πμ")
  ) {
    if (hour === 12) {
      hour = 0;
    }
  }

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}`;
}

/* =======================================================
   PHONE ENGINE
   ======================================================= */

function extractPhone(text = "") {
  const match = text.match(
    /(?:\+30\s?)?(?:69\d{8}|\d{10})/
  );

  return match ? match[0].replace(/\s+/g, "") : null;
}

/* =======================================================
   EMAIL ENGINE
   ======================================================= */

function extractEmail(text = "") {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0].toLowerCase() : null;
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email.trim()
  );
}

/* =======================================================
   SERVICES
   ======================================================= */

function getServices() {
  return Array.isArray(businessData?.services)
    ? businessData.services
    : [];
}

function findService(text = "") {
  const normalized = normalizeText(text);

  return getServices().find((service) => {
    const serviceName = normalizeText(service.name);

    return (
      normalized.includes(serviceName) ||
      serviceName.includes(normalized)
    );
  });
}

/* =======================================================
   NAME ENGINE
   ======================================================= */

const NAME_PREFIXES = [
  "με λενε",
  "λέγομαι",
  "λεγομαι",
  "ειμαι",
  "είμαι",
  "ονομαζομαι",
  "ονομάζομαι",
  "my name is",
  "i am",
];

function containsBookingNoise(text = "") {
  const normalized = normalizeText(text);

  return (
    normalized.includes("ραντεβου") ||
    normalized.includes("appointment") ||
    normalized.includes("κουρεμα") ||
    normalized.includes("balayage") ||
    normalized.includes("χτενισμα") ||
    normalized.includes("τιμη") ||
    normalized.includes("ευρω") ||
    normalized.includes("ωρα") ||
    normalized.includes("αυριο") ||
    normalized.includes("σημερα")
  );
}

function isValidName(value = "") {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return false;
  }

  if (cleaned.length < 2 || cleaned.length > 40) {
    return false;
  }

  if (/\d/.test(cleaned)) {
    return false;
  }

  if (containsBookingNoise(cleaned)) {
    return false;
  }

  return /^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώϊΐϋΰ\s'-]+$/.test(
    cleaned
  );
}

function extractName(text = "") {
  const cleaned = cleanText(text);

  for (const prefix of NAME_PREFIXES) {
    const normalizedPrefix = normalizeText(prefix);

    const normalizedText = normalizeText(cleaned);

    if (normalizedText.startsWith(normalizedPrefix)) {
      const result = cleanText(
        cleaned.slice(prefix.length)
      );

      if (isValidName(result)) {
        return result;
      }
    }
  }

  if (isValidName(cleaned)) {
    return cleaned;
  }

  return null;
}

function splitFullName(fullName = "") {
  const parts = cleanText(fullName).split(" ");

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      surname: "",
    };
  }

  return {
    firstName: parts[0],
    surname: parts.slice(1).join(" "),
  };
}

/* =======================================================
   INTENT
   ======================================================= */

function wantsBooking(text = "") {
  const normalized = normalizeText(text);

  return (
    normalized.includes("ραντεβου") ||
    normalized.includes("κλεισω") ||
    normalized.includes("κλεισω ραντεβου") ||
    normalized.includes("θελω να κλεισω") ||
    normalized.includes("appointment") ||
    normalized.includes("book")
  );
}

function wantsCancel(text = "") {
  const normalized = normalizeText(text);

  return (
    normalized.includes("ακυρωση") ||
    normalized.includes("ακυρωσω") ||
    normalized.includes("cancel")
  );
}

function wantsChange(text = "") {
  const normalized = normalizeText(text);

  return (
    normalized.includes("αλλαξ") ||
    normalized.includes("μετακινη") ||
    normalized.includes("change") ||
    normalized.includes("reschedule")
  );
}

function isYes(text = "") {
  const normalized = normalizeText(text);

  return [
    "ναι",
    "yes",
    "ok",
    "οκ",
    "βεβαια",
    "βεβαίως",
    "σωστα",
    "σωστό",
    "σωστα",
  ].includes(normalized);
}

function isNo(text = "") {
  const normalized = normalizeText(text);

  return [
    "οχι",
    "όχι",
    "no",
    "cancel",
    "ακυρωση",
  ].includes(normalized);
}

/* =======================================================
   MEMORY NOTE
   ======================================================= */

function wantsMemoryNote(text = "") {
  const normalized = normalizeText(text);

  return (
    normalized.includes("θυμησου") ||
    normalized.includes("να θυμασαι") ||
    normalized.includes("remember")
  );
}

function extractMemoryNote(text = "") {
  const normalized = normalizeText(text);

  const prefixes = [
    "θυμησου",
    "να θυμασαι",
    "remember",
  ];

  for (const prefix of prefixes) {
    const index = normalized.indexOf(prefix);

    if (index !== -1) {
      const originalIndex = text
        .toLowerCase()
        .indexOf(prefix);

      const note = cleanText(
        text.slice(
          originalIndex + prefix.length
        )
      );

      if (note) {
        return note;
      }
    }
  }

  return null;
}

/* =======================================================
   BUSINESS HOURS
   ======================================================= */

function getTodayName(date = new Date()) {
  const names = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return names[date.getDay()];
}

function getAvailableTimes(date) {
  if (!date) {
    return [];
  }

  const dayName = getTodayName(date);
  const range =
    businessData?.openingHours?.[dayName];

  if (!range || range === "Κλειστά") {
    return [];
  }

  const [start, end] = range.split("-");

  if (!start || !end) {
    return [];
  }

  const [startHour, startMinute] = start
    .split(":")
    .map(Number);

  const [endHour, endMinute] = end
    .split(":")
    .map(Number);

  const result = [];

  let currentMinutes =
    startHour * 60 + startMinute;

  const endMinutes =
    endHour * 60 + endMinute;

  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const minute = currentMinutes % 60;

    result.push(
      `${String(hour).padStart(2, "0")}:${String(
        minute
      ).padStart(2, "0")}`
    );

    currentMinutes += 30;
  }

  return result;
}

/* =======================================================
   CUSTOMER MEMORY
   ======================================================= */

function normalizeClient(client = {}) {
  return {
    id: client.id || createId("client"),
    firstName: cleanText(client.firstName || ""),
    surname: cleanText(client.surname || ""),
    phone: cleanText(client.phone || ""),
    email: cleanText(client.email || "").toLowerCase(),
    memoryNotes: Array.isArray(client.memoryNotes)
      ? client.memoryNotes
      : [],
    createdAt:
      client.createdAt || new Date().toISOString(),
    updatedAt:
      client.updatedAt || new Date().toISOString(),
  };
}

function loadClients() {
  const clients = safeStorageGet(CLIENTS_KEY, []);

  if (!Array.isArray(clients)) {
    return [];
  }

  return clients.map(normalizeClient);
}

function loadActiveClientId() {
  try {
    return localStorage.getItem(
      ACTIVE_CLIENT_KEY
    );
  } catch {
    return null;
  }
}

function findClient(
  clients,
  {
    id,
    phone,
    email,
    firstName,
    surname,
  } = {}
) {
  if (!Array.isArray(clients)) {
    return null;
  }

  if (id) {
    const byId = clients.find(
      (client) => client.id === id
    );

    if (byId) {
      return byId;
    }
  }

  const normalizedPhone = cleanText(phone);
  const normalizedEmail = cleanText(email).toLowerCase();

  if (normalizedPhone) {
    const byPhone = clients.find(
      (client) =>
        cleanText(client.phone) ===
        normalizedPhone
    );

    if (byPhone) {
      return byPhone;
    }
  }

  if (normalizedEmail) {
    const byEmail = clients.find(
      (client) =>
        cleanText(client.email).toLowerCase() ===
        normalizedEmail
    );

    if (byEmail) {
      return byEmail;
    }
  }

  const normalizedFirst = normalizeText(
    firstName
  );
  const normalizedSurname = normalizeText(
    surname
  );

  if (normalizedFirst && normalizedSurname) {
    return (
      clients.find(
        (client) =>
          normalizeText(client.firstName) ===
            normalizedFirst &&
          normalizeText(client.surname) ===
            normalizedSurname
      ) || null
    );
  }

  return null;
}

function rememberClient(clients, incomingClient) {
  const normalizedIncoming =
    normalizeClient(incomingClient);

  const existing = findClient(
    clients,
    {
      id: normalizedIncoming.id,
      phone: normalizedIncoming.phone,
      email: normalizedIncoming.email,
      firstName: normalizedIncoming.firstName,
      surname: normalizedIncoming.surname,
    }
  );

  if (!existing) {
    return [
      ...clients,
      normalizedIncoming,
    ];
  }

  const merged = {
    ...existing,
    ...normalizedIncoming,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  return clients.map((client) =>
    client.id === existing.id
      ? merged
      : client
  );
}

/* =======================================================
   BOOKING
   ======================================================= */

function createEmptyBooking() {
  return {
    active: false,
    step: null,
    serviceId: null,
    serviceName: "",
    price: null,
    duration: null,
    date: null,
    dateLabel: "",
    time: "",
    firstName: "",
    surname: "",
    phone: "",
    email: "",
  };
}

function bookingProgress(booking) {
  if (!booking?.active) {
    return 0;
  }

  let completed = 0;

  if (booking.serviceId) completed += 1;
  if (booking.date) completed += 1;
  if (booking.time) completed += 1;
  if (booking.firstName) completed += 1;
  if (booking.surname) completed += 1;
  if (booking.phone) completed += 1;
  if (booking.email) completed += 1;

  return completed;
}

/* =======================================================
   AI
   ======================================================= */

async function askNelaAI(message) {
  try {
    const response = await fetch(
      "http://localhost:3001/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `AI request failed: ${response.status}`
      );
    }

    const data = await response.json();

    return (
      data?.reply ||
      data?.message ||
      null
    );
  } catch {
    return null;
  }
}

/* =======================================================
   APP
   ======================================================= */

export default function App() {
  const path = window.location.pathname;

  if (path === "/admin") {
    return <Admin />;
  }

  if (path !== "/chat") {
    return <LandingPage />;
  }

  /* =======================================================
     STATE
     ======================================================= */

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const [booking, setBooking] = useState(
    createEmptyBooking()
  );

  const [bookings, setBookings] = useState(() =>
    safeStorageGet(BOOKINGS_KEY, [])
  );

  const [clients, setClients] = useState(() =>
    loadClients()
  );

  const [currentClient, setCurrentClient] =
    useState(() => {
      const storedClients = loadClients();
      const activeId =
        loadActiveClientId();

      return (
        findClient(storedClients, {
          id: activeId,
        }) || null
      );
    });

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [view, setView] =
    useState("chat");

  const [editingAccount, setEditingAccount] =
    useState(false);

  const [accountForm, setAccountForm] =
    useState({
      firstName: "",
      surname: "",
      phone: "",
      email: "",
    });

  const [messages, setMessages] = useState([
    {
      id: createId("msg"),
      role: "assistant",
      text:
        "Γεια σου. Είμαι η NELA. Πώς μπορώ να σε βοηθήσω;",
    },
  ]);

  const messagesEndRef = useRef(null);

  /* =======================================================
     MEMORY
     ======================================================= */

  const memoryNotes = useMemo(() => {
    if (!currentClient) {
      return [];
    }

    return Array.isArray(
      currentClient.memoryNotes
    )
      ? currentClient.memoryNotes
      : [];
  }, [currentClient]);

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
     ACTIVE CLIENT
     ======================================================= */

  useEffect(() => {
    if (currentClient?.id) {
      safeStorageSet(
        ACTIVE_CLIENT_KEY,
        currentClient.id
      );
    }
  }, [currentClient]);

  /* =======================================================
     ACCOUNT FORM SYNC
     ======================================================= */

  useEffect(() => {
    if (!currentClient) {
      setAccountForm({
        firstName: "",
        surname: "",
        phone: "",
        email: "",
      });

      return;
    }

    setAccountForm({
      firstName:
        currentClient.firstName || "",
      surname:
        currentClient.surname || "",
      phone:
        currentClient.phone || "",
      email:
        currentClient.email || "",
    });
  }, [currentClient]);

  /* =======================================================
     AUTO SCROLL
     ======================================================= */

  useEffect(() => {
    if (view !== "chat") {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, typing, view]);

  /* =======================================================
     SERVICE NAMES
     ======================================================= */

  const serviceNames = useMemo(
    () =>
      getServices()
        .map((service) => service.name)
        .join(", "),
    []
  );

  /* =======================================================
     MESSAGE
     ======================================================= */

  function addMessage(role, text) {
    setMessages((previous) => [
      ...previous,
      {
        id: createId("msg"),
        role,
        text,
      },
    ]);
  }

  /* =======================================================
     IDENTIFY CLIENT
     ======================================================= */

  function identifyClient({
    firstName,
    surname,
    phone,
    email,
  }) {
    const existing = findClient(
      clients,
      {
        phone,
        email,
        firstName,
        surname,
      }
    );

    if (existing) {
      setCurrentClient(existing);
      return existing;
    }

    const newClient = normalizeClient({
      id: createId("client"),
      firstName,
      surname,
      phone,
      email,
      memoryNotes: [],
    });

    setClients((previous) =>
      rememberClient(
        previous,
        newClient
      )
    );

    setCurrentClient(newClient);

    return newClient;
  }

  /* =======================================================
     SAVE MEMORY NOTE
     ======================================================= */

  function saveMemoryNote(note) {
    if (!currentClient || !note) {
      return;
    }

    const exists =
      currentClient.memoryNotes?.some(
        (item) =>
          normalizeText(item) ===
          normalizeText(note)
      );

    if (exists) {
      return;
    }

    const updated = {
      ...currentClient,
      memoryNotes: [
        ...(currentClient.memoryNotes || []),
        note,
      ],
      updatedAt:
        new Date().toISOString(),
    };

    setCurrentClient(updated);

    setClients((previous) =>
      rememberClient(
        previous,
        updated
      )
    );
  }

  /* =======================================================
     BOOKING AVAILABILITY
     ======================================================= */

  function isTimeBooked(date, time) {
    if (!date || !time) {
      return false;
    }

    const dateKey = date
      .toISOString()
      .slice(0, 10);

    return bookings.some(
      (bookingItem) =>
        bookingItem.date === dateKey &&
        bookingItem.time === time &&
        bookingItem.status !== "cancelled"
    );
  }

  /* =======================================================
     SAVE BOOKING
     ======================================================= */

  function saveBooking(finalBooking) {
    const dateKey = finalBooking.date
      ? new Date(finalBooking.date)
          .toISOString()
          .slice(0, 10)
      : "";

    const newBooking = {
      id: createId("booking"),
      clientId:
        currentClient?.id || null,

      serviceId:
        finalBooking.serviceId,

      serviceName:
        finalBooking.serviceName,

      price:
        finalBooking.price,

      duration:
        finalBooking.duration,

      date:
        dateKey,

      dateLabel:
        finalBooking.dateLabel,

      time:
        finalBooking.time,

      firstName:
        finalBooking.firstName,

      surname:
        finalBooking.surname,

      phone:
        finalBooking.phone,

      email:
        finalBooking.email,

      status: "confirmed",

      createdAt:
        new Date().toISOString(),
    };

    const nextBookings = [
      ...bookings,
      newBooking,
    ];

    setBookings(nextBookings);

    safeStorageSet(
      BOOKINGS_KEY,
      nextBookings
    );

    const client =
      identifyClient({
        firstName:
          finalBooking.firstName,
        surname:
          finalBooking.surname,
        phone:
          finalBooking.phone,
        email:
          finalBooking.email,
      });

    const updatedClient = {
      ...client,
    };

    setClients((previous) =>
      rememberClient(
        previous,
        updatedClient
      )
    );

    setCurrentClient(
      updatedClient
    );

    return newBooking;
  }

  /* =======================================================
     BOOKING SUMMARY
     ======================================================= */

  function getBookingSummary(finalBooking) {
    const formattedDate =
      finalBooking.date
        ? new Date(
            finalBooking.date
          ).toLocaleDateString(
            "el-GR",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
            }
          )
        : finalBooking.dateLabel;

    return [
      "Το ραντεβού σου:",
      "",
      `Υπηρεσία: ${finalBooking.serviceName}`,
      `Ημερομηνία: ${formattedDate}`,
      `Ώρα: ${finalBooking.time}`,
      `Όνομα: ${finalBooking.firstName} ${finalBooking.surname}`,
      `Τηλέφωνο: ${finalBooking.phone}`,
      `Email: ${finalBooking.email}`,
      "",
      `Τιμή: €${finalBooking.price}`,
    ].join("\n");
  }

  /* =======================================================
     BEGIN BOOKING
     ======================================================= */

  function beginBooking() {
    setBooking({
      ...createEmptyBooking(),
      active: true,
      step: "service",
    });

    addMessage(
      "assistant",
      `Φυσικά. Ποια υπηρεσία θέλεις;\n\nΔιαθέσιμες υπηρεσίες: ${serviceNames}`
    );
  }

  /* =======================================================
     APPLY CHANGE
     ======================================================= */

  function applyChange(text) {
    const normalized = normalizeText(text);

    if (
      normalized.includes("υπηρεσια") ||
      normalized.includes("service")
    ) {
      setBooking((previous) => ({
        ...previous,
        step: "service",
        serviceId: null,
        serviceName: "",
        price: null,
        duration: null,
      }));

      addMessage(
        "assistant",
        `Ποια υπηρεσία θέλεις;\n\nΔιαθέσιμες υπηρεσίες: ${serviceNames}`
      );

      return true;
    }

    if (
      normalized.includes("ημερομηνια") ||
      normalized.includes("date") ||
      normalized.includes("μερα")
    ) {
      setBooking((previous) => ({
        ...previous,
        step: "date",
        date: null,
        dateLabel: "",
        time: "",
      }));

      addMessage(
        "assistant",
        "Ποια ημέρα σε εξυπηρετεί;"
      );

      return true;
    }

    if (
      normalized.includes("ωρα") ||
      normalized.includes("time")
    ) {
      setBooking((previous) => ({
        ...previous,
        step: "time",
        time: "",
      }));

      addMessage(
        "assistant",
        "Τι ώρα θα ήθελες;"
      );

      return true;
    }

    return false;
  }

  /* =======================================================
     BOOKING PROCESS
     ======================================================= */

  async function processBooking(text) {
    const cleaned = cleanText(text);

    if (booking.step === "service") {
      const service =
        findService(cleaned);

      if (!service) {
        addMessage(
          "assistant",
          `Δεν εντόπισα την υπηρεσία. Οι διαθέσιμες υπηρεσίες είναι:\n\n${serviceNames}`
        );

        return true;
      }

      setBooking((previous) => ({
        ...previous,
        serviceId: service.id,
        serviceName: service.name,
        price: service.price,
        duration: service.duration,
        step: "date",
      }));

      addMessage(
        "assistant",
        `Τέλεια. ${service.name} — €${service.price}.\n\nΠοια ημέρα θέλεις;`
      );

      return true;
    }

    if (booking.step === "date") {
      const date =
        getDateFromText(cleaned);

      if (!date) {
        addMessage(
          "assistant",
          "Δεν κατάλαβα την ημερομηνία. Πες μου για παράδειγμα «αύριο», «Παρασκευή» ή «25/09»."
        );

        return true;
      }

      const times =
        getAvailableTimes(date).filter(
          (time) =>
            !isTimeBooked(
              date,
              time
            )
        );

      if (!times.length) {
        addMessage(
          "assistant",
          "Δυστυχώς δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημέρα."
        );

        return true;
      }

      const dateLabel =
        date.toLocaleDateString(
          "el-GR",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
          }
        );

      setBooking((previous) => ({
        ...previous,
        date,
        dateLabel,
        step: "time",
      }));

      addMessage(
        "assistant",
        `Τέλεια, ${dateLabel}.\n\nΔιαθέσιμες ώρες:\n${times.join(
          " • "
        )}\n\nΠοια ώρα θέλεις;`
      );

      return true;
    }

    if (booking.step === "time") {
      const time =
        extractTime(cleaned);

      if (!time) {
        addMessage(
          "assistant",
          "Πες μου την ώρα, για παράδειγμα «10:30»."
        );

        return true;
      }

      if (
        booking.date &&
        isTimeBooked(
          booking.date,
          time
        )
      ) {
        addMessage(
          "assistant",
          "Αυτή η ώρα είναι ήδη κλεισμένη. Διάλεξε μία άλλη διαθέσιμη ώρα."
        );

        return true;
      }

      setBooking((previous) => ({
        ...previous,
        time,
        step: "firstName",
        firstName:
          currentClient?.firstName || "",
        surname:
          currentClient?.surname || "",
        phone:
          currentClient?.phone || "",
        email:
          currentClient?.email || "",
      }));

      if (currentClient?.firstName) {
        addMessage(
          "assistant",
          `Έχω ήδη τα στοιχεία σου, ${currentClient.firstName}.\n\nΠες μου μόνο αν θέλεις να τα αλλάξουμε ή γράψε «ναι» για να συνεχίσουμε.`
        );
      } else {
        addMessage(
          "assistant",
          "Τέλεια. Ποιο είναι το όνομά σου;"
        );
      }

      return true;
    }

    if (booking.step === "firstName") {
      if (
        currentClient?.firstName &&
        isYes(cleaned)
      ) {
        setBooking((previous) => ({
          ...previous,
          firstName:
            currentClient.firstName,
          surname:
            currentClient.surname,
          phone:
            currentClient.phone,
          email:
            currentClient.email,
          step: "confirm",
        }));

        addMessage(
          "assistant",
          "Ωραία. Έλεγξε τα στοιχεία σου και πες μου «ναι» για να επιβεβαιώσουμε το ραντεβού."
        );

        return true;
      }

      const name =
        extractName(cleaned);

      if (!name) {
        addMessage(
          "assistant",
          "Ποιο είναι το όνομά σου;"
        );

        return true;
      }

      setBooking((previous) => ({
        ...previous,
        firstName: name,
        step: "surname",
      }));

      addMessage(
        "assistant",
        "Και το επώνυμό σου;"
      );

      return true;
    }

    if (booking.step === "surname") {
      const surname =
        extractName(cleaned);

      if (!surname) {
        addMessage(
          "assistant",
          "Ποιο είναι το επώνυμό σου;"
        );

        return true;
      }

      setBooking((previous) => ({
        ...previous,
        surname,
        step: "phone",
      }));

      addMessage(
        "assistant",
        "Ποιο είναι το τηλέφωνό σου;"
      );

      return true;
    }

    if (booking.step === "phone") {
      const phone =
        extractPhone(cleaned);

      if (!phone) {
        addMessage(
          "assistant",
          "Γράψε μου ένα έγκυρο τηλέφωνο."
        );

        return true;
      }

      setBooking((previous) => ({
        ...previous,
        phone,
        step: "email",
      }));

      addMessage(
        "assistant",
        "Και το email σου;"
      );

      return true;
    }

    if (booking.step === "email") {
      const email =
        extractEmail(cleaned);

      if (!email || !isValidEmail(email)) {
        addMessage(
          "assistant",
          "Γράψε μου ένα έγκυρο email."
        );

        return true;
      }

      const nextBooking = {
        ...booking,
        email,
        step: "confirm",
      };

      setBooking(nextBooking);

      addMessage(
        "assistant",
        `${getBookingSummary(
          nextBooking
        )}\n\nΘέλεις να το επιβεβαιώσουμε;`
      );

      return true;
    }

    if (booking.step === "confirm") {
      if (isYes(cleaned)) {
        saveBooking(booking);

        setBooking(
          createEmptyBooking()
        );

        addMessage(
          "assistant",
          `Το ραντεβού σου επιβεβαιώθηκε. ✦\n\n${getBookingSummary(
            booking
          )}\n\nΣε περιμένουμε!`
        );

        return true;
      }

      if (isNo(cleaned)) {
        setBooking(
          createEmptyBooking()
        );

        addMessage(
          "assistant",
          "Εντάξει. Δεν δημιουργήθηκε το ραντεβού."
        );

        return true;
      }

      addMessage(
        "assistant",
        "Θέλεις να το επιβεβαιώσουμε; Πες μου «ναι» ή «όχι»."
      );

      return true;
    }

    return false;
  }

  /* =======================================================
     SEND MESSAGE
     ======================================================= */

  async function sendMessage() {
    const text = cleanText(input);

    if (!text || typing) {
      return;
    }

    setInput("");

    addMessage(
      "user",
      text
    );

    if (wantsMemoryNote(text)) {
      const note =
        extractMemoryNote(text);

      if (note) {
        saveMemoryNote(note);

        addMessage(
          "assistant",
          "Το σημείωσα στη μνήμη σου. Θα το θυμάμαι για τις επόμενες συνομιλίες μας."
        );

        return;
      }
    }

    if (booking.active) {
      const handled =
        await processBooking(text);

      if (handled) {
        return;
      }
    }

    if (wantsBooking(text)) {
      beginBooking();
      return;
    }

    if (wantsCancel(text)) {
      const clientBookings =
        currentClient
          ? bookings.filter(
              (bookingItem) =>
                bookingItem.clientId ===
                currentClient.id &&
                bookingItem.status !==
                  "cancelled"
            )
          : [];

      if (!clientBookings.length) {
        addMessage(
          "assistant",
          "Δεν βλέπω κάποια ενεργή κράτηση για τον λογαριασμό σου."
        );

        return;
      }

      const latest =
        clientBookings[
          clientBookings.length - 1
        ];

      const updatedBookings =
        bookings.map(
          (bookingItem) =>
            bookingItem.id === latest.id
              ? {
                  ...bookingItem,
                  status:
                    "cancelled",
                }
              : bookingItem
        );

      setBookings(
        updatedBookings
      );

      safeStorageSet(
        BOOKINGS_KEY,
        updatedBookings
      );

      addMessage(
        "assistant",
        "Το ραντεβού σου ακυρώθηκε."
      );

      return;
    }

    if (wantsChange(text)) {
      const handled =
        applyChange(text);

      if (handled) {
        return;
      }
    }

    setTyping(true);

    const aiReply =
      await askNelaAI(text);

    setTyping(false);

    if (aiReply) {
      addMessage(
        "assistant",
        aiReply
      );

      return;
    }

    addMessage(
      "assistant",
      "Μπορώ να σε βοηθήσω με ραντεβού, υπηρεσίες, διαθεσιμότητα και τα στοιχεία του λογαριασμού σου."
    );
  }

  /* =======================================================
     ACCOUNT
     ======================================================= */

  function openAccount() {
    setView("account");
    setMenuOpen(false);
    setEditingAccount(false);
  }

  function saveAccountChanges() {
    if (!currentClient) {
      return;
    }

    const firstName =
      cleanText(
        accountForm.firstName
      );

    const surname =
      cleanText(
        accountForm.surname
      );

    const phone =
      cleanText(
        accountForm.phone
      );

    const email =
      cleanText(
        accountForm.email
      ).toLowerCase();

    if (
      !isValidName(firstName) ||
      !isValidName(surname)
    ) {
      return;
    }

    if (
      !isValidEmail(email)
    ) {
      return;
    }

    const updatedClient = {
      ...currentClient,
      firstName,
      surname,
      phone,
      email,
      updatedAt:
        new Date().toISOString(),
    };

    setCurrentClient(
      updatedClient
    );

    setClients((previous) =>
      rememberClient(
        previous,
        updatedClient
      )
    );

    setEditingAccount(false);
  }

  /* =======================================================
     HISTORY
     ======================================================= */

  function openHistory() {
    setView("history");
    setMenuOpen(false);
  }

  /* =======================================================
     LOGOUT
     ======================================================= */

  function logout() {
    safeStorageRemove(
      ACTIVE_CLIENT_KEY
    );

    setCurrentClient(null);

    setBooking(
      createEmptyBooking()
    );

    setMenuOpen(false);
    setView("chat");

    window.location.href = "/";
  }

  /* =======================================================
     MENU ICON
     ======================================================= */

  function MenuIcon() {
    return (
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          width: "20px",
        }}
      >
        <span
          style={{
            height: "1px",
            width: "100%",
            background:
              COLORS.text,
            display: "block",
          }}
        />
        <span
          style={{
            height: "1px",
            width: "100%",
            background:
              COLORS.text,
            display: "block",
          }}
        />
        <span
          style={{
            height: "1px",
            width: "100%",
            background:
              COLORS.text,
            display: "block",
          }}
        />
      </span>
    );
  }

  /* =======================================================
     BOOKING PROGRESS
     ======================================================= */

  const progress =
    booking.active
      ? bookingProgress(booking)
      : 0;

  /* =======================================================
     STYLES
     ======================================================= */

  const styles = {
    page: {
      minHeight: "100dvh",
      width: "100%",
      background: COLORS.black,
      color: COLORS.text,
      fontFamily:
        "'Manrope', sans-serif",
      display: "flex",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
    },

    glows: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      overflow: "hidden",
    },

    glowOne: {
      position: "absolute",
      width: "520px",
      height: "520px",
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(214,183,106,0.10) 0%, rgba(214,183,106,0.02) 40%, transparent 72%)",
      top: "-260px",
      right: "-180px",
    },

    glowTwo: {
      position: "absolute",
      width: "450px",
      height: "450px",
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(214,183,106,0.06) 0%, transparent 70%)",
      bottom: "-240px",
      left: "-180px",
    },

    shell: {
      position: "relative",
      zIndex: 2,
      width: "100%",
      maxWidth: "860px",
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      padding:
        "0 18px 14px",
    },

    header: {
      height: "76px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
    },

    brand: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
    },

    logo: {
      width: "30px",
      height: "30px",
      border:
        `1px solid ${COLORS.gold}`,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: COLORS.gold,
      fontFamily:
        "'Playfair Display', serif",
      fontSize: "17px",
      fontStyle: "italic",
    },

    title: {
      fontFamily:
        "'Playfair Display', serif",
      fontSize: "19px",
      letterSpacing: "3px",
      color: COLORS.text,
    },

    subtitle: {
      fontSize: "10px",
      letterSpacing: "2px",
      color: COLORS.muted,
      marginTop: "2px",
    },

    online: {
      width: "7px",
      height: "7px",
      borderRadius: "50%",
      background: COLORS.green,
      boxShadow:
        "0 0 10px rgba(143,207,155,0.5)",
      marginLeft: "8px",
    },

    menuButton: {
      width: "44px",
      height: "44px",
      border:
        "1px solid rgba(255,255,255,0.10)",
      borderRadius: "50%",
      background:
        "rgba(255,255,255,0.025)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },

    business: {
      fontSize: "9px",
      letterSpacing: "2px",
      color: COLORS.muted,
    },

    memoryBadge: {
      alignSelf: "center",
      marginTop: "-2px",
      marginBottom: "8px",
      fontSize: "9px",
      letterSpacing: "1px",
      color: COLORS.gold,
      opacity: 0.75,
    },

    progress: {
      height: "3px",
      background:
        "rgba(255,255,255,0.05)",
      borderRadius: "99px",
      overflow: "hidden",
      marginBottom: "14px",
      flexShrink: 0,
    },

    progressFill: {
      height: "100%",
      borderRadius: "99px",
      width:
        `${Math.min(
          100,
          progress *
            (100 / 7)
        )}%`,
      background:
        `linear-gradient(90deg, ${COLORS.goldDark}, ${COLORS.goldLight})`,
      transition:
        "width 0.35s ease",
    },

    chat: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      padding:
        "10px 2px 24px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      scrollbarWidth: "none",
    },

    watermark: {
      position: "absolute",
      pointerEvents: "none",
      userSelect: "none",
      fontFamily:
        "'Playfair Display', serif",
      fontSize: "420px",
      fontStyle: "italic",
      color:
        "rgba(214,183,106,0.018)",
      right: "-100px",
      top: "50%",
      transform:
        "translateY(-50%)",
      lineHeight: 1,
    },

    bubbles: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },

    bubbleUser: {
      alignSelf: "flex-end",
      maxWidth: "82%",
      padding:
        "11px 14px",
      borderRadius:
        "15px 15px 4px 15px",
      background:
        "rgba(214,183,106,0.12)",
      border:
        "1px solid rgba(214,183,106,0.15)",
      color: COLORS.text,
      fontSize: "13px",
      lineHeight: 1.55,
      whiteSpace: "pre-wrap",
    },

    bubbleAssistant: {
      alignSelf: "flex-start",
      maxWidth: "86%",
      padding:
        "11px 14px",
      borderRadius:
        "15px 15px 15px 4px",
      background:
        "rgba(255,255,255,0.035)",
      border:
        "1px solid rgba(255,255,255,0.07)",
      color: COLORS.text,
      fontSize: "13px",
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
    },

    footer: {
      flexShrink: 0,
      paddingTop: "8px",
    },

    actions: {
      display: "flex",
      gap: "8px",
      marginBottom: "8px",
      overflowX: "auto",
      scrollbarWidth: "none",
    },

    action: {
      border:
        "1px solid rgba(214,183,106,0.22)",
      background:
        "rgba(214,183,106,0.05)",
      color: COLORS.goldLight,
      borderRadius: "999px",
      padding:
        "7px 11px",
      fontSize: "10px",
      whiteSpace: "nowrap",
      cursor: "pointer",
    },

    inputRow: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },

    input: {
      flex: 1,
      minWidth: 0,
      height: "48px",
      borderRadius: "15px",
      border:
        "1px solid rgba(255,255,255,0.09)",
      background:
        "rgba(255,255,255,0.035)",
      color: COLORS.text,
      outline: "none",
      padding:
        "0 15px",
      fontSize: "13px",
    },

    send: {
      width: "48px",
      height: "48px",
      borderRadius: "15px",
      border:
        `1px solid ${COLORS.goldDark}`,
      background:
        "rgba(214,183,106,0.10)",
      color: COLORS.goldLight,
      cursor: "pointer",
      fontSize: "16px",
    },

    powered: {
      textAlign: "center",
      color: COLORS.muted,
      fontSize: "8px",
      letterSpacing: "1.5px",
      marginTop: "7px",
      opacity: 0.55,
    },

    overlay: {
      position: "fixed",
      inset: 0,
      background:
        "rgba(0,0,0,0.60)",
      backdropFilter:
        "blur(4px)",
      zIndex: 20,
    },

    menuPanel: {
      position: "fixed",
      top: 0,
      right: 0,
      width: "min(340px, 88vw)",
      height: "100dvh",
      background:
        "linear-gradient(180deg, #0b0f13 0%, #06090d 100%)",
      borderLeft:
        "1px solid rgba(255,255,255,0.08)",
      zIndex: 21,
      padding:
        "24px 20px",
      boxShadow:
        "-20px 0 70px rgba(0,0,0,0.35)",
    },

    menuLogo: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      paddingBottom: "22px",
      borderBottom:
        "1px solid rgba(255,255,255,0.07)",
      marginBottom: "16px",
    },

    menuLogoMark: {
      width: "36px",
      height: "36px",
      border:
        `1px solid ${COLORS.gold}`,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: COLORS.gold,
      fontFamily:
        "'Playfair Display', serif",
      fontStyle: "italic",
      fontSize: "19px",
    },

    menuLogoText: {
      fontFamily:
        "'Playfair Display', serif",
      letterSpacing: "3px",
      fontSize: "18px",
    },

    menuUser: {
      padding:
        "10px 0 18px",
      fontSize: "12px",
      color: COLORS.muted,
      lineHeight: 1.6,
    },

    menuItem: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      border: "none",
      background: "transparent",
      color: COLORS.text,
      padding:
        "14px 4px",
      cursor: "pointer",
      textAlign: "left",
      fontSize: "13px",
      borderBottom:
        "1px solid rgba(255,255,255,0.045)",
    },

    menuIcon: {
      width: "25px",
      height: "25px",
      borderRadius: "8px",
      border:
        "1px solid rgba(214,183,106,0.20)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: COLORS.gold,
      fontSize: "11px",
    },

    menuDanger: {
      color: COLORS.red,
    },

    viewHeader: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding:
        "5px 0 18px",
      flexShrink: 0,
    },

    backButton: {
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      border:
        "1px solid rgba(255,255,255,0.08)",
      background:
        "rgba(255,255,255,0.025)",
      color: COLORS.text,
      cursor: "pointer",
    },

    viewTitle: {
      fontFamily:
        "'Playfair Display', serif",
      fontSize: "22px",
      color: COLORS.text,
    },

    viewSubtitle: {
      fontSize: "10px",
      color: COLORS.muted,
      marginTop: "2px",
    },

    accountContent: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: "20px",
    },

    accountCard: {
      border:
        "1px solid rgba(255,255,255,0.07)",
      background:
        "rgba(255,255,255,0.025)",
      borderRadius: "18px",
      padding: "18px",
    },

    accountLabel: {
      fontSize: "9px",
      letterSpacing: "1.5px",
      color: COLORS.muted,
      textTransform: "uppercase",
      marginBottom: "6px",
    },

    accountValue: {
      fontSize: "14px",
      color: COLORS.text,
      marginBottom: "18px",
    },

    accountField: {
      width: "100%",
      height: "44px",
      borderRadius: "11px",
      border:
        "1px solid rgba(255,255,255,0.09)",
      background:
        "rgba(0,0,0,0.22)",
      color: COLORS.text,
      outline: "none",
      padding:
        "0 12px",
      marginBottom: "12px",
      fontSize: "13px",
    },

    editButton: {
      width: "100%",
      height: "44px",
      borderRadius: "11px",
      border:
        `1px solid ${COLORS.goldDark}`,
      background:
        "rgba(214,183,106,0.08)",
      color: COLORS.goldLight,
      cursor: "pointer",
      fontSize: "11px",
      letterSpacing: "1px",
    },

    saveButton: {
      flex: 1,
      height: "44px",
      borderRadius: "11px",
      border:
        `1px solid ${COLORS.goldDark}`,
      background:
        "rgba(214,183,106,0.12)",
      color: COLORS.goldLight,
      cursor: "pointer",
      fontSize: "11px",
    },

    cancelEditButton: {
      flex: 1,
      height: "44px",
      borderRadius: "11px",
      border:
        "1px solid rgba(255,255,255,0.09)",
      background:
        "rgba(255,255,255,0.03)",
      color: COLORS.text,
      cursor: "pointer",
      fontSize: "11px",
    },

    historyContent: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: "20px",
    },

    historyEmpty: {
      textAlign: "center",
      color: COLORS.muted,
      fontSize: "13px",
      paddingTop: "70px",
      lineHeight: 1.7,
    },

    historyCard: {
      border:
        "1px solid rgba(255,255,255,0.07)",
      background:
        "rgba(255,255,255,0.025)",
      borderRadius: "18px",
      padding: "16px",
      marginBottom: "10px",
    },

    historyTop: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      marginBottom: "14px",
    },

    historyService: {
      fontFamily:
        "'Playfair Display', serif",
      fontSize: "18px",
      color: COLORS.text,
    },

    historyStatus: {
      fontSize: "9px",
      letterSpacing: "1px",
      textTransform: "uppercase",
      color: COLORS.green,
      border:
        "1px solid rgba(143,207,155,0.18)",
      borderRadius: "999px",
      padding:
        "5px 8px",
    },

    historyGrid: {
      display: "grid",
      gridTemplateColumns:
        "1fr 1fr",
      gap: "12px",
    },

    historyInfo: {
      minWidth: 0,
    },

    historyLabel: {
      fontSize: "8px",
      letterSpacing: "1.2px",
      textTransform: "uppercase",
      color: COLORS.muted,
      marginBottom: "4px",
    },

    historyValue: {
      fontSize: "12px",
      color: COLORS.text,
    },

    historyNote: {
      marginTop: "14px",
      paddingTop: "12px",
      borderTop:
        "1px solid rgba(255,255,255,0.05)",
      color: COLORS.muted,
      fontSize: "10px",
      lineHeight: 1.5,
    },
  };

  /* =======================================================
     MENU
     ======================================================= */

  function MenuPanel() {
    if (!menuOpen) {
      return null;
    }

    return (
      <>
        <div
          style={styles.overlay}
          onClick={() =>
            setMenuOpen(false)
          }
        />

        <aside
          style={styles.menuPanel}
        >
          <div
            style={styles.menuLogo}
          >
            <div
              style={
                styles.menuLogoMark
              }
            >
              N
            </div>

            <div
              style={
                styles.menuLogoText
              }
            >
              NELA
            </div>
          </div>

          <div
            style={styles.menuUser}
          >
            {currentClient ? (
              <>
                <div
                  style={{
                    color:
                      COLORS.text,
                    fontSize: "14px",
                    marginBottom:
                      "3px",
                  }}
                >
                  {currentClient.firstName}{" "}
                  {currentClient.surname}
                </div>

                <div>
                  {currentClient.email ||
                    currentClient.phone}
                </div>
              </>
            ) : (
              "Guest"
            )}
          </div>

          <button
            style={styles.menuItem}
            onClick={openAccount}
          >
            <span
              style={
                styles.menuIcon
              }
            >
              ◯
            </span>

            Account
          </button>

          <button
            style={styles.menuItem}
            onClick={openHistory}
          >
            <span
              style={
                styles.menuIcon
              }
            >
              ◷
            </span>

            Appointment History
          </button>

          <button
            style={{
              ...styles.menuItem,
              ...styles.menuDanger,
              marginTop: "10px",
            }}
            onClick={logout}
          >
            <span
              style={{
                ...styles.menuIcon,
                color: COLORS.red,
                borderColor:
                  "rgba(217,135,135,0.20)",
              }}
            >
              ↪
            </span>

            Logout
          </button>
        </aside>
      </>
    );
  }

  /* =======================================================
     ACCOUNT VIEW
     ======================================================= */

  function AccountView() {
    if (!currentClient) {
      return (
        <div
          style={styles.accountContent}
        >
          <div
            style={
              styles.historyEmpty
            }
          >
            Δεν υπάρχει ενεργός λογαριασμός.
          </div>
        </div>
      );
    }

    return (
      <div
        style={styles.accountContent}
      >
        <div
          style={styles.accountCard}
        >
          {!editingAccount ? (
            <>
              <div
                style={
                  styles.accountLabel
                }
              >
                Όνομα
              </div>

              <div
                style={
                  styles.accountValue
                }
              >
                {currentClient.firstName}
              </div>

              <div
                style={
                  styles.accountLabel
                }
              >
                Επώνυμο
              </div>

              <div
                style={
                  styles.accountValue
                }
              >
                {currentClient.surname}
              </div>

              <div
                style={
                  styles.accountLabel
                }
              >
                Τηλέφωνο
              </div>

              <div
                style={
                  styles.accountValue
                }
              >
                {currentClient.phone ||
                  "—"}
              </div>

              <div
                style={
                  styles.accountLabel
                }
              >
                Email
              </div>

              <div
                style={
                  styles.accountValue
                }
              >
                {currentClient.email ||
                  "—"}
              </div>

              <button
                style={
                  styles.editButton
                }
                onClick={() =>
                  setEditingAccount(
                    true
                  )
                }
              >
                EDIT DETAILS
              </button>
            </>
          ) : (
            <>
              <div
                style={
                  styles.accountLabel
                }
              >
                Όνομα
              </div>

              <input
                style={
                  styles.accountField
                }
                value={
                  accountForm.firstName
                }
                onChange={(event) =>
                  setAccountForm(
                    (previous) => ({
                      ...previous,
                      firstName:
                        event.target
                          .value,
                    })
                  )
                }
              />

              <div
                style={
                  styles.accountLabel
                }
              >
                Επώνυμο
              </div>

              <input
                style={
                  styles.accountField
                }
                value={
                  accountForm.surname
                }
                onChange={(event) =>
                  setAccountForm(
                    (previous) => ({
                      ...previous,
                      surname:
                        event.target
                          .value,
                    })
                  )
                }
              />

              <div
                style={
                  styles.accountLabel
                }
              >
                Τηλέφωνο
              </div>

              <input
                style={
                  styles.accountField
                }
                value={
                  accountForm.phone
                }
                onChange={(event) =>
                  setAccountForm(
                    (previous) => ({
                      ...previous,
                      phone:
                        event.target
                          .value,
                    })
                  )
                }
              />

              <div
                style={
                  styles.accountLabel
                }
              >
                Email
              </div>

              <input
                style={
                  styles.accountField
                }
                value={
                  accountForm.email
                }
                onChange={(event) =>
                  setAccountForm(
                    (previous) => ({
                      ...previous,
                      email:
                        event.target
                          .value,
                    })
                  )
                }
              />

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "4px",
                }}
              >
                <button
                  style={
                    styles.cancelEditButton
                  }
                  onClick={() =>
                    setEditingAccount(
                      false
                    )
                  }
                >
                  CANCEL
                </button>

                <button
                  style={
                    styles.saveButton
                  }
                  onClick={
                    saveAccountChanges
                  }
                >
                  SAVE CHANGES
                </button>
              </div>
            </>
          )}
        </div>

        {memoryNotes.length > 0 && (
          <div
            style={{
              ...styles.accountCard,
              marginTop: "10px",
            }}
          >
            <div
              style={
                styles.accountLabel
              }
            >
              NELA MEMORY
            </div>

            {memoryNotes.map(
              (note, index) => (
                <div
                  key={`${note}-${index}`}
                  style={{
                    fontSize: "12px",
                    color:
                      COLORS.muted,
                    lineHeight: 1.6,
                    marginTop:
                      index === 0
                        ? "8px"
                        : "6px",
                  }}
                >
                  • {note}
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  /* =======================================================
     HISTORY VIEW
     ======================================================= */

  function HistoryView() {
    const customerBookings =
      currentClient
        ? bookings
            .filter(
              (bookingItem) =>
                bookingItem.clientId ===
                currentClient.id
            )
            .sort(
              (a, b) =>
                new Date(
                  `${b.date}T${b.time || "00:00"}`
                ) -
                new Date(
                  `${a.date}T${a.time || "00:00"}`
                )
            )
        : [];

    if (!customerBookings.length) {
      return (
        <div
          style={
            styles.historyContent
          }
        >
          <div
            style={
              styles.historyEmpty
            }
          >
            Δεν υπάρχει ακόμα ιστορικό ραντεβού.
          </div>
        </div>
      );
    }

    return (
      <div
        style={
          styles.historyContent
        }
      >
        {customerBookings.map(
          (bookingItem) => {
            const dateLabel =
              bookingItem.date
                ? new Date(
                    `${bookingItem.date}T12:00:00`
                  ).toLocaleDateString(
                    "el-GR",
                    {
                      weekday:
                        "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )
                : bookingItem.dateLabel;

            const statusText =
              bookingItem.status ===
              "cancelled"
                ? "Cancelled"
                : "Confirmed";

            const statusColor =
              bookingItem.status ===
              "cancelled"
                ? COLORS.red
                : COLORS.green;

            return (
              <div
                key={
                  bookingItem.id
                }
                style={
                  styles.historyCard
                }
              >
                <div
                  style={
                    styles.historyTop
                  }
                >
                  <div
                    style={
                      styles.historyService
                    }
                  >
                    {
                      bookingItem.serviceName
                    }
                  </div>

                  <div
                    style={{
                      ...styles.historyStatus,
                      color:
                        statusColor,
                      borderColor:
                        bookingItem.status ===
                        "cancelled"
                          ? "rgba(217,135,135,0.18)"
                          : "rgba(143,207,155,0.18)",
                    }}
                  >
                    {statusText}
                  </div>
                </div>

                <div
                  style={
                    styles.historyGrid
                  }
                >
                  <div
                    style={
                      styles.historyInfo
                    }
                  >
                    <div
                      style={
                        styles.historyLabel
                      }
                    >
                      Date
                    </div>

                    <div
                      style={
                        styles.historyValue
                      }
                    >
                      {dateLabel}
                    </div>
                  </div>

                  <div
                    style={
                      styles.historyInfo
                    }
                  >
                    <div
                      style={
                        styles.historyLabel
                      }
                    >
                      Time
                    </div>

                    <div
                      style={
                        styles.historyValue
                      }
                    >
                      {bookingItem.time ||
                        "—"}
                    </div>
                  </div>

                  <div
                    style={
                      styles.historyInfo
                    }
                  >
                    <div
                      style={
                        styles.historyLabel
                      }
                    >
                      Price
                    </div>

                    <div
                      style={
                        styles.historyValue
                      }
                    >
                      {bookingItem.price !=
                      null
                        ? `€${bookingItem.price}`
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={
                      styles.historyInfo
                    }
                  >
                    <div
                      style={
                        styles.historyLabel
                      }
                    >
                      Duration
                    </div>

                    <div
                      style={
                        styles.historyValue
                      }
                    >
                      {bookingItem.duration
                        ? `${bookingItem.duration} min`
                        : "—"}
                    </div>
                  </div>
                </div>

                {bookingItem.note && (
                  <div
                    style={
                      styles.historyNote
                    }
                  >
                    {bookingItem.note}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    );
  }

  /* =======================================================
     CHAT VIEW
     ======================================================= */

  return (
    <div
      style={styles.page}
    >
      <div
        style={styles.glows}
      >
        <div
          style={styles.glowOne}
        />

        <div
          style={styles.glowTwo}
        />
      </div>

      <div
        style={styles.watermark}
      >
        N
      </div>

      <div
        style={styles.shell}
      >
        <header
          style={styles.header}
        >
          <div
            style={styles.brand}
            onClick={() => {
              setView("chat");
              setMenuOpen(false);
            }}
          >
            <div
              style={styles.logo}
            >
              N
            </div>

            <div>
              <div
                style={styles.title}
              >
                NELA
              </div>

              <div
                style={styles.subtitle}
              >
                AI RECEPTIONIST
              </div>
            </div>

            <div
              style={styles.online}
            />
          </div>

          <button
            style={styles.menuButton}
            onClick={() =>
              setMenuOpen(
                (previous) =>
                  !previous
              )
            }
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
        </header>

        {view === "chat" && (
          <>
            {currentClient &&
              memoryNotes.length >
                0 && (
                <div
                  style={
                    styles.memoryBadge
                  }
                >
                  MEMORY ACTIVE
                </div>
              )}

            <div
              style={
                styles.progress
              }
            >
              <div
                style={
                  styles.progressFill
                }
              />
            </div>

            <main
              style={styles.chat}
            >
              <div
                style={
                  styles.bubbles
                }
              >
                {messages.map(
                  (message) => (
                    <div
                      key={
                        message.id
                      }
                      style={
                        message.role ===
                        "user"
                          ? styles.bubbleUser
                          : styles.bubbleAssistant
                      }
                    >
                      {message.text}
                    </div>
                  )
                )}

                {typing && (
                  <div
                    style={
                      styles.bubbleAssistant
                    }
                  >
                    <span
                      style={{
                        opacity: 0.55,
                      }}
                    >
                      NELA is typing…
                    </span>
                  </div>
                )}

                <div
                  ref={
                    messagesEndRef
                  }
                />
              </div>
            </main>

            <footer
              style={styles.footer}
            >
              <div
                style={
                  styles.actions
                }
              >
                <button
                  style={
                    styles.action
                  }
                  onClick={() =>
                    beginBooking()
                  }
                >
                  Book appointment
                </button>

                <button
                  style={
                    styles.action
                  }
                  onClick={() =>
                    setInput(
                      "Ποιες υπηρεσίες προσφέρετε;"
                    )
                  }
                >
                  Services
                </button>

                <button
                  style={
                    styles.action
                  }
                  onClick={() =>
                    setInput(
                      "Ποιες ώρες είστε ανοιχτά;"
                    )
                  }
                >
                  Opening hours
                </button>
              </div>

              <div
                style={
                  styles.inputRow
                }
              >
                <input
                  style={
                    styles.input
                  }
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      sendMessage();
                    }
                  }}
                  placeholder="Write a message..."
                />

                <button
                  style={
                    styles.send
                  }
                  onClick={
                    sendMessage
                  }
                  disabled={typing}
                >
                  ↑
                </button>
              </div>

              <div
                style={styles.powered}
              >
                NELA AI RECEPTIONIST
              </div>
            </footer>
          </>
        )}

        {view === "account" && (
          <>
            <div
              style={
                styles.viewHeader
              }
            >
              <button
                style={
                  styles.backButton
                }
                onClick={() =>
                  setView("chat")
                }
              >
                ←
              </button>

              <div>
                <div
                  style={
                    styles.viewTitle
                  }
                >
                  Account
                </div>

                <div
                  style={
                    styles.viewSubtitle
                  }
                >
                  Your personal details
                </div>
              </div>
            </div>

            {AccountView()}
          </>
        )}

        {view === "history" && (
          <>
            <div
              style={
                styles.viewHeader
              }
            >
              <button
                style={
                  styles.backButton
                }
                onClick={() =>
                  setView("chat")
                }
              >
                ←
              </button>

              <div>
                <div
                  style={
                    styles.viewTitle
                  }
                >
                  Appointment History
                </div>

                <div
                  style={
                    styles.viewSubtitle
                  }
                >
                  Your previous appointments
                </div>
              </div>
            </div>

            {HistoryView()}
          </>
        )}
      </div>

      {MenuPanel()}
    </div>
  );
}