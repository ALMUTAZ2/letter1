import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import LetterList from "./components/LetterList";
import Reports from "./components/Reports";
import WhatsAppSettings from "./components/WhatsAppSettings";
import { User } from "./types";
import { UserCircle, Bell, Search, Menu, X } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data));

    // Active polling block for Cloud Run scheduler ticks
    const interval = setInterval(() => {
      fetch("/api/scheduler-tick", { method: "POST" })
        .then((res) => res.json())
        .catch((e) => console.log("Tick ping error", e));
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const switchRole = () => {
    const newRole = user?.role === "manager" ? "staff" : "manager";
    const newEmail = newRole === "manager" ? "manager@example.com" : "staff@example.com";
    
    fetch("/api/auth/me", {
      headers: { "x-user-email": newEmail }
    })
      .then((res) => res.json())
      .then((data) => setUser(data));
  };

  if (!user) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={user.role} 
      />

      <main className="mr-64 p-8 transition-all duration-300">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
              <UserCircle size={24} className="text-slate-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">أهلاً بك، {user.name}</h1>
              <p className="text-xs text-slate-400">لديك صلاحيات {user.role === "manager" ? "المدير" : "الموظف"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={switchRole}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              تبديل الصلاحية (للتجربة)
            </button>
            <button className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-emerald-600 transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "letters" && <LetterList userRole={user.role} />}
            {activeTab === "reports" && user.role === "manager" && <Reports />}
            {activeTab === "whatsapp" && <WhatsAppSettings />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
