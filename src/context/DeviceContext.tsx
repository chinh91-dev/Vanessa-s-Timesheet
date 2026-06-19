import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { detectDevice, throttle, type DeviceInfo } from '@/utils/device-detection';

interface DeviceContextType extends DeviceInfo {
  // Add any additional context methods here if needed
  refreshDeviceInfo: () => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

interface DeviceProviderProps {
  children: ReactNode;
}

export const DeviceProvider: React.FC<DeviceProviderProps> = ({ children }) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => detectDevice());

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

  const value: DeviceContextType = {
    ...deviceInfo,
    refreshDeviceInfo,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
