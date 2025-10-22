import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const usePlatform = () => {
  const [platform, setPlatform] = useState<{
    isIOS: boolean;
    isAndroid: boolean;
    isWeb: boolean;
    isNative: boolean;
    isReadReceiptApp: boolean;
  }>({
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    isNative: false,
    isReadReceiptApp: false,
  });

  useEffect(() => {
    const platformName = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();

    // Detect iOS WKWebView (non-Capacitor) opened inside an iOS app
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOSUA = /iPhone|iPad|iPod/i.test(ua);
    const isWKWebView = typeof window !== 'undefined' && !!(window as any).webkit && !!(window as any).webkit.messageHandlers;
    const isIosAppWebView = isIOSUA && isWKWebView;
    
    // Detect custom ReadReceipt iOS app user agent
    const isReadReceiptApp = ua.includes('ReadReceiptApp iOS');

    const computed = {
      isIOS: platformName === 'ios' || (isNative && isIOSUA) || isIosAppWebView,
      isAndroid: platformName === 'android',
      isWeb: platformName === 'web' && !isIosAppWebView && !isReadReceiptApp,
      isNative: isNative || isIosAppWebView,
      isReadReceiptApp,
    };

    // Debug log to diagnose iOS header rendering in native app
    try {
      console.log('[usePlatform]', {
        ua,
        platformName,
        capIsNative: isNative,
        isIOSUA,
        isWKWebView,
        isIosAppWebView,
        ...computed,
      });
    } catch {}
    
    setPlatform(computed);
  }, []);

  return platform;
};
