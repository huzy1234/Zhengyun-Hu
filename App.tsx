import React, { useState, useEffect, useRef } from 'react';
import { AppState, BloodGasValues, INITIAL_BG_VALUES, UABGAData, GeneralBGAData, Scenario } from './types';
import { extractDataFromImage, extractDataFromText, generatePediReport, fileToGenerativePart } from './services/geminiService';
import { ScenarioCard } from './components/ScenarioCard';
import { StepIndicator } from './components/StepIndicator';
import { Baby, Stethoscope, Upload, ClipboardPaste, ArrowRight, ArrowLeft, Loader2, RotateCcw, AlertCircle, FileText, Info } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  const [state, setState] = useState<AppState>({
    step: 'scenario',
    scenario: null,
    uabgaData: {},
    generalData: {},
    bloodGasValues: INITIAL_BG_VALUES,
    isAnalyzing: false,
    isExtracting: false,
    analysisReport: null,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'ocr' | 'manual' | 'paste'>('manual');
  const [pastedText, setPastedText] = useState('');

  // --- HANDLERS ---

  const handleScenarioSelect = (scenario: Scenario) => {
    setState(prev => ({ ...prev, scenario, step: 'details', error: null }));
  };

  const handleDetailChange = (key: string, value: any) => {
    if (state.scenario === 'A') {
      setState(prev => ({ ...prev, uabgaData: { ...prev.uabgaData, [key]: value } }));
    } else {
      setState(prev => ({ ...prev, generalData: { ...prev.generalData, [key]: value } }));
    }
  };

  const handleBloodGasChange = (key: keyof BloodGasValues, value: string) => {
    setState(prev => ({
      ...prev,
      bloodGasValues: { ...prev.bloodGasValues, [key]: value }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, isExtracting: true, error: null }));
    
    try {
      const base64Data = await fileToGenerativePart(file);
      const extractedData = await extractDataFromImage(base64Data);
      
      // Merge extracted data only if values are present (not null)
      setState(prev => {
          const newValues = { ...prev.bloodGasValues };
          (Object.keys(extractedData) as Array<keyof BloodGasValues>).forEach(key => {
              if (extractedData[key]) {
                  newValues[key] = String(extractedData[key]);
              }
          });
          return {
              ...prev,
              bloodGasValues: newValues,
              isExtracting: false
          };
      });
      setActiveTab('manual'); // Switch to manual for verification
    } catch (err) {
      setState(prev => ({ ...prev, isExtracting: false, error: "图片识别失败，请手动输入或重试。" }));
    }
  };

  const handlePasteParse = async () => {
    if (!pastedText.trim()) return;
    
    setState(prev => ({ ...prev, isExtracting: true, error: null }));

    try {
        const extractedData = await extractDataFromText(pastedText);

        setState(prev => {
            const newValues = { ...prev.bloodGasValues };
            (Object.keys(extractedData) as Array<keyof BloodGasValues>).forEach(key => {
                if (extractedData[key]) {
                    newValues[key] = String(extractedData[key]);
                }
            });
            return {
                ...prev,
                bloodGasValues: newValues,
                isExtracting: false
            };
        });
        setActiveTab('manual');
    } catch (err) {
        setState(prev => ({ ...prev, isExtracting: false, error: "未在文本中识别到有效血气数据，请手动输入。" }));
    }
  };

  const handleAnalyze = async () => {
    // Basic validation
    if (!state.bloodGasValues.pH || !state.bloodGasValues.pCO2 || !state.bloodGasValues.HCO3) {
      setState(prev => ({ ...prev, error: "请至少输入 pH, pCO2 和 HCO3 以进行分析。" }));
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
        const report = await generatePediReport(state);
        setState(prev => ({ 
            ...prev, 
            analysisReport: report, 
            isAnalyzing: false, 
            step: 'analysis' 
        }));
    } catch (err) {
        setState(prev => ({ ...prev, isAnalyzing: false, error: "分析生成失败，请检查网络设置或重试。" }));
    }
  };

  const reset = () => {
    setState({
        step: 'scenario',
        scenario: null,
        uabgaData: {},
        generalData: {},
        bloodGasValues: INITIAL_BG_VALUES,
        isAnalyzing: false,
        isExtracting: false,
        analysisReport: null,
        error: null,
    });
    setActiveTab('manual');
    setPastedText('');
  };

  // --- RENDERERS ---

  const renderScenarioSelection = () => (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-bold text-slate-800 text-center">请选择评估场景</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScenarioCard
          title="场景 A: 新生儿脐血气 (UABGA)"
          description="适用于新生儿出生时脐动脉/脐静脉血气评估，包含窒息风险分层。"
          icon={<Baby size={32} />}
          selected={state.scenario === 'A'}
          onClick={() => handleScenarioSelect('A')}
        />
        <ScenarioCard
          title="场景 B: 儿童/新生儿动脉血气"
          description="适用于所有年龄段儿童的常规动脉血气分析及动态监测。"
          icon={<Stethoscope size={32} />}
          selected={state.scenario === 'B'}
          onClick={() => handleScenarioSelect('B')}
        />
      </div>
    </div>
  );

  const renderDetailsForm = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          {state.scenario === 'A' ? <Baby className="text-blue-500"/> : <Stethoscope className="text-blue-500"/>}
          {state.scenario === 'A' ? '新生儿基本信息' : '患儿基本信息'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.scenario === 'A' ? (
            <>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">胎龄 (周+天)</label>
                <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" placeholder="例如: 38+2" onChange={(e) => handleDetailChange('gestationalAge', e.target.value)} value={state.uabgaData.gestationalAge || ''}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">出生体重 (g)</label>
                <input type="number" className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" onChange={(e) => handleDetailChange('birthWeight', e.target.value)} value={state.uabgaData.birthWeight || ''}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apgar评分 (1-5-10min)</label>
                <div className="flex gap-2">
                    <input type="text" placeholder="1m" className="w-full border p-2 rounded" onChange={(e) => handleDetailChange('apgar1', e.target.value)} value={state.uabgaData.apgar1 || ''}/>
                    <input type="text" placeholder="5m" className="w-full border p-2 rounded" onChange={(e) => handleDetailChange('apgar5', e.target.value)} value={state.uabgaData.apgar5 || ''}/>
                    <input type="text" placeholder="10m" className="w-full border p-2 rounded" onChange={(e) => handleDetailChange('apgar10', e.target.value)} value={state.uabgaData.apgar10 || ''}/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">标本类型</label>
                <select className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" onChange={(e) => handleDetailChange('sampleType', e.target.value)} value={state.uabgaData.sampleType || 'Umbilical Artery'}>
                    <option value="Umbilical Artery">脐动脉</option>
                    <option value="Umbilical Vein">脐静脉</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">年龄</label>
                <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" placeholder="例如: 3岁5个月" onChange={(e) => handleDetailChange('age', e.target.value)} value={state.generalData.age || ''}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">体重 (kg)</label>
                <input type="number" className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" onChange={(e) => handleDetailChange('weight', e.target.value)} value={state.generalData.weight || ''}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">临床诊断</label>
                <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" onChange={(e) => handleDetailChange('diagnosis', e.target.value)} value={state.generalData.diagnosis || ''}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">吸氧条件 / FiO2</label>
                <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" placeholder="例如: 鼻导管 2L/min" onChange={(e) => handleDetailChange('fiO2', e.target.value)} value={state.generalData.fiO2 || ''}/>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="flex justify-between">
        <button onClick={() => setState(prev => ({ ...prev, step: 'scenario' }))} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium px-4 py-2">
            <ArrowLeft size={18} /> 返回
        </button>
        <button onClick={() => setState(prev => ({ ...prev, step: 'input' }))} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors flex items-center gap-2">
            下一步: 输入数据 <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );

  const renderInputScreen = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        
        {/* Input Method Tabs */}
        <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            <button 
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-2 ${activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <FileText size={16} /> 逐项输入
            </button>
            <button 
                onClick={() => setActiveTab('ocr')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-2 ${activeTab === 'ocr' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Upload size={16} /> 图片识别
            </button>
            <button 
                onClick={() => setActiveTab('paste')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-2 ${activeTab === 'paste' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <ClipboardPaste size={16} /> 文本粘贴
            </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
            {activeTab === 'ocr' && (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        {state.isExtracting ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">上传血气报告图片</h3>
                    <p className="text-slate-500 mb-6 text-sm">支持 .jpg, .png 格式。系统将自动识别数值。</p>
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload}
                    />
                    <button 
                        disabled={state.isExtracting}
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {state.isExtracting ? '正在识别...' : '选择图片'}
                    </button>
                </div>
            )}

            {activeTab === 'paste' && (
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">粘贴血气结果文本</h3>
                    <textarea 
                        className="w-full h-32 border border-slate-300 rounded-lg p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="在此粘贴文本，例如: pH 7.35, pCO2 45, HCO3 24..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                    ></textarea>
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={handlePasteParse}
                            disabled={state.isExtracting}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {state.isExtracting ? <Loader2 className="animate-spin" size={16} /> : null}
                            {state.isExtracting ? '解析中...' : '解析文本'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'manual' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800">核对/输入数据</h3>
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                           ⚠️ 请务必确认数值准确
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[
                            { id: 'pH', label: 'pH', unit: '', required: true },
                            { id: 'pCO2', label: 'PaCO₂', unit: 'mmHg', required: true },
                            { id: 'pO2', label: 'PaO₂', unit: 'mmHg', required: false },
                            { id: 'HCO3', label: 'HCO₃⁻', unit: 'mmol/L', required: true },
                            { id: 'BE', label: 'BE', unit: 'mmol/L', required: true },
                            { id: 'Lactate', label: '乳酸', unit: 'mmol/L', required: false },
                            { id: 'Na', label: 'Na⁺', unit: 'mmol/L', required: false },
                            { id: 'K', label: 'K⁺', unit: 'mmol/L', required: false },
                            { id: 'Cl', label: 'Cl⁻', unit: 'mmol/L', required: false },
                            { id: 'Glucose', label: '血糖', unit: 'mmol/L', required: false },
                            { 
                                id: 'Albumin', 
                                label: '白蛋白', 
                                unit: 'g/dL', 
                                required: false, 
                                tooltip: '如报告单位为 g/L，请除以 10 (例如 35 g/L = 3.5 g/dL)' 
                            },
                        ].map((field) => (
                            <div key={field.id} className="relative">
                                <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                    {field.tooltip && (
                                        <div className="group relative flex items-center">
                                            <Info size={12} className="text-slate-400 hover:text-blue-500 cursor-help" />
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                                {field.tooltip}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                        </div>
                                    )}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className={`w-full border rounded-md shadow-sm p-2 text-slate-800 font-medium focus:ring-blue-500 focus:border-blue-500 ${state.bloodGasValues[field.id as keyof BloodGasValues] ? 'border-blue-300 bg-blue-50' : 'border-slate-300'}`}
                                        value={state.bloodGasValues[field.id as keyof BloodGasValues]}
                                        onChange={(e) => handleBloodGasChange(field.id as keyof BloodGasValues, e.target.value)}
                                    />
                                    {field.unit && <span className="absolute right-2 top-2.5 text-xs text-slate-400 pointer-events-none">{field.unit}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {state.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm mb-4 border border-red-100">
                <AlertCircle size={16} />
                {state.error}
            </div>
        )}

        <div className="flex justify-between items-center">
            <button onClick={() => setState(prev => ({ ...prev, step: 'details' }))} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium px-4 py-2">
                <ArrowLeft size={18} /> 返回
            </button>
            
            <button 
                onClick={handleAnalyze} 
                disabled={state.isAnalyzing}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 font-bold text-lg disabled:opacity-70 disabled:cursor-wait"
            >
                {state.isAnalyzing ? <Loader2 className="animate-spin" /> : '开始智能评估'}
            </button>
        </div>
    </div>
  );

  const renderReport = () => (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">血气分析评估报告</h2>
            <div className="flex gap-2">
                <button onClick={reset} className="text-slate-500 border border-slate-300 bg-white px-4 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-medium">
                    <RotateCcw size={16} /> 新评估
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
            <div className="p-6 report-content overflow-y-auto flex-1">
                {state.analysisReport ? (
                    <div className="markdown-body whitespace-pre-wrap font-sans text-slate-700">
                        {state.analysisReport}
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-400">
                        生成报告为空，请重试。
                    </div>
                )}
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-xs text-slate-500 text-center">
                ⚠️ 免责声明：本工具仅供临床辅助参考，不作为最终诊断依据。请结合临床实际情况进行判断。
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                <h1 className="font-bold text-xl tracking-tight text-slate-800">PediBGA <span className="text-blue-600 font-light text-sm ml-1">AI Assitant</span></h1>
            </div>
            <div className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded">
                v1.0.0
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {state.step !== 'analysis' && (
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">儿童/新生儿血气分析专家助手</h1>
                <p className="text-slate-500">基于六步法与临床指南的智能解读系统</p>
            </div>
        )}

        <StepIndicator currentStep={state.step} />

        <div className="max-w-2xl mx-auto">
            {state.step === 'scenario' && renderScenarioSelection()}
            {state.step === 'details' && renderDetailsForm()}
            {state.step === 'input' && renderInputScreen()}
        </div>

        {state.step === 'analysis' && (
            <div className="max-w-4xl mx-auto h-[calc(100vh-200px)]">
                {renderReport()}
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
