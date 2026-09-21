import React from 'react';
import 'leaflet/dist/leaflet.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LibrariesPage from './pages/LibrariesPage';
import BooksPage from './pages/BooksPage';
import RequestsPage from './pages/RequestsPage';
import PendingApprovalsPage from './pages/PendingApprovalsPage';
import UsersPage from './pages/UserPage';
import BookRequestsPage from './pages/BookRequestsPage';
import PublicBooksPage from './pages/PublicBooksPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MyScorePage from './pages/MyScorePage';
import IssueRegisterPage from './pages/IssueRegisterPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  return <Navigate to={user.role === 'READER' ? '/books' : '/dashboard'} replace />;
}

function CatalogueRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/books" replace />;
  return <PublicBooksPage />;
}

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'READER' ? '/books' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/catalogue" element={<CatalogueRoute />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DefaultRedirect />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="libraries" element={<LibrariesPage />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="approvals" element={<PendingApprovalsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="book-requests" element={<BookRequestsPage />} />
            <Route path="my-score" element={<MyScorePage />} />
            <Route path="issue-register" element={<IssueRegisterPage />} />
          </Route>
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}