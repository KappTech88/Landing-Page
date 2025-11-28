import React from 'react';
import { LogIn, UserPlus, ArrowRight, Shield } from 'lucide-react';

interface ServiceAuthChoiceProps {
  serviceName: string;
  serviceDescription: string;
  onLoginClick: () => void;
  onGuestClick: () => void;
}

const ServiceAuthChoice: React.FC<ServiceAuthChoiceProps> = ({
  serviceName,
  serviceDescription,
  onLoginClick,
  onGuestClick
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 animate-fadeInScale">
      <div className="glass-panel w-full max-w-2xl p-8 md:p-12 rounded-2xl shadow-2xl border border-blue-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600"></div>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
            <Shield className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-3xl font-light text-white mb-3">{serviceName}</h2>
          <p className="text-blue-200/60 text-sm max-w-lg mx-auto">{serviceDescription}</p>
        </div>

        <div className="space-y-4">
          {/* Login Button */}
          <button
            onClick={onLoginClick}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-5 px-6 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center">
              <LogIn className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-bold">Login to Request Service</div>
                <div className="text-xs text-blue-100/60 font-normal">Existing clients - your information will be auto-filled</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Guest Button */}
          <button
            onClick={onGuestClick}
            className="w-full bg-slate-800/60 hover:bg-slate-800/80 border border-blue-500/20 hover:border-blue-500/40 text-white font-bold py-5 px-6 rounded-xl flex items-center justify-between transition-all group"
          >
            <div className="flex items-center">
              <UserPlus className="w-5 h-5 mr-3 text-blue-400" />
              <div className="text-left">
                <div className="font-bold">Request Service as Guest</div>
                <div className="text-xs text-blue-200/40 font-normal">New clients - fill out the service request form</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
          <p className="text-blue-200/40 text-xs text-center">
            <strong className="text-blue-300">Returning client?</strong> Login to save time - we'll remember your contact details and property information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceAuthChoice;
