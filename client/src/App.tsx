import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GameProvider, useGame } from "./contexts/GameContext";
import SplashScreen from "./pages/SplashScreen";
import SetupScreen from "./pages/SetupScreen";
import GameScreen from "./pages/GameScreen";
import SummaryScreen from "./pages/SummaryScreen";
import PrivacyPolicy from "./pages/PrivacyPolicy";
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
          <Switch>
            {/* Standalone privacy policy page — no game context needed */}
            <Route path="/privacy" component={PrivacyPolicy} />

            {/* Main app — all other routes go through the game state router */}
            <Route>
              <GameProvider>
                <Toaster />
                <AppScreenRouter />
              </GameProvider>
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
