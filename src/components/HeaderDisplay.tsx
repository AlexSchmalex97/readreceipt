import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QuotesDisplay } from './QuotesDisplay';
import { TimeWeatherIcons } from './TimeWeatherIcons';

type DisplayPreference = 'quotes' | 'time_weather' | 'both';

export function HeaderDisplay() {
  const [displayPreference, setDisplayPreference] = useState<DisplayPreference>('quotes');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserPreference = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Get user's display preference
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('display_preference')
          .eq('id', user.id)
          .single();

        if (!error && profile) {
          setDisplayPreference((profile.display_preference as DisplayPreference) || 'quotes');
        }
      } catch (error) {
        console.error('Error loading user preference:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserPreference();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserPreference();
    });

    // Listen for preference updates
    const handlePreferenceUpdate = () => {
      loadUserPreference();
    };

    window.addEventListener('display-preference-updated', handlePreferenceUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('display-preference-updated', handlePreferenceUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="w-5 h-5 bg-muted animate-pulse rounded"></div>
        <div className="w-32 h-4 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  // Show quotes by default for non-logged-in users
  if (!userId) {
    return <QuotesDisplay />;
  }

  // Render based on user preference
  if (displayPreference === 'quotes') {
    return <QuotesDisplay />;
  } else if (displayPreference === 'time_weather') {
    return <TimeWeatherIcons />;
  } else if (displayPreference === 'both') {
    return (
      <div className="flex flex-col sm:flex-row items-start gap-3 w-full">
        <div className="flex-shrink-0 w-full sm:w-auto">
          <TimeWeatherIcons />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <QuotesDisplay compact={true} />
        </div>
      </div>
    );
  }
  
  return <QuotesDisplay />;
}