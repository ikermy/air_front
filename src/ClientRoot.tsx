import { useEffect, useState } from "react";
import App from "./App";
import "./i18n";
import { ThemeProvider } from "./ThemeContext";
import { UserContext } from "./UserContext";
import { getOrSetUserId } from "./utils/getOrSetUserId";

export default function ClientRoot() {
  const [userId, setUserId] = useState(0);

  useEffect(() => {
    setUserId(getOrSetUserId());
  }, []);

  return <UserContext.Provider value={userId}>
    <ThemeProvider><App /></ThemeProvider>
  </UserContext.Provider>;
}
