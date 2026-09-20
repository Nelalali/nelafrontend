import { useEffect, useMemo, useRef, useState } from "react";
import Admin from "./Admin";
import LandingPage from "./LandingPage";
import businessData from "./businessData";

const USER_KEY = "nelaUser";
const BOOKINGS_KEY = "nelaBookings";
const CLIENTS_KEY = "nelaClients";
const ACTIVE_CLIENT_KEY = "nelaActiveClient";
const CONVERSATION_KEY = "nelaConversationHistory";

const COLORS = {
  gold: "#d6b76a",
  goldLight: "#f4e3b0",
  goldDark: "#9d762d",
  black: "#020304",
  dark: "#06090d",
  panel: "#0c1117",
  panel2: "#101720",
  border: "rgba(214,183,106,.18)",
  text: "#f7f3e8",
  muted: "#a9a39a",
  green: "#8fcf9a",
  red: "#d88b8b",
};

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function safeStorageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function getServices() {
  const services = businessData?.services;

  if (!Array.isArray(services)) return [];

  return services.map((service, index) => {
    if (typeof service === "string") {
      return {
        id: `service_${index}`,
        name: service,
        price: "",
        duration: "",
      };
    }

    return {
      id: service.id || `service_${index}`,
      name: service.name || service.title || "Υπηρεσία",
      price: service.price || "",
      duration: service.duration || "",
    };
  });
}

const SERVICES = getServices();

function normalizeClient(client = {}) {
  const surname = cleanText(
    client.surname || client.lastName || ""
  );

  return {
    id: client.id || createId("client"),
    firstName: cleanText(client.firstName || ""),
    surname,
    lastName: surname,
    phone: cleanText(client.phone || ""),
    email: cleanText(client.email || "").toLowerCase(),
    memoryNotes: Array.isArray(client.memoryNotes)
      ? client.memoryNotes
      : Array.isArray(client.memory)
      ? client.memory
      : [],
    createdAt:
      client.createdAt || new Date().toISOString(),
    updatedAt:
      client.updatedAt || new Date().toISOString(),
  };
}

function loadClients() {
  const clients = safeStorageGet(CLIENTS_KEY, []);
  if (!Array.isArray(clients)) return [];

  return clients.map(normalizeClient);
}

function saveClients(clients) {
  safeStorageSet(
    CLIENTS_KEY,
    clients.map(normalizeClient)
  );
}

function loadActiveClientId() {
  return safeStorageGet(ACTIVE_CLIENT_KEY, null);
}

function findClient(clients, criteria = {}) {
  if (!Array.isArray(clients)) return null;

  if (criteria.id) {
    const found = clients.find(
      (client) => client.id === criteria.id
    );

    if (found) return normalizeClient(found);
  }

  if (criteria.email) {
    const email = cleanText(criteria.email).toLowerCase();

    const found = clients.find(
      (client) =>
        cleanText(client.email).toLowerCase() === email
    );

    if (found) return normalizeClient(found);
  }

  if (criteria.phone) {
    const phone = cleanText(criteria.phone).replace(/\D/g, "");

    const found = clients.find(
      (client) =>
        cleanText(client.phone).replace(/\D/g, "") === phone
    );

    if (found) return normalizeClient(found);
  }

  return null;
}

function createEmptyBooking() {
  return {
    service: "",
    date: "",
    time: "",
    firstName: "",
    surname: "",
    phone: "",
    email: "",
  };
}

function extractPhone(text) {
  const match = String(text).match(
    /(?:\+30\s?)?(?:69\d{8}|2\d{9})/
  );

  return match ? match[0].replace(/\s+/g, "") : "";
}

function extractEmail(text) {
  const match = String(text).match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0].toLowerCase() : "";
}

function extractTime(text) {
  const match = String(text).match(
    /\b([01]?\d|2[0-3])[:.](\d{2})\b/
  );

  if (!match) return "";

  return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
}

function extractName(text) {
  const match = String(text).match(
    /(?:με λένε|ονομαζομαι|είμαι|ειμαι|όνομα μου είναι|ονομα μου ειναι)\s+([a-zA-ZΑ-Ωα-ωάέήίόύώϊϋΐΰ]+)(?:\s+([a-zA-ZΑ-Ωα-ωάέήίόύώϊϋΐΰ]+))?/i
  );

  if (!match) return null;

  return {
    firstName: match[1] || "",
    surname: match[2] || "",
  };
}

