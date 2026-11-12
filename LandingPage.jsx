import { useState } from "react";
import "./LandingPage.css";

const CLIENTS_KEY = "nelaClients";
const USER_KEY = "nelaUser";
const ACTIVE_CLIENT_KEY = "nelaActiveClient";
const HISTORY_KEY = "nelaConversationHistory";

// Προσωρινά demo credentials.
// Για δημόσια λειτουργία απαιτείται backend authentication.
const BUSINESS_EMAIL = "ΒΑΛΕ_ΤΟ_EMAIL_ΣΟΥ";
const BUSINESS_PASSWORD = "ΒΑΛΕ_ΤΟΝ_ΚΩΔΙΚΟ_ΣΟΥ";

const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const normalizeEmail = (value = "") =>
  String(value).trim().toLowerCase();

const normalizePhone = (value = "") =>
  String(value).replace(/[^\d+]/g, "");

const makeId = () =>
  `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

function EyeIcon({ visible }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.1 3.9" />
          <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7c1.5 0 2.8-.3 4-1" />
        </>
      )}
    </svg>
  );
}

function LampIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M8.2 14.5a7 7 0 1 1 7.6 0c-.8.5-1.3 1.3-1.3 2.2h-5c0-.9-.5-1.7-1.3-2.2Z" />
      <path d="M12 2V1" />
      <path d="m4.9 4.9-.7-.7" />
      <path d="M19.1 4.9l.7-.7" />
    </svg>
  );
}

export default function LandingPage({ defaultMode = "home" }) {
  const [mode, setMode] = useState(defaultMode);
  const [lightMode, setLightMode] = useState(false);

  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
  });

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [business, setBusiness] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (next) => {
    setError("");
    setMode(next);
  };

  const togglePassword = (name) => {
    setVisiblePasswords((old) => ({
      ...old,
      [name]: !old[name],
    }));
  };

  const updateForm = (e) =>
    setForm((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));

  const updateLogin = (e) =>
    setLogin((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));

  const updateBusiness = (e) =>
    setBusiness((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));

  function handleRegister(e) {
    e.preventDefault();
    setError("");

    const clean = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizePhone(form.phone),
      email: normalizeEmail(form.email),
      confirmEmail: normalizeEmail(form.confirmEmail),
    };

    if (Object.values(clean).some((v) => !String(v).trim())) {
      return setError("Συμπλήρωσε όλα τα πεδία.");
    }

    if (clean.email !== clean.confirmEmail) {
      return setError("Τα email δεν ταιριάζουν.");
    }

    if (clean.password !== clean.confirmPassword) {
      return setError("Οι κωδικοί δεν ταιριάζουν.");
    }

    if (clean.password.length < 8) {
      return setError("Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
      return setError("Βάλε έγκυρη διεύθυνση email.");
    }

    if (clean.phone.replace(/\D/g, "").length < 8) {
      return setError("Έλεγξε τον αριθμό τηλεφώνου.");
    }

    const clients = readArray(CLIENTS_KEY);

    if (clients.some((c) => normalizeEmail(c?.email) === clean.email)) {
      return setError(
        "Υπάρχει ήδη λογαριασμός με αυτό το email. Κάνε σύνδεση."
      );
    }

    if (clients.some((c) => normalizePhone(c?.phone) === clean.phone)) {
      return setError(
        "Υπάρχει ήδη λογαριασμός με αυτό το τηλέφωνο."
      );
    }

    const now = new Date().toISOString();

    const client = {
      id: makeId(),
      firstName: clean.firstName,
      lastName: clean.lastName,
      phone: clean.phone,
      email: clean.email,
      password: clean.password,
      appointments: [],
      memory: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      localStorage.setItem(
        CLIENTS_KEY,
        JSON.stringify([...clients, client])
      );

      localStorage.setItem(
        USER_KEY,
        JSON.stringify({
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          email: client.email,
        })
      );

      localStorage.setItem(ACTIVE_CLIENT_KEY, client.id);

      localStorage.setItem(
        "nelaClientMemory",
        JSON.stringify({
          name: `${client.firstName} ${client.lastName}`.trim(),
          phone: client.phone,
          visits: 0,
          lastBooking: null,
          preferences: [],
        })
      );

      localStorage.removeItem(HISTORY_KEY);

      window.location.replace("/");
    } catch {
      setError(
        "Δεν ήταν δυνατή η αποθήκευση. Έλεγξε τον διαθέσιμο χώρο του browser."
      );
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    setError("");

    const email = normalizeEmail(login.email);

    if (!email || !login.password) {
      return setError("Συμπλήρωσε email και κωδικό.");
    }

    const client = readArray(CLIENTS_KEY).find(
      (c) => normalizeEmail(c?.email) === email
    );

    if (!client) {
      return setError(
        "Δεν βρέθηκε λογαριασμός με αυτό το email."
      );
    }

    if (String(client.password || "") !== login.password) {
      return setError("Ο κωδικός δεν είναι σωστός.");
    }

    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: client.id,
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        phone: client.phone || "",
        email,
      })
    );

    localStorage.setItem(ACTIVE_CLIENT_KEY, client.id);

    localStorage.setItem(
      "nelaClientMemory",
      JSON.stringify({
        name: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
        phone: client.phone || "",
        visits: Number(client.visits || 0),
        lastBooking: client.lastBooking || null,
        preferences: Array.isArray(client.preferences)
          ? client.preferences
          : [],
      })
    );

    localStorage.removeItem(HISTORY_KEY);

    window.location.replace("/");
  }

  function handleBusinessLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const valid =
      normalizeEmail(business.email) === BUSINESS_EMAIL &&
      business.password === BUSINESS_PASSWORD;

    if (!valid) {
      setBusy(false);
      return setError(
        "Το email ή ο κωδικός επιχείρησης δεν είναι σωστός."
      );
    }

    localStorage.setItem(
      "nelaBusinessUser",
      JSON.stringify({
        email: BUSINESS_EMAIL,
        loggedIn: true,
        loggedInAt: new Date().toISOString(),
      })
    );

    window.location.replace("/?admin=true");
  }

  const isForm = mode !== "home";

  return (
    <div className={`landing-shell ${lightMode ? "theme-light" : "theme-dark"}`}>
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />

      <header className="landing-header">
        <button
          className="wordmark"
          onClick={() => go("home")}
          type="button"
          aria-label="NELA αρχική"
        >
          <span className="wordmark-symbol" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="25" height="25">
              <path
                d="M16 2.5 29.5 16 16 29.5 2.5 16 16 2.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M10 21V11l12 10V11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="wordmark-text">
            NELA<span className="wordmark-registered">®</span>
          </span>
        </button>

        <button
          className="business-link"
          type="button"
          onClick={() => go("business")}
        >
          FOR BUSINESS <span>↗</span>
        </button>
      </header>

      <main className={`landing-main ${isForm ? "is-form" : ""}`}>
        {mode === "home" && (
          <section className="landing-hero">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              YOUR PERSONAL AI RECEPTIONIST
              <span className="eyebrow-line" />
            </div>

            <h1>NELA</h1>

            <div className="hero-subtitle">
              Booking Simple
              <span> Έτσι απλά.</span>
            </div>

            <p className="hero-copy">
              Η εμπειρία του ραντεβού σου, αναβαθμισμένη.
              <br />
              Έξυπνη εξυπηρέτηση. Προσωπική εμπειρία. Χωρίς αναμονή.
            </p>

            <div className="hero-actions">
              <button
                className="btn btn-gold"
                onClick={() => go("register")}
              >
                Δημιουργία λογαριασμού <span>→</span>
              </button>

              <button
                className="btn btn-outline"
                onClick={() => go("login")}
              >
                Σύνδεση
              </button>
            </div>

            <div className="hero-trust">
              <span>✦</span>
              Πιο εύκολα ραντεβού. Πιο προσωπική εξυπηρέτηση.
            </div>
          </section>
        )}

        {mode !== "home" && (
          <section className="auth-card">
            <button
              className="back-link"
              type="button"
              onClick={() => go("home")}
            >
              ← Αρχική
            </button>

            <div className="auth-kicker">
              {mode === "register"
                ? "WELCOME TO NELA"
                : mode === "login"
                ? "WELCOME BACK"
                : "NELA BUSINESS"}
            </div>

            <h2>
              {mode === "register"
                ? "Δημιουργία λογαριασμού"
                : mode === "login"
                ? "Καλώς επέστρεψες"
                : "Business sign in"}
            </h2>

            <p className="auth-description">
              {mode === "business"
                ? "Ασφαλής πρόσβαση στον χώρο διαχείρισης."
                : "Η επόμενη κράτηση ξεκινά εδώ."}
            </p>

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            {mode === "register" && (
              <form onSubmit={handleRegister} className="auth-form">
                <div className="field-grid">
                  <Field
                    label="Όνομα"
                    name="firstName"
                    value={form.firstName}
                    onChange={updateForm}
                    autoComplete="given-name"
                  />

                  <Field
                    label="Επώνυμο"
                    name="lastName"
                    value={form.lastName}
                    onChange={updateForm}
                    autoComplete="family-name"
                  />
                </div>

                <Field
                  label="Τηλέφωνο"
                  name="phone"
                  value={form.phone}
                  onChange={updateForm}
                  type="tel"
                  autoComplete="tel"
                />

                <Field
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={updateForm}
                  type="email"
                  autoComplete="email"
                />

                <Field
                  label="Επιβεβαίωση email"
                  name="confirmEmail"
                  value={form.confirmEmail}
                  onChange={updateForm}
                  type="email"
                  autoComplete="off"
                />

                <div className="field-grid">
                  <Field
                    label="Κωδικός (8+ χαρακτήρες)"
                    name="password"
                    value={form.password}
                    onChange={updateForm}
                    type={visiblePasswords.password ? "text" : "password"}
                    showPassword={visiblePasswords.password}
                    onTogglePassword={togglePassword}
                    autoComplete="new-password"
                  />

                  <Field
                    label="Επιβεβαίωση κωδικού"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={updateForm}
                    type={visiblePasswords.confirmPassword ? "text" : "password"}
                    showPassword={visiblePasswords.confirmPassword}
                    onTogglePassword={togglePassword}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  className="btn btn-gold full-width"
                  type="submit"
                >
                  Δημιουργία λογαριασμού <span>→</span>
                </button>
              </form>
            )}

            {mode === "login" && (
              <form onSubmit={handleLogin} className="auth-form">
                <Field
                  label="Email"
                  name="email"
                  value={login.email}
                  onChange={updateLogin}
                  type="email"
                  autoComplete="email"
                />

                <Field
                  label="Κωδικός"
                  name="password"
                  value={login.password}
                  onChange={updateLogin}
                  type={visiblePasswords.login ? "text" : "password"}
                  showPassword={visiblePasswords.login}
                  onTogglePassword={togglePassword}
                  autoComplete="current-password"
                />

                <button
                  className="btn btn-gold full-width"
                  type="submit"
                >
                  Σύνδεση <span>→</span>
                </button>
              </form>
            )}

            {mode === "business" && (
              <form onSubmit={handleBusinessLogin} className="auth-form">
                <Field
                  label="Business email"
                  name="email"
                  value={business.email}
                  onChange={updateBusiness}
                  type="email"
                  autoComplete="username"
                />

                <Field
                  label="Κωδικός επιχείρησης"
                  name="password"
                  value={business.password}
                  onChange={updateBusiness}
                  type={visiblePasswords.business ? "text" : "password"}
                  showPassword={visiblePasswords.business}
                  onTogglePassword={togglePassword}
                  autoComplete="current-password"
                />

                <button
                  className="btn btn-gold full-width"
                  type="submit"
                  disabled={busy}
                >
                  Είσοδος στο dashboard <span>→</span>
                </button>

                <p className="security-note">
                  Η τρέχουσα σύνδεση είναι για demo. Για δημόσια λειτουργία
                  χρειάζεται επαλήθευση από το backend.
                </p>
              </form>
            )}

            {mode === "register" && (
              <p className="auth-switch">
                Έχεις ήδη λογαριασμό;{" "}
                <button type="button" onClick={() => go("login")}>
                  Σύνδεση
                </button>
              </p>
            )}

            {mode === "login" && (
              <p className="auth-switch">
                Δεν έχεις λογαριασμό;{" "}
                <button type="button" onClick={() => go("register")}>
                  Δημιούργησε έναν
                </button>
              </p>
            )}
          </section>
        )}
      </main>

      <button
        className="theme-toggle"
        type="button"
        onClick={() => setLightMode((old) => !old)}
        aria-label={
          lightMode
            ? "Ενεργοποίηση σκούρου θέματος"
            : "Ενεργοποίηση φωτεινού θέματος"
        }
        title={lightMode ? "Dark Mode" : "Light Mode"}
      >
        <LampIcon />
      </button>

      <footer className="landing-footer">
        <span>NELA</span> · AI RECEPTIONIST
        <span className="footer-dot">✦</span>
        MADE FOR BETTER EXPERIENCES
      </footer>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete = "off",
  showPassword = false,
  onTogglePassword,
}) {
  const isPassword = type === "password" || type === "text" && Boolean(onTogglePassword);

  return (
    <label className="form-field">
      <span>{label}</span>

      <div className="input-wrapper">
        <input
          required
          name={name}
          type={isPassword && showPassword ? "text" : type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />

        {onTogglePassword && (
          <button
            className="password-toggle"
            type="button"
            onClick={() => onTogglePassword(name === "password" || name === "confirmPassword" ? name : name === "password" ? name : name)}
            aria-label={showPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
            title={showPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
          >
            <EyeIcon visible={showPassword} />
          </button>
        )}
      </div>
    </label>
  );
}
