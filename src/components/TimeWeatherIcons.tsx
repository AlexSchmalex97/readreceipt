import { useState, useEffect } from 'react';
import { Sun, Moon, Cloud, CloudRain, CloudSnow, CloudDrizzle, Zap, Wind, Eye, Thermometer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type WeatherData = {
  temperature: number;
  condition: string;
  description: string;
  city: string;
  country: string;
} | null;

export function TimeWeatherIcons() {
  const [timeIcon, setTimeIcon] = useState<'sun' | 'moon'>('sun');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData>(null);
  const [loading, setLoading] = useState(true);
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('celsius');

  // Get weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'clear':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'rain':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'drizzle':
        return <CloudDrizzle className="w-5 h-5 text-blue-400" />;
      case 'snow':
        return <CloudSnow className="w-5 h-5 text-blue-200" />;
      case 'thunderstorm':
        return <Zap className="w-5 h-5 text-purple-500" />;
      case 'mist':
      case 'fog':
      case 'haze':
        return <Eye className="w-5 h-5 text-gray-400" />;
      case 'clouds':
        return <Cloud className="w-5 h-5 text-gray-500" />;
      default:
        return <Thermometer className="w-5 h-5 text-gray-500" />;
    }
  };

  useEffect(() => {
    // Update date/time and time icon
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime(now);
      
      const hour = now.getHours();
      // Consider 6 AM - 6 PM as day time
      setTimeIcon(hour >= 6 && hour < 18 ? 'sun' : 'moon');
    };

    updateDateTime();
    // Update every minute
    const timeInterval = setInterval(updateDateTime, 60 * 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    // Fetch user's temperature unit preference
    const fetchUserPreference = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('temperature_unit')
            .eq('id', user.id)
            .single();
          
          if (profileData?.temperature_unit) {
            setTemperatureUnit(profileData.temperature_unit as 'celsius' | 'fahrenheit');
          }
        }
      } catch (error) {
        console.log('Failed to fetch temperature unit preference');
      }
    };

    fetchUserPreference();
  }, []);

  useEffect(() => {
    // Get user's location and fetch weather (simplified for now)
    const fetchWeather = async () => {
      try {
        if (!navigator.geolocation) {
          setLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            // For now, set a mock weather since the API might not be configured
            setWeather({
              temperature: 22,
              condition: 'clear',
              description: 'clear sky',
              city: 'Your City',
              country: 'Your Country'
            });
            setLoading(false);
          },
          () => {
            setLoading(false);
          },
          { timeout: 5000 }
        );
      } catch (error) {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  // Convert temperature between units
  const convertTemperature = (temp: number, unit: 'celsius' | 'fahrenheit') => {
    if (unit === 'fahrenheit') {
      return Math.round((temp * 9/5) + 32);
    }
    return temp;
  };

  // Format date and time
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2">
      {/* Time Icon with Date/Time */}
      <div 
        className="flex items-center gap-2" 
        title={timeIcon === 'sun' ? 'Good day!' : 'Good evening!'}
      >
        {timeIcon === 'sun' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-blue-300" />
        )}
        <div className="text-xs sm:text-sm text-[hsl(30,15%,40%)] dark:text-[hsl(35,18%,70%)] text-center sm:text-left">
          <div className="font-medium text-[hsl(30,25%,20%)] dark:text-[hsl(35,30%,92%)]">{formatDate(currentDateTime)}</div>
          <div className="text-xs">{formatTime(currentDateTime)}</div>
        </div>
      </div>

      {/* Weather Icon with Conditions */}
      <div className="flex items-center gap-2">
        {loading ? (
          <>
            <Wind className="w-5 h-5 text-gray-400 animate-spin" />
            <span className="text-xs sm:text-sm text-[hsl(30,15%,40%)] dark:text-[hsl(35,18%,70%)]">Loading...</span>
          </>
        ) : weather ? (
          <div 
            className="flex items-center gap-2" 
            title={`${convertTemperature(weather.temperature, temperatureUnit)}°${temperatureUnit === 'celsius' ? 'C' : 'F'} in ${weather.city}, ${weather.country} - ${weather.description}`}
          >
            {getWeatherIcon(weather.condition)}
            <div className="text-xs sm:text-sm text-[hsl(30,15%,40%)] dark:text-[hsl(35,18%,70%)] text-center sm:text-left">
              <div className="font-medium text-[hsl(30,25%,20%)] dark:text-[hsl(35,30%,92%)]">
                {convertTemperature(weather.temperature, temperatureUnit)}°{temperatureUnit === 'celsius' ? 'C' : 'F'}
              </div>
              <div className="text-xs capitalize">{weather.description}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2" title="Weather unavailable">
            <Cloud className="w-5 h-5 text-gray-400" />
            <span className="text-xs sm:text-sm text-[hsl(30,15%,40%)] dark:text-[hsl(35,18%,70%)]">Weather unavailable</span>
          </div>
        )}
      </div>
    </div>
  );
}