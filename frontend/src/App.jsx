import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute, GuestRoute, HomeRedirect } from './components/ProtectedRoute';
import { PageLoader } from './components/States';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import NotFoundPage from './pages/shared/NotFoundPage';

// Role workspaces are split into separate bundles.
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const CreateComplaint = lazy(() => import('./pages/student/CreateComplaint'));
const MyComplaints = lazy(() => import('./pages/student/MyComplaints'));
const StudentComplaintDetail = lazy(() => import('./pages/student/StudentComplaintDetail'));

const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const AssignedTasks = lazy(() => import('./pages/staff/AssignedTasks'));
const TaskDetail = lazy(() => import('./pages/staff/TaskDetail'));
const WorkHistory = lazy(() => import('./pages/staff/WorkHistory'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AllComplaints = lazy(() => import('./pages/admin/AllComplaints'));
const AdminComplaintDetail = lazy(() => import('./pages/admin/AdminComplaintDetail'));
const StaffManagement = lazy(() => import('./pages/admin/StaffManagement'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));

const NotificationsPage = lazy(() => import('./pages/shared/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'));

function sharedRoutes() {
  return (
    <>
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />

                <Route element={<GuestRoute />}>
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                  </Route>
                </Route>

                <Route path="/student" element={<ProtectedRoute roles={['student']} />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<StudentDashboard />} />
                    <Route path="complaints" element={<MyComplaints />} />
                    <Route path="complaints/new" element={<CreateComplaint />} />
                    <Route path="complaints/:id" element={<StudentComplaintDetail />} />
                    {sharedRoutes()}
                  </Route>
                </Route>

                <Route path="/staff" element={<ProtectedRoute roles={['staff']} />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<StaffDashboard />} />
                    <Route path="tasks" element={<AssignedTasks />} />
                    <Route path="tasks/:id" element={<TaskDetail />} />
                    <Route path="history" element={<WorkHistory />} />
                    {sharedRoutes()}
                  </Route>
                </Route>

                <Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="complaints" element={<AllComplaints />} />
                    <Route path="complaints/:id" element={<AdminComplaintDetail />} />
                    <Route path="staff" element={<StaffManagement />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="analytics" element={<Analytics />} />
                    {sharedRoutes()}
                  </Route>
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
