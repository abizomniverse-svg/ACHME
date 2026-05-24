import { useLocation, useNavigate } from "react-router-dom";
import { Home, Phone, ShoppingCart, ListTodo, Grid3X3 } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Phone, label: "Leads", path: "/dashboard/telecalling" },
  { icon: ShoppingCart, label: "Sales", path: "/dashboard/proposal" },
  { icon: ListTodo, label: "Tasks", path: "/dashboard/task" },
  { icon: Grid3X3, label: "More", path: null, isMenu: true },
];

export default function MobileBottomNav({ onMenuOpen }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-hairline shadow-level-2 safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.isMenu) {
                  onMenuOpen?.();
                } else {
                  navigate(item.path);
                }
              }}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-90 min-w-0 flex-1
                ${active ? "text-primary" : "text-muted"}`}
            >
              <div className={`p-1 rounded-lg ${active ? "bg-primary/10" : ""}`}>
                <Icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
              </div>
              <span className={`text-[10px] font-semibold leading-none ${active ? "text-primary" : "text-muted"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
