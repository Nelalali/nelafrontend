import { useState } from "react";
import "./LandingPage.css";

const CLIENTS_KEY = "nelaClients";
const USER_KEY = "nelaUser";
const BUSINESS_KEY = "nelaBusinesses";
const BUSINESS_USER_KEY = "nelaBusinessUser";

function readStorage(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

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
              aria-label="Toggle password visibility"
            >
              {visible ? "Hide" : "Show"}
            </button>
          )}
        </div>
      )}
    </label>
  );
}

export default function LandingPage() {
  const [mode, setMode] = useState("home");
  const [theme, setTheme] = useState("dark");
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

  const updateCustomer = (event) => {
    setCustomer({
      ...customer,
      [event.target.name]: event.target.value,
    });
  };

  const updateBusiness = (event) => {
    setBusiness({
      ...business,
      [event.target.name]: event.target.value,
    });
  };

  const updateLogin = (event) => {
    setLogin({
      ...login,
      [event.target.name]: event.target.value,
    });
  };

  const changeMode = (newMode) => {
    setError("");
    setMessage("");
    setMode(newMode);
  };

  const validEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const registerCustomer = (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!validEmail(customer.email)) {
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

    const clients = readStorage(CLIENTS_KEY);

    const exists = clients.some(
      (client) =>
        client.email?.toLowerCase() === customer.email.toLowerCase()
    );

    if (exists) {
      setError("An account with this email already exists.");
      return;
    }

    const newClient = {
      id: crypto.randomUUID(),
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      password: customer.password,
      createdAt: new Date().toISOString(),
    };

    clients.push(newClient);

    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));

    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: newClient.id,
        name: newClient.name,
        email: newClient.email,
      })
    );

    localStorage.setItem("nelaActiveClient", newClient.id);

    setMessage("Your account has been created successfully.");

    setTimeout(() => {
      window.location.href = "/";
    }, 700);
  };

  const loginCustomer = (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const clients = readStorage(CLIENTS_KEY);

    const found = clients.find(
      (client) =>
        client.email?.toLowerCase() === login.email.toLowerCase() &&
        client.password === login.password
    );

    if (!found) {
      setError("Incorrect email or password.");
      return;
    }

    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: found.id,
        name: found.name,
        email: found.email,
      })
    );

    localStorage.setItem("nelaActiveClient", found.id);

    window.location.href = "/";
  };

  const registerBusiness = (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!validEmail(business.email)) {
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

    const businesses = readStorage(BUSINESS_KEY);

    const exists = businesses.some(
      (item) =>
        item.email?.toLowerCase() === business.email.toLowerCase()
    );

    if (exists) {
      setError("This business email is already registered.");
      return;
    }

    const newBusiness = {
      id: crypto.randomUUID(),
      businessName: business.businessName.trim(),
      ownerName: business.ownerName.trim(),
      email: business.email.trim().toLowerCase(),
      phone: business.phone.trim(),
      category: business.category,
      password: business.password,
      createdAt: new Date().toISOString(),
    };

    businesses.push(newBusiness);

    localStorage.setItem(BUSINESS_KEY, JSON.stringify(businesses));

    localStorage.setItem(
      BUSINESS_USER_KEY,
      JSON.stringify({
        id: newBusiness.id,
        businessName: newBusiness.businessName,
        ownerName: newBusiness.ownerName,
        email: newBusiness.email,
        phone: newBusiness.phone,
        category: newBusiness.category,
      })
    );

    setMessage("Your business account has been created.");

    setTimeout(() => {
      window.location.href = "/?admin=true";
    }, 700);
  };

  const loginBusiness = (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const businesses = readStorage(BUSINESS_KEY);

    const found = businesses.find(
      (item) =>
        item.email?.toLowerCase() === login.email.toLowerCase() &&
        item.password === login.password
    );

    if (!found) {
      setError("Incorrect business email or password.");
      return;
    }

    localStorage.setItem(
      BUSINESS_USER_KEY,
      JSON.stringify({
        id: found.id,
        businessName: found.businessName,
        ownerName: found.ownerName,
        email: found.email,
        phone: found.phone,
        category: found.category,
      })
    );

    window.location.href = "/?admin=true";
  };

  return (
    <main className={`nela-page theme-${theme}`}>
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

          <button
            className="nela-business-button"
            onClick={() => changeMode("business-login")}
          >
            FOR BUSINESS
          </button>
        </nav>
      </header>

      <section className="nela-main">
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
                autoComplete="new-password"
              />

              <Field
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={business.confirmPassword}
                onChange={updateBusiness}
                placeholder="Repeat your password"
                autoComplete="new-password"
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

        {(error || message) && (
          <div className={`nela-message ${error ? "error" : "success"}`}>
            {error || message}
          </div>
        )}
      </section>

      <footer className="nela-footer">
        <span>© {new Date().getFullYear()} NELA</span>
        <span>Smart appointments. Effortlessly.</span>
      </footer>
    </main>
  );
}
