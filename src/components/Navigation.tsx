import { Link, useLocation } from "react-router-dom";
import AuthButtons from "@/components/AuthButtons";
import { HeaderDisplay } from "@/components/HeaderDisplay";

export function Navigation() {
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname === path;

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