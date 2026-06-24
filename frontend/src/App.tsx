import { useState } from "react";
import { LoginScreen } from "../components/LoginScreen";
import { AdminDashboard } from "../components/AdminDashboard";
import { TutorDashboard } from "../components/TutorDashboard";

type Screen = "login" | "admin" | "tutor";
type UserType = "admin" | "tutor";

interface UserData {
  id?: string;
  username: string;
  userType: UserType;
  name?: string;
  email?: string;
  phone?: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  const handleLogin = (userData: UserData) => {
    setCurrentUser(userData);
    setCurrentScreen(userData.userType);
  };

  const handleLogout = () => {
    localStorage.removeItem('petmonitor_token');
    setCurrentUser(null);
    setCurrentScreen("login");
  };

  return (
    <div className="size-full">
      {currentScreen === "login" && <LoginScreen onLogin={handleLogin} />}
      
      {currentScreen === "admin" && currentUser && (
        <AdminDashboard onLogout={handleLogout} username={currentUser.username} />
      )}
      
      {currentScreen === "tutor" && currentUser && (
        <TutorDashboard onLogout={handleLogout} userData={currentUser} />
      )}
    </div>
  );
}