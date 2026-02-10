import React from 'react';

interface StepIndicatorProps {
  currentStep: 'scenario' | 'details' | 'input' | 'analysis';
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { id: 'scenario', label: '1. 场景' },
    { id: 'details', label: '2. 信息' },
    { id: 'input', label: '3. 数据' },
    { id: 'analysis', label: '4. 报告' },
  ];

  const getStatus = (stepId: string) => {
    const order = ['scenario', 'details', 'input', 'analysis'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex items-center justify-between w-full max-w-lg mx-auto mb-8 px-4">
      {steps.map((step, index) => {
        const status = getStatus(step.id);
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex flex-col items-center relative`}>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300
                  ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                  ${status === 'current' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : ''}
                  ${status === 'upcoming' ? 'bg-slate-200 text-slate-400' : ''}
                `}
              >
                {status === 'completed' ? '✓' : index + 1}
              </div>
              <span className={`absolute -bottom-6 text-xs font-medium whitespace-nowrap
                 ${status === 'current' ? 'text-blue-700' : 'text-slate-400'}
              `}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 
                ${status === 'completed' ? 'bg-green-500' : 'bg-slate-200'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
};
