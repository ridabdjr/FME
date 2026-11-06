/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SignInPage } from './components/auth/SignInPage';
import { AppShell } from './components/layout/AppShell';
import { AppProvider, useApp } from './context/AppContext';
import { I18nProvider } from './i18n';

const MainRouter: React.FC = () => {
  const { currentUser } = useApp();
  if (!currentUser) {
    return <SignInPage />;
  }
  return <AppShell />;
};

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <MainRouter />
      </AppProvider>
    </I18nProvider>
  );
}