function detectService(text) {
  const normalized = normalizeText(text);

  const found = SERVICES.find((service) => {
    const name = normalizeText(service.name);
    return name && normalized.includes(name);
  });

  return found || null;
}

function parseDate(text) {
  const normalized = normalizeText(text);
  const now = new Date();

  if (
    normalized.includes("σήμερα") ||
    normalized.includes("simera")
  ) {
    return now.toISOString().slice(0, 10);
  }

  if (
    normalized.includes("αυριο") ||
    normalized.includes("avrio")
  ) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }

  if (
    normalized.includes("μεθαυριο") ||
    normalized.includes("methavrio")
  ) {
    const date = new Date(now);
    date.setDate(date.getDate() + 2);
    return date.toISOString().slice(0, 10);
  }

  const numeric = String(text).match(
    /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/
  );

  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    let year = numeric[3]
      ? Number(numeric[3])
      : now.getFullYear();

    if (year < 100) year += 2000;

    const date = new Date(year, month - 1, day);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return "";
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("el-GR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isBookingIntent(text) {
  const value = normalizeText(text);

  return [
    "ραντεβου",
    "κρατηση",
    "κλεισω",
    "κλεισουμε",
    "book",
    "booking",
    "appointment",
    "θελω να κλεισω",
    "θα ηθελα να κλεισω",
  ].some((word) => value.includes(word));
}

function isCancelIntent(text) {
  const value = normalizeText(text);

  return [
    "ακυρωση",
    "ακυρωσω",
    "ακυρωσε",
    "cancel",
  ].some((word) => value.includes(word));
}

function isHistoryIntent(text) {
  const value = normalizeText(text);

  return [
    "ραντεβου μου",
    "κρατησεις μου",
    "ιστορικο",
    "history",
    "appointments",
  ].some((word) => value.includes(word));
}

function getBookings() {
  const bookings = safeStorageGet(BOOKINGS_KEY, []);
  return Array.isArray(bookings) ? bookings : [];
}

function saveBookings(bookings) {
  safeStorageSet(BOOKINGS_KEY, bookings);
}

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
      throw new Error("AI request failed");
    }

    const data = await response.json();

    return (
      data.reply ||
      data.message ||
      "Μπορώ να σε βοηθήσω με το ραντεβού σου."
    );
  } catch {
    return null;
  }
}

function getWelcomeMessage(user) {
  const firstName =
    user?.firstName ||
    user?.name ||
    "εκεί";

  return `Γεια σου ${firstName}! Είμαι η NELA. Πώς μπορώ να σε βοηθήσω σήμερα;`;
}

/* =========================================================
   CHAT APP
========================================================= */

