import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/state/queryClient';
import { ThemeProvider } from '@/state/themeProvider';
import Root from '@/routes/Root';
import DashboardPage from '@/routes/DashboardPage';
import TransactionsPage from '@/routes/TransactionsPage';
import AccountsPage from '@/routes/AccountsPage';
import SettingsPage from '@/routes/SettingsPage';
import ManageAccountsPage from '@/routes/settings/ManageAccountsPage';
import ManageCategoriesPage from '@/routes/settings/ManageCategoriesPage';
import ManageSubcategoriesPage from '@/routes/settings/ManageSubcategoriesPage';
import ManageTagsPage from '@/routes/settings/ManageTagsPage';
import ManagePaymentMethodsPage from '@/routes/settings/ManagePaymentMethodsPage';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/accounts', element: <ManageAccountsPage /> },
      { path: 'settings/categories', element: <ManageCategoriesPage /> },
      { path: 'settings/categories/:id', element: <ManageSubcategoriesPage /> },
      { path: 'settings/tags', element: <ManageTagsPage /> },
      { path: 'settings/payment-methods', element: <ManagePaymentMethodsPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
