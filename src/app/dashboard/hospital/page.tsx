import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function HospitalDashboardPage() {
  return (
    <ProtectedRoute requiredRole="HOSPITAL">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900">Hospital Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Welcome. Manage staff, departments, and institutional records here.
        </p>
      </div>
    </ProtectedRoute>
  );
}
