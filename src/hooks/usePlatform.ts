import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const usePlatform = () => {
  const [platform, setPlatform] = useState<{
    isIOS: boolean;
    isAndroid: boolean;
    isWeb: boolean;
    isNative: boolean;
  }>({
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    isNative: false,
  });

  useEffect(() => {
    const platformName = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    
    setPlatform({
      isIOS: platformName === 'ios',
      isAndroid: platformName === 'android',
      isWeb: platformName === 'web',
      isNative,
    });
  }, []);

  return platform;
};
