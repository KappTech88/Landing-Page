import React from 'react';
import { PenTool, CreditCard, Megaphone, Image, FileText, Type, Palette, Layout, Flag } from 'lucide-react';

interface LabsMenuProps {
  onSelectService: (service: string) => void;
}

const LabsMenu: React.FC<LabsMenuProps> = ({ onSelectService }) => {
  const services = [
    {
      id: 'LOGO',
      title: 'Logo Creation',
      icon: <PenTool className="w-12 h-12 text-emerald-400" />,
      desc: 'Create professional brand logos from scratch or refine existing concepts.',
      color: 'emerald',
      bgIcon: <Palette className="w-24 h-24 text-emerald-500" />
    },
    {
      id: 'BUSINESS_CARD',
      title: 'Business Cards',
      icon: <CreditCard className="w-12 h-12 text-blue-400" />,
      desc: 'Generate dual-sided business cards with your branding and contact info.',
      color: 'blue',
      bgIcon: <Layout className="w-24 h-24 text-blue-500" />
    },
    {
      id: 'YARD_SIGN',
      title: 'Yard Signs',
      icon: <Megaphone className="w-12 h-12 text-orange-400" />,
      desc: 'High-visibility signs for job sites and local advertising.',
      color: 'orange',
      bgIcon: <Megaphone className="w-24 h-24 text-orange-500" />
    },
    {
      id: 'BANNER',
      title: 'Banners',
      icon: <Image className="w-12 h-12 text-violet-400" />,
      desc: 'Large format banners for web, social media, or vinyl print.',
      color: 'violet',
      bgIcon: <Flag className="w-24 h-24 text-violet-500" />
    },
    {
      id: 'FLYER',
      title: 'Flyers',
      icon: <FileText className="w-12 h-12 text-pink-400" />,
      desc: 'Promotional flyers with detailed body text and key bullet points.',
      color: 'pink',
      bgIcon: <FileText className="w-24 h-24 text-pink-500" />
    },
    {
      id: 'SLOGAN',
      title: 'Slogan Creation',
      icon: <Type className="w-12 h-12 text-teal-400" />,
      desc: 'Generate catchy, witty, and powerful slogans with our Grok-powered engine.',
      color: 'teal',
      bgIcon: <Type className="w-24 h-24 text-teal-500" />
    }
  ];

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn">
       <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-slate-100 tracking-wide mb-2">ESTIMATE RELIANCE LABS</h2>
            <p className="text-slate-400">Select a creative service to begin</p>
       </div>

       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <button 
                key={service.id}
                onClick={() => onSelectService(service.id)}
                className={`group relative h-72 bg-slate-900/40 border border-${service.color}-500/30 hover:border-${service.color}-500/80 rounded-2xl p-6 transition-all hover:bg-slate-900/60 overflow-hidden text-left`}
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                    {service.bgIcon}
                </div>
                <div className="relative z-10 flex flex-col h-full justify-end">
                    <div className={`bg-${service.color}-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-${service.color}-500/20 transition-colors border border-${service.color}-500/20`}>
                        {service.icon}
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-2">{service.title}</h3>
                    <p className={`text-sm text-${service.color}-200/60 leading-relaxed`}>{service.desc}</p>
                </div>
            </button>
          ))}
       </div>
    </div>
  );
};

export default LabsMenu;