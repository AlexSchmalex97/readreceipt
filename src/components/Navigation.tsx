import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthButtons from "@/components/AuthButtons";
import { HeaderDisplay } from "@/components/HeaderDisplay";
import { usePlatform } from "@/hooks/usePlatform";
import { Home, Rss, User, Mail, BookOpen, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";

export function Navigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isIOS, isNative, isReadReceiptApp, isWeb } = usePlatform();
  const isIOSWebView = typeof window !== 'undefined' && !!(window as any).webkit && !!(window as any).webkit.messageHandlers;
  const isStandalonePWA = typeof window !== 'undefined' && (("standalone" in navigator && (navigator as any).standalone) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
  const [headerOpacity, setHeaderOpacity] = useState(1);

  const isActive = (path: string) => pathname === path;
  const isHomePage = pathname === "/";

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/feed", label: "Feed", icon: Rss },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/tbr", label: "TBR", icon: BookOpen },
    { path: "/more", label: "More", icon: MoreHorizontal },
  ];

  // Scroll detection for header fade effect (only on home page)
  useEffect(() => {
    if (!isHomePage || !isWeb) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const fadeStart = 0;
      const fadeEnd = 150;
      
      if (scrollY <= fadeStart) {
        setHeaderOpacity(1);
      } else if (scrollY >= fadeEnd) {
        setHeaderOpacity(0);
      } else {
        const opacity = 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart);
        setHeaderOpacity(opacity);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage, isWeb]);

  // ReadReceipt iOS App: No header, only bottom tab bar
  if (isReadReceiptApp || isNative || isIOS || isIOSWebView || isStandalonePWA || (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (window as any)?.Capacitor)) {
    return (
      <nav data-mobile-tabbar className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe-bottom z-50">




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


  // Web: Original navigation layout - but ONLY if truly web (not iOS, not native, not WKWebView, not PWA)
  if (isWeb && !isIOS && !isNative && !isReadReceiptApp && !isIOSWebView && !isStandalonePWA && !(typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (window as any)?.Capacitor)) {
    return (
      <header 
        className="bg-card shadow-soft border-b border-border transition-opacity duration-300"
        style={{ 
          opacity: isHomePage ? headerOpacity : 1,
          pointerEvents: isHomePage && headerOpacity < 0.1 ? 'none' : 'auto'
        }}
      >
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* First Row: Logo + Title + Auth */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/assets/readreceipt-logo.png"
              alt="ReadReceipt logo"
              className="h-14 sm:h-16"
            />
          </Link>
          
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

  // Non-web environments: no top header
  return null;
}