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

const queryClient = new QueryClient();

const App = () => {
  const { isIOS } = usePlatform();

  useEffect(() => {
    // Add iOS-specific class to body for bottom tab bar spacing
    if (isIOS) {
      document.body.classList.add('ios-app');
    } else {
      document.body.classList.remove('ios-app');
    }
  }, [isIOS]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<ProtectedRoute><IOSProtectedRoute><Index /></IOSProtectedRoute></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><IOSProtectedRoute><Index /></IOSProtectedRoute></ProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/contact" element={<IOSProtectedRoute><Contact /></IOSProtectedRoute>} />
          <Route path="/user/:userId" element={<IOSProtectedRoute><UserProfile /></IOSProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><IOSProtectedRoute><Feed /></IOSProtectedRoute></ProtectedRoute>} />
          <Route path="/people" element={<ProtectedRoute><IOSProtectedRoute><People /></IOSProtectedRoute></ProtectedRoute>} />
          <Route path="/reviews" element={<ProtectedRoute><IOSProtectedRoute><Reviews /></IOSProtectedRoute></ProtectedRoute>} />
          <Route path="/profile" element={<IOSProtectedRoute><Profile /></IOSProtectedRoute>} />
          <Route path="/settings" element={<IOSProtectedRoute><Settings /></IOSProtectedRoute>} />
          <Route path="/tbr" element={<IOSProtectedRoute><TBR /></IOSProtectedRoute>} />
          <Route path="/profile/settings" element={<ProtectedRoute><IOSProtectedRoute><ProfileSettings /></IOSProtectedRoute></ProtectedRoute>} />
          <Route path="/completed" element={<ProtectedRoute><IOSProtectedRoute><CompletedBooks /></IOSProtectedRoute></ProtectedRoute>} />
          <Route path="/integrations" element={<ProtectedRoute><IOSProtectedRoute><Integrations /></IOSProtectedRoute></ProtectedRoute>} />
          <Route path="*" element={<IOSProtectedRoute><NotFound /></IOSProtectedRoute>} />
        </Routes>
      </BrowserRouter>

      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