function ChatApp() {
  const loggedUser = safeStorageGet(USER_KEY, null);

  const [clients, setClients] = useState(() =>
    loadClients()
  );

  const [currentClient, setCurrentClient] = useState(() => {
    const storedClients = loadClients();
    const activeId = loadActiveClientId();
    const user = safeStorageGet(USER_KEY, null);

    const found =
      findClient(storedClients, {
        id: activeId || user?.id,
      }) ||
      findClient(storedClients, {
        email: user?.email,
      });

    if (found) return found;

    if (user?.id) {
      return normalizeClient({
        id: user.id,
        firstName: user.firstName,
        surname: user.lastName || user.surname,
        phone: user.phone,
        email: user.email,
      });
    }

    return null;
  });

  const [messages, setMessages] = useState(() => {
    const history = safeStorageGet(
      CONVERSATION_KEY,
      []
    );

    if (Array.isArray(history) && history.length) {
      return history;
    }

    return [
      {
        id: createId("message"),
        role: "assistant",
        text: getWelcomeMessage(loggedUser),
      },
    ];
  });

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState("chat");
  const [editingAccount, setEditingAccount] =
    useState(false);

  const [booking, setBooking] = useState(
    createEmptyBooking()
  );

  const [accountForm, setAccountForm] = useState({
    firstName: currentClient?.firstName || "",
    surname:
      currentClient?.surname ||
      currentClient?.lastName ||
      "",
    phone: currentClient?.phone || "",
    email: currentClient?.email || "",
  });

  const bottomRef = useRef(null);

  useEffect(() => {
    saveClients(clients);
  }, [clients]);

  useEffect(() => {
    if (currentClient?.id) {
      safeStorageSet(
        ACTIVE_CLIENT_KEY,
        currentClient.id
      );
    }
  }, [currentClient]);

  useEffect(() => {
    if (!currentClient) return;

    setAccountForm({
      firstName: currentClient.firstName || "",
      surname:
        currentClient.surname ||
        currentClient.lastName ||
        "",
      phone: currentClient.phone || "",
      email: currentClient.email || "",
    });
  }, [currentClient]);

  useEffect(() => {
    safeStorageSet(
      CONVERSATION_KEY,
      messages.slice(-100)
    );

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 30);
  }, [messages]);

  const clientBookings = useMemo(() => {
    if (!currentClient) return [];

    return getBookings()
      .filter(
        (bookingItem) =>
          bookingItem.clientId === currentClient.id ||
          (
            bookingItem.email &&
            bookingItem.email.toLowerCase() ===
              currentClient.email?.toLowerCase()
          )
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      );
  }, [currentClient, messages]);

  function addMessage(role, text) {
    setMessages((prev) => [
      ...prev,
      {
        id: createId("message"),
        role,
        text,
      },
    ]);
  }

  function updateClient(nextClient) {
    const normalized = normalizeClient(nextClient);

    setCurrentClient(normalized);

    setClients((prev) => {
      const exists = prev.some(
        (client) => client.id === normalized.id
      );

      if (!exists) {
        return [...prev, normalized];
      }

      return prev.map((client) =>
        client.id === normalized.id
          ? normalized
          : client
      );
    });
  }

  function identifyClient(data) {
    if (!data) return;

    const existing =
      findClient(clients, {
        email: data.email,
      }) ||
      findClient(clients, {
        phone: data.phone,
      });

    if (existing) {
      updateClient({
        ...existing,
        firstName:
          data.firstName || existing.firstName,
        surname:
          data.surname ||
          data.lastName ||
          existing.surname,
        lastName:
          data.surname ||
          data.lastName ||
          existing.surname,
        phone: data.phone || existing.phone,
        email: data.email || existing.email,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    updateClient({
      id: currentClient?.id || createId("client"),
      firstName: data.firstName || "",
      surname:
        data.surname ||
        data.lastName ||
        "",
      phone: data.phone || "",
      email: data.email || "",
      memoryNotes: [],
    });
  }

  function saveBooking() {
    if (
      !booking.service ||
      !booking.date ||
      !booking.time
    ) {
      return false;
    }

    const user = safeStorageGet(USER_KEY, null);

    const bookingClient = normalizeClient({
      ...(currentClient || {}),
      id:
        currentClient?.id ||
        user?.id ||
        createId("client"),
      firstName:
        booking.firstName ||
        currentClient?.firstName ||
        user?.firstName ||
        "",
      surname:
        booking.surname ||
        currentClient?.surname ||
        user?.lastName ||
        "",
      phone:
        booking.phone ||
        currentClient?.phone ||
        user?.phone ||
        "",
      email:
        booking.email ||
        currentClient?.email ||
        user?.email ||
        "",
    });

    updateClient(bookingClient);

    const newBooking = {
      id: createId("booking"),
      clientId: bookingClient.id,
      firstName: bookingClient.firstName,
      surname: bookingClient.surname,
      phone: bookingClient.phone,
      email: bookingClient.email,
      service: booking.service,
      date: booking.date,
      time: booking.time,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    const bookings = getBookings();

    saveBookings([
      ...bookings,
      newBooking,
    ]);

    setBooking(createEmptyBooking());

    return newBooking;
  }

  function startBooking(prefill = {}) {
    const user = safeStorageGet(USER_KEY, null);

    setBooking({
      service:
        prefill.service ||
        "",
      date:
        prefill.date ||
        "",
      time:
        prefill.time ||
        "",
      firstName:
        currentClient?.firstName ||
        user?.firstName ||
        "",
      surname:
        currentClient?.surname ||
        currentClient?.lastName ||
        user?.lastName ||
        "",
      phone:
        currentClient?.phone ||
        user?.phone ||
        "",
      email:
        currentClient?.email ||
        user?.email ||
        "",
    });
  }

  function processBooking(text) {
    let next = {
      ...booking,
    };

    const service = detectService(text);

    if (service) {
      next.service = service.name;
    }

    const date = parseDate(text);

    if (date) {
      next.date = date;
    }

    const time = extractTime(text);

    if (time) {
      next.time = time;
    }

    const phone = extractPhone(text);

    if (phone) {
      next.phone = phone;
    }

    const email = extractEmail(text);

    if (email) {
      next.email = email;
    }

    const name = extractName(text);

    if (name) {
      next.firstName = name.firstName;
      next.surname = name.surname;
    }

    setBooking(next);

    if (!next.service) {
      return "Φυσικά. Ποια υπηρεσία θα ήθελες να κλείσεις;";
    }

    if (!next.date) {
      return "Τέλεια. Για ποια ημερομηνία θέλεις το ραντεβού;";
    }

    if (!next.time) {
      return `Ωραία. Για ${formatDate(
        next.date
      )}. Τι ώρα σε εξυπηρετεί;`;
    }

    const missingContact =
      !next.firstName ||
      !next.phone ||
      !next.email;

    if (missingContact) {
      return "Έχουμε σχεδόν τελειώσει. Χρειάζομαι το όνομά σου, το τηλέφωνό σου και το email σου για να ολοκληρώσω την κράτηση.";
    }

    const saved = saveBooking();

    if (!saved) {
      return "Δεν κατάφερα να ολοκληρώσω την κράτηση. Δοκίμασε ξανά.";
    }

    return `Έτοιμο! Το ραντεβού σου καταχωρήθηκε για ${formatDate(
      next.date
    )} στις ${next.time}.`;
  }

  async function sendMessage(customText = null) {
    const text = cleanText(
      customText !== null ? customText : input
    );

    if (!text || typing) return;

    setInput("");

    addMessage("user", text);

    const normalized = normalizeText(text);

    if (isHistoryIntent(text)) {
      setView("history");
      return;
    }

    if (isCancelIntent(text)) {
      const latest = clientBookings[0];

      if (!latest) {
        addMessage(
          "assistant",
          "Δεν βλέπω κάποια ενεργή κράτηση στο ιστορικό σου."
        );
        return;
      }

      const bookings = getBookings();

      const updated = bookings.map((item) =>
        item.id === latest.id
          ? {
              ...item,
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            }
          : item
      );

      saveBookings(updated);

      addMessage(
        "assistant",
        "Έγινε. Η τελευταία σου κράτηση ακυρώθηκε."
      );

      return;
    }

    if (
      isBookingIntent(text) ||
      booking.service ||
      booking.date ||
      booking.time
    ) {
      addMessage(
        "assistant",
        processBooking(text)
      );

      return;
    }

    const service = detectService(text);

    if (service) {
      startBooking({
        service: service.name,
      });

      addMessage(
        "assistant",
        `Φυσικά. Για την υπηρεσία «${service.name}», πες μου ποια ημέρα θέλεις.`
      );

      return;
    }

    if (
      normalized.includes("γεια") ||
      normalized.includes("hello") ||
      normalized.includes("hi")
    ) {
      addMessage(
        "assistant",
        getWelcomeMessage(
          currentClient || loggedUser
        )
      );
      return;
    }

    setTyping(true);

    const aiReply = await askNelaAI(text);

    setTyping(false);

    if (aiReply) {
      addMessage("assistant", aiReply);
    } else {
      addMessage(
        "assistant",
        "Μπορώ να σε βοηθήσω με υπηρεσίες, διαθεσιμότητα και ραντεβού. Πες μου τι χρειάζεσαι."
      );
    }
  }

  function saveAccountChanges() {
    const firstName = cleanText(
      accountForm.firstName
    );

    const surname = cleanText(
      accountForm.surname
    );

    const phone = cleanText(
      accountForm.phone
    );

    const email = cleanText(
      accountForm.email
    ).toLowerCase();

    if (!firstName || !surname || !phone || !email) {
      return;
    }

    const updatedClient = normalizeClient({
      ...currentClient,
      firstName,
      surname,
      lastName: surname,
      phone,
      email,
      updatedAt: new Date().toISOString(),
    });

    updateClient(updatedClient);

    safeStorageSet(USER_KEY, {
      id: updatedClient.id,
      firstName,
      lastName: surname,
      phone,
      email,
    });

    setEditingAccount(false);
  }

  function logout() {
    safeStorageRemove(ACTIVE_CLIENT_KEY);
    safeStorageRemove(USER_KEY);

    setCurrentClient(null);
    setBooking(createEmptyBooking());
    setMenuOpen(false);

    safeStorageRemove(CONVERSATION_KEY);

    window.location.replace("/");
  }

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(circle at top, #15110a 0%, #06090d 38%, #020304 100%)",
      color: COLORS.text,
      fontFamily:
        "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      display: "flex",
      flexDirection: "column",
    },

    header: {
      height: 72,
      borderBottom:
        `1px solid ${COLORS.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 22px",
      background:
        "rgba(2,3,4,.82)",
      backdropFilter: "blur(16px)",
      position: "sticky",
      top: 0,
      zIndex: 20,
    },

    logo: {
      width: 42,
      height: 42,
      borderRadius: 13,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border:
        `1px solid ${COLORS.gold}`,
      color: COLORS.goldLight,
      fontWeight: 900,
      fontSize: 21,
      boxShadow:
        "0 0 24px rgba(214,183,106,.12)",
    },

    brand: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },

    brandTitle: {
      fontWeight: 800,
      letterSpacing: ".18em",
      fontSize: 15,
    },

    menuButton: {
      border:
        `1px solid ${COLORS.border}`,
      background: "rgba(255,255,255,.025)",
      color: COLORS.text,
      width: 44,
      height: 44,
      borderRadius: 13,
      cursor: "pointer",
      fontSize: 20,
    },

    content: {
      width: "100%",
      maxWidth: 920,
      margin: "0 auto",
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "24px 16px 110px",
      boxSizing: "border-box",
    },

    chat: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
    },

    bubble: {
      maxWidth: "82%",
      padding: "13px 16px",
      borderRadius: 18,
      lineHeight: 1.55,
      fontSize: 15,
      whiteSpace: "pre-wrap",
    },

    inputArea: {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      padding: 14,
      background:
        "linear-gradient(transparent, #020304 35%)",
      zIndex: 15,
    },

    inputInner: {
      maxWidth: 920,
      margin: "0 auto",
      display: "flex",
      gap: 10,
      padding: 10,
      border:
        `1px solid ${COLORS.border}`,
      background:
        "rgba(8,12,17,.96)",
      borderRadius: 18,
    },

    input: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 0,
      background: "transparent",
      color: COLORS.text,
      padding: "12px 8px",
      fontSize: 16,
    },

    send: {
      border: 0,
      background:
        `linear-gradient(135deg, ${COLORS.goldLight}, ${COLORS.goldDark})`,
      color: "#171208",
      borderRadius: 13,
      minWidth: 52,
      cursor: "pointer",
      fontWeight: 900,
    },

    panel: {
      background:
        "linear-gradient(145deg, rgba(20,26,34,.94), rgba(7,10,14,.94))",
      border:
        `1px solid ${COLORS.border}`,
      borderRadius: 22,
      padding: 22,
    },
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>N</div>

          <div>
            <div style={styles.brandTitle}>
              NELA
            </div>

            <div
              style={{
                color: COLORS.muted,
                fontSize: 11,
                marginTop: 2,
              }}
            >
              AI RECEPTIONIST
            </div>
          </div>
        </div>

        <button
          type="button"
          style={styles.menuButton}
          onClick={() =>
            setMenuOpen((value) => !value)
          }
        >
          ☰
        </button>
      </header>

      {menuOpen && (
        <div
          style={{
            position: "fixed",
            top: 82,
            right: 16,
            width: 260,
            background: "#0a0e13",
            border:
              `1px solid ${COLORS.border}`,
            borderRadius: 18,
            padding: 10,
            zIndex: 50,
            boxShadow:
              "0 20px 70px rgba(0,0,0,.55)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setView("chat");
              setMenuOpen(false);
            }}
            style={menuItemStyle(view === "chat")}
          >
            💬 Συνομιλία
          </button>

          <button
            type="button"
            onClick={() => {
              setView("history");
              setMenuOpen(false);
            }}
            style={menuItemStyle(
              view === "history"
            )}
          >
            📅 Τα ραντεβού μου
          </button>

          <button
            type="button"
            onClick={() => {
              setView("account");
              setMenuOpen(false);
            }}
            style={menuItemStyle(
              view === "account"
            )}
          >
            👤 Ο λογαριασμός μου
          </button>

          <div
            style={{
              height: 1,
              background: COLORS.border,
              margin: "8px 4px",
            }}
          />

          <button
            type="button"
            onClick={logout}
            style={{
              ...menuItemStyle(false),
              color: COLORS.red,
            }}
          >
            ↪ Αποσύνδεση
          </button>
        </div>
      )}

      <main style={styles.content}>
        {view === "chat" && (
          <>
            <div style={styles.chat}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      message.role === "user"
                        ? "flex-end"
                        : "flex-start",
                  }}
                >
                  <div
                    style={{
                      ...styles.bubble,
                      background:
                        message.role === "user"
                          ? `linear-gradient(135deg, ${COLORS.goldDark}, #5f471d)`
                          : "rgba(255,255,255,.045)",
                      border:
                        message.role === "user"
                          ? "1px solid rgba(244,227,176,.2)"
                          : `1px solid ${COLORS.border}`,
                      color:
                        message.role === "user"
                          ? "#fff8e7"
                          : COLORS.text,
                    }}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {typing && (
                <div
                  style={{
                    color: COLORS.muted,
                    fontSize: 13,
                    padding: "4px 8px",
                  }}
                >
                  NELA γράφει…
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div style={styles.inputArea}>
              <div style={styles.inputInner}>
                <input
                  style={styles.input}
                  value={input}
                  placeholder="Γράψε το μήνυμά σου…"
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                />

                <button
                  type="button"
                  style={styles.send}
                  onClick={() => sendMessage()}
                >
                  ↑
                </button>
              </div>
            </div>
          </>
        )}

        {view === "history" && (
          <div style={styles.panel}>
            <button
              type="button"
              onClick={() => setView("chat")}
              style={backButtonStyle}
            >
              ← Πίσω
            </button>

            <h2
              style={{
                marginTop: 22,
                marginBottom: 6,
              }}
            >
              Τα ραντεβού μου
            </h2>

            <p style={{ color: COLORS.muted }}>
              Εδώ εμφανίζεται το ιστορικό των
              κρατήσεών σου.
            </p>

            {clientBookings.length === 0 ? (
              <div
                style={{
                  marginTop: 25,
                  padding: 18,
                  borderRadius: 16,
                  background:
                    "rgba(255,255,255,.035)",
                  color: COLORS.muted,
                }}
              >
                Δεν έχεις ακόμα καταχωρημένα
                ραντεβού.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 20,
                }}
              >
                {clientBookings.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 17,
                      borderRadius: 16,
                      border:
                        `1px solid ${COLORS.border}`,
                      background:
                        "rgba(255,255,255,.025)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                      }}
                    >
                      <strong>
                        {item.service}
                      </strong>

                      <span
                        style={{
                          color:
                            item.status ===
                            "cancelled"
                              ? COLORS.red
                              : COLORS.green,
                          fontSize: 12,
                        }}
                      >
                        {item.status ===
                        "cancelled"
                          ? "Ακυρωμένο"
                          : "Επιβεβαιωμένο"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: COLORS.muted,
                        fontSize: 14,
                      }}
                    >
                      {formatDate(item.date)}
                      {" • "}
                      {item.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "account" && (
          <div style={styles.panel}>
            <button
              type="button"
              onClick={() => setView("chat")}
              style={backButtonStyle}
            >
              ← Πίσω
            </button>

            <h2
              style={{
                marginTop: 22,
                marginBottom: 6,
              }}
            >
              Ο λογαριασμός μου
            </h2>

            {!editingAccount ? (
              <>
                <AccountRow
                  label="Όνομα"
                  value={
                    currentClient?.firstName || "—"
                  }
                />

                <AccountRow
                  label="Επώνυμο"
                  value={
                    currentClient?.surname ||
                    currentClient?.lastName ||
                    "—"
                  }
                />

                <AccountRow
                  label="Τηλέφωνο"
                  value={
                    currentClient?.phone || "—"
                  }
                />

                <AccountRow
                  label="Email"
                  value={
                    currentClient?.email || "—"
                  }
                />

                <button
                  type="button"
                  style={goldButtonStyle}
                  onClick={() =>
                    setEditingAccount(true)
                  }
                >
                  Επεξεργασία
                </button>
              </>
            ) : (
              <>
                <AccountInput
                  label="Όνομα"
                  value={accountForm.firstName}
                  onChange={(value) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      firstName: value,
                    }))
                  }
                />

                <AccountInput
                  label="Επώνυμο"
                  value={accountForm.surname}
                  onChange={(value) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      surname: value,
                    }))
                  }
                />

                <AccountInput
                  label="Τηλέφωνο"
                  value={accountForm.phone}
                  onChange={(value) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      phone: value,
                    }))
                  }
                />

                <AccountInput
                  label="Email"
                  value={accountForm.email}
                  onChange={(value) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      email: value,
                    }))
                  }
                />

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 20,
                  }}
                >
                  <button
                    type="button"
                    style={goldButtonStyle}
                    onClick={saveAccountChanges}
                  >
                    Αποθήκευση
                  </button>

                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() =>
                      setEditingAccount(false)
                    }
                  >
                    Ακύρωση
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function menuItemStyle(active) {
  return {
    width: "100%",
    textAlign: "left",
    padding: "13px 14px",
    border: 0,
    borderRadius: 12,
    cursor: "pointer",
    background: active
      ? "rgba(214,183,106,.1)"
      : "transparent",
    color: active ? "#f4e3b0" : "#eee9df",
    fontSize: 14,
    marginBottom: 3,
  };
}

