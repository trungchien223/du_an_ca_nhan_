import "./global.css";
import AppNavigation from "./src/navigation/AppNavigation";
import { WebSocketProvider } from "./src/context/WebSocketContext";

export default function App() {
  return (
    <WebSocketProvider>
      <AppNavigation />
    </WebSocketProvider>
  );
}
