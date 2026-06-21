import { NavLink, Route, Routes } from "react-router-dom";
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
];

function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col pb-16">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Personal CFO</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        <Routes>
          <Route path="/" element={<Overview />} />
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
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex overflow-x-auto border-t border-gray-200 bg-white text-xs">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex shrink-0 flex-col items-center gap-0.5 px-3 py-2 whitespace-nowrap ${
                isActive ? "text-purple-600 font-medium" : "text-gray-500"
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

export default App;
