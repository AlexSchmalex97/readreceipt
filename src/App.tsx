import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { usePlatform } from "@/hooks/usePlatform";
import { useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { IOSProtectedRoute } from "@/components/IOSProtectedRoute";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Feed from "./pages/EnhancedFeed";
import People from "./pages/People";
import Reviews from "./pages/Reviews";
import Profile from "./pages/Profile";
import ProfileSettings from "./pages/ProfileSettings";
import Settings from "./pages/Settings";
import CompletedBooks from "./pages/CompletedBooks";
import UserProfile from "./pages/UserProfile";
import Contact from "./pages/Contact";
import Integrations from "./pages/Integrations";
import Auth from "./pages/Auth";
import TBR from "./pages/TBR";
import More from "./pages/More";
import Notifications from "./pages/Notifications";
import GlobalUserColors from "@/components/GlobalUserColors";

const queryClient = new QueryClient();

const App = () => {
  const { isIOS, isNative, isReadReceiptApp } = usePlatform();

  useEffect(() => {
    // Add iOS-specific class to body for bottom tab bar spacing
    const body = document.body;
    const isIOSWebView = typeof window !== 'undefined' && (window as any).webkit && (window as any).webkit.messageHandlers;
    const isStandalonePWA = typeof window !== 'undefined' && (("standalone" in navigator && (navigator as any).standalone) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));

    if (isIOS) {
      body.classList.add('ios-app');
    } else {
      body.classList.remove('ios-app');
    }

    // Mark native/webview app or standalone PWA on iOS to hide web header entirely
    if (isNative || isReadReceiptApp || isIOSWebView || isStandalonePWA) {
      body.classList.add('ios-native-app');
    } else {
      body.classList.remove('ios-native-app');
    }
  }, [isIOS, isNative, isReadReceiptApp]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalUserColors>
            <Routes>
            <Route path="/" element={<ProtectedRoute><IOSProtectedRoute><Index /></IOSProtectedRoute></ProtectedRoute>} />
            <Route path="/home" element={<ProtectedRoute><IOSProtectedRoute><Index /></IOSProtectedRoute></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/contact" element={<IOSProtectedRoute><Contact /></IOSProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><IOSProtectedRoute><Feed /></IOSProtectedRoute></ProtectedRoute>} />
            <Route path="/people" element={<ProtectedRoute><IOSProtectedRoute><People /></IOSProtectedRoute></ProtectedRoute>} />
            <Route path="/reviews" element={<ProtectedRoute><IOSProtectedRoute><Reviews /></IOSProtectedRoute></ProtectedRoute>} />
            <Route path="/profile" element={<IOSProtectedRoute><Profile /></IOSProtectedRoute>} />
            <Route path="/settings" element={<IOSProtectedRoute><Settings /></IOSProtectedRoute>} />
            <Route path="/tbr" element={<IOSProtectedRoute><TBR /></IOSProtectedRoute>} />
            <Route path="/more" element={<IOSProtectedRoute><More /></IOSProtectedRoute>} />
            <Route path="/profile/settings" element={<ProtectedRoute><IOSProtectedRoute><ProfileSettings /></IOSProtectedRoute></ProtectedRoute>} />
            <Route path="/completed" element={<ProtectedRoute><IOSProtectedRoute><CompletedBooks /></IOSProtectedRoute></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute><IOSProtectedRoute><Integrations /></IOSProtectedRoute></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><IOSProtectedRoute><Notifications /></IOSProtectedRoute></ProtectedRoute>} />
            <Route path="/:username" element={<IOSProtectedRoute><UserProfile /></IOSProtectedRoute>} />
            <Route path="*" element={<IOSProtectedRoute><NotFound /></IOSProtectedRoute>} />
          </Routes>

          <Analytics />
          </GlobalUserColors>
        </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
