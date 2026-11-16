
import { useEffect, useMemo, useState } from "react";
import "./LandingPage.css";
import { NELA_LOGO_DATA, NELA_MARK_DATA } from "./NelaLogo";

const CLIENTS_KEY = "nelaClients";
const USER_KEY = "nelaUser";
const ACTIVE_CLIENT_KEY = "nelaActiveClient";
const BUSINESS_KEY = "nelaBusinesses";
const BUSINESS_USER_KEY = "nelaBusinessUser";
const BOOKINGS_KEY = "nelaBookings";
const HISTORY_KEY = "nelaConversationHistory";
const MEMORY_KEY = "nelaClientMemory";
const THEME_KEY = "nelaTheme";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname) ? "http://localhost:3001" : "")
).replace(/\/+$/, "").replace(/\/chat$/i, "");

const API_URL = API_BASE_URL ? `${API_BASE_URL}/chat` : null;

const categories = [
  "Beauty Salon",
  "Hair Salon",
  "Barbershop",
  "Nail Studio",
  "Medical Clinic",
  "Doctor",
  "Psychologist",
  "Dentist",
  "Accountant",
  "Wellness & Fitness",
  "Other",
];

/* =========================================================
   STORAGE HELPERS
========================================================= */

function readStorage(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("NELA storage error:", error);
    return false;
  }
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now() + "-" + Math.random().toString(36).slice(2);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getClientName(client) {
  if (!client) return "Customer";

  if (client.name) return client.name;

  const firstName = client.firstName || "";
  const lastName = client.lastName || "";

  return (firstName + " " + lastName).trim() || "Customer";
}

function getAppointmentDate(appointment) {
  const value =
    appointment.date ||
    appointment.datetime ||
    appointment.start ||
    "";

  if (!value) return new Date(0);

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function getClientAppointments(client) {
  const ownAppointments = Array.isArray(client?.appointments)
    ? client.appointments
    : [];

  const allBookings = readStorage(BOOKINGS_KEY, []);

  const linkedBookings = Array.isArray(allBookings)
    ? allBookings.filter(
        (booking) =>
          booking.clientId === client?.id ||
          booking.userId === client?.id ||
          normalizeEmail(booking.email) ===
            normalizeEmail(client?.email)
      )
    : [];

  const combined = [...ownAppointments, ...linkedBookings];

  return combined.filter(
    (appointment, index, array) =>
      array.findIndex(
        (item) =>
          item.id &&
          appointment.id &&
          item.id === appointment.id
      ) === index
  );
}

function getHistoryForClient(clientId) {
  const history = readStorage(HISTORY_KEY, []);

  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && (item.clientId === clientId || !item.clientId))
    .map((item) => {
      const content = String(item.content ?? item.text ?? item.message ?? "").trim();
      const rawRole = String(item.role || item.sender || "").toLowerCase();
      const role = ["assistant", "ai", "bot", "model", "nela"].includes(rawRole)
        ? "assistant"
        : ["user", "customer", "human"].includes(rawRole)
          ? "user"
          : rawRole;
      return { ...item, role, content };
    })
    .filter((item) => item.content && ["user", "assistant"].includes(item.role))
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
}

/* =========================================================
   REUSABLE FORM FIELD
========================================================= */

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
  options,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false);

  const isPassword = type === "password";

  return (
    <label className="nela-field">
      <span>{label}</span>

      {options ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
        >
          <option value="">Επιλέξτε κατηγορία</option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <div className="nela-input-wrap">
          <input
            name={name}
            type={isPassword && visible ? "text" : type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            autoComplete={autoComplete}
          />

          {isPassword && (
            <button
              type="button"
              className="nela-eye"
              onClick={() => setVisible(!visible)}
            >
              {visible ? "Hide" : "Show"}
            </button>
          )}
        </div>
      )}
    </label>
  );
}

/* =========================================================
   MAIN LANDING PAGE
========================================================= */

