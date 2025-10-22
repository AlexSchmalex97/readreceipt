import { useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/hooks/usePlatform";
import { useSwipeBack } from "@/hooks/useSwipeBack";

interface IOSProtectedRouteProps {
  children: ReactNode;
}

export const IOSProtectedRoute = ({ children }: IOSProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isIOS, isReadReceiptApp } = usePlatform();

  // Enable swipe-back gesture on iOS
  useSwipeBack(isIOS || isReadReceiptApp);

  // Allow /contact without authentication
  const isPublicRoute = location.pathname === "/contact";

  useEffect(() => {
    // Allow public routes without authentication
    if (isPublicRoute) {
      setLoading(false);
      setIsAuthenticated(true);
      return;
    }

    // Only enforce authentication on iOS
    if (!isIOS && !isReadReceiptApp) {
      setLoading(false);
      setIsAuthenticated(true);
      return;
    }

    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isIOS, isReadReceiptApp, isPublicRoute]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated && (isIOS || isReadReceiptApp)) {
    return null;
  }

  return <>{children}</>;
};
