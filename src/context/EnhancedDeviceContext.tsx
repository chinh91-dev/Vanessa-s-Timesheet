import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { detectDevice, throttle, type DeviceInfo } from '@/utils/device-detection';
import { useResponsive, ResponsiveState } from '@/hooks/use-responsive';
import { useTouchDetection, TouchCapabilities } from '@/hooks/use-touch-detection';
import { useViewport, ViewportState } from '@/hooks/use-viewport';

// Enhanced device context with comprehensive device information
export interface EnhancedDeviceContextValue {
  // Legacy device info for backwards compatibility
  deviceInfo: DeviceInfo;
  refreshDeviceInfo: () => void;
  // New comprehensive device capabilities
  responsive: ResponsiveState;
  touch: TouchCapabilities;
  viewport: ViewportState;
}

const EnhancedDeviceContext = createContext<EnhancedDeviceContextValue | undefined>(undefined);

interface EnhancedDeviceProviderProps {
  children: ReactNode;
}

export const EnhancedDeviceProvider: React.FC<EnhancedDeviceProviderProps> = ({ children }) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => detectDevice());

  // New comprehensive hooks
  const responsive = useResponsive();
  const touch = useTouchDetection();
  const viewport = useViewport();

  const refreshDeviceInfo = () => {
    setDeviceInfo(detectDevice());
  };

  useEffect(() => {
    // Update device info on resize (throttled for performance)
    const handleResize = throttle(() => {
      setDeviceInfo(detectDevice());
    }, 200);

    // Update device info on orientation change
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(() => {
        setDeviceInfo(detectDevice());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Update on connection change
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', refreshDeviceInfo);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (connection) {
        connection.removeEventListener('change', refreshDeviceInfo);
      }
    };
  }, []);

  const value: EnhancedDeviceContextValue = {
    deviceInfo,
    refreshDeviceInfo,
    responsive,
    touch,
    viewport,
  };

  return (
    <EnhancedDeviceContext.Provider value={value}>
      {children}
    </EnhancedDeviceContext.Provider>
  );
};

export const useEnhancedDevice = (): EnhancedDeviceContextValue => {
  const context = useContext(EnhancedDeviceContext);
  if (context === undefined) {
    throw new Error('useEnhancedDevice must be used within an EnhancedDeviceProvider');
  }
  return context;
};

// Convenience hooks for specific device capabilities
export function useDeviceResponsive(): ResponsiveState {
  const { responsive } = useEnhancedDevice();
  return responsive;
}

export function useDeviceTouch(): TouchCapabilities {
  const { touch } = useEnhancedDevice();
  return touch;
}

export function useDeviceViewport(): ViewportState {
  const { viewport } = useEnhancedDevice();
  return viewport;
}
