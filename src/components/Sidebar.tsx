import { LayoutDashboard, Mail, BarChart3, Settings, LogOut, PlusCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: string;
}

export default function Sidebar({ activeTab, setActiveTab, userRole }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { id: "letters", label: "الخطابات", icon: Mail },
    { id: "reports", label: "التقارير", icon: BarChart3, managerOnly: true },
    { id: "whatsapp", label: "إعدادات الواتساب", icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed right-0 top-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-emerald-400">منصة تتبع الخطابات</h1>
        <p className="text-xs text-slate-400 mt-1">نظام المتابعة الإدارية</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          if (item.managerOnly && userRole !== "manager") return null;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                activeTab === item.id
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
            {userRole === "manager" ? "مدير" : "موظف"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">
              {userRole === "manager" ? "المدير العام" : "موظف المتابعة"}
            </p>
            <p className="text-xs truncate opacity-50">
              {userRole === "manager" ? "manager@example.com" : "staff@example.com"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
