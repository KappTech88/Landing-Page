import React from 'react';

export enum AppView {
  LANDING = 'LANDING',
  SERVICES = 'SERVICES',
  CLAIMS = 'CLAIMS',
  LABS = 'LABS',
  PORTAL = 'PORTAL',
}

export interface NavItem {
  id: AppView;
  label: string;
  icon: React.ReactNode;
}

// Augment window for AI Studio key selection
declare global {
  // The global 'aistudio' property on Window is already defined with type 'AIStudio'.
  // We augment the interface 'AIStudio' to ensure it includes the required methods.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}