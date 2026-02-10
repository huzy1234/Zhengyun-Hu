import React from 'react';
import { MouseEventHandler } from 'react';

interface ScenarioCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({ title, description, icon, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left flex flex-col gap-3
        ${selected 
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md' 
          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
        }
      `}
    >
      <div className={`p-3 rounded-full w-fit ${selected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
    </button>
  );
};
