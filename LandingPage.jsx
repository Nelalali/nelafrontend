import { useState } from "react";
import "./LandingPage.css";

const CLIENTS_KEY = "nelaClients";
const BUSINESSES_KEY = "nelaBusinesses";
const USER_KEY = "nelaUser";
const ACTIVE_CLIENT_KEY = "nelaActiveClient";
const HISTORY_KEY = "nelaConversationHistory";

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

const makeId = (prefix = "nela") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [clientForm, setClientForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
  });

  const [businessForm, setBusinessForm] = useState({
    businessName: "",
    email: "",
    confirmEmail: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [businessLogin, setBusinessLogin] = useState({
    email: "",
    password: "",
  });

  const go = (next) => {
    setError("");
    setMode(next);
  };

  const togglePassword = (key) => {
    setVisiblePasswords((old) => ({
      ...old,
      [key]: !old[key],
    }));
  };

  const updateClient = (e) => {
    setClientForm((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));
  };

  const updateBusiness = (e) => {
    setBusinessForm((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));
  };

  const updateLogin = (e) => {
    setLogin((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));
  };

  const updateBusinessLogin = (e) => {
    setBusinessLogin((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));
  };

  function handleClientRegister(e) {
    e.preventDefault();
    setError("");

    const clean = {
      ...clientForm,
      firstName: clientForm.firstName.trim(),
      lastName: clientForm.lastName.trim(),
      phone: normalizePhone(clientForm.phone),
      email: normalizeEmail(clientForm.email),
      confirmEmail: normalizeEmail(clientForm.confirmEmail),
    };

    if (Object.values(clean).some((value) => !String(value).trim())) {
      return setError("Please complete all fields.");
    }

    if (clean.email !== clean.confirmEmail) {
      return setError("Email addresses do not match.");
    }

    if (clean.password !== clean.confirmPassword) {
      return setError("Passwords do not match.");
    }

    if (clean.password.length < 8) {
      return setError("Your password must contain at least 8 characters.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
      return setError("Please enter a valid email address.");
    }

    if (clean.phone.replace(/\D/g, "").length < 8) {
      return setError("Please enter a valid phone number.");
    }

    const clients = readArray(CLIENTS_KEY);

    if (
      clients.some(
        (client) => normalizeEmail(client?.email) === clean.email
      )
    ) {
      return setError(
        "An account with this email already exists. Please sign in."
      );
    }

    if (
      clients.some(
        (client) => normalizePhone(client?.phone) === clean.phone
      )
    ) {
      return setError("An account with this phone number already exists.");
    }

    const now = new Date().toISOString();

    const client = {
      id: makeId("client"),
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
          name: `${client.firstName} ${client.lastName}`,
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
        "Unable to save your account. Please check your browser storage."
      );
    }
  }

  function handleBusinessRegister(e) {
    e.preventDefault();
    setError("");

    const clean = {
      businessName: businessForm.businessName.trim(),
      email: normalizeEmail(businessForm.email),
      confirmEmail: normalizeEmail(businessForm.confirmEmail),
      phone: normalizePhone(businessForm.phone),
      password: businessForm.password,
      confirmPassword: businessForm.confirmPassword,
    };

    if (Object.values(clean).some((value) => !String(value).trim())) {
      return setError("Please complete all fields.");
    }

    if (clean.email !== clean.confirmEmail) {
      return setError("Email addresses do not match.");
    }

    if (clean.password !== clean.confirmPassword) {
      return setError("Passwords do not match.");
    }

    if (clean.password.length < 8) {
      return setError("Your password must contain at least 8 characters.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
      return setError("Please enter a valid email address.");
    }

    if (clean.phone.replace(/\D/g, "").length < 8) {
      return setError("Please enter a valid phone number.");
    }

    const businesses = readArray(BUSINESSES_KEY);

    if (
      businesses.some(
        (business) => normalizeEmail(business?.email) === clean.email
      )
    ) {
      return setError(
        "A business account with this email already exists."
      );
    }

    const now = new Date().toISOString();

    const business = {
      id: makeId("business"),
      businessName: clean.businessName,
      email: clean.email,
      phone: clean.phone,
      password: clean.password,
      createdAt: now,
      updatedAt: now,
    };

    try {
      localStorage.setItem(
        BUSINESSES_KEY,
        JSON.stringify([...businesses, business])
      );

      localStorage.setItem(
        "nelaBusinessUser",
        JSON.stringify({
          id: business.id,
          businessName: business.businessName,
          email: business.email,
          loggedIn: true,
          loggedInAt: now,
        })
      );

      window.location.replace("/?admin=true");
    } catch {
      setError("Unable to create your account. Please try again.");
    }
  }

  function handleClientLogin(e) {
    e.preventDefault();
    setError("");

    const email = normalizeEmail(login.email);

    if (!email || !login.password) {
      return setError("Please enter your email and password.");
    }

    const client = readArray(CLIENTS_KEY).find(
      (item) => normalizeEmail(item?.email) === email
    );

    if (!client) {
      return setError("No account was found with this email address.");
    }

    if (String(client.password || "") !== login.password) {
      return setError("Incorrect password.");
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

    const email = normalizeEmail(businessLogin.email);

    const business = readArray(BUSINESSES_KEY).find(
      (item) => normalizeEmail(item?.email) === email
    );

    if (
      !business ||
      String(business.password || "") !== businessLogin.password
    ) {
      setBusy(false);
      return setError("Incorrect business email or password.");
    }

    localStorage.setItem(
      "nelaBusinessUser",
      JSON.stringify({
        id: business.id,
        businessName: business.businessName,
        email: business.email,
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
          aria-label="NELA home"
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
              YOUR AI BOOKING ASSISTANT
              <span className="eyebrow-line" />
            </div>

            <h1>NELA</h1>

            <div className="hero-subtitle">Booking Simple</div>

            <p className="hero-copy">
              Smarter appointment management.
              <br />
              Personal service. Effortless bookings.
            </p>

            <div className="hero-actions">
              <button
                className="btn btn-gold"
                onClick={() => go("register")}
                type="button"
              >
                Create Account <span>→</span>
              </button>

              <button
                className="btn btn-outline"
                onClick={() => go("login")}
                type="button"
              >
                Sign In
              </button>
            </div>

            <div className="business-cta">
              <span>Are you a professional or business?</span>
              <button type="button" onClick={() => go("businessRegister")}>
                Create a Business Account <span>↗</span>
              </button>
            </div>

            <div className="hero-trust">
              <span>✦</span>
              Better bookings. More personal service.
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
              ← Back to Home
            </button>

            <div className="auth-kicker">
              {mode === "register"
                ? "PERSONAL ACCOUNT"
                : mode === "login"
                ? "WELCOME BACK"
                : mode === "businessRegister"
                ? "JOIN NELA FOR BUSINESS"
                : "NELA BUSINESS"}
            </div>

            <h2>
              {mode === "register"
                ? "Create Your Account"
                : mode === "login"
                ? "Welcome Back"
                : mode === "businessRegister"
                ? "Create a Business Account"
                : "Business Sign In"}
            </h2>

            <p className="auth-description">
              {mode === "businessRegister"
                ? "Bring smarter appointment management to your business."
                : mode === "business"
                ? "Sign in to manage your business."
                : "Your next booking starts here."}
            </p>

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            {mode === "register" && (
              <form onSubmit={handleClientRegister} className="auth-form">
                <div className="field-grid">
                  <Field label="First Name" name="firstName"
                    value={clientForm.firstName} onChange={updateClient}
                    autoComplete="given-name" />
                  <Field label="Last Name" name="lastName"
                    value={clientForm.lastName} onChange={updateClient}
                    autoComplete="family-name" />
                </div>

                <Field label="Phone Number" name="phone"
                  value={clientForm.phone} onChange={updateClient}
                  type="tel" autoComplete="tel" />

                <Field label="Email Address" name="email"
                  value={clientForm.email} onChange={updateClient}
                  type="email" autoComplete="email" />

                <Field label="Confirm Email" name="confirmEmail"
                  value={clientForm.confirmEmail} onChange={updateClient}
                  type="email" autoComplete="off" />

                <div className="field-grid">
                  <Field label="Password (8+ characters)" name="password"
                    value={clientForm.password} onChange={updateClient}
                    type={visiblePasswords.clientPassword ? "text" : "password"}
                    showPassword={visiblePasswords.clientPassword}
                    onTogglePassword={() => togglePassword("clientPassword")}
                    autoComplete="new-password" />

                  <Field label="Confirm Password" name="confirmPassword"
                    value={clientForm.confirmPassword} onChange={updateClient}
                    type={visiblePasswords.clientConfirmPassword ? "text" : "password"}
                    showPassword={visiblePasswords.clientConfirmPassword}
                    onTogglePassword={() => togglePassword("clientConfirmPassword")}
                    autoComplete="new-password" />
                </div>

                <button className="btn btn-gold full-width" type="submit">
                  Create Account <span>→</span>
                </button>
              </form>
            )}

            {mode === "businessRegister" && (
              <form onSubmit={handleBusinessRegister} className="auth-form">
                <Field label="Business Name" name="businessName"
                  value={businessForm.businessName} onChange={updateBusiness}
                  autoComplete="organization" />

                <Field label="Business Email" name="email"
                  value={businessForm.email} onChange={updateBusiness}
                  type="email" autoComplete="email" />

                <Field label="Confirm Business Email" name="confirmEmail"
                  value={businessForm.confirmEmail} onChange={updateBusiness}
                  type="email" autoComplete="off" />

                <Field label="Business Phone Number" name="phone"
                  value={businessForm.phone} onChange={updateBusiness}
                  type="tel" autoComplete="tel" />

                <div className="field-grid">
                  <Field label="Password (8+ characters)" name="password"
                    value={businessForm.password} onChange={updateBusiness}
                    type={visiblePasswords.businessPassword ? "text" : "password"}
                    showPassword={visiblePasswords.businessPassword}
                    onTogglePassword={() => togglePassword("businessPassword")}
                    autoComplete="new-password" />

                  <Field label="Confirm Password" name="confirmPassword"
                    value={businessForm.confirmPassword} onChange={updateBusiness}
                    type={visiblePasswords.businessConfirmPassword ? "text" : "password"}
                    showPassword={visiblePasswords.businessConfirmPassword}
                    onTogglePassword={() => togglePassword("businessConfirmPassword")}
                    autoComplete="new-password" />
                </div>

                <button className="btn btn-gold full-width" type="submit">
                  Create Business Account <span>→</span>
                </button>
              </form>
            )}

            {mode === "login" && (
              <form onSubmit={handleClientLogin} className="auth-form">
                <Field label="Email Address" name="email"
                  value={login.email} onChange={updateLogin}
                  type="email" autoComplete="email" />

                <Field label="Password" name="password"
                  value={login.password} onChange={updateLogin}
                  type={visiblePasswords.loginPassword ? "text" : "password"}
                  showPassword={visiblePasswords.loginPassword}
                  onTogglePassword={() => togglePassword("loginPassword")}
                  autoComplete="current-password" />

                <button className="btn btn-gold full-width" type="submit">
                  Sign In <span>→</span>
                </button>
              </form>
            )}

            {mode === "business" && (
              <form onSubmit={handleBusinessLogin} className="auth-form">
                <Field label="Business Email" name="email"
                  value={businessLogin.email} onChange={updateBusinessLogin}
                  type="email" autoComplete="username" />

                <Field label="Password" name="password"
                  value={businessLogin.password} onChange={updateBusinessLogin}
                  type={visiblePasswords.businessLoginPassword ? "text" : "password"}
                  showPassword={visiblePasswords.businessLoginPassword}
                  onTogglePassword={() => togglePassword("businessLoginPassword")}
                  autoComplete="current-password" />

                <button className="btn btn-gold full-width"
                  type="submit" disabled={busy}>
                  {busy ? "Signing In..." : "Access Dashboard"} <span>→</span>
                </button>

                <p className="security-note">
                  New to NELA? Create your business account first.
                </p>
              </form>
            )}

            {mode === "register" && (
              <p className="auth-switch">
                Already have an account?{" "}
                <button type="button" onClick={() => go("login")}>
                  Sign In
                </button>
              </p>
            )}

            {mode === "login" && (
              <p className="auth-switch">
                Don't have an account?{" "}
                <button type="button" onClick={() => go("register")}>
                  Create one
                </button>
              </p>
            )}

            {mode === "businessRegister" && (
              <p className="auth-switch">
                Already registered your business?{" "}
                <button type="button" onClick={() => go("business")}>
                  Business Sign In
                </button>
              </p>
            )}

            {mode === "business" && (
              <p className="auth-switch">
                Don't have a business account?{" "}
                <button type="button" onClick={() => go("businessRegister")}>
                  Create one
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
        aria-label={lightMode ? "Switch to dark theme" : "Switch to light theme"}
        title={lightMode ? "Dark Mode" : "Light Mode"}
      >
        <LampIcon />
      </button>

      <footer className="landing-footer">
        <span>NELA</span> · AI BOOKING ASSISTANT
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
  return (
    <label className="form-field">
      <span>{label}</span>
      <div className="input-wrapper">
        <input
          required
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />

        {onTogglePassword && (
          <button
            className="password-toggle"
            type="button"
            onClick={onTogglePassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon visible={showPassword} />
          </button>
        )}
      </div>
    </label>
  );
}
