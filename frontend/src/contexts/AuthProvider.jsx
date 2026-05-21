import { AuthContext } from './authContext';
import { useAuth } from '../hooks/useAuth';

export function AuthProvider({ children }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}
