import { Link, useLocation } from "react-router-dom";
import AuthButtons from "@/components/AuthButtons";
import { HeaderDisplay } from "@/components/HeaderDisplay";

export function Navigation() {
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-card shadow-soft border-b border-border">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-0">
          {/* Left: Logo + Title + Nav */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
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

            <nav className="flex gap-4 sm:gap-6 mt-2 sm:mt-0 sm:ml-8 w-full sm:w-auto overflow-x-auto">
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
            </nav>
          </div>

          {/* Center: Dynamic Display (Quotes or Time/Weather) - Hidden on small screens */}
          <div className="hidden lg:block">
            <HeaderDisplay />
          </div>

          {/* Right: Auth */}
          <AuthButtons />
        </div>
        
        {/* Mobile-only quotes/time display */}
        <div className="lg:hidden mt-3 pt-3 border-t border-border">
          <HeaderDisplay />
        </div>
      </div>
    </header>
  );
}