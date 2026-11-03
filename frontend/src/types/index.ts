export type Crop = "Soja" | "Milho" | "Algodão";
export type Risk = "Baixo" | "Moderado" | "Alto";
export type Task = "regressao" | "classificacao";
export type Algorithm = "random_forest" | "decision_tree" | "knn";
export interface TalhaoRecord {
  talhao_id: string;
  municipio: string;
  latitude: number;
  longitude: number;
  cultura: Crop;
  area_hectares: number;
  precipitacao_mm: number;
  temperatura_media: number;
  umidade_solo_pct: number;
  ph_solo: number;
  teor_argila_pct: number;
  produtividade_sc_ha: number;
  risco_quebra: Risk;
}
export interface DataSummary {
  total_talhoes: number;
  area_total_ha: number;
  produtividade_media: number | null;
  precipitacao_media: number | null;
  culturas_contagem: Record<Crop, number>;
  risco_contagem: Record<Risk, number>;
}
export interface Dataset {
  dataset_id: string;
  filename: string;
  records: TalhaoRecord[];
  summary: DataSummary;
  validation: { columns_detected: number; warnings: string[] };
  mode: "mock" | "real";
}
export interface TrainConfig {
  dataset_id: string;
  task: Task;
  algorithm: Algorithm;
  hyperparameters: Record<string, string | number>;
}
export interface Sample {
  talhao_id: string;
  real: number | Risk;
  previsto: number | Risk;
}
export interface TrainingResult {
  model_id: string;
  dataset_id: string;
  config: TrainConfig;
  mode: "mock" | "real";
  train_size: number;
  test_size: number;
  metrics: {
    r2?: number | null;
    mae?: number;
    rmse?: number;
    accuracy?: number;
    f1_weighted?: number;
    precision?: number;
    recall?: number;
    confusion_matrix?: number[][];
    classes?: Risk[];
  };
  test_samples: Sample[];
  warnings: string[];
}
export type PredictionInput = Pick<
  TalhaoRecord,
  | "municipio"
  | "cultura"
  | "area_hectares"
  | "precipitacao_mm"
  | "temperatura_media"
  | "umidade_solo_pct"
  | "ph_solo"
  | "teor_argila_pct"
>;
export interface PredictionRequest {
  dataset_id: string;
  model_ids: Partial<Record<Task, string>>;
  input: PredictionInput;
}
export interface PredictionResult {
  dataset_id: string;
  model_ids: Partial<Record<Task, string>>;
  produtividade_estimada_sc_ha: number | null;
  risco_predito: Risk | null;
  probabilidades: Record<Risk, number> | null;
  mode: "mock" | "real";
  warnings: string[];
}
export interface AgroService {
  health(): Promise<{ status: string; contract_version: string }>;
  fetchData(datasetId?: string): Promise<Dataset>;
  uploadDataset(file: File): Promise<Dataset>;
  train(config: TrainConfig): Promise<TrainingResult>;
  predict(request: PredictionRequest): Promise<PredictionResult>;
}
