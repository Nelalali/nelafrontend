import { useEffect, useMemo, useState } from "react";
import "./LandingPage.css";

const CLIENTS_KEY = "nelaClients";
const USER_KEY = "nelaUser";
const ACTIVE_CLIENT_KEY = "nelaActiveClient";
const BUSINESS_KEY = "nelaBusinesses";
const BUSINESS_USER_KEY = "nelaBusinessUser";
const BOOKINGS_KEY = "nelaBookings";
const HISTORY_KEY = "nelaConversationHistory";
const MEMORY_KEY = "nelaClientMemory";
const THEME_KEY = "nelaTheme";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/chat";

const categories = [
  "Beauty Salon",
  "Hair Salon",
  "Barbershop",
  "Nail Salon",
  "Medical Clinic",
  "Doctor",
  "Psychologist",
  "Dentist",
  "Accountant",
  "Fitness & Wellness",
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

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getClientName(client) {
  if (!client) return "Customer";

  if (client.name) return client.name;

  return `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
    "Customer";
}

function getAppointmentDate(appointment) {
  return new Date(
    appointment.date || appointment.datetime || appointment.start || 0
  );
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
          normalizeEmail(booking.email) === normalizeEmail(client?.email)
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

  return history.filter(
    (item) => item.clientId === clientId || !item.clientId
  );
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
          <option value="">Select category</option>

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

export default function LandingPage() {
  const [mode, setMode] = useState("home");

  const [theme, setTheme] = useState(() =>
    readStorage(THEME_KEY, "dark")
  );

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

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  useEffect(() => {
    writeStorage(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (currentUser?.id) {
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

        setChatMessages(getHistoryForClient(found.id));
      }
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
    setMode(newMode);
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

    setTimeout(() => {
      setMessage("");
      setMode("chat");
    }, 700);
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

    setCurrentUser(found);
    setAppointments(getClientAppointments(found));

    const memory =
      readStorage(MEMORY_KEY, {})[found.id] ||
      found.memory ||
      {};

    setClientMemory(memory);
    setChatMessages(getHistoryForClient(found.id));

    setMode("chat");
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

    writeStorage(HISTORY_KEY, [
      ...otherMessages,
      ...newHistory.map((item) => ({
        ...item,
        clientId: currentUser.id,
      })),
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
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      const reply =
        data.reply ||
        data.message ||
        data.response ||
        "I am here to help you.";

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        content: reply,
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
          "I'm having trouble connecting right now. Please try again in a moment.",
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
     UI HELPERS
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

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  return (
    <main className={`nela-page theme-${theme}`}>

      {/* HEADER */}

      <header className="nela-header">
        <button
          className="nela-brand"
          onClick={() => changeMode("home")}
        >
          <span className="nela-brand-icon">✦</span>
          <span>NELA</span>
        </button>

        <nav className="nela-navigation">

          <button
            className="nela-theme-button"
            onClick={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
            aria-label="Change theme"
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>

          {currentUser && (
            <>
              <button
                style={actionButton}
                onClick={() => changeMode("account")}
              >
                MY ACCOUNT
              </button>

              <button
                style={actionButton}
                onClick={logout}
              >
                LOG OUT
              </button>
            </>
          )}

          {!currentUser && (
            <button
              className="nela-business-button"
              onClick={() => changeMode("business-login")}
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
          <div className="nela-hero">

            <div className="nela-emblem">✧</div>

            <h1>NELA</h1>

            <p className="nela-tagline">
              Booking, made simple.
            </p>

            <p className="nela-description">
              Your personal assistant for everyday appointments.
              <br />
              Find, book and manage your appointments effortlessly.
            </p>

            <div className="nela-hero-actions">

              <button
                className="nela-primary-button"
                onClick={() => changeMode("register")}
              >
                Create Account
              </button>

              <button
                className="nela-secondary-button"
                onClick={() => changeMode("login")}
              >
                Log In
              </button>

            </div>

            <div className="nela-trust">
              <span>✦</span> Simple · Smart · Personal
            </div>
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
              onClick={() => changeMode("business-login")}
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
                onClick={() => {
                  setAppointmentFilter("upcoming");
                  setAccountSection("appointments");
                }}
              >
                Upcoming Appointments
              </button>

              <button
                style={actionButton}
                onClick={() => {
                  setAppointmentFilter("previous");
                  setAccountSection("appointments");
                }}
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
                onClick={() => changeMode("chat")}
              >
                NELA Chat
              </button>
            </div>

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

                        {String(appointment.status || "").toLowerCase() !==
                          "cancelled" &&
                          String(appointment.status || "").toLowerCase() !==
                            "completed" &&
                          getAppointmentDate(appointment) >= new Date() && (
                            <button
                              style={{
                                ...actionButton,
                                color: "#e8aaaa",
                                borderColor: "rgba(220,100,100,0.5)",
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
            style={{
              ...panelStyle,
              maxWidth: "950px",
              height: "min(720px, 80vh)",
              minHeight: "500px",
              display: "flex",
              flexDirection: "column",
              padding: "0",
              overflow: "hidden",
            }}
          >

            {/* CHAT HEADER */}

            <div
              style={{
                padding: "20px 25px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    ...sectionTitle,
                    margin: 0,
                  }}
                >
                  NELA <span style={{ color: "var(--gold)" }}>✦</span>
                </h2>

                <p style={mutedText}>
                  Your personal appointment assistant
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "9px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  style={actionButton}
                  onClick={() => setTheme(
                    theme === "dark" ? "light" : "dark"
                  )}
                  title="Change chat appearance"
                >
                  {theme === "dark" ? "☼ Light" : "☾ Dark"}
                </button>

                <button
                  style={actionButton}
                  onClick={() => changeMode("account")}
                >
                  My Account
                </button>

                <button
                  style={actionButton}
                  onClick={clearChat}
                >
                  Clear Chat
                </button>
              </div>
            </div>

            {/* CHAT MESSAGES */}

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "25px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
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
                  <div className="nela-emblem">✧</div>

                  <h2 style={sectionTitle}>
                    Welcome, {getClientName(currentUser).split(" ")[0]}
                  </h2>

                  <p style={mutedText}>
                    I'm NELA, your personal appointment assistant.
                    How can I help you today?
                  </p>
                </div>
              )}

              {chatMessages.map((item) => {
                const isUser = item.role === "user";

                return (
                  <div
                    key={item.id || createId()}
                    style={{
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      maxWidth: "82%",
                      padding: "14px 18px",
                      borderRadius: "18px",
                      background: isUser
                        ? "linear-gradient(135deg,#dfc48c,#b78e49)"
                        : theme === "dark"
                          ? "rgba(255,255,255,0.07)"
                          : "rgba(0,0,0,0.06)",
                      color: isUser ? "#17150f" : "var(--text)",
                      border: isUser
                        ? "none"
                        : "1px solid var(--border)",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      fontSize: "13px",
                      lineHeight: 1.7,
                    }}
                  >
                    {item.content || item.message || ""}
                  </div>
                );
              })}

              {chatLoading && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    padding: "13px 18px",
                    borderRadius: "18px",
                    border: "1px solid var(--border)",
                    color: "var(--gold-light)",
                    fontSize: "12px",
                  }}
                >
                  NELA is thinking...
                </div>
              )}

            </div>

            {/* CHAT INPUT */}

            <form
              onSubmit={sendMessage}
              style={{
                display: "flex",
                gap: "10px",
                padding: "18px",
                borderTop: "1px solid var(--border)",
              }}
            >

              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Write your message to NELA..."
                disabled={chatLoading}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "48px",
                  borderRadius: "30px",
                  padding: "0 18px",
                  outline: "none",
                  border: "1px solid var(--border)",
                  background:
                    theme === "dark"
                      ? "rgba(0,0,0,0.25)"
                      : "rgba(255,255,255,0.75)",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />

              <button
                type="submit"
                className="nela-primary-button"
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  minWidth: "95px",
                  opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
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
            className={`nela-message ${
              error ? "error" : "success"
            }`}
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
