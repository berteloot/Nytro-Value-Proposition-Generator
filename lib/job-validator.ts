import { CustomerJob, CustomerPain } from '@/types';

/**
 * Global validation rule: If a Job contains emotional language,
 * move it to Pains automatically.
 * 
 * Emotional keywords: stress, anxiety, worry, confidence, fear, reputation,
 * pressure, concern, nervous, uneasy, apprehensive, dread, panic, tension
 */
const EMOTIONAL_KEYWORDS = [
  'stress', 'stressed', 'anxiety', 'anxious', 'worry', 'worried', 'worries',
  'confidence', 'fear', 'fearful', 'reputation', 'pressure', 'pressured',
  'concern', 'concerned', 'nervous', 'uneasy', 'apprehensive', 'dread',
  'panic', 'tension', 'tense', 'frustration', 'frustrated', 'frustrating'
];

/**
 * Validates Jobs and moves any emotional language to Pains
 * Returns: { validJobs, extractedPains }
 */
export function validateJobsAndExtractEmotionalPains(
  jobs: CustomerJob[]
): { validJobs: CustomerJob[]; extractedPains: CustomerPain[] } {
  const validJobs: CustomerJob[] = [];
  const extractedPains: CustomerPain[] = [];
  
  jobs.forEach((job, idx) => {
    const jobTextLower = job.text.toLowerCase();
    
    // Check if job contains emotional keywords
    const hasEmotionalLanguage = EMOTIONAL_KEYWORDS.some(keyword => 
      jobTextLower.includes(keyword)
    );
    
    if (hasEmotionalLanguage) {
      // Move to Pains
      extractedPains.push({
        id: `pain-from-job-${idx + 1}`,
        text: job.text,
        confidence: job.confidence,
        intensity: 'medium' as const,
        category: 'frustration' as const,
        source: 'job validation (emotional language moved)',
      });
    } else {
      // Keep as valid Job
      validJobs.push(job);
    }
  });
  
  return { validJobs, extractedPains };
}




