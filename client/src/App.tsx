import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GameProvider, useGame } from "./contexts/GameContext";
import SplashScreen from "./pages/SplashScreen";
import SetupScreen from "./pages/SetupScreen";
import GameScreen from "./pages/GameScreen";
import SummaryScreen from "./pages/SummaryScreen";
import ErrorBoundary from "./components/ErrorBoundary";

function AppScreenRouter() {
  const { state } = useGame();
  if (state.screen === "splash") return <SplashScreen />;
  if (state.screen === "setup") return <SetupScreen />;
  if (state.screen === "game") return <GameScreen />;
  return <SummaryScreen />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <GameProvider>
            <Toaster />
            <AppScreenRouter />
          </GameProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
