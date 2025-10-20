import { useEffect, useRef, useState } from 'react';
import { usePlatform } from './usePlatform';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  pullDownThreshold?: number;
  maxPullDown?: number;
  resistance?: number;
}

export function usePullToRefresh({
  onRefresh,
  pullDownThreshold = 80,
  maxPullDown = 150,
  resistance = 2.5,
}: UsePullToRefreshOptions) {
  const { isIOS, isAndroid } = usePlatform();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const scrollableRef = useRef<HTMLDivElement>(null);

  const isMobile = isIOS || isAndroid;

  useEffect(() => {
    if (!isMobile) return;

    const scrollable = scrollableRef.current;
    if (!scrollable) return;

    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull-to-refresh when scrolled to top
      if (scrollable.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
        isDragging = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;

      // Only track downward pulls
      if (diff > 0 && scrollable.scrollTop === 0) {
        // Prevent default scrolling behavior
        e.preventDefault();
        
        // Apply resistance to the pull
        const distance = Math.min(diff / resistance, maxPullDown);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging) return;
      isDragging = false;

      if (pullDistance >= pullDownThreshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(pullDownThreshold);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    scrollable.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollable.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollable.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      scrollable.removeEventListener('touchstart', handleTouchStart);
      scrollable.removeEventListener('touchmove', handleTouchMove);
      scrollable.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isRefreshing, pullDistance, pullDownThreshold, maxPullDown, resistance, onRefresh]);

  return {
    scrollableRef,
    pullDistance,
    isRefreshing,
    showPullIndicator: isMobile && pullDistance > 0,
  };
}
