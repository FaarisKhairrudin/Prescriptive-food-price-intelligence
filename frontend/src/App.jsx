import { useEffect, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { InteractiveLoader } from "./components/InteractiveLoader";
import { EmptyState } from "./components/EmptyState";
import { OnboardingTour } from "./components/OnboardingTour";
import { useAppContext } from "./context/AppContext";
import { AlertTriangle } from "lucide-react";
import "./styles.css";

function App() {
  const { payload, isLoading, error, isAuthenticated, user } = useAppContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    if (user?.is_admin) {
      if (pathname === "/dashboard" || pathname === "/dashboard/" || (!pathname.startsWith("/dashboard/users") && !pathname.startsWith("/dashboard/system"))) {
        navigate("/dashboard/users");
      }
    } else {
      if (pathname.startsWith("/dashboard/users") || pathname.startsWith("/dashboard/system")) {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, user, pathname, navigate]);

  return (
    <div className="app-shell">
      {!user?.is_admin && <OnboardingTour />}
      <Sidebar />
      <div className="main-content">
        <TopBar />
        
        {error && <div className="error-banner"><AlertTriangle size={16} /><span>{error}</span></div>}
        
        {isLoading && !payload && !user?.is_admin ? (
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
