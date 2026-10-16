import { useState } from "react";
import "./LandingPage.css";

const CLIENTS_KEY = "nelaClients";
const USER_KEY = "nelaUser";
const ACTIVE_CLIENT_KEY = "nelaActiveClient";
const HISTORY_KEY = "nelaConversationHistory";

// Temporary local-demo credentials from the existing project.
// For a public launch, replace this with backend authentication; browser-side
// credentials are visible to users and are not a security boundary.
const BUSINESS_EMAIL = "nelabusiness@outlook.com";
const BUSINESS_PASSWORD = "Nela2022$";

const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
const normalizeEmail = (value = "") => String(value).trim().toLowerCase();
const normalizePhone = (value = "") => String(value).replace(/[^\d+]/g, "");
const makeId = () => `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export default function LandingPage({ defaultMode = "home" }) {
  const [mode, setMode] = useState(defaultMode);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", confirmEmail: "", password: "", confirmPassword: "" });
  const [login, setLogin] = useState({ email: "", password: "" });
  const [business, setBusiness] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (next) => { setError(""); setMode(next); };
  const updateForm = (e) => setForm((old) => ({ ...old, [e.target.name]: e.target.value }));
  const updateLogin = (e) => setLogin((old) => ({ ...old, [e.target.name]: e.target.value }));
  const updateBusiness = (e) => setBusiness((old) => ({ ...old, [e.target.name]: e.target.value }));

  function handleRegister(e) {
    e.preventDefault(); setError("");
    const clean = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: normalizePhone(form.phone), email: normalizeEmail(form.email), confirmEmail: normalizeEmail(form.confirmEmail) };
    if (Object.values(clean).some((v) => !String(v).trim())) return setError("Συμπλήρωσε όλα τα πεδία.");
    if (clean.email !== clean.confirmEmail) return setError("Τα email δεν ταιριάζουν.");
    if (clean.password !== clean.confirmPassword) return setError("Οι κωδικοί δεν ταιριάζουν.");
    if (clean.password.length < 8) return setError("Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) return setError("Βάλε έγκυρη διεύθυνση email.");
    if (clean.phone.replace(/\D/g, "").length < 8) return setError("Έλεγξε τον αριθμό τηλεφώνου.");
    const clients = readArray(CLIENTS_KEY);
    if (clients.some((c) => normalizeEmail(c?.email) === clean.email)) return setError("Υπάρχει ήδη λογαριασμός με αυτό το email. Κάνε σύνδεση.");
    if (clients.some((c) => normalizePhone(c?.phone) === clean.phone)) return setError("Υπάρχει ήδη λογαριασμός με αυτό το τηλέφωνο.");
    const now = new Date().toISOString();
    const client = { id: makeId(), firstName: clean.firstName, lastName: clean.lastName, phone: clean.phone, email: clean.email, password: clean.password, appointments: [], memory: [], createdAt: now, updatedAt: now };
    try {
      localStorage.setItem(CLIENTS_KEY, JSON.stringify([...clients, client]));
      localStorage.setItem(USER_KEY, JSON.stringify({ id: client.id, firstName: client.firstName, lastName: client.lastName, phone: client.phone, email: client.email }));
      localStorage.setItem(ACTIVE_CLIENT_KEY, client.id);
      localStorage.setItem("nelaClientMemory", JSON.stringify({ name: `${client.firstName} ${client.lastName}`.trim(), phone: client.phone, visits: 0, lastBooking: null, preferences: [] }));
      localStorage.removeItem(HISTORY_KEY);
      window.location.replace("/");
    } catch { setError("Δεν ήταν δυνατή η αποθήκευση. Έλεγξε τον διαθέσιμο χώρο του browser."); }
  }

  function handleLogin(e) {
    e.preventDefault(); setError("");
    const email = normalizeEmail(login.email);
    if (!email || !login.password) return setError("Συμπλήρωσε email και κωδικό.");
    const client = readArray(CLIENTS_KEY).find((c) => normalizeEmail(c?.email) === email);
    if (!client) return setError("Δεν βρέθηκε λογαριασμός με αυτό το email.");
    if (String(client.password || "") !== login.password) return setError("Ο κωδικός δεν είναι σωστός.");
    localStorage.setItem(USER_KEY, JSON.stringify({ id: client.id, firstName: client.firstName || "", lastName: client.lastName || "", phone: client.phone || "", email }));
    localStorage.setItem(ACTIVE_CLIENT_KEY, client.id);
    localStorage.setItem("nelaClientMemory", JSON.stringify({ name: `${client.firstName || ""} ${client.lastName || ""}`.trim(), phone: client.phone || "", visits: Number(client.visits || 0), lastBooking: client.lastBooking || null, preferences: Array.isArray(client.preferences) ? client.preferences : [] }));
    localStorage.removeItem(HISTORY_KEY);
    window.location.replace("/");
  }

  function handleBusinessLogin(e) {
    e.preventDefault(); setError(""); setBusy(true);
    const valid = normalizeEmail(business.email) === BUSINESS_EMAIL && business.password === BUSINESS_PASSWORD;
    if (!valid) { setBusy(false); return setError("Το email ή ο κωδικός επιχείρησης δεν είναι σωστός."); }
    localStorage.setItem("nelaBusinessUser", JSON.stringify({ email: BUSINESS_EMAIL, loggedIn: true, loggedInAt: new Date().toISOString() }));
    window.location.replace("/?admin=true");
  }

  const isForm = mode !== "home";
  return <div className="landing-shell">
    <div className="landing-glow landing-glow-a" /><div className="landing-glow landing-glow-b" />
    <header className="landing-header">
      <button className="wordmark" onClick={() => go("home")} type="button" aria-label="NELA αρχική">NELA<span>®</span></button>
      <button className="business-link" type="button" onClick={() => go("business")}>FOR BUSINESS <span>↗</span></button>
    </header>
    <main className={`landing-main ${isForm ? "is-form" : ""}`}>
      {mode === "home" && <section className="landing-hero">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL AI RECEPTIONIST <span className="eyebrow-line" /></div>
        <h1>NELA</h1><div className="hero-subtitle">Booking, beautifully simple.<span> Έτσι απλά.</span></div>
        <p className="hero-copy">Η εμπειρία του ραντεβού σου, αναβαθμισμένη.<br />Έξυπνη εξυπηρέτηση. Προσωπική εμπειρία. Χωρίς αναμονή.</p>
        <div className="hero-actions"><button className="btn btn-gold" onClick={() => go("register")}>Δημιουργία λογαριασμού <span>→</span></button><button className="btn btn-outline" onClick={() => go("login")}>Σύνδεση</button></div>
        <div className="hero-trust"><span>✦</span> Πιο εύκολα ραντεβού. Πιο προσωπική εξυπηρέτηση.</div>
      </section>}
      {mode !== "home" && <section className="auth-card">
        <button className="back-link" type="button" onClick={() => go("home")}>← Αρχική</button>
        <div className="auth-kicker">{mode === "register" ? "WELCOME TO NELA" : mode === "login" ? "WELCOME BACK" : "NELA BUSINESS"}</div>
        <h2>{mode === "register" ? "Δημιουργία λογαριασμού" : mode === "login" ? "Καλώς επέστρεψες" : "Business sign in"}</h2>
        <p className="auth-description">{mode === "business" ? "Ασφαλής πρόσβαση στον χώρο διαχείρισης." : "Η επόμενη κράτηση ξεκινά εδώ."}</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {mode === "register" && <form onSubmit={handleRegister} className="auth-form">
          <div className="field-grid"><Field label="Όνομα" name="firstName" value={form.firstName} onChange={updateForm} autoComplete="given-name" /><Field label="Επώνυμο" name="lastName" value={form.lastName} onChange={updateForm} autoComplete="family-name" /></div>
          <Field label="Τηλέφωνο" name="phone" value={form.phone} onChange={updateForm} type="tel" autoComplete="tel" />
          <Field label="Email" name="email" value={form.email} onChange={updateForm} type="email" autoComplete="email" />
          <Field label="Επιβεβαίωση email" name="confirmEmail" value={form.confirmEmail} onChange={updateForm} type="email" autoComplete="off" />
          <div className="field-grid"><Field label="Κωδικός (8+ χαρακτήρες)" name="password" value={form.password} onChange={updateForm} type="password" autoComplete="new-password" /><Field label="Επιβεβαίωση κωδικού" name="confirmPassword" value={form.confirmPassword} onChange={updateForm} type="password" autoComplete="new-password" /></div>
          <button className="btn btn-gold full-width" type="submit">Δημιουργία λογαριασμού <span>→</span></button>
        </form>}
        {mode === "login" && <form onSubmit={handleLogin} className="auth-form"><Field label="Email" name="email" value={login.email} onChange={updateLogin} type="email" autoComplete="email" /><Field label="Κωδικός" name="password" value={login.password} onChange={updateLogin} type="password" autoComplete="current-password" /><button className="btn btn-gold full-width" type="submit">Σύνδεση <span>→</span></button></form>}
        {mode === "business" && <form onSubmit={handleBusinessLogin} className="auth-form"><Field label="Business email" name="email" value={business.email} onChange={updateBusiness} type="email" autoComplete="username" /><Field label="Κωδικός επιχείρησης" name="password" value={business.password} onChange={updateBusiness} type="password" autoComplete="current-password" /><button className="btn btn-gold full-width" type="submit" disabled={busy}>Είσοδος στο dashboard <span>→</span></button><p className="security-note">Η τρέχουσα σύνδεση είναι για demo. Για δημόσια λειτουργία χρειάζεται επαλήθευση από το backend.</p></form>}
        {mode === "register" && <p className="auth-switch">Έχεις ήδη λογαριασμό; <button type="button" onClick={() => go("login")}>Σύνδεση</button></p>}
        {mode === "login" && <p className="auth-switch">Δεν έχεις λογαριασμό; <button type="button" onClick={() => go("register")}>Δημιούργησε έναν</button></p>}
      </section>}
    </main>
    <footer className="landing-footer"><span>NELA</span> · AI RECEPTIONIST <span className="footer-dot">✦</span> MADE FOR BETTER EXPERIENCES</footer>
  </div>;
}

function Field({ label, name, value, onChange, type = "text", autoComplete = "off" }) {
  return <label className="form-field"><span>{label}</span><input required name={name} type={type} value={value} onChange={onChange} autoComplete={autoComplete} /></label>;
}
