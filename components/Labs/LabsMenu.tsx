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
       <div className="text-center mb-12 animate-fadeInScale">
            <h2 className="text-4xl font-light text-slate-100 tracking-widest mb-3 neon-text">ESTIMATE RELIANCE LABS</h2>
            <div className="h-0.5 w-32 mx-auto animate-swoosh-green mb-4 rounded-full"></div>
            <p className="text-slate-300 text-lg">Select a creative service to begin</p>
       </div>

       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <button
                key={service.id}
                onClick={() => onSelectService(service.id)}
                className={`card-3d hover-lift group relative h-72 glass-card border border-${service.color}-500/30 hover:border-${service.color}-500/70 rounded-2xl p-6 transition-all overflow-hidden text-left animate-fadeIn stagger-${index + 1}`}
            >
                {/* Animated Background Glow */}
                <div className={`absolute inset-0 bg-gradient-to-br from-${service.color}-500/0 via-${service.color}-500/5 to-${service.color}-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                {/* Background Icon */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all duration-500 group-hover:scale-110">
                    {service.bgIcon}
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full justify-end">
                    <div className={`bg-${service.color}-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-${service.color}-500/25 transition-all duration-300 border border-${service.color}-500/20 group-hover:border-${service.color}-500/40 group-hover:scale-110 group-hover:rotate-3`}>
                        {service.icon}
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-2 group-hover:text-${service.color}-100 transition-colors">{service.title}</h3>
                    <p className={`text-sm text-${service.color}-200/60 leading-relaxed group-hover:text-${service.color}-100/80 transition-colors`}>{service.desc}</p>
                </div>

                {/* Shimmer Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
            </button>
          ))}
       </div>
    </div>
  );
};

export default LabsMenu;