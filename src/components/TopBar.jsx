import { useLocation } from "react-router-dom";
import { Bell, Search, HelpCircle } from "lucide-react";

const pageTitles = {
  "/": "Dashboard",
  "/cards": "Cards",
  "/transactions": "Transactions",
  "/approvals": "Approvals",
  "/books": "P&L Statement",
  "/balance-sheet": "Balance Sheet",
  "/adjust": "Adjustments",
  "/month-end-close": "Month-End Close",
  "/chart-of-accounts": "Chart of Accounts",
  "/invoicing": "Invoicing",
  "/bills": "Bills",
  "/reimbursements": "Reimbursements",
  "/analytics": "Analytics",
  "/copilot": "AI Copilot",
  "/people": "People & Teams",
  "/integrations": "Integrations",
  "/settings": "Settings",
};

export default function TopBar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Ledge";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1">
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 w-52"
          />
        </div>
        <button className="p-2 rounded-md hover:bg-gray-100 text-gray-500 relative">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full" />
        </button>
        <button className="p-2 rounded-md hover:bg-gray-100 text-gray-500">
          <HelpCircle size={17} />
        </button>
      </div>
    </header>
  );
}
