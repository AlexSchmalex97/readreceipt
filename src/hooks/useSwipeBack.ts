import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSwipeBack = (enabled: boolean = true) => {
  const navigate = useNavigate();
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      
      // Only start swipe if touch starts near left edge (within 50px)
      if (touch.clientX < 50) {
        isSwiping.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Prevent vertical scrolling during horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current) {
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Swipe right (back) if:
      // 1. Horizontal movement is greater than vertical
      // 2. Moved at least 100px to the right
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 100) {
        navigate(-1);
      }

      isSwiping.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, navigate]);
};
