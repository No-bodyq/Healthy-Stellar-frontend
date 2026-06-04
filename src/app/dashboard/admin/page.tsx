import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Welcome. Manage platform users, roles, and system settings here.
        </p>
      </div>
    </ProtectedRoute>
  );
}