export default function LandingPage({ defaultMode = "home" } = {}) {
  const [mode, setMode] = useState(defaultMode);

  const [theme, setTheme] = useState(() => readStorage(THEME_KEY, "dark") === "light" ? "light" : "dark");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [business, setBusiness] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    category: "",
    password: "",
    confirmPassword: "",
  });

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [currentUser, setCurrentUser] = useState(() =>
    readStorage(USER_KEY, null)
  );

  const [currentBusiness, setCurrentBusiness] = useState(() =>
    readStorage(BUSINESS_USER_KEY, null)
  );

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [clientMemory, setClientMemory] = useState({});
  const [appointments, setAppointments] = useState([]);

  const [accountSection, setAccountSection] = useState("upcoming");
  const [appointmentFilter, setAppointmentFilter] =
    useState("upcoming");

  const [menuOpen, setMenuOpen] = useState(false);

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      console.error("NELA theme preference could not be saved:", error);
    }
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event) => {
      if (event.key === THEME_KEY) {
        setTheme(event.newValue === "light" ? "light" : "dark");
      }
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    const clients = readStorage(CLIENTS_KEY, []);

    const found = clients.find(
      (client) => client.id === currentUser.id
    );

    if (found) {
      setCurrentUser(found);
      setAppointments(getClientAppointments(found));

      setClientMemory(
        readStorage(MEMORY_KEY, {})[found.id] ||
          found.memory ||
          {}
      );

      setChatMessages([]);
    }
  }, []);

  /* =======================================================
     GENERAL HELPERS
  ======================================================= */

  const validEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const changeMode = (newMode) => {
    setError("");
    setMessage("");
    setMenuOpen(false);
    setMode(newMode);
    if (newMode === "home") {
      // Returning to the homepage should always reveal the hero, especially on mobile.
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    }
  };

  const updateCustomer = (event) => {
    setCustomer((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const updateBusiness = (event) => {
    setBusiness((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const updateLogin = (event) => {
    setLogin((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  /* =======================================================
     CUSTOMER REGISTRATION
  ======================================================= */

  const registerCustomer = (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const name = customer.name.trim();
    const email = normalizeEmail(customer.email);

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (!validEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (customer.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (customer.password !== customer.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const clients = readStorage(CLIENTS_KEY, []);

    const exists = clients.some(
      (client) => normalizeEmail(client.email) === email
    );

    if (exists) {
      setError("An account with this email already exists.");
      return;
    }

    const newClient = {
      id: createId(),
      name,
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
      email,
      password: customer.password,
      appointments: [],
      memory: {},
      createdAt: new Date().toISOString(),
    };

    clients.push(newClient);

    if (!writeStorage(CLIENTS_KEY, clients)) {
      setError("Could not save your account. Please try again.");
      return;
    }

    const publicUser = {
      id: newClient.id,
      name: newClient.name,
      firstName: newClient.firstName,
      lastName: newClient.lastName,
      email: newClient.email,
    };

    writeStorage(USER_KEY, publicUser);
    writeStorage(ACTIVE_CLIENT_KEY, newClient.id);

    setCurrentUser(newClient);
    setAppointments([]);
    setClientMemory({});
    setChatMessages([]);

    setMessage("Your account has been created successfully.");

    // Send newly registered customers through the main app router,
    // so they see the same premium chat as returning customers.
    window.location.assign("/");
  };

  /* =======================================================
     CUSTOMER LOGIN
  ======================================================= */

  const loginCustomer = (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const email = normalizeEmail(login.email);
    const clients = readStorage(CLIENTS_KEY, []);

    const found = clients.find(
      (client) =>
        normalizeEmail(client.email) === email &&
        client.password === login.password
    );

    if (!found) {
      setError("Incorrect email or password.");
      return;
    }

    const publicUser = {
      id: found.id,
      name: getClientName(found),
      firstName: found.firstName,
      lastName: found.lastName,
      email: found.email,
    };

    writeStorage(USER_KEY, publicUser);
    writeStorage(ACTIVE_CLIENT_KEY, found.id);

    // Start every login with a clean visible conversation. Keep other clients' data.
    const savedHistory = readStorage(HISTORY_KEY, []);
    if (Array.isArray(savedHistory)) {
      writeStorage(
        HISTORY_KEY,
        savedHistory.filter((item) => item && item.clientId && item.clientId !== found.id)
      );
    }

    // Enter the premium chat immediately without returning to the public homepage.
    setCurrentUser(found);
    setAppointments(getClientAppointments(found));
    setClientMemory(
      readStorage(MEMORY_KEY, {})[found.id] || found.memory || {}
    );
    setChatMessages([]);
    setLogin({ email: "", password: "" });
    setMode("chat");
    setMenuOpen(false);
  };

  /* =======================================================
     BUSINESS REGISTRATION
  ======================================================= */

  const registerBusiness = (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const email = normalizeEmail(business.email);

    if (!validEmail(email)) {
      setError("Please enter a valid business email.");
      return;
    }

    if (business.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (business.password !== business.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const businesses = readStorage(BUSINESS_KEY, []);

    const exists = businesses.some(
      (item) => normalizeEmail(item.email) === email
    );

    if (exists) {
      setError("This business email is already registered.");
      return;
    }

    const newBusiness = {
      id: createId(),
      businessName: business.businessName.trim(),
      ownerName: business.ownerName.trim(),
      email,
      phone: business.phone.trim(),
      category: business.category,
      password: business.password,
      createdAt: new Date().toISOString(),
    };

    businesses.push(newBusiness);

    if (!writeStorage(BUSINESS_KEY, businesses)) {
      setError("Could not save your business account.");
      return;
    }

    const publicBusiness = {
      id: newBusiness.id,
      businessName: newBusiness.businessName,
      ownerName: newBusiness.ownerName,
      email: newBusiness.email,
      phone: newBusiness.phone,
      category: newBusiness.category,
    };

    writeStorage(BUSINESS_USER_KEY, publicBusiness);

    setCurrentBusiness(publicBusiness);
    setMessage("Your business account has been created.");

    setTimeout(() => {
      window.location.href = "/?admin=true";
    }, 700);
  };

  /* =======================================================
     BUSINESS LOGIN
  ======================================================= */

  const loginBusiness = (event) => {
    event.preventDefault();

    setError("");

    const email = normalizeEmail(login.email);
    const businesses = readStorage(BUSINESS_KEY, []);

    const found = businesses.find(
      (item) =>
        normalizeEmail(item.email) === email &&
        item.password === login.password
    );

    if (!found) {
      setError("Incorrect business email or password.");
      return;
    }

    const publicBusiness = {
      id: found.id,
      businessName: found.businessName,
      ownerName: found.ownerName,
      email: found.email,
      phone: found.phone,
      category: found.category,
    };

    writeStorage(BUSINESS_USER_KEY, publicBusiness);

    setCurrentBusiness(publicBusiness);

    window.location.href = "/?admin=true";
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_CLIENT_KEY);

    setCurrentUser(null);
    setAppointments([]);
    setChatMessages([]);
    setClientMemory({});
    setMenuOpen(false);

    setLogin({
      email: "",
      password: "",
    });

    setMode("home");
  };

  const businessLogout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    localStorage.removeItem(BUSINESS_USER_KEY);

    setCurrentBusiness(null);
    setMode("home");
  };

  /* =======================================================
     APPOINTMENTS
  ======================================================= */

  const saveAppointments = (updatedAppointments) => {
    if (!currentUser?.id) return;

    setAppointments(updatedAppointments);

    const clients = readStorage(CLIENTS_KEY, []);

    const updatedClients = clients.map((client) =>
      client.id === currentUser.id
        ? {
            ...client,
            appointments: updatedAppointments,
          }
        : client
    );

    writeStorage(CLIENTS_KEY, updatedClients);

    const allBookings = readStorage(BOOKINGS_KEY, []);

    const otherBookings = allBookings.filter(
      (booking) =>
        booking.clientId !== currentUser.id &&
        booking.userId !== currentUser.id &&
        normalizeEmail(booking.email) !==
          normalizeEmail(currentUser.email)
    );

    writeStorage(BOOKINGS_KEY, [
      ...otherBookings,
      ...updatedAppointments,
    ]);
  };

  const cancelAppointment = (appointmentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    const updated = appointments.map((appointment) =>
      appointment.id === appointmentId
        ? {
            ...appointment,
            status: "cancelled",
            cancelledAt: new Date().toISOString(),
          }
        : appointment
    );

    saveAppointments(updated);
  };

  const upcomingAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const status = String(appointment.status || "").toLowerCase();

      return (
        getAppointmentDate(appointment) >= new Date() &&
        status !== "cancelled" &&
        status !== "completed"
      );
    });
  }, [appointments]);

  const previousAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const status = String(appointment.status || "").toLowerCase();

      return (
        getAppointmentDate(appointment) < new Date() ||
        status === "completed" ||
        status === "cancelled"
      );
    });
  }, [appointments]);

  /* =======================================================
     NELA MEMORY
  ======================================================= */

  const saveMemory = (newMemory) => {
    if (!currentUser?.id) return;

    const allMemory = readStorage(MEMORY_KEY, {});

    allMemory[currentUser.id] = newMemory;

    writeStorage(MEMORY_KEY, allMemory);

    setClientMemory(newMemory);

    const clients = readStorage(CLIENTS_KEY, []);

    writeStorage(
      CLIENTS_KEY,
      clients.map((client) =>
        client.id === currentUser.id
          ? { ...client, memory: newMemory }
          : client
      )
    );
  };

  /* =======================================================
     CHAT HISTORY
  ======================================================= */

  const saveChatHistory = (newHistory) => {
    if (!currentUser?.id) return;

    const history = readStorage(HISTORY_KEY, []);

    const otherMessages = Array.isArray(history)
      ? history.filter(
          (item) => item.clientId !== currentUser.id
        )
      : [];

    const userHistory = newHistory
      .map((item) => ({
        ...item,
        content: String(item.content ?? item.text ?? item.message ?? "").trim(),
        clientId: currentUser.id,
      }))
      .filter((item) => item.content && ["user", "assistant"].includes(item.role));

    writeStorage(HISTORY_KEY, [
      ...otherMessages,
      ...userHistory,
    ]);

    setChatMessages(newHistory);
  };

  /* =======================================================
     PROCESS APPOINTMENTS RETURNED BY AI
  ======================================================= */

  const processAIAppointment = (data) => {
    const possibleAppointments = [
      ...(Array.isArray(data.bookings) ? data.bookings : []),
      ...(Array.isArray(data.appointments) ? data.appointments : []),
      ...(data.booking ? [data.booking] : []),
      ...(data.appointment ? [data.appointment] : []),
    ];

    if (!possibleAppointments.length) return;

    const updated = [...appointments];

    possibleAppointments.forEach((appointment) => {
      if (!appointment || typeof appointment !== "object") return;

      const newAppointment = {
        ...appointment,
        id: appointment.id || createId(),
        clientId: currentUser.id,
        customerName: getClientName(currentUser),
        email: currentUser.email,
        status: appointment.status || "confirmed",
      };

      const exists = updated.some(
        (item) => item.id === newAppointment.id
      );

      if (!exists) {
        updated.push(newAppointment);
      }
    });

    saveAppointments(updated);
  };

  /* =======================================================
     SEND CHAT MESSAGE
  ======================================================= */

  const sendMessage = async (event) => {
    if (event) event.preventDefault();

    const text = chatInput.trim();

    if (!text || chatLoading || !currentUser) return;

    setChatInput("");
    setError("");

    const userMessage = {
      id: createId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      clientId: currentUser.id,
    };

    const updatedHistory = [...chatMessages, userMessage];

    setChatMessages(updatedHistory);
    saveChatHistory(updatedHistory);

    setChatLoading(true);

    try {
      if (!API_URL) {
        throw new Error("NELA AI server is not configured. Set VITE_API_URL in the frontend environment.");
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          clientId: currentUser.id,
          customer: {
            id: currentUser.id,
            name: getClientName(currentUser),
            email: currentUser.email,
          },
          memory: clientMemory,
          history: updatedHistory.slice(-20),
        }),
      });

      if (!response.ok) {
        throw new Error("Server error: " + response.status);
      }

      const data = await response.json();

      const reply =
        data.answer ||
        data.reply ||
        data.message ||
        data.response ||
        data.output_text ||
        "I am here to help you.";

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        content:
          typeof reply === "string"
            ? reply
            : JSON.stringify(reply),
        timestamp: new Date().toISOString(),
        clientId: currentUser.id,
      };

      const finalHistory = [
        ...updatedHistory,
        assistantMessage,
      ];

      saveChatHistory(finalHistory);

      if (data.memory || data.clientMemory) {
        saveMemory(data.memory || data.clientMemory);
      }

      processAIAppointment(data);
    } catch (err) {
      console.error("NELA chat error:", err);

      const errorMessage = {
        id: createId(),
        role: "assistant",
        content:
          "Δεν μπορώ να συνδεθώ αυτή τη στιγμή. Παρακαλώ δοκίμασε ξανά σε λίγο.",
        timestamp: new Date().toISOString(),
        clientId: currentUser.id,
      };

      const finalHistory = [
        ...updatedHistory,
        errorMessage,
      ];

      saveChatHistory(finalHistory);
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    const confirmed = window.confirm(
      "Do you want to clear this conversation?"
    );

    if (!confirmed) return;

    saveChatHistory([]);
  };

  /* =======================================================
     MENU NAVIGATION
  ======================================================= */

  const openAccountSection = (section) => {
    setAccountSection(section);
    setMenuOpen(false);
    setMode("account");
  };

  const openAppointments = (filter) => {
    setAppointmentFilter(filter);
    setAccountSection("appointments");
    setMenuOpen(false);
    setMode("account");
  };

  /* =======================================================
     UI STYLES
  ======================================================= */

  const panelStyle = {
    width: "100%",
    maxWidth: "950px",
    padding: "30px",
    border: "1px solid var(--border)",
    borderRadius: "25px",
    background: "var(--surface)",
    backdropFilter: "blur(22px)",
    boxShadow: "0 20px 70px rgba(0,0,0,0.4)",
  };

  const actionButton = {
    border: "1px solid var(--gold)",
    borderRadius: "30px",
    padding: "10px 18px",
    color: "var(--gold-light)",
    background: "rgba(0,0,0,0.15)",
    cursor: "pointer",
    fontSize: "11px",
  };

  const sectionTitle = {
    color: "var(--gold-light)",
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: "30px",
    fontWeight: 500,
    margin: "0 0 8px",
  };

  const mutedText = {
    color: "var(--muted)",
    fontSize: "12px",
  };

  const visibleAppointments =
    appointmentFilter === "upcoming"
      ? upcomingAppointments
      : previousAppointments;

  const menuButtonStyle = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "14px 15px",
    border: "none",
    borderRadius: "11px",
    background: "transparent",
    color: "#e9dcc0",
    textAlign: "left",
    fontSize: "12px",
    cursor: "pointer",
    transition: "background 0.2s ease",
  };

  const menuDivider = {
    height: "1px",
    background: "rgba(201,164,95,0.18)",
    margin: "9px 0",
  };

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  return (
    <main className={"nela-page theme-" + theme}>
      <div className="nela-brand-watermark" aria-hidden="true">
        <img src={NELA_LOGO_DATA} alt="" />
      </div>
      {/* HEADER */}

      <header className="nela-header">
        <button
          className="nela-brand"
          onClick={() => changeMode("home")}
        >
          <span className="nela-monogram" aria-label="NELA"><img src={NELA_MARK_DATA} alt="" /></span>
        </button>

        <nav className="nela-navigation">
          {mode === "home" && <>
            <button type="button" className="nela-nav-link" onClick={() => document.getElementById("nela-features")?.scrollIntoView({ behavior: "smooth" })}>EXPLORE</button>
            <button type="button" className="nela-nav-link" onClick={() => document.getElementById("nela-how")?.scrollIntoView({ behavior: "smooth" })}>HOW IT WORKS</button>
            <button type="button" className="nela-nav-link" onClick={() => document.getElementById("nela-pricing")?.scrollIntoView({ behavior: "smooth" })}>PRICING</button>
            <button type="button" className="nela-nav-login" onClick={() => changeMode("login")}>LOG IN</button>
          </>}
          <button type="button" className="nela-theme-button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title={theme === "dark" ? "Light theme" : "Dark theme"}>{theme === "dark" ? "☀" : "☾"}</button>


          {currentUser && mode !== "home" && (
            <button
              style={actionButton}
              onClick={() => changeMode("chat")}
            >
              NELA CHAT
            </button>
          )}

          {currentUser && (
            <button
              style={actionButton}
              onClick={() => changeMode("account")}
            >
              MY ACCOUNT
            </button>
          )}

          {currentUser && (
            <button
              style={actionButton}
              onClick={logout}
            >
              LOG OUT
            </button>
          )}

          {!currentUser && (
            <button
              className="nela-business-button"
              onClick={() => changeMode("business-home")}
            >
              FOR BUSINESS
            </button>
          )}
        </nav>
      </header>

      {/* MAIN CONTENT */}

      <section className="nela-main">
        {/* HOME */}

        {mode === "home" && (
          <div className="nela-home-content">
            <div className="nela-hero">
              <div className="nela-hero-kicker"><span /> YOUR EVERYDAY, REIMAGINED</div>
              <div className="nela-emblem"><img src={NELA_MARK_DATA} alt="NELA monogram" /></div>
              <h1>NELA</h1>
              <p className="nela-tagline">Your time. Your plans. <em>One intelligent place.</em></p>
              <p className="nela-description">
                Meet the smarter way to find trusted professionals and book the services you need.
                <br className="desktop-break" /> One simple conversation takes care of the details.
              </p>
              <div className="nela-hero-actions">
                <button className="nela-primary-button" onClick={() => changeMode("register")}>Get started <span>↗</span></button>
                <button className="nela-secondary-button" onClick={() => changeMode("business-home")}>For businesses <span>→</span></button>
              </div>
              <p className="nela-login-prompt">Already have an account; <button onClick={() => changeMode("login")}>Σύνδεση</button></p>
              <div className="nela-trust"><span>✦</span> LESS SEARCHING&nbsp; · &nbsp;MORE LIVING&nbsp; · &nbsp;SMARTER BOOKINGS</div>
              <button className="nela-scroll-cue" onClick={() => document.getElementById("nela-features")?.scrollIntoView({ behavior: "smooth" })}>DISCOVER NELA <span>↓</span></button>
            </div>

            <section className="nela-section nela-feature-section" id="nela-features">
              <div className="nela-section-heading">
                <span className="nela-section-kicker">A BETTER WAY TO GET THINGS DONE</span>
                <h2>Everything you need.<br /><em>Nothing you don't.</em></h2>
                <p>From the first question to the confirmed appointment, NELA keeps the experience clear, personal and effortless.</p>
              </div>
              <div className="nela-feature-grid">
                <article className="nela-feature-card"><span className="nela-feature-number">01</span><div className="nela-feature-icon">⌕</div><h3>Find your people</h3><p>Discover nearby professionals and services that match what you are looking for.</p><small>DISCOVER WITH CONFIDENCE</small></article>
                <article className="nela-feature-card featured"><span className="nela-feature-number">02</span><div className="nela-feature-icon">✧</div><h3>Talk naturally</h3><p>Tell NELA what you need in your own words. No complicated forms or endless searching.</p><small>AI-POWERED ASSISTANCE</small></article>
                <article className="nela-feature-card"><span className="nela-feature-number">03</span><div className="nela-feature-icon">◷</div><h3>Book in moments</h3><p>Choose a service, find a suitable time and keep your appointments organised.</p><small>YOUR TIME, RESPECTED</small></article>
              </div>
            </section>

            <section className="nela-showcase-section">
              <div className="nela-showcase-copy">
                <span className="nela-section-kicker">MEET YOUR NEW ASSISTANT</span>
                <h2>Just say what<br />you <em>need.</em></h2>
                <p>No more switching between tabs, calling around or repeating the same details. Start with a simple message and let NELA guide the next step.</p>
                <button className="nela-text-link" onClick={() => changeMode(currentUser ? "chat" : "register")}>Experience NELA <span>↗</span></button>
              </div>
              <div className="nela-chat-preview" aria-label="Illustrative NELA conversation preview">
                <div className="nela-preview-top"><span className="nela-preview-avatar"><img src={NELA_MARK_DATA} alt="" /></span><div><b>NELA assistant</b><small><i /> ONLINE · ΕΤΟΙΜΗ ΝΑ ΒΟΗΘΗΣΕΙ</small></div><span className="nela-preview-dots">•••</span></div>
                <div className="nela-preview-body">
                  <div className="nela-preview-date">ΣΗΜΕΡΑ · 10:42</div>
                  <div className="nela-preview-message assistant">Γεια σου! Τι θα ήθελες να οργανώσουμε σήμερα;</div>
                  <div className="nela-preview-message customer">Θα ήθελα κούρεμα αυτή την εβδομάδα, κάπου κοντά μου.</div>
                  <div className="nela-preview-message assistant">Φυσικά! Μπορώ να βρω κουρεία κοντά σου και να ελέγξω διαθέσιμες ώρες.</div>
                  <div className="nela-preview-result"><span>✦</span><div><b>Το επόμενο βήμα, απλά.</b><small>Αναζήτηση · Σύγκριση · Ραντεβού</small></div><span className="nela-preview-arrow">↗</span></div>
                </div>
                <div className="nela-preview-input">Γράψε ένα μήνυμα… <span>↑</span></div>
                <div className="nela-preview-caption">ΜΙΑ ΜΙΚΡΗ ΓΕΥΣΗ ΑΠΟ ΤΗ NELA</div>
              </div>
            </section>

            <section className="nela-section nela-categories-section">
              <div className="nela-section-heading">
                <span className="nela-section-kicker">ONE PLACE. MANY POSSIBILITIES.</span>
                <h2>Whatever life <em>calls for.</em></h2>
                <p>From everyday appointments to the professionals you rely on, NELA is designed to make access simpler.</p>
              </div>
              <div className="nela-category-grid">
                {[
                  ["✂","Beauty & hair","Salons, barbershops and nail studios"],
                  ["＋","Health & care","Doctors, dentists and clinics"],
                  ["⌂","Professional services","Accountants and consultants"],
                  ["◉","Wellness & fitness","Personal care and training"]
                ].map(([icon,title,description]) => <article className="nela-category-card" key={title}><span>{icon}</span><div><b>{title}</b><small>{description}</small></div><i>↗</i></article>)}
              </div>
            </section>

            <section className="nela-section nela-how-section" id="nela-how">
              <div className="nela-section-heading">
                <span className="nela-section-kicker">THREE STEPS. ONE SMOOTH EXPERIENCE.</span>
                <h2>Simple by <em>design.</em></h2>
              </div>
              <div className="nela-steps">
                <article><span>01</span><div><h3>Tell us what you need</h3><p>Describe the service, professional or appointment you have in mind.</p></div></article>
                <article><span>02</span><div><h3>Explore the right options</h3><p>NELA helps you move from your request to a suitable service and time.</p></div></article>
                <article><span>03</span><div><h3>You're all set</h3><p>Confirm your details and keep your bookings together in your account.</p></div></article>
              </div>
            </section>

            <section className="nela-pricing-section" id="nela-pricing">
              <div className="nela-pricing-copy"><span className="nela-section-kicker">FOR BUSINESS ΜΕ ΦΙΛΟΔΟΞΙΑ</span><h2>Your business,<br /><em>always in reach.</em></h2><p>Give customers a simpler way to discover your services, ask questions and request appointments — while you stay focused on your work.</p><button className="nela-secondary-button" onClick={() => changeMode("business-home")}>Explore the business workspace <span>→</span></button></div>
              <div className="nela-price-card"><span className="nela-price-label">NELA FOR BUSINESS</span><div className="nela-price">€24<span>.99</span><small> / month</small></div><p>Everything you need to start delivering a smarter booking experience.</p><ul><li>AI-assisted customer conversations</li><li>Appointment and calendar management</li><li>Customer directory and booking history</li><li>Service and business profile settings</li><li>Business overview and insights</li></ul><button className="nela-primary-button" onClick={() => changeMode("business-register")}>Get started <span>↗</span></button><small className="nela-price-note">Simple pricing. No complicated setup.</small></div>
            </section>

            <section className="nela-final-cta">
              <span className="nela-section-kicker">MAKE ROOM FOR WHAT MATTERS</span>
              <h2>Life moves fast.<br /><em>Booking should too.</em></h2>
              <button className="nela-primary-button" onClick={() => changeMode("register")}>Start with NELA <span>↗</span></button>
            </section>
          </div>
        )}

        {/* CUSTOMER REGISTER */}

        {mode === "register" && (
          <div className="nela-card">
            <button
              className="nela-back"
              onClick={() => changeMode("home")}
            >
              ← Back
            </button>

            <div className="nela-card-heading">
              <span className="nela-small-emblem">✦</span>
              <h2>Create your account</h2>
              <p>Start booking smarter with NELA.</p>
            </div>

            <form onSubmit={registerCustomer}>
              <Field
                label="Full Name"
                name="name"
                value={customer.name}
                onChange={updateCustomer}
                placeholder="Your full name"
                autoComplete="name"
              />

              <Field
                label="Email Address"
                name="email"
                type="email"
                value={customer.email}
                onChange={updateCustomer}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <Field
                label="Password"
                name="password"
                type="password"
                value={customer.password}
                onChange={updateCustomer}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />

              <Field
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={customer.confirmPassword}
                onChange={updateCustomer}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />

              <button className="nela-primary-button nela-submit">
                Create Account
              </button>
            </form>

            <p className="nela-switch">
              Already have an account?{" "}
              <button onClick={() => changeMode("login")}>
                Log in
              </button>
            </p>
          </div>
        )}

        {/* CUSTOMER LOGIN */}

        {mode === "login" && (
          <div className="nela-card nela-small-card">
            <button
              className="nela-back"
              onClick={() => changeMode("home")}
            >
              ← Back
            </button>

            <div className="nela-card-heading">
              <span className="nela-small-emblem">✦</span>
              <h2>Welcome back</h2>
              <p>Log in to your NELA account.</p>
            </div>

            <form onSubmit={loginCustomer}>
              <Field
                label="Email Address"
                name="email"
                type="email"
                value={login.email}
                onChange={updateLogin}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <Field
                label="Password"
                name="password"
                type="password"
                value={login.password}
                onChange={updateLogin}
                placeholder="Your password"
                autoComplete="current-password"
              />

              <button className="nela-primary-button nela-submit">
                Log In
              </button>
            </form>

            <p className="nela-switch">
              Don't have an account?{" "}
              <button onClick={() => changeMode("register")}>
                Create one
              </button>
            </p>
          </div>
        )}

        {/* BUSINESS WORKSPACE OVERVIEW */}
        {mode === "business-home" && (
          <div className="nela-business-page">
            <section className="nela-business-hero">
              <button className="nela-back" onClick={() => changeMode("home")}>← Back to NELA</button>
              <span className="nela-section-kicker">NELA FOR BUSINESS · BUSINESS MANAGEMENT, REIMAGINED</span>
              <h1>Run your business.<br /><em>Not your admin.</em></h1>
              <p className="nela-business-lead">A smarter front desk for modern service businesses. Let NELA support customer conversations, organise appointment requests and give you a clearer view of daily operations — all in one professional workspace.</p>
              <div className="nela-business-actions">
                <button className="nela-primary-button" onClick={() => changeMode("business-register")}>Create your business account <span>↗</span></button>
                <button className="nela-secondary-button" onClick={() => changeMode("business-login")}>Sign in to your workspace <span>→</span></button>
              </div>
              <div className="nela-business-proof"><span>✦</span> ONE WORKSPACE <i /> SMARTER BOOKINGS <i /> MORE CONTROL</div>
            </section>
            <section className="nela-business-intro">
              <div><span className="nela-section-kicker">BUILT AROUND YOUR WORKDAY</span><h2>More clarity.<br /><em>Less busywork.</em></h2></div>
              <p>Running a service business means balancing customers, appointments, schedules and constant questions. NELA brings these everyday tasks into a single, structured workspace, helping you stay organised while giving customers a more consistent experience.</p>
            </section>
            <section className="nela-business-feature-grid">
              <article><span>01 · CUSTOMER EXPERIENCE</span><b>AI-assisted conversations</b><p>Help customers ask questions, understand your services and move towards an appointment through a natural chat experience.</p><small>Clear communication · Consistent information · Less repetitive admin</small></article>
              <article><span>02 · DAILY OPERATIONS</span><b>Appointment control</b><p>Keep upcoming bookings, appointment details and schedule information organised, so you can see what needs attention.</p><small>Booking overview · Calendar visibility · Status tracking</small></article>
              <article><span>03 · CUSTOMER RELATIONSHIPS</span><b>Customer directory</b><p>Keep customer details and available booking history together, making it easier to understand previous interactions.</p><small>Customer records · Contact details · Booking history</small></article>
              <article><span>04 · SERVICE MANAGEMENT</span><b>Your services, your rules</b><p>Present your business clearly by managing service names, descriptions, prices, durations and business information.</p><small>Service catalogue · Pricing details · Business profile</small></article>
              <article><span>05 · BUSINESS PERFORMANCE</span><b>Useful operational insights</b><p>Review the information recorded in your workspace, including booking activity, customer volume and estimated revenue.</p><small>Booking summaries · Activity indicators · Performance overview</small></article>
              <article><span>06 · WORKSPACE SETTINGS</span><b>Configured around your business</b><p>Maintain key business details and opening hours so your workspace reflects how your team actually operates.</p><small>Business details · Opening hours · Workspace preferences</small></article>
            </section>
            <section className="nela-business-process">
              <div className="nela-business-process-heading"><span className="nela-section-kicker">A CLEARER WAY TO WORK</span><h2>From first message<br /><em>to organised day.</em></h2></div>
              <div className="nela-business-steps">
                <article><span>01</span><div><b>Set up your business</b><p>Add your business details, services, prices and opening hours.</p></div></article>
                <article><span>02</span><div><b>Let customers connect</b><p>Give customers a simple way to ask about your services and request appointments.</p></div></article>
                <article><span>03</span><div><b>Manage everything centrally</b><p>Review bookings, customer information and business activity from your workspace.</p></div></article>
              </div>
            </section>
            <section className="nela-business-price">
              <div><span className="nela-section-kicker">STRAIGHTFORWARD MONTHLY PRICING</span><h2>Professional tools.<br /><em>One simple plan.</em></h2><p>Start with the essential workspace for managing customer conversations, appointments and business information.</p></div>
              <div className="nela-business-price-card"><span>NELA FOR BUSINESS</span><strong>€24.99 <small>/ month</small></strong><p>One clear monthly price.</p><ul><li>AI-assisted customer conversations</li><li>Appointment and calendar management</li><li>Customer directory and booking history</li><li>Service and business profile settings</li><li>Business overview and insights</li></ul><button className="nela-primary-button" onClick={() => changeMode("business-register")}>Get started <span>↗</span></button><button className="nela-business-login-link" onClick={() => changeMode("business-login")}>Already registered? Sign in</button></div>
            </section>
            <section className="nela-business-bottom"><span className="nela-section-kicker">YOUR BUSINESS DESERVES A BETTER WORKFLOW</span><h2>Make every day<br /><em>easier to manage.</em></h2><button className="nela-primary-button" onClick={() => changeMode("business-register")}>Create your business account <span>↗</span></button></section>
          </div>
        )}

        {/* BUSINESS LOGIN */}

        {mode === "business-login" && (
          <div className="nela-card nela-small-card">
            <button
              className="nela-back"
              onClick={() => changeMode("home")}
            >
              ← Back
            </button>

            <div className="nela-card-heading">
              <span className="nela-small-emblem">✦</span>
              <h2>Business Portal</h2>
              <p>Manage your business with NELA.</p>
            </div>

            <form onSubmit={loginBusiness}>
              <Field
                label="Business Email"
                name="email"
                type="email"
                value={login.email}
                onChange={updateLogin}
                placeholder="business@example.com"
              />

              <Field
                label="Password"
                name="password"
                type="password"
                value={login.password}
                onChange={updateLogin}
                placeholder="Your password"
              />

              <button className="nela-primary-button nela-submit">
                Access Business Portal
              </button>
            </form>

            <p className="nela-switch">
              New to NELA Business?{" "}
              <button onClick={() => changeMode("business-register")}>
                Create Business Account
              </button>
            </p>
          </div>
        )}

        {/* BUSINESS REGISTER */}

        {mode === "business-register" && (
          <div className="nela-card nela-business-card">
            <button
              className="nela-back"
              onClick={() => changeMode("business-home")}
            >
              ← Back to Business Login
            </button>

            <div className="nela-card-heading">
              <span className="nela-small-emblem">✦</span>
              <h2>Join NELA Business</h2>
              <p>Create an account for your business.</p>
            </div>

            <form onSubmit={registerBusiness}>
              <Field
                label="Business Name"
                name="businessName"
                value={business.businessName}
                onChange={updateBusiness}
                placeholder="Your business name"
              />

              <Field
                label="Owner's Full Name"
                name="ownerName"
                value={business.ownerName}
                onChange={updateBusiness}
                placeholder="Full name"
              />

              <Field
                label="Business Email"
                name="email"
                type="email"
                value={business.email}
                onChange={updateBusiness}
                placeholder="business@example.com"
              />

              <Field
                label="Phone Number"
                name="phone"
                type="tel"
                value={business.phone}
                onChange={updateBusiness}
                placeholder="+30 690 000 0000"
              />

              <Field
                label="Business Category"
                name="category"
                value={business.category}
                onChange={updateBusiness}
                options={categories}
              />

              <Field
                label="Password"
                name="password"
                type="password"
                value={business.password}
                onChange={updateBusiness}
                placeholder="At least 8 characters"
              />

              <Field
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={business.confirmPassword}
                onChange={updateBusiness}
                placeholder="Repeat your password"
              />

              <button className="nela-primary-button nela-submit">
                Create Business Account
              </button>
            </form>

            <p className="nela-security-note">
              Demo account storage only. Production requires secure
              backend authentication.
            </p>
          </div>
        )}

        {/* CUSTOMER ACCOUNT */}

        {mode === "account" && currentUser && (
          <div style={panelStyle}>
            <button
              className="nela-back"
              onClick={() => changeMode("chat")}
            >
              ← Back to NELA
            </button>

            <div className="nela-card-heading">
              <span className="nela-small-emblem">✦</span>
              <h2>My Account</h2>
              <p>Your personal NELA dashboard.</p>
            </div>

            {/* PROFILE SUMMARY */}

            <div
              style={{
                padding: "22px",
                borderRadius: "18px",
                border: "1px solid var(--border)",
                marginBottom: "25px",
              }}
            >
              <h3 style={sectionTitle}>
                {getClientName(currentUser)}
              </h3>

              <p style={mutedText}>
                {currentUser.email}
              </p>

              <p style={mutedText}>
                Member since{" "}
                {currentUser.createdAt
                  ? new Date(currentUser.createdAt).toLocaleDateString()
                  : "NELA member"}
              </p>
            </div>

            {/* ACCOUNT NAVIGATION */}

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "25px",
              }}
            >
              <button
                style={actionButton}
                onClick={() => openAppointments("upcoming")}
              >
                Upcoming Appointments
              </button>

              <button
                style={actionButton}
                onClick={() => openAppointments("previous")}
              >
                Previous Appointments
              </button>

              <button
                style={actionButton}
                onClick={() => setAccountSection("profile")}
              >
                Profile
              </button>

              <button
                style={actionButton}
                onClick={() => setAccountSection("memory")}
              >
                NELA Memory
              </button>

              <button
                style={actionButton}
                onClick={() => setAccountSection("history")}
              >
                Chat History
              </button>

              <button
                style={actionButton}
                onClick={() => changeMode("chat")}
              >
                NELA Chat
              </button>
            </div>

            {/* PROFILE */}

            {accountSection === "profile" && (
              <div>
                <h3 style={sectionTitle}>Profile Information</h3>

                <p style={mutedText}>
                  Name: {getClientName(currentUser)}
                </p>

                <p style={mutedText}>
                  Email: {currentUser.email}
                </p>

                <p style={mutedText}>
                  Your personal information is stored with your
                  current browser account.
                </p>
              </div>
            )}

            {/* MEMORY */}

            {accountSection === "memory" && (
              <div>
                <h3 style={sectionTitle}>NELA Memory</h3>

                <p style={mutedText}>
                  Information NELA has saved about you.
                </p>

                {Object.keys(clientMemory || {}).length === 0 ? (
                  <p style={mutedText}>
                    NELA has not saved any personal preferences yet.
                    As you use the assistant, supported memory
                    information may appear here.
                  </p>
                ) : (
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      color: "var(--text)",
                      background: "rgba(0,0,0,0.15)",
                      padding: "18px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      lineHeight: 1.7,
                    }}
                  >
                    {JSON.stringify(clientMemory, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* CHAT HISTORY */}

            {accountSection === "history" && (
              <div>
                <h3 style={sectionTitle}>Conversation History</h3>

                <p style={mutedText}>
                  Your saved conversations with NELA.
                </p>

                {chatMessages.length === 0 ? (
                  <p style={mutedText}>
                    No conversation history yet.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                      marginTop: "18px",
                    }}
                  >
                    {chatMessages.map((item) => (
                      <div
                        key={item.id || String(item.timestamp) + item.role}
                        style={{
                          padding: "15px",
                          borderRadius: "13px",
                          border: "1px solid var(--border)",
                          background: "rgba(0,0,0,0.12)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            flexWrap: "wrap",
                            marginBottom: "8px",
                          }}
                        >
                          <strong
                            style={{
                              color:
                                item.role === "user"
                                  ? "#78b8ff"
                                  : "var(--gold-light)",
                              fontSize: "11px",
                            }}
                          >
                            {item.role === "user" ? "YOU" : "NELA"}
                          </strong>

                          <span style={mutedText}>
                            {item.timestamp
                              ? new Date(
                                  item.timestamp
                                ).toLocaleString()
                              : ""}
                          </span>
                        </div>

                        <p
                          style={{
                            color: "var(--text)",
                            fontSize: "12px",
                            lineHeight: 1.7,
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            margin: 0,
                          }}
                        >
                          {item.content || item.message || ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* APPOINTMENTS */}

            {accountSection === "appointments" && (
              <div>
                <h3 style={sectionTitle}>
                  {appointmentFilter === "upcoming"
                    ? "Upcoming Appointments"
                    : "Previous Appointments"}
                </h3>

                {visibleAppointments.length === 0 ? (
                  <p style={mutedText}>
                    No appointments found.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "13px",
                      marginTop: "20px",
                    }}
                  >
                    {visibleAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        style={{
                          padding: "20px",
                          borderRadius: "16px",
                          border: "1px solid var(--border)",
                          background: "rgba(0,0,0,0.12)",
                        }}
                      >
                        <h3 style={sectionTitle}>
                          {appointment.businessName ||
                            appointment.business ||
                            appointment.service ||
                            "Appointment"}
                        </h3>

                        <p style={mutedText}>
                          Service:{" "}
                          {appointment.service ||
                            appointment.serviceName ||
                            "Not specified"}
                        </p>

                        <p style={mutedText}>
                          Date:{" "}
                          {appointment.date ||
                            appointment.datetime ||
                            "Not specified"}
                        </p>

                        <p style={mutedText}>
                          Time:{" "}
                          {appointment.time || "Not specified"}
                        </p>

                        <p style={mutedText}>
                          Status:{" "}
                          {appointment.status || "Pending"}
                        </p>

                        {String(
                          appointment.status || ""
                        ).toLowerCase() !== "cancelled" &&
                          String(
                            appointment.status || ""
                          ).toLowerCase() !== "completed" &&
                          getAppointmentDate(appointment) >=
                            new Date() && (
                            <button
                              style={{
                                ...actionButton,
                                color: "#e8aaaa",
                                borderColor:
                                  "rgba(220,100,100,0.5)",
                                marginTop: "10px",
                              }}
                              onClick={() =>
                                cancelAppointment(appointment.id)
                              }
                            >
                              Cancel Appointment
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: "30px" }}>
              <button
                className="nela-primary-button"
                onClick={logout}
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* NELA CHAT */}

        {mode === "chat" && currentUser && (
          <div
            className={"nela-chat-panel" + (theme === "light" ? " theme-light-chat" : "")}
            style={{
              width: "100%",
              maxWidth: "950px",
              height: "min(720px, 80vh)",
              minHeight: "500px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "visible",
              borderRadius: "22px",
              border: "1px solid rgba(201,164,95,0.30)",
              background: "linear-gradient(145deg,#17110b 0%,#0c0906 58%,#080604 100%)",
              boxShadow: "0 28px 85px rgba(0,0,0,0.58), inset 0 1px rgba(255,255,255,0.025)",
            }}
          >
            <span className="nela-chat-watermark" aria-hidden="true"><img src={NELA_LOGO_DATA} alt="" /></span>
            {/* CHAT HEADER */}

            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid rgba(201,164,95,0.18)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                position: "relative",
                zIndex: 5,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div className="nela-chat-monogram" aria-label="NELA"><img src={NELA_MARK_DATA} alt="" /></div>

                <div>
                  <h2 className="nela-chat-title"
                    style={{
                      margin: 0,
                      fontSize: "20px",
                      color: "#ead5a6",
                      letterSpacing: "1px",
                    }}
                  >
                    NELA
                  </h2>

                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: "10px",
                      color: "#a99572",
                    }}
                  >
                    Η προσωπική σου βοηθός για ραντεβού
                  </p>
                </div>
              </div>

              {/* HEADER ACTIONS */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                }}
              >
                <button type="button" className="nela-theme-button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title={theme === "dark" ? "Light theme" : "Dark theme"}>{theme === "dark" ? "☀" : "☾"}</button>

                {/* HAMBURGER MENU */}

                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Open account menu"
                  aria-expanded={menuOpen}
                  style={{
                    width: "43px",
                    height: "43px",
                    borderRadius: "12px",
                    border: "1px solid rgba(201,164,95,0.36)",
                    background: menuOpen ? "rgba(201,164,95,0.16)" : "rgba(201,164,95,0.055)",
                    color: "#ead5a6",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "2px",
                      background: "currentColor",
                      borderRadius: "3px",
                    }}
                  />
                  <span
                    style={{
                      width: "18px",
                      height: "2px",
                      background: "currentColor",
                      borderRadius: "3px",
                    }}
                  />
                  <span
                    style={{
                      width: "18px",
                      height: "2px",
                      background: "currentColor",
                      borderRadius: "3px",
                    }}
                  />
                </button>
              </div>

              {/* DROPDOWN MENU */}

              {menuOpen && (
                <>
                  <div
                    onClick={() => setMenuOpen(false)}
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 8,
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      top: "72px",
                      right: "20px",
                      width: "min(280px, calc(100vw - 40px))",
                      padding: "13px",
                      borderRadius: "17px",
                      border: "1px solid rgba(201,164,95,0.34)",
                      background: "linear-gradient(145deg,#21170e,#100b06 70%,#090705)",
                      boxShadow:
                        "0 20px 55px rgba(0,0,0,0.45)",
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 13px 15px",
                        borderBottom: "1px solid rgba(201,164,95,0.18)",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#f1e4c7",
                          fontWeight: 600,
                        }}
                      >
                        {getClientName(currentUser)}
                      </div>

                      <div
                        style={{
                          fontSize: "10px",
                          color: "#a99572",
                          marginTop: "5px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {currentUser.email}
                      </div>
                    </div>

                    <div style={{ padding: "8px 13px 4px", color: "#9d8358", fontSize: "9px", letterSpacing: "1.5px", fontWeight: 700 }}>ΡΑΝΤΕΒΟΥ</div>

                    <button
                      style={menuButtonStyle}
                      onClick={() => openAppointments("upcoming")}
                    >
                      <span>📅</span>
                      <span>Τα ραντεβού μου</span>
                    </button>

                    <button
                      style={menuButtonStyle}
                      onClick={() => openAppointments("previous")}
                    >
                      <span>🗓</span>
                      <span>Ιστορικό ραντεβού</span>
                    </button>

                    <div style={menuDivider} />
                    <div style={{ padding: "8px 13px 4px", color: "#9d8358", fontSize: "9px", letterSpacing: "1.5px", fontWeight: 700 }}>ΠΡΟΣΩΠΙΚΟΣ ΧΩΡΟΣ</div>

                    <button
                      style={menuButtonStyle}
                      onClick={() =>
                        openAccountSection("history")
                      }
                    >
                      <span>💬</span>
                      <span>Ιστορικό συνομιλιών</span>
                    </button>

                    <button
                      style={menuButtonStyle}
                      onClick={() =>
                        openAccountSection("memory")
                      }
                    >
                      <span>✧</span>
                      <span>Τι θυμάται η NELA</span>
                    </button>

                    <button
                      style={menuButtonStyle}
                      onClick={() =>
                        openAccountSection("profile")
                      }
                    >
                      <span>👤</span>
                      <span>Προφίλ & ρυθμίσεις</span>
                    </button>

                    <div style={menuDivider} />

                    <button
                      style={menuButtonStyle}
                      onClick={() => {
                        setMenuOpen(false);
                        clearChat();
                      }}
                    >
                      <span>🧹</span>
                      <span>Καθαρισμός συνομιλίας</span>
                    </button>

                    <button
                      style={{
                        ...menuButtonStyle,
                        color: "#f0a6a6",
                      }}
                      onClick={logout}
                    >
                      <span>↪</span>
                      <span>Αποσύνδεση</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* CHAT MESSAGES */}

            <div
              className="nela-chat-messages"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "25px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {chatMessages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    margin: "auto",
                    maxWidth: "400px",
                  }}
                >
                  <div className="nela-chat-welcome-monogram" aria-hidden="true"><img src={NELA_MARK_DATA} alt="" /></div>

                  <h2
                    style={{
                      ...sectionTitle,
                      color:
                        "#ead5a6",
                    }}
                  >
                    Καλώς ήρθες,{" "}
                    {getClientName(currentUser).split(" ")[0]}
                  </h2>

                  <p
                    style={{
                      ...mutedText,
                      color: "#b9aa8d",
                      lineHeight: 1.8,
                    }}
                  >
                    Είμαι η NELA, η προσωπική σου βοηθός για ραντεβού.
                    Πώς μπορώ να σε βοηθήσω σήμερα;
                  </p>
                </div>
              )}

              {chatMessages.map((item, index) => {
                const isUser = item.role === "user";

                return (
                  <div
                    key={
                      item.id ||
                      String(item.timestamp || "message") + "-" + index
                    }
                    style={{
                      alignSelf: isUser
                        ? "flex-end"
                        : "flex-start",
                      maxWidth: "82%",
                      padding: "14px 18px",
                      borderRadius: isUser
                        ? "18px 18px 5px 18px"
                        : "18px 18px 18px 5px",
                      background: isUser
                        ? "linear-gradient(135deg,#d9bd80,#a77b3c)"
                        : theme === "dark"
                          ? "linear-gradient(145deg,#261b10,#171008)"
                          : "linear-gradient(145deg,#fffdf8,#f1e7d3)",
                      color: isUser
                        ? "#ffffff"
                        : theme === "dark"
                          ? "#eee4d0"
                          : "#46371f",
                      border: isUser
                        ? "1px solid rgba(201,164,95,0.24)"
                        : "1px solid rgba(201,164,95,0.2)",
                      boxShadow: isUser
                        ? "0 5px 18px rgba(0,0,0,0.25)"
                        : "0 4px 15px rgba(0,0,0,0.08)",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      fontSize: "13px",
                      lineHeight: 1.75,
                    }}
                  >
                    {item.content || item.message || ""}

                    {item.timestamp && (
                      <div
                        style={{
                          fontSize: "9px",
                          opacity: 0.55,
                          marginTop: "7px",
                          textAlign: "right",
                        }}
                      >
                        {new Date(
                          item.timestamp
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {chatLoading && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    padding: "13px 18px",
                    borderRadius: "18px 18px 18px 5px",
                    border:
                      "1px solid rgba(201,164,95,0.2)",
                    background:
                      theme === "dark"
                        ? "#21170e"
                        : "#fff8e9",
                    color:
                      theme === "dark" ? "#d8c59c" : "#72551f",
                    fontSize: "12px",
                  }}
                >
                  Η NELA ετοιμάζει την απάντησή της...
                </div>
              )}
            </div>

            {/* CHAT INPUT */}

            <form
              className="nela-chat-composer"
              onSubmit={sendMessage}
              style={{
                display: "flex",
                gap: "10px",
                padding: "18px",
                borderTop:
                  "1px solid rgba(201,164,95,0.18)",
                background:
                  theme === "dark"
                    ? "rgba(9,7,5,0.78)"
                    : "rgba(255,250,239,0.92)",
                borderRadius: "0 0 22px 22px",
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(event) =>
                  setChatInput(event.target.value)
                }
                placeholder="Γράψε το μήνυμά σου στη NELA..."
                disabled={chatLoading}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "49px",
                  borderRadius: "30px",
                  padding: "0 19px",
                  outline: "none",
                  border:
                    "1px solid rgba(201,164,95,0.28)",
                  background:
                    theme === "dark"
                      ? "rgba(255,255,255,0.055)"
                      : "#fffdf8",
                  color:
                    theme === "dark" ? "#eee4d0" : "#46371f",
                  fontSize: "12px",
                }}
              />

              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  minWidth: "95px",
                  border: "none",
                  borderRadius: "30px",
                  padding: "0 20px",
                  color: "#ffffff",
                  background:
                    "linear-gradient(135deg,#e0c58d,#a77b3c)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  opacity:
                    chatLoading || !chatInput.trim() ? 0.5 : 1,
                  boxShadow:
                    "0 5px 18px rgba(154,109,48,0.18)",
                }}
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* MESSAGES */}

        {(error || message) && (
          <div
            className={"nela-message " + (error ? "error" : "success")}
          >
            {error || message}
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="nela-footer">
        <span>© {new Date().getFullYear()} NELA</span>
        <span>Smart appointments. Effortlessly.</span>
      </footer>
    </main>
  );
}
