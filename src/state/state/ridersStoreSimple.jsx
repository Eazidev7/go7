import React, { createContext, useContext, useMemo, useState } from "react";
const Ctx = createContext(null);

export function RidersProvider({ children }) {
  const [rider, setRider] = useState(null); // {id,name,zone,status}
  const value = useMemo(() => ({ rider, setRider }), [rider]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useRider = () => useContext(Ctx);
