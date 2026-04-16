import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Coins,
  CheckCircle,
  TrendingUp,
  Scale,
  CalendarCheck,
  BookOpen,
  FileText,
  Receipt,
  RefreshCcw,
  BarChart2,
  Bot,
  Users,
  Plug,
  Settings,
  LogOut,
  Wallet,
  ShoppingCart,
} from "lucide-react";

const navGroups = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Spend",
    items: [
      { label: "Transactions", path: "/transactions", icon: Wallet },
      { label: "Cards", path: "/cards", icon: CreditCard },
      { label: "Expenses", path: "/expenses", icon: ShoppingCart },
      { label: "Approvals", path: "/approvals", icon: CheckCircle, badge: 4 },
    ],
  },
  {
    label: "Books",
    items: [
      { label: "P&L", path: "/books", icon: TrendingUp },
      { label: "Balance Sheet", path: "/balance-sheet", icon: Scale },
      { label: "Month-End Close", path: "/month-end-close", icon: CalendarCheck },
      { label: "Chart of Accounts", path: "/chart-of-accounts", icon: BookOpen },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Invoicing", path: "/invoicing", icon: FileText },
      { label: "Bills", path: "/bills", icon: Receipt, badge: 7 },
      { label: "Reimbursements", path: "/reimbursements", icon: RefreshCcw },
      { label: "Revenue", path: "/revenue", icon: Coins },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Analytics", path: "/analytics", icon: BarChart2 },
      { label: "AI Copilot", path: "/copilot", icon: Bot },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "People & Teams", path: "/people", icon: Users },
      { label: "Integrations", path: "/integrations", icon: Plug },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname === path;

  return (
    <div className="w-60 min-w-[240px] h-screen bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-5 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg leading-none">L</span>
        </div>
        <span className="text-gray-900 font-bold text-lg tracking-tight">Ledge</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium mb-0.5 transition-all relative group
                    ${active
                      ? "bg-green-50 text-green-600 border-l-[3px] border-green-500 pl-[9px]"
                      : "text-gray-600 hover:bg-green-50 hover:text-green-600 border-l-[3px] border-transparent"
                    }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-gray-50 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">AO</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Abena Owusu</p>
            <p className="text-xs text-gray-500 truncate">Finance Lead</p>
          </div>
          <LogOut size={15} className="text-gray-400 group-hover:text-gray-600 shrink-0" />
        </div>
      </div>
    </div>
  );
}
