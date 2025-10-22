import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { usePlatform } from "@/hooks/usePlatform";
import { useEffect } from "react";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Feed from "./pages/EnhancedFeed";
import People from "./pages/People";
import Reviews from "./pages/Reviews";
import Profile from "./pages/Profile";
import ProfileSettings from "./pages/ProfileSettings";
import CompletedBooks from "./pages/CompletedBooks";
import UserProfile from "./pages/UserProfile";
import Contact from "./pages/Contact";
import Integrations from "./pages/Integrations";

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
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Index />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/people" element={<People />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/settings" element={<ProfileSettings />} />
          <Route path="/completed" element={<CompletedBooks />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>

      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
