import React, { useState } from "react";

const CLIENTS_KEY = "nelaClients";
const USER_KEY = "nelaUser";
const ACTIVE_CLIENT_KEY = "nelaActiveClient";
const CONVERSATION_KEY = "nelaConversationHistory";

const BUSINESS_EMAIL = "nelabusiness@outlook.com";
const BUSINESS_PASSWORD = "Nela2022$";

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const normalizePhone = (value = "") =>
  value.replace(/\s+/g, "").replace(/[-().]/g, "");

const getClients = () => {
  try {
    const stored = localStorage.getItem(CLIENTS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveClients = (clients) => {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
};

const makeClientId = () =>
  `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export default function LandingPage() {
  const [mode, setMode] = useState("home");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPassword, setBusinessPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const goHome = () => {
    resetMessages();
    setMode("home");
  };

  const goRegister = () => {
    resetMessages();
    setMode("register");
  };

  const goLogin = () => {
    resetMessages();
    setMode("login");
  };

  const goBusinessLogin = () => {
    resetMessages();
    setMode("business");
  };

  const handleRegister = (e) => {
    e.preventDefault();

    resetMessages();

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = normalizeEmail(email);
    const cleanConfirmEmail = normalizeEmail(confirmEmail);
    const cleanPhone = normalizePhone(phone);

    if (
      !cleanFirstName ||
      !cleanLastName ||
      !cleanPhone ||
      !cleanEmail ||
      !cleanConfirmEmail ||
      !password ||
      !confirmPassword
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (cleanEmail !== cleanConfirmEmail) {
      setError("Email addresses do not match.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    const clients = getClients();

    const emailExists = clients.some(
      (client) => normalizeEmail(client.email) === cleanEmail
    );

    if (emailExists) {
      setError(
        "An account with this email already exists. Please sign in instead."
      );
      return;
    }

    const phoneExists = clients.some(
      (client) => normalizePhone(client.phone) === cleanPhone
    );

    if (phoneExists) {
      setError(
        "An account with this phone number already exists. Please sign in instead."
      );
      return;
    }

    const newClient = {
      id: makeClientId(),

      firstName: cleanFirstName,
      lastName: cleanLastName,

      phone: cleanPhone,
      email: cleanEmail,

      password,

      appointments: [],
      memory: [],

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedClients = [...clients, newClient];

    saveClients(updatedClients);

    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: newClient.id,
        firstName: newClient.firstName,
        lastName: newClient.lastName,
        phone: newClient.phone,
        email: newClient.email,
      })
    );

    localStorage.setItem(ACTIVE_CLIENT_KEY, newClient.id);

    localStorage.removeItem(CONVERSATION_KEY);

    window.location.href = "/chat";
  };

  const handleLogin = (e) => {
    e.preventDefault();

    resetMessages();

    const cleanEmail = normalizeEmail(loginEmail);

    if (!cleanEmail || !loginPassword) {
      setError("Please enter your email and password.");
      return;
    }

    const clients = getClients();

    const client = clients.find(
      (item) => normalizeEmail(item.email) === cleanEmail
    );

    if (!client) {
      setError("No account was found with this email.");
      return;
    }

    if (client.password !== loginPassword) {
      setError("Incorrect password.");
      return;
    }

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

    localStorage.removeItem(CONVERSATION_KEY);

    window.location.href = "/chat";
  };

  const handleBusinessLogin = (e) => {
    e.preventDefault();

    resetMessages();

    const cleanEmail = normalizeEmail(businessEmail);

    if (!cleanEmail || !businessPassword) {
      setError("Please enter your business email and password.");
      return;
    }

    if (
      cleanEmail !== normalizeEmail(BUSINESS_EMAIL) ||
      businessPassword !== BUSINESS_PASSWORD
    ) {
      setError("Incorrect business email or password.");
      return;
    }

    localStorage.setItem(
      "nelaBusinessUser",
      JSON.stringify({
        email: BUSINESS_EMAIL,
        loggedIn: true,
        loggedInAt: new Date().toISOString(),
      })
    );

    window.location.href = "/admin";
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "15px 16px",
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(210,180,105,0.24)",
    borderRadius: "10px",
    color: "#f4efe4",
    outline: "none",
    fontSize: "14px",
    letterSpacing: "0.2px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    fontSize: "10px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "rgba(244,239,228,0.58)",
  };

  const buttonStyle = {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #c9a85c, #a8863f)",
    color: "#11100d",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    cursor: "pointer",
    marginTop: "8px",
  };

  const secondaryButtonStyle = {
    background: "transparent",
    border: "none",
    color: "#c9a85c",
    cursor: "pointer",
    fontSize: "12px",
    letterSpacing: "0.5px",
    padding: "4px",
  };

  const field = (
    label,
    value,
    setter,
    type = "text",
    placeholder = ""
  ) => (
    <div style={{ marginBottom: "14px" }}>
      <label style={labelStyle}>{label}</label>

      <input
        type={type}
        value={value}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete={type === "password" ? "new-password" : "off"}
      />
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at 50% 35%, rgba(183,146,68,0.10), transparent 32%), #080807",
        color: "#f4efe4",
        fontFamily: "Inter, Arial, Helvetica, sans-serif",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* BACKGROUND */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.82)), radial-gradient(circle at 50% 0%, rgba(202,169,94,0.08), transparent 42%)",
          pointerEvents: "none",
        }}
      />

      {/* TOP BAR */}
      <header
        style={{
          position: "relative",
          zIndex: 2,
          height: "78px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 5vw",
          borderBottom: "1px solid rgba(255,255,255,0.055)",
        }}
      >
        <button
          onClick={goHome}
          style={{
            background: "none",
            border: "none",
            color: "#d2b56b",
            fontSize: "22px",
            letterSpacing: "7px",
            fontWeight: 500,
            cursor: "pointer",
            padding: 0,
          }}
        >
          NELA
        </button>

        <button
          onClick={goBusinessLogin}
          style={{
            background: "none",
            border: "none",
            color: "rgba(244,239,228,0.72)",
            fontSize: "10px",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          FOR BUSINESS
        </button>
      </header>

      {/* CONTENT */}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: mode === "home" ? "center" : "flex-start",
          padding:
            mode === "home" ? "40px 20px" : "55px 20px 80px",
        }}
      >
        {/* HOME */}
        {mode === "home" && (
          <div
            style={{
              width: "100%",
              maxWidth: "620px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#c9a85c",
                fontSize: "10px",
                letterSpacing: "5px",
                textTransform: "uppercase",
                marginBottom: "24px",
              }}
            >
              YOUR PERSONAL RECEPTIONIST
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(48px, 8vw, 88px)",
                fontWeight: 400,
                letterSpacing: "12px",
                color: "#f2eadb",
                fontFamily: "Cinzel, Georgia, serif",
              }}
            >
              NELA
            </h1>

            {/* NEW SLOGAN */}
            <div
              style={{
                marginTop: "14px",
                color: "rgba(201,168,92,0.88)",
                fontSize: "12px",
                letterSpacing: "2.8px",
                fontWeight: 400,
              }}
            >
              Booking. Simple.{" "}
              <span
                style={{
                  fontStyle: "italic",
                  color: "#d8bd79",
                }}
              >
                Έτσι απλά.
              </span>
            </div>

            <p
              style={{
                margin: "25px auto 42px",
                maxWidth: "470px",
                color: "rgba(244,239,228,0.55)",
                fontSize: "14px",
                lineHeight: 1.8,
                fontWeight: 300,
              }}
            >
              Your appointment, your experience with us.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={goRegister}
                style={{
                  ...buttonStyle,
                  width: "auto",
                  minWidth: "190px",
                  marginTop: 0,
                  padding: "15px 28px",
                }}
              >
                Create Account
              </button>

              <button
                onClick={goLogin}
                style={{
                  width: "auto",
                  minWidth: "190px",
                  padding: "14px 28px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(210,180,105,0.28)",
                  color: "#d9c58d",
                  fontSize: "12px",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* REGISTER */}
        {mode === "register" && (
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "35px" }}>
              <div
                style={{
                  color: "#c9a85c",
                  fontSize: "10px",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                WELCOME TO NELA
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "30px",
                  fontWeight: 400,
                  letterSpacing: "3px",
                }}
              >
                Create Account
              </h2>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "13px 15px",
                  borderRadius: "9px",
                  background: "rgba(180,60,60,0.10)",
                  border: "1px solid rgba(220,100,100,0.25)",
                  color: "#e5a4a4",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleRegister}>
              {field("First Name", firstName, setFirstName, "text", "First name")}

              {field("Last Name", lastName, setLastName, "text", "Last name")}

              {field("Phone", phone, setPhone, "tel", "Phone number")}

              {field("Email", email, setEmail, "email", "Email address")}

              {field(
                "Confirm Email",
                confirmEmail,
                setConfirmEmail,
                "email",
                "Confirm email address"
              )}

              {field(
                "Password",
                password,
                setPassword,
                "password",
                "Password"
              )}

              {field(
                "Confirm Password",
                confirmPassword,
                setConfirmPassword,
                "password",
                "Confirm password"
              )}

              <button type="submit" style={buttonStyle}>
                Create Account
              </button>
            </form>

            <div
              style={{
                textAlign: "center",
                marginTop: "25px",
                color: "rgba(244,239,228,0.45)",
                fontSize: "12px",
              }}
            >
              Already have an account?{" "}
              <button onClick={goLogin} style={secondaryButtonStyle}>
                Sign in
              </button>
            </div>

            <div
              style={{
                textAlign: "center",
                marginTop: "14px",
              }}
            >
              <button
                onClick={goHome}
                style={{
                  ...secondaryButtonStyle,
                  color: "rgba(244,239,228,0.35)",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <div
            style={{
              width: "100%",
              maxWidth: "430px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "35px" }}>
              <div
                style={{
                  color: "#c9a85c",
                  fontSize: "10px",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                WELCOME BACK
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "30px",
                  fontWeight: 400,
                  letterSpacing: "3px",
                }}
              >
                Sign In
              </h2>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "13px 15px",
                  borderRadius: "9px",
                  background: "rgba(180,60,60,0.10)",
                  border: "1px solid rgba(220,100,100,0.25)",
                  color: "#e5a4a4",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "13px 15px",
                  borderRadius: "9px",
                  background: "rgba(100,160,100,0.10)",
                  border: "1px solid rgba(120,190,120,0.22)",
                  color: "#a8d4a8",
                  fontSize: "13px",
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleLogin}>
              {field(
                "Email",
                loginEmail,
                setLoginEmail,
                "email",
                "Email address"
              )}

              {field(
                "Password",
                loginPassword,
                setLoginPassword,
                "password",
                "Password"
              )}

              <button type="submit" style={buttonStyle}>
                Sign In
              </button>
            </form>

            <div
              style={{
                textAlign: "center",
                marginTop: "25px",
                color: "rgba(244,239,228,0.45)",
                fontSize: "12px",
              }}
            >
              Don't have an account?{" "}
              <button onClick={goRegister} style={secondaryButtonStyle}>
                Create one
              </button>
            </div>

            <div
              style={{
                textAlign: "center",
                marginTop: "14px",
              }}
            >
              <button
                onClick={goHome}
                style={{
                  ...secondaryButtonStyle,
                  color: "rgba(244,239,228,0.35)",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* BUSINESS LOGIN */}
        {mode === "business" && (
          <div
            style={{
              width: "100%",
              maxWidth: "430px",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "35px",
              }}
            >
              <div
                style={{
                  color: "#c9a85c",
                  fontSize: "10px",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                NELA BUSINESS
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "30px",
                  fontWeight: 400,
                  letterSpacing: "3px",
                }}
              >
                Business Sign In
              </h2>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "13px 15px",
                  borderRadius: "9px",
                  background: "rgba(180,60,60,0.10)",
                  border: "1px solid rgba(220,100,100,0.25)",
                  color: "#e5a4a4",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleBusinessLogin}>
              {field(
                "Business Email",
                businessEmail,
                setBusinessEmail,
                "email",
                "Business email"
              )}

              {field(
                "Password",
                businessPassword,
                setBusinessPassword,
                "password",
                "Password"
              )}

              <button type="submit" style={buttonStyle}>
                Sign In
              </button>
            </form>

            <div
              style={{
                textAlign: "center",
                marginTop: "28px",
                color: "rgba(244,239,228,0.38)",
                fontSize: "11px",
                lineHeight: 1.7,
              }}
            >
              Authorized NELA business access only.
            </div>

            <div
              style={{
                textAlign: "center",
                marginTop: "18px",
              }}
            >
              <button
                onClick={goHome}
                style={{
                  ...secondaryButtonStyle,
                  color: "rgba(244,239,228,0.35)",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: "20px",
          color: "rgba(244,239,228,0.22)",
          fontSize: "9px",
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}
      >
        NELA · AI RECEPTIONIST
      </footer>
    </div>
  );
}