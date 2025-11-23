'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserInput } from '@/types';
import { ArrowRight, Loader2 } from 'lucide-react';

interface InitialInputFormProps {
  onSubmit: (input: UserInput) => void;
}

interface SuggestedSegment {
  id: string;
  label: string;
  type: string;
  confidence: 'high' | 'medium' | 'low';
}

export default function InitialInputForm({ onSubmit }: InitialInputFormProps) {
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [suggestedSegments, setSuggestedSegments] = useState<SuggestedSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [customSegment, setCustomSegment] = useState('');
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);
  const [useCustomSegment, setUseCustomSegment] = useState(false);
  const [productType, setProductType] = useState<'product' | 'service' | 'both' | ''>('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch segment suggestions
  const fetchSegmentSuggestions = useCallback(async () => {
    if (!productName || !description || description.length < 20) {
      setSuggestedSegments([]);
      return;
    }

    setIsLoadingSegments(true);
    try {
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/suggest-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDescription: description,
          websiteUrl: websiteUrl || undefined,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setSuggestedSegments(data.segments || []);
      } else {
        console.error('Failed to fetch segment suggestions');
        setSuggestedSegments([]);
      }
    } catch (error: any) {
      console.error('Error fetching segment suggestions:', error);
      if (error.name === 'AbortError') {
        console.error('Request timed out after 30 seconds');
      }
      setSuggestedSegments([]);
    } finally {
      setIsLoadingSegments(false);
    }
  }, [productName, description, websiteUrl]);

  // Trigger segment suggestions when description changes (debounced)
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Only trigger if we have enough content
    if (description && productName && description.length >= 20) {
      debounceTimeoutRef.current = setTimeout(() => {
        fetchSegmentSuggestions();
      }, 1000);
    } else {
      setSuggestedSegments([]);
    }

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [description, productName, websiteUrl, fetchSegmentSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine the selected segment
    let finalSegment = '';
    if (useCustomSegment && customSegment.trim()) {
      finalSegment = customSegment.trim();
    } else if (selectedSegmentId) {
      const selected = suggestedSegments.find(s => s.id === selectedSegmentId);
      finalSegment = selected?.label || '';
    }

    if (!productName || !description || !finalSegment) {
      alert('Please fill in all required fields and select a customer segment');
      return;
    }

    onSubmit({
      productName,
      description,
      targetDecisionMaker: finalSegment, // Keep for backward compatibility
      websiteUrl: websiteUrl || undefined,
      primarySegment: finalSegment,
      productType: productType || undefined,
    });
  };

  const handleSegmentSelect = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    setUseCustomSegment(false);
    setCustomSegment('');
  };

  const handleCustomSegmentToggle = () => {
    setUseCustomSegment(true);
    setSelectedSegmentId(null);
  };

  const isFormValid = productName && description && (selectedSegmentId || (useCustomSegment && customSegment.trim()));


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Start Building Your Value Proposition
      </h2>
      <p className="text-gray-600 mb-8">
        Choose one clear customer segment and map the job your product truly solves for them. By focusing on a single segment's real pains, outcomes, and buying triggers, you'll generate a sharp, evidence-based value proposition and a segment you can target with confidence.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-2">
            Product/Service Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder="e.g., Project Management Tool"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Product/Service Description (Plain Language) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="e.g., A collaborative platform that helps remote teams manage projects and deadlines. It provides real-time visibility into project status, automates task assignments, and integrates with popular tools like Slack and Jira. The platform reduces meeting time by 40% and helps teams deliver projects on time."
              required
            />
            {description.length >= 20 && (
              <button
                type="button"
                onClick={fetchSegmentSuggestions}
                disabled={isLoadingSegments}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-accent-50 text-accent rounded-md hover:bg-accent-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingSegments ? 'Loading...' : 'Suggest segments'}
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Describe what your product actually does and how it works. Skip slogans and "market leader" claims.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Customer Segment (Choose One) <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-600 mb-4">
            Focus on one primary customer segment per canvas. You can create another canvas for secondary segments later.
          </p>

          {isLoadingSegments && description.length >= 20 && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing product to suggest segments...</span>
            </div>
          )}

          {suggestedSegments.length > 0 && !isLoadingSegments && (
            <div className="mb-4 space-y-2">
              {suggestedSegments.map((segment) => (
                <label
                  key={segment.id}
                  className={`flex items-center p-3 border-2 rounded-md cursor-pointer transition-all ${
                    selectedSegmentId === segment.id
                      ? 'border-accent bg-accent-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="segment"
                    value={segment.id}
                    checked={selectedSegmentId === segment.id && !useCustomSegment}
                    onChange={() => handleSegmentSelect(segment.id)}
                    className="mr-3 text-accent focus:ring-accent"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{segment.label}</div>
                    {segment.type && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {segment.type} • {segment.confidence} confidence
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="mt-4">
            <label
              className={`flex items-center p-3 border-2 rounded-md cursor-pointer transition-all ${
                useCustomSegment
                  ? 'border-accent bg-accent-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="segment"
                checked={useCustomSegment}
                onChange={handleCustomSegmentToggle}
                className="mr-3 text-accent focus:ring-accent"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-2">Custom segment:</div>
                <input
                  type="text"
                  value={customSegment}
                  onChange={(e) => setCustomSegment(e.target.value)}
                  onClick={handleCustomSegmentToggle}
                  placeholder="e.g., Board-certified neurosurgeons in tertiary hospitals"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="productType" className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="text-gray-400">(optional)</span>
          </label>
          <select
            id="productType"
            value={productType}
            onChange={(e) => setProductType(e.target.value as 'product' | 'service' | 'both' | '')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="">Auto-detect from name/description</option>
            <option value="product">Product</option>
            <option value="service">Service/Agency</option>
            <option value="both">Both Product & Service</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Helps adapt phrasing in value propositions. Auto-detection works for most cases.
          </p>
        </div>

        <div>
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Website Link (Optional but Recommended)
          </label>
          <input
            type="url"
            id="websiteUrl"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder="https://example.com"
          />
          <p className="mt-1 text-sm text-gray-500">
            Used to analyze your positioning and product portfolio.
          </p>
        </div>

        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full px-6 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 font-medium flex items-center justify-center gap-2 ${
            isFormValid
              ? 'bg-accent text-white hover:bg-accent-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Start Research & Analysis
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

