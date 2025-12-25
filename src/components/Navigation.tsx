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
  const isMobileOrNative = isNativeIOSApp || isReadReceiptApp || isNative || isIOS || isIOSWebView || isStandalonePWA || (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (window as any)?.Capacitor);
  
  // Unified layout: Header + Bottom Tab Bar (matches iOS app)
  return (
    <>
      {/* Top Header with Logo - for both web and iOS */}
      <header 
        className="bg-card border-b border-border transition-opacity duration-300 px-4 py-3"
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

      {/* Bottom Tab Bar Navigation - matches iOS app */}
      <nav 
        data-mobile-tabbar 
        className="fixed bottom-0 left-0 right-0 border-t-2 z-50 backdrop-blur-xl shadow-lg"
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