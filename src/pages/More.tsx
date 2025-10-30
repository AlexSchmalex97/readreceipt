import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Users, Mail, Settings, Star, ChevronRight, LogOut, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function More() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  const menuItems = [
    { path: "/people", label: "People", icon: Users, description: "Find and follow readers" },
    { path: "/reviews", label: "Reviews", icon: Star, description: "Read and write reviews" },
    { path: "/notifications", label: "Notifications", icon: Bell, description: "View your notifications" },
    { path: "/contact", label: "Contact", icon: Mail, description: "Get in touch with us" },
    { path: "/settings", label: "Settings", icon: Settings, description: "Manage your preferences" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">More</h1>
        
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full bg-card hover:bg-accent/50 transition-colors rounded-lg p-4 flex items-center gap-4 border border-border"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-foreground">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
          
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full bg-card hover:bg-destructive/10 transition-colors rounded-lg p-4 flex items-center gap-4 border border-border"
          >
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-destructive">Sign Out</h3>
              <p className="text-sm text-muted-foreground">Log out of your account</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
