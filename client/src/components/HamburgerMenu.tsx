import { useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { Menu, X, Home, History, Settings, Info, LogOut, Heart, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/history", label: "History", icon: History },
    { path: "/activities", label: "Activities", icon: History },
    { path: "/activity-manager", label: "Activity Manager", icon: Tag },
    { path: "/niharika", label: "Niharika", icon: Heart },
    { path: "/analysis", label: "Analysis", icon: Info },
    { path: "/settings", label: "Settings", icon: Settings },
    { path: "/about", label: "About", icon: Info },
  ];

  const closeMenu = () => setIsOpen(false);

  const menuContent = (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenu}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-2xl z-[101] flex flex-col"
          >
            {/* Menu Header */}
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold">Menu</h2>
              <p className="text-sm text-muted-foreground mt-1">Navigate the app</p>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;

                  return (
                    <li key={item.path}>
                      <Link href={item.path}>
                        <a
                          onClick={closeMenu}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "hover:bg-secondary text-foreground"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </a>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Menu Footer */}
            <div className="p-6 border-t border-border space-y-3">
              {user && (
                <div className="flex items-center gap-3 mb-3">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  closeMenu();
                  logout();
                }}
                className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
              <p className="text-xs text-muted-foreground text-center">
                FocusLoop Timer v1.0
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-secondary rounded-lg transition-colors relative"
        aria-label="Menu"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Render overlay and menu at document root using Portal */}
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
}
