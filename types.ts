import React from 'react';

export enum AppView {
  LANDING = 'LANDING',
  SERVICES = 'SERVICES',
  DENIAL_APPEAL = 'DENIAL_APPEAL',
  XACTIMATE_ESTIMATE = 'XACTIMATE_ESTIMATE',
  SUPPLEMENT_CLAIM = 'SUPPLEMENT_CLAIM',
  COMMERCIAL_BID = 'COMMERCIAL_BID',
  CUSTOMIZED_DOCS = 'CUSTOMIZED_DOCS',
  CLAIMS = 'CLAIMS',
  LABS = 'LABS',
  PORTAL = 'PORTAL',
  REGISTER = 'REGISTER',
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