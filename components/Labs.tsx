import React, { useState } from 'react';
import LabsMenu from './Labs/LabsMenu';
import LogoStudio from './Labs/LogoStudio';
import BusinessCardStudio from './Labs/BusinessCardStudio';
import YardSignStudio from './Labs/YardSignStudio';
import BannerStudio from './Labs/BannerStudio';
import FlyerStudio from './Labs/FlyerStudio';
import SloganStudio from './Labs/SloganStudio';

const Labs: React.FC = () => {
  const [currentService, setCurrentService] = useState('MENU');

  return (
    <div className="max-w-6xl mx-auto w-full p-6 animate-float">
      {currentService === 'MENU' && <LabsMenu onSelectService={setCurrentService} />}
      {currentService === 'LOGO' && <LogoStudio onBack={() => setCurrentService('MENU')} />}
      {currentService === 'BUSINESS_CARD' && <BusinessCardStudio onBack={() => setCurrentService('MENU')} />}
      {currentService === 'YARD_SIGN' && <YardSignStudio onBack={() => setCurrentService('MENU')} />}
      {currentService === 'BANNER' && <BannerStudio onBack={() => setCurrentService('MENU')} />}
      {currentService === 'FLYER' && <FlyerStudio onBack={() => setCurrentService('MENU')} />}
      {currentService === 'SLOGAN' && <SloganStudio onBack={() => setCurrentService('MENU')} />}
    </div>
  );
};

export default Labs;