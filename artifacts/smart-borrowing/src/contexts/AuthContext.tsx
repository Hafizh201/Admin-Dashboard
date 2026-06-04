import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  pin: string | null;
  login: (pin: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  pin: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pin, setPin] = useState<string | null>(() => {
    return sessionStorage.getItem("sbs_pin");
  });

  useEffect(() => {
    if (pin) {
      sessionStorage.setItem("sbs_pin", pin);
    } else {
      sessionStorage.removeItem("sbs_pin");
    }
  }, [pin]);

  const login = (p: string) => setPin(p);
  const logout = () => setPin(null);

  return (
    <AuthContext.Provider value={{ pin, login, logout, isAuthenticated: !!pin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
