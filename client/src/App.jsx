import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Problems from './pages/Problems.jsx';
import ProblemDetails from './pages/ProblemDetails.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Submissions from './pages/Submissions.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ManageProblems from './pages/ManageProblems.jsx';
import ManageTestCases from './pages/ManageTestCases.jsx';
import NotFound from './pages/NotFound.jsx';
import Unauthorized from './pages/Unauthorized.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#161b28',
            color: '#e9ecf5',
            border: '1px solid #262d40',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#33d17a', secondary: '#161b28' } },
          error: { iconTheme: { primary: '#ff5470', secondary: '#161b28' } },
        }}
      />
      <Navbar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/:id" element={<ProblemDetails />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submissions"
            element={
              <ProtectedRoute>
                <Submissions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/problems"
            element={
              <ProtectedRoute adminOnly>
                <ManageProblems />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/testcases"
            element={
              <ProtectedRoute adminOnly>
                <ManageTestCases />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
