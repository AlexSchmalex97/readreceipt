import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/hooks/usePlatform";

interface IOSProtectedRouteProps {
  children: ReactNode;
}

export const IOSProtectedRoute = ({ children }: IOSProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { isIOS, isReadReceiptApp } = usePlatform();

  useEffect(() => {
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
  }, [navigate, isIOS, isReadReceiptApp]);

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
