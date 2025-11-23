export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CanvasItem {
  id: string;
  text: string;
  confidence: ConfidenceLevel;
  source?: string;
}

export interface CustomerJob extends CanvasItem {
  type: 'functional' | 'emotional' | 'social';
}

export interface CustomerPain extends CanvasItem {
  intensity?: 'high' | 'medium' | 'low';
  category?: 'risk' | 'barrier' | 'frustration' | 'financial';
  isPrioritized?: boolean;
}

export interface CustomerGain extends CanvasItem {
  type: 'required' | 'expected' | 'desired' | 'unexpected';
  isPrioritized?: boolean;
}

export interface ProductService extends CanvasItem {
  category?: string;
}

export interface PainReliever extends CanvasItem {
  relatedPainId?: string;
  title?: string;
  description?: string; // How the product relieves the pain (mechanism)
  productsUsed?: string[];
  evidenceSource?: 'user_input' | 'website' | 'research' | 'inferred';
}

export interface GainCreator extends CanvasItem {
  relatedGainId?: string;
  title?: string;
  description?: string; // How the product creates the gain (mechanism)
  productsUsed?: string[];
  evidenceSource?: 'user_input' | 'website' | 'research' | 'inferred';
}

export interface ValuePropositionCanvas {
  customerJobs: CustomerJob[];
  customerPains: CustomerPain[];
  customerGains: CustomerGain[];
  productsServices: ProductService[];
  painRelievers: PainReliever[];
  gainCreators: GainCreator[];
  segment?: string; // Single focused segment
  primaryJobId?: string; // Selected primary job
  alternatives?: string[]; // Current ways customers solve the problem
  evidenceMetrics?: EvidenceMetric[]; // Available evidence/metrics (if any)
}

export interface EvidenceMetric {
  description: string;
  value?: string; // Optional numeric value
  source: string;
  linkedToProduct: boolean;
}

export interface ValuePropositionStatement {
  id: string;
  label?: string; // Short internal label
  statement: string;
  segmentTargeted: string; // Who this is for (role + context)
  primaryJob: string;
  coreOutcome: string;
  keyPainsRelieved: string[]; // Pain IDs
  keyGainsCreated: string[]; // Gain IDs
  competitiveContrast: string;
  measurableImpact: string; // Either metric or qualitative description
  assumptions?: string[]; // Key assumptions that must be true
  notesForLegalOrCompliance?: string[]; // Optional compliance notes
}

export interface ProspectSegment {
  id: string;
  name: string;
  jobTitles: string[];
  industries: string[];
  companySize?: string[];
  buyingTriggers: string[];
  toolsInStack?: string[];
  keywords: string[];
  hashtags: string[];
  events?: string[];
}

export interface UserInput {
  productName: string;
  description: string;
  targetDecisionMaker: string;
  websiteUrl?: string;
  marketingAsset?: unknown; // File object (browser) or file data (server) - using unknown to avoid build issues
  primarySegment?: string; // Optional: user-selected primary segment
  primaryJobId?: string; // Optional: user-selected primary job
  productType?: 'product' | 'service' | 'both'; // Optional: product type for phrasing adaptation
  companyName?: string; // Optional: company name (if not provided, derived from productName/websiteUrl)
}

export interface ResearchData {
  problemSpace: string;
  typicalPains: string[];
  buyingTriggers: string[];
  competitiveAlternatives: string[];
  source: string;
}

export interface Assumption {
  id: string;
  statement: string;
  category: 'customer_segment' | 'value_proposition' | 'channel' | 'revenue' | 'cost' | 'other';
  testability: ConfidenceLevel;
  experiment?: string; // Suggested experiment to test this assumption
}

export interface CompanyPositioningSummary {
  companyName: string;
  productFamilyName?: string;
  overarchingPromise: string;
  unifiedJobStatement: string;
  sharedGains: string[];
  sharedPains: string[];
  sharedDifferentiators: string[]; // mechanism / capabilities, not slogans
  primarySegments: string[];       // e.g. ["CIOs in large manufacturing enterprises"]
  positioningStatement: string;    // final narrative
}

