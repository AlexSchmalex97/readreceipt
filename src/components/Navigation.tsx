import { Link, useLocation } from "react-router-dom";
import AuthButtons from "@/components/AuthButtons";

export function Navigation() {
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-card shadow-soft border-b border-border">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Title + Nav */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/readreceipt-logo.png"
              alt="ReadReceipt logo"
              className="w-14 h-14"
            />
            <div>
              <h1 className="text-2xl font-bold text-primary">ReadReceipt</h1>
              <p className="text-sm text-muted-foreground">
                Track your reading progress and stay motivated
              </p>
            </div>

            <nav className="hidden sm:flex gap-6 ml-8">
              <Link
                to="/"
                className={`text-sm ${
                  isActive("/")
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Home
              </Link>
              <Link
                to="/people"
                className={`text-sm ${
                  isActive("/people")
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                People
              </Link>
              <Link
                to="/feed"
                className={`text-sm ${
                  isActive("/feed")
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Feed
              </Link>
              <Link
                to="/reviews"
                className={`text-sm ${
                  isActive("/reviews")
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Reviews
              </Link>
              <Link
                to="/profile"
                className={`text-sm ${
                  isActive("/profile")
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Profile
              </Link>
            </nav>
          </div>

          {/* Right: Auth */}
          <AuthButtons />
        </div>

        {/* Mobile nav */}
        <nav className="sm:hidden mt-4 flex gap-6">
          <Link
            to="/"
            className={`text-sm ${
              isActive("/")
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Home
          </Link>
          <Link
            to="/people"
            className={`text-sm ${
              isActive("/people")
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            People
          </Link>
          <Link
            to="/feed"
            className={`text-sm ${
              isActive("/feed")
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Feed
          </Link>
          <Link
            to="/reviews"
            className={`text-sm ${
              isActive("/reviews")
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Reviews
          </Link>
          <Link
            to="/profile"
            className={`text-sm ${
              isActive("/profile")
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}