import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthButtons from "@/components/AuthButtons";
import { HeaderDisplay } from "@/components/HeaderDisplay";
import { usePlatform } from "@/hooks/usePlatform";
import { useUserAccent } from "@/hooks/useUserAccent";
import { Home, Rss, User, Mail, BookOpen, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";

export function Navigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isIOS, isNative, isReadReceiptApp, isWeb } = usePlatform();
  const isIOSWebView = typeof window !== 'undefined' && !!(window as any).webkit && !!(window as any).webkit.messageHandlers;
  const isStandalonePWA = typeof window !== 'undefined' && (("standalone" in navigator && (navigator as any).standalone) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
  const [headerOpacity, setHeaderOpacity] = useState(1);
  const { accentTextColor } = useUserAccent();

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

  // Check if running in ReadReceipt iOS native app
  const isNativeIOSApp = typeof window !== 'undefined' && (window as any).__RR_NATIVE_IOS_APP;
  
  // ReadReceipt iOS App: No header, only bottom tab bar
  if (isNativeIOSApp || isReadReceiptApp || isNative || isIOS || isIOSWebView || isStandalonePWA || (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (window as any)?.Capacitor)) {
    return (
      <nav 
        data-mobile-tabbar 
        className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border z-50"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
          borderTopColor: accentTextColor || 'hsl(var(--border))',
        }}
      >
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all"
                style={{
                  color: accentTextColor || "hsl(var(--foreground))",
                  fontWeight: active ? 600 : 500,
                  opacity: active ? 1 : 0.65,
                }}
              >
                <Icon className={active ? "w-6 h-6" : "w-5 h-5"} strokeWidth={active ? 2.5 : 2} />
                <span className="text-xs">{item.label}</span>
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
        className="bg-card shadow-md border-b"
        style={{ 
          borderColor: 'hsl(var(--border))'
        }}
      >
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        {/* First Row: Logo + Title + Auth */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/assets/readreceipt-logo-tight.png?v=2"
              alt="ReadReceipt logo wordmark"
              className="block h-12 sm:h-14 md:h-16"
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
              className={`text-sm whitespace-nowrap transition-opacity ${
                isActive("/")
                  ? "font-medium underline underline-offset-4"
                  : "opacity-80 hover:opacity-100"
              }`}
              style={{ color: accentTextColor || "hsl(var(--foreground))" }}
            >
              Home
            </Link>
            <Link
              to="/people"
              className={`text-sm whitespace-nowrap transition-opacity ${
                isActive("/people")
                  ? "font-medium underline underline-offset-4"
                  : "opacity-80 hover:opacity-100"
              }`}
              style={{ color: accentTextColor || "hsl(var(--foreground))" }}
            >
              People
            </Link>
            <Link
              to="/feed"
              className={`text-sm whitespace-nowrap transition-opacity ${
                isActive("/feed")
                  ? "font-medium underline underline-offset-4"
                  : "opacity-80 hover:opacity-100"
              }`}
              style={{ color: accentTextColor || "hsl(var(--foreground))" }}
            >
              Feed
            </Link>
            <Link
              to="/reviews"
              className={`text-sm whitespace-nowrap transition-opacity ${
                isActive("/reviews")
                  ? "font-medium underline underline-offset-4"
                  : "opacity-80 hover:opacity-100"
              }`}
              style={{ color: accentTextColor || "hsl(var(--foreground))" }}
            >
              Reviews
            </Link>
            <Link
              to="/profile"
              className={`text-sm whitespace-nowrap transition-opacity ${
                isActive("/profile")
                  ? "font-medium underline underline-offset-4"
                  : "opacity-80 hover:opacity-100"
              }`}
              style={{ color: accentTextColor || "hsl(var(--foreground))" }}
            >
              Profile
            </Link>
            <Link
              to="/contact"
              className={`text-sm whitespace-nowrap transition-opacity ${
                isActive("/contact")
                  ? "font-medium underline underline-offset-4"
                  : "opacity-80 hover:opacity-100"
              }`}
              style={{ color: accentTextColor || "hsl(var(--foreground))" }}
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