const backButtonStyle = {
  border: 0,
  background: "transparent",
  color: "#d6b76a",
  cursor: "pointer",
  padding: 0,
  fontSize: 14,
};

const goldButtonStyle = {
  marginTop: 22,
  border: 0,
  borderRadius: 13,
  padding: "12px 18px",
  background:
    "linear-gradient(135deg,#f4e3b0,#9d762d)",
  color: "#171208",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "1px solid rgba(214,183,106,.18)",
  borderRadius: 13,
  padding: "12px 18px",
  background: "rgba(255,255,255,.04)",
  color: "#f7f3e8",
  fontWeight: 700,
  cursor: "pointer",
};

function AccountRow({ label, value }) {
  return (
    <div
      style={{
        padding: "15px 0",
        borderBottom:
          "1px solid rgba(214,183,106,.1)",
      }}
    >
      <div
        style={{
          color: "#a9a39a",
          fontSize: 12,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AccountInput({
  label,
  value,
  onChange,
}) {
  return (
    <label
      style={{
        display: "block",
        marginTop: 18,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#a9a39a",
          marginBottom: 7,
        }}
      >
        {label}
      </div>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "13px 14px",
          borderRadius: 12,
          border:
            "1px solid rgba(214,183,106,.18)",
          background: "#080c11",
          color: "#f7f3e8",
          outline: "none",
          fontSize: 15,
        }}
      />
    </label>
  );
}

/* =========================================================
   MAIN ROUTER
========================================================= */

export default function App() {
  const path = window.location.pathname;

  if (path === "/admin") {
    return <Admin />;
  }

  const loggedUser = safeStorageGet(
    USER_KEY,
    null
  );

  /*
    IMPORTANT:

    Δεν υπάρχει πλέον route /chat.

    /
      χωρίς nelaUser -> LandingPage
      με nelaUser     -> ChatApp

    Αυτό αποτρέπει το "Not Found" που εμφανιζόταν
    όταν το browser πήγαινε στο /chat.
  */

  if (!loggedUser?.id) {
    return <LandingPage />;
  }

  return <ChatApp />;
}
