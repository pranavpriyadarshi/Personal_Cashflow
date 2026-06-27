import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Ledger from "./pages/Ledger";
import Advisor from "./pages/Advisor";
import CardOptimizer from "./pages/CardOptimizer";
import InvestmentPlanner from "./pages/InvestmentPlanner";
import History from "./pages/History";
import StatementImport from "./pages/StatementImport";
import ReimbursementTracker from "./pages/ReimbursementTracker";
import Bills from "./pages/Bills";
import Loans from "./pages/Loans";
import Overview from "./pages/Overview";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Account from "./pages/Account";
import EmailSync from "./pages/EmailSync";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";

const NAV_ITEMS = [
  { to: "/", label: "Overview" },
  { to: "/add", label: "Add" },
  { to: "/ledger", label: "Ledger" },
  { to: "/advisor", label: "Advisor" },
  { to: "/cards", label: "Cards" },
  { to: "/investments", label: "Invest" },
  { to: "/loans", label: "Loans" },
  { to: "/bills", label: "Bills" },
  { to: "/history", label: "History" },
  { to: "/import", label: "Import" },
  { to: "/reimbursements", label: "Reimburse" },
  { to: "/email-sync", label: "Email Sync" },
];

function MainApp() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col pb-16 dark:bg-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personal CFO</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {theme === "dark" ? "☀ Light" : "🌙 Dark"}
          </button>
          <NavLink to="/account" className="text-xs text-purple-600 dark:text-purple-400">
            Account
          </NavLink>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/account" element={<Account />} />
          <Route path="/add" element={<Dashboard />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/advisor" element={<Advisor />} />
          <Route path="/cards" element={<CardOptimizer />} />
          <Route path="/investments" element={<InvestmentPlanner />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/history" element={<History />} />
          <Route path="/import" element={<StatementImport />} />
          <Route path="/reimbursements" element={<ReimbursementTracker />} />
          <Route path="/email-sync" element={<EmailSync />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex overflow-x-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex shrink-0 flex-col items-center gap-0.5 px-3 py-2 whitespace-nowrap ${
                isActive ? "text-purple-600 dark:text-purple-400 font-medium" : "text-gray-500 dark:text-gray-400"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  const postAuthRedirect = user?.onboardingCompletedAt ? "/" : "/onboarding";

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={postAuthRedirect} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={postAuthRedirect} replace /> : <Register />} />
      <Route
        path="/onboarding"
        element={user ? <Onboarding /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/*"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : !user.onboardingCompletedAt ? (
            <Navigate to="/onboarding" replace />
          ) : (
            <MainApp />
          )
        }
      />
    </Routes>
  );
}

export default App;
