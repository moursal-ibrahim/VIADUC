import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute, AdminRoute, SellerRoute } from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import InventoryPage from '../pages/admin/InventoryPage';
import WarehousesPage from '../pages/admin/WarehousesPage';
import FinancePage from '../pages/admin/FinancePage';
import PricingPage from '../pages/admin/PricingPage';
import ContainersPage from '../pages/admin/ContainersPage';
import ReportsPage from '../pages/admin/ReportsPage';
import AnalyticsPage from '../pages/admin/AnalyticsPage';
import UsersPage from '../pages/admin/UsersPage';
import OpeningStockPage from '../pages/admin/OpeningStockPage';
import SettingsPage from '../pages/admin/SettingsPage';
import SellerDashboard from '../pages/seller/SellerDashboard';
import ProductEntryPage from '../pages/seller/ProductEntryPage';
import MoneySubmissionPage from '../pages/seller/MoneySubmissionPage';
import ActivityHistoryPage from '../pages/seller/ActivityHistoryPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      <Route path="/admin" element={<AdminRoute />}>
        <Route index element={<AdminDashboard />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="containers" element={<ContainersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="opening-stock" element={<OpeningStockPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="/seller" element={<SellerRoute />}>
        <Route index element={<SellerDashboard />} />
        <Route path="entry" element={<ProductEntryPage />} />
        <Route path="money" element={<MoneySubmissionPage />} />
        <Route path="history" element={<ActivityHistoryPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
