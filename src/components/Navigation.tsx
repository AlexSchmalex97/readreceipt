import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthButtons from "@/components/AuthButtons";
import { HeaderDisplay } from "@/components/HeaderDisplay";
import { usePlatform } from "@/hooks/usePlatform";
import { Home, Users, Rss, Star, User, Mail } from "lucide-react";

export function Navigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isIOS, isReadReceiptApp } = usePlatform();

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/people", label: "People", icon: Users },
    { path: "/feed", label: "Feed", icon: Rss },
    { path: "/reviews", label: "Reviews", icon: Star },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/contact", label: "Contact", icon: Mail },
  ];

  // ReadReceipt iOS App: No header, only bottom tab bar
  if (isReadReceiptApp) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe-bottom z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // iOS: Bottom tab bar navigation with simplified header
  if (isIOS) {
    return (
      <>
        {/* Top header - simplified for iOS */}
        <header className="bg-card shadow-soft border-b border-border pb-safe-top">
          <div className="container mx-auto px-3 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/readreceipt-logo.png"
                  alt="ReadReceipt logo"
                  className="w-10 h-10"
                />
                <h1 className="text-xl font-bold text-primary">ReadReceipt</h1>
              </div>
              <AuthButtons />
            </div>
          </div>
        </header>

        {/* Bottom tab bar navigation for iOS */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe-bottom z-50">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  // Web: Original navigation layout
  return (
    <header className="bg-card shadow-soft border-b border-border">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* First Row: Logo + Title + Auth */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/readreceipt-logo.png"
              alt="ReadReceipt logo"
              className="w-10 h-10 sm:w-14 sm:h-14"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-primary">ReadReceipt</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Track your reading progress and stay motivated
              </p>
            </div>
          </div>
          
          <AuthButtons />
        </div>

        {/* Second Row: Navigation + Dynamic Display */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Navigation */}
          <nav className="flex gap-4 sm:gap-6">
            <Link
              to="/"
              className={`text-sm whitespace-nowrap ${
                isActive("/")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Home
            </Link>
            <Link
              to="/people"
              className={`text-sm whitespace-nowrap ${
                isActive("/people")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              People
            </Link>
            <Link
              to="/feed"
              className={`text-sm whitespace-nowrap ${
                isActive("/feed")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Feed
            </Link>
            <Link
              to="/reviews"
              className={`text-sm whitespace-nowrap ${
                isActive("/reviews")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reviews
            </Link>
            <Link
              to="/profile"
              className={`text-sm whitespace-nowrap ${
                isActive("/profile")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Profile
            </Link>
            <Link
              to="/contact"
              className={`text-sm whitespace-nowrap ${
                isActive("/contact")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* Dynamic Display (Quotes or Time/Weather) */}
          <div className="mt-3 lg:mt-0">
            <HeaderDisplay />
          </div>
        </div>
      </div>
    </header>
  );
}