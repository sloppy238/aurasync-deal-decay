import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import DealDetail from "@/pages/DealDetail";
import CommandCenter from "@/pages/CommandCenter";
import SignalLab from "@/pages/SignalLab";
import RelationshipGraph from "@/pages/RelationshipGraph";
import ReviewRoom from "@/pages/ReviewRoom";
import Deals from "@/pages/Deals";
import Governance from "@/pages/Governance";
import Integrations from "@/pages/Integrations";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/deals" component={Deals} />
        <Route path="/command-center" component={CommandCenter} />
        <Route path="/signal-lab" component={SignalLab} />
        <Route path="/relationship-graph" component={RelationshipGraph} />
        <Route path="/review-room" component={ReviewRoom} />
        <Route path="/deals/:id">{params => <DealDetail id={params.id} />}</Route>
        <Route path="/integrations" component={Integrations} />
        <Route path="/governance" component={Governance} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
