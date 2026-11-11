import { useState, useEffect } from "react";

export function useDeviceType() {
  const [device, setDevice] = useState("desktop");

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window !== "undefined") {
        const width = window.innerWidth;
        const newDevice = width <= 768 ? "mobile" : "desktop";
        console.log(`🔍 Device detection: width=${width}px, device=${newDevice}`);
        setDevice(newDevice);
      }
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  console.log(`📱 Current device: ${device}`);
  return device;
}