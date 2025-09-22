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
  const [weather, setWeather] = useState<WeatherData>(null);
  const [loading, setLoading] = useState(true);

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
    // Determine time of day
    const updateTimeIcon = () => {
      const hour = new Date().getHours();
      // Consider 6 AM - 6 PM as day time
      setTimeIcon(hour >= 6 && hour < 18 ? 'sun' : 'moon');
    };

    updateTimeIcon();
    // Update every hour
    const timeInterval = setInterval(updateTimeIcon, 60 * 60 * 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    // Get user's location and fetch weather
    const fetchWeather = async () => {
      try {
        if (!navigator.geolocation) {
          console.log('Geolocation not supported');
          setLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              
              const { data, error } = await supabase.functions.invoke('get-weather', {
                body: { latitude, longitude }
              });

              if (error) {
                console.error('Weather function error:', error);
              } else {
                setWeather(data);
              }
            } catch (err) {
              console.error('Error fetching weather:', err);
            } finally {
              setLoading(false);
            }
          },
          (error) => {
            console.log('Geolocation error:', error.message);
            setLoading(false);
          },
          { timeout: 10000 }
        );
      } catch (error) {
        console.error('Error getting location:', error);
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* Time Icon */}
      <div 
        className="flex items-center gap-1" 
        title={timeIcon === 'sun' ? 'Good day!' : 'Good evening!'}
      >
        {timeIcon === 'sun' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-blue-300" />
        )}
      </div>

      {/* Weather Icon */}
      <div className="flex items-center gap-1">
        {loading ? (
          <Wind className="w-5 h-5 text-gray-400 animate-spin" />
        ) : weather ? (
          <div 
            className="flex items-center gap-1" 
            title={`${weather.temperature}°C in ${weather.city}, ${weather.country} - ${weather.description}`}
          >
            {getWeatherIcon(weather.condition)}
            <span className="text-xs text-muted-foreground font-medium">
              {weather.temperature}°
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1" title="Weather unavailable">
            <Cloud className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}