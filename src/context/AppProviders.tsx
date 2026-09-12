"use client";

import React from "react";
import { LanguageProvider } from "../lib/i18n";
import { AuthProvider } from "./AuthContext";
import { OrgProvider } from "./OrgContext";
import { CollectorProvider } from "./CollectorContext";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <OrgProvider>
          <CollectorProvider>
            {children}
          </CollectorProvider>
        </OrgProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}