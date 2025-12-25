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
  const { accentTextColor, accentCardColor } = useUserAccent();

  const tabBarBg = accentCardColor || 'hsl(var(--card))';
  const tabBarText = accentTextColor || 'hsl(var(--foreground))';

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
    if (!isHomePage) return;

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
  }, [isHomePage]);

  // Check if running in ReadReceipt iOS native app
  const isNativeIOSApp = typeof window !== 'undefined' && (window as any).__RR_NATIVE_IOS_APP;
  const isMobileOrNative = isNativeIOSApp || isReadReceiptApp || isNative || isIOS || isIOSWebView || isStandalonePWA || (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (window as any)?.Capacitor);
  
  // Mobile/Tablet: iOS-style layout with header image + bottom tab bar
  // Desktop: Original layout with logo, auth buttons, and text navigation
  return (
    <>
      {/* Mobile/Tablet Header with centered logo - hidden on desktop (lg+) */}
      <header 
        className="lg:hidden bg-card border-b border-border transition-opacity duration-300 px-4 py-3"
        style={{ 
          opacity: isHomePage ? headerOpacity : 1,
          pointerEvents: (isHomePage && headerOpacity < 0.1) ? 'none' : 'auto'
        }}
      >
        <div className="flex items-center justify-center">
          <Link to="/">
            <img
              src="/assets/readreceipt-header-ios.png"
              alt="ReadReceipt"
              className="h-12"
            />
          </Link>
        </div>
      </header>

      {/* Desktop Header - hidden on mobile/tablet */}
      <header 
        className="hidden lg:block bg-card shadow-md border-b"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          {/* First Row: Logo + Auth */}
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
            <nav className="flex gap-4 sm:gap-6">
              <Link
                to="/"
                className={`text-sm whitespace-nowrap transition-opacity text-foreground ${
                  isActive("/") ? "font-medium underline underline-offset-4" : "opacity-80 hover:opacity-100"
                }`}
              >
                Home
              </Link>
              <Link
                to="/people"
                className={`text-sm whitespace-nowrap transition-opacity text-foreground ${
                  isActive("/people") ? "font-medium underline underline-offset-4" : "opacity-80 hover:opacity-100"
                }`}
              >
                People
              </Link>
              <Link
                to="/feed"
                className={`text-sm whitespace-nowrap transition-opacity text-foreground ${
                  isActive("/feed") ? "font-medium underline underline-offset-4" : "opacity-80 hover:opacity-100"
                }`}
              >
                Feed
              </Link>
              <Link
                to="/reviews"
                className={`text-sm whitespace-nowrap transition-opacity text-foreground ${
                  isActive("/reviews") ? "font-medium underline underline-offset-4" : "opacity-80 hover:opacity-100"
                }`}
              >
                Reviews
              </Link>
              <Link
                to="/profile"
                className={`text-sm whitespace-nowrap transition-opacity text-foreground ${
                  isActive("/profile") ? "font-medium underline underline-offset-4" : "opacity-80 hover:opacity-100"
                }`}
              >
                Profile
              </Link>
              <Link
                to="/contact"
                className={`text-sm whitespace-nowrap transition-opacity text-foreground ${
                  isActive("/contact") ? "font-medium underline underline-offset-4" : "opacity-80 hover:opacity-100"
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

      {/* Bottom Tab Bar Navigation - only on mobile/tablet, hidden on desktop */}
      <nav 
        data-mobile-tabbar 
        className="lg:hidden fixed bottom-0 left-0 right-0 border-t-2 z-50 backdrop-blur-xl shadow-lg"
        style={{
          paddingBottom: isMobileOrNative ? 'calc(env(safe-area-inset-bottom, 0px) + 8px)' : '8px',
          backgroundColor: tabBarBg,
          borderTopColor: tabBarText,
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
                  color: tabBarText,
                  fontWeight: active ? 650 : 550,
                  opacity: active ? 1 : 0.85,
                }}
              >
                <Icon className={active ? "w-6 h-6" : "w-5 h-5"} strokeWidth={active ? 2.5 : 2} />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
