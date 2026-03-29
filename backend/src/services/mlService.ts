import { IsolationForest } from 'isolation-forest';

export interface MLResult {
  anomalyScore: number;
  isAnomaly: boolean;
  status: 'success' | 'skipped' | 'error';
  errorMessage?: string;
}

const ML_TIMEOUT_MS = 2000;
const ANOMALY_THRESHOLD = 0.6; // typically > 0.5 starts indicating anomalies in iForest

/**
 * Transforms an array of number arrays into the ObjectArray format
 * expected by the `isolation-forest` package.
 */
function toDataObjects(vectors: number[][]): { [key: string]: number }[] {
  return vectors.map(vec => {
    const obj: { [key: string]: number } = {};
    vec.forEach((val, i) => {
      // Create features f0, f1, f2... dynamically
      obj[`f${i}`] = val;
    });
    return obj;
  });
}

/**
 * Core Isolation Forest execution logic.
 */
const runIsolationForest = async (featureVectors: number[][]): Promise<MLResult> => {
  // We need enough historical data to meaningfully train the local model.
  // The system specified "minimum 20-30 samples".
  if (!featureVectors || featureVectors.length < 20) {
    return { anomalyScore: 0, isAnomaly: false, status: 'skipped', errorMessage: 'Insufficient data points < 20' };
  }

  // Convert to expected data format
  const dataset = toDataObjects(featureVectors);

  // Train a new model. Note: numberOfTrees = 100
  const forest = new IsolationForest();
  forest.fit(dataset);

  // The latest datapoint is what we want to evaluate for anomalies
  const latestDatapoint = dataset[dataset.length - 1];
  
  // Scikit-learn normalizes this differently, but npm implementation returns scores ~0 to 1
  const scores = forest.predict([latestDatapoint]);
  
  if (!scores || scores.length === 0) {
    return { anomalyScore: 0, isAnomaly: false, status: 'error', errorMessage: 'Isolation Forest generated empty scores' };
  }

  const score = scores[0];
  const isAnomaly = score >= ANOMALY_THRESHOLD;

  return { anomalyScore: score, isAnomaly, status: 'success' };
};

/**
 * Analyzes feature vectors to detect anomalies.
 * Wrapped with strict timeout and fallback per Phase 3 requirements.
 * 
 * @param featureVectors Plural feature vectors [history...current]
 * @returns Anomaly score and whether it is considered an anomaly
 */
export const detectAnomaly = async (featureVectors: number[][]): Promise<MLResult> => {
  try {
    const result = await Promise.race([
      runIsolationForest(featureVectors),
      new Promise<MLResult>((_, reject) => 
        setTimeout(() => reject(new Error('ML Analysis Timeout')), ML_TIMEOUT_MS)
      )
    ]);
    return result;
  } catch (error) {
    // Fallback if fails (timeout or any other error)
    console.error('[ML Module Warning] Isolation Forest fallback triggered:', error instanceof Error ? error.message : error);
    
    // Return a completely safe, non-anomalous result
    return {
      anomalyScore: 0,
      isAnomaly: false,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
};
