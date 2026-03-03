import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import CategoryView from "./pages/CategoryView";
import AddEditEntry from "./pages/AddEditEntry";
import Settings from "./pages/Settings";

function Router() {
  const { isInitialized, isAuthenticated } = useAuth();

  // Show Setup if not initialized
  if (!isInitialized) {
    return (
      <Switch>
        <Route path="*" component={Setup} />
      </Switch>
    );
  }

  // Show Login if not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="*" component={Login} />
      </Switch>
    );
  }

  // Show authenticated routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/category/:id" component={CategoryView} />
      <Route path="/add-entry" component={AddEditEntry} />
      <Route path="/edit-entry/:id" component={AddEditEntry} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
