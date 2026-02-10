export type Scenario = 'A' | 'B';

export interface UABGAData {
  gestationalAge?: string;
  birthWeight?: string;
  deliveryMode?: 'Natural' | 'C-Section' | 'Assisted';
  riskFactors?: string;
  apgar1?: string;
  apgar5?: string;
  apgar10?: string;
  sampleType?: 'Umbilical Artery' | 'Umbilical Vein';
  sampleTime?: string;
  delayedCordClamping?: boolean;
}

export interface GeneralBGAData {
  age?: string;
  weight?: string;
  sampleType?: 'Arterial' | 'Venous' | 'Capillary';
  fiO2?: string;
  ventilation?: string;
  diagnosis?: string;
  albumin?: string;
}

export interface BloodGasValues {
  pH: string;
  pCO2: string; // mmHg
  pO2: string; // mmHg
  HCO3: string; // mmol/L
  BE: string; // mmol/L
  Lactate: string; // mmol/L
  Na: string; // mmol/L
  K: string; // mmol/L
  Cl: string; // mmol/L
  Glucose: string; // mmol/L
  Albumin: string; // g/dL (duplicate from General but useful here for input grouping)
}

export interface AppState {
  step: 'scenario' | 'details' | 'input' | 'analysis';
  scenario: Scenario | null;
  uabgaData: UABGAData;
  generalData: GeneralBGAData;
  bloodGasValues: BloodGasValues;
  isAnalyzing: boolean;
  isExtracting: boolean;
  analysisReport: string | null;
  error: string | null;
}

export const INITIAL_BG_VALUES: BloodGasValues = {
  pH: '',
  pCO2: '',
  pO2: '',
  HCO3: '',
  BE: '',
  Lactate: '',
  Na: '',
  K: '',
  Cl: '',
  Glucose: '',
  Albumin: '',
};
