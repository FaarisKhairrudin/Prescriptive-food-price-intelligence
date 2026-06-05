import { useEffect, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { InteractiveLoader } from "./components/InteractiveLoader";
import { EmptyState } from "./components/EmptyState";
import { OnboardingTour } from "./components/OnboardingTour";
import { useAppContext } from "./context/AppContext";
import { AlertTriangle } from "lucide-react";
import "./styles.css";

function App() {
  const { payload, isLoading, error, isAuthenticated } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="app-shell">
      <OnboardingTour />
      <Sidebar />
      <div className="main-content">
        <TopBar />
        
        {error && <div className="error-banner"><AlertTriangle size={16} /><span>{error}</span></div>}
        
        {isLoading ? (
          <InteractiveLoader />
        ) : (
          <Suspense fallback={<div className="page-loader"><span>Memuat halaman...</span></div>}>
            <Outlet />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default App;
