import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { AuthenticatedRoute, AdminOnlyRoute } from "./components/auth";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import GamesPage from "./pages/games/GamesPage";
import GameDetailPage from "./pages/games/GameDetailPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import AdminPage from "./pages/admin/AdminPage";
import { NotFoundPage } from "./pages/errors";
import "./App.css";

function App() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error for debugging
    console.error('Global error boundary caught an error:', error, errorInfo);
    
    // In production, you might want to send error to logging service
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, errorInfo);
    // }
  };

  return (
    <ErrorBoundary onError={handleError}>
      <NotificationProvider defaultPosition="top-right">
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="games" element={<GamesPage />} />
                <Route path="games/:id" element={<GameDetailPage />} />
                <Route 
                  path="dashboard/*" 
                  element={
                    <AuthenticatedRoute>
                      <DashboardPage />
                    </AuthenticatedRoute>
                  } 
                />
                <Route 
                  path="admin/*" 
                  element={
                    <AdminOnlyRoute>
                      <AdminPage />
                    </AdminOnlyRoute>
                  } 
                />
              </Route>
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              {/* Catch-all route for 404 errors */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
