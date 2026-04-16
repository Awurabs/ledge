import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Cards from "./pages/Cards";
import Transactions from "./pages/Transactions";
import Expenses from "./pages/Expenses";
import Approvals from "./pages/Approvals";
import Books from "./pages/Books";
import BalanceSheet from "./pages/BalanceSheet";
import Adjust from "./pages/Adjust";
import MonthEndClose from "./pages/MonthEndClose";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import Invoicing from "./pages/Invoicing";
import Bills from "./pages/Bills";
import Reimbursements from "./pages/Reimbursements";
import Revenue from "./pages/Revenue";
import Analytics from "./pages/Analytics";
import Copilot from "./pages/Copilot";
import PeopleTeams from "./pages/PeopleTeams";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/books" element={<Books />} />
          <Route path="/balance-sheet" element={<BalanceSheet />} />
          <Route path="/adjust" element={<Adjust />} />
          <Route path="/month-end-close" element={<MonthEndClose />} />
          <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="/invoicing" element={<Invoicing />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/reimbursements" element={<Reimbursements />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/copilot" element={<Copilot />} />
          <Route path="/people" element={<PeopleTeams />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
