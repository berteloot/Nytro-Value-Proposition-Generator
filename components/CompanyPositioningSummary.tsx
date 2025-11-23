'use client';

import { useState, useEffect } from 'react';
import { CompanyPositioningSummary as CompanyPositioningSummaryType } from '@/types';
import { Edit2, Check, X, Plus } from 'lucide-react';

interface CompanyPositioningSummaryProps {
  companyPositioning: CompanyPositioningSummaryType;
  onPositioningUpdate?: (updated: CompanyPositioningSummaryType) => void;
  suggestedSegments?: string[]; // Optional: segments from prospect universe or other sources
  onRegenerate?: (segments: string[]) => void; // Callback to regenerate summary with new segments
}

export default function CompanyPositioningSummary({ 
  companyPositioning: initialPositioning,
  onPositioningUpdate,
  suggestedSegments = [],
  onRegenerate
}: CompanyPositioningSummaryProps) {
  const [positioning, setPositioning] = useState<CompanyPositioningSummaryType>(initialPositioning);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [newSegmentInput, setNewSegmentInput] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Helper function to check if a segment is already selected (case-insensitive)
  const isSegmentSelected = (segment: string): boolean => {
    const normalizedSegment = segment.trim().toLowerCase();
    return positioning.primarySegments.some(
      selected => selected.trim().toLowerCase() === normalizedSegment
    );
  };

  // Get filtered suggestions (not already selected, case-insensitive)
  const getFilteredSuggestions = () => {
    return suggestedSegments
      .filter(s => s && s.trim() && !isSegmentSelected(s))
      .map(s => s.trim());
  };

  // Get autocomplete suggestions based on input
  const getAutocompleteSuggestions = () => {
    if (!newSegmentInput.trim()) return [];
    const inputLower = newSegmentInput.trim().toLowerCase();
    return getFilteredSuggestions()
      .filter(s => s.toLowerCase().includes(inputLower))
      .slice(0, 5);
  };

  // Sync positioning when initialPositioning prop changes
  useEffect(() => {
    console.log('CompanyPositioningSummary: initialPositioning changed', {
      segments: initialPositioning.primarySegments,
      timestamp: new Date().toISOString()
    });
    setPositioning(initialPositioning);
    setHasChanges(false);
  }, [initialPositioning]);

  const handleStartEdit = (field: string, currentValue: string | string[]) => {
    const value = Array.isArray(currentValue) ? currentValue.join('\n') : currentValue;
    setEditingField(field);
    setEditValue(value);
  };

  const handleSaveEdit = (field: string) => {
    const updated = { ...positioning };
    
    if (field === 'sharedPains' || field === 'sharedGains' || field === 'sharedDifferentiators' || field === 'primarySegments') {
      const textValues = editValue.split('\n').filter(line => line.trim() !== '');
      (updated as any)[field] = textValues;
      if (field === 'primarySegments') {
        setHasChanges(true);
      }
    } else {
      (updated as any)[field] = editValue;
    }
    
    setPositioning(updated);
    if (onPositioningUpdate) {
      onPositioningUpdate(updated);
    }
    setEditingField(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setNewSegmentInput('');
  };

  const handleAddSegment = (segmentToAdd?: string) => {
    const segment = segmentToAdd || newSegmentInput.trim();
    if (!segment) return;
    
    const trimmedSegment = segment.trim();
    
    // Check for duplicates (case-insensitive)
    if (isSegmentSelected(trimmedSegment)) {
      return; // Already selected, don't add
    }
    
    const updated = { ...positioning };
    updated.primarySegments = [...updated.primarySegments, trimmedSegment];
    setPositioning(updated);
    setHasChanges(true);
    if (onPositioningUpdate) {
      onPositioningUpdate(updated);
    }
    
    setNewSegmentInput('');
    setShowAutocomplete(false);
  };

  const handleRemoveSegment = (segmentToRemove: string) => {
    const updated = { ...positioning };
    updated.primarySegments = updated.primarySegments.filter(s => s !== segmentToRemove);
    setPositioning(updated);
    setHasChanges(true);
    if (onPositioningUpdate) {
      onPositioningUpdate(updated);
    }
  };

  const handleRegenerate = async () => {
    if (onRegenerate) {
      console.log('Regenerate button clicked with segments:', positioning.primarySegments);
      setIsRegenerating(true);
      try {
        await onRegenerate(positioning.primarySegments);
        setHasChanges(false);
      } catch (error) {
        console.error('Error during regeneration:', error);
      } finally {
        setIsRegenerating(false);
      }
    } else {
      console.warn('onRegenerate callback not provided');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const autocompleteSuggestions = getAutocompleteSuggestions();
      if (autocompleteSuggestions.length > 0 && showAutocomplete) {
        // If there's a matching suggestion, use the first one
        handleAddSegment(autocompleteSuggestions[0]);
      } else {
        handleAddSegment();
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSegmentInput(e.target.value);
    setShowAutocomplete(e.target.value.trim().length > 0);
  };

  const handleInputFocus = () => {
    if (newSegmentInput.trim().length > 0) {
      setShowAutocomplete(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding autocomplete to allow clicks on suggestions
    setTimeout(() => setShowAutocomplete(false), 200);
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Company Positioning Summary
        </h2>
        <p className="text-gray-600 mt-2">
          A synthesized overview of your company's positioning aggregated across {positioning.primarySegments.length > 1 ? 'multiple segments' : 'your value proposition canvas'}. 
          {positioning.primarySegments.length > 1 && ' This summary combines insights from all segments to create a unified company positioning.'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Overarching Promise */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Overarching Promise
            </h3>
            {editingField === 'overarchingPromise' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit('overarchingPromise')}
                  className="text-green-600 hover:text-green-700"
                  title="Save"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-red-600 hover:text-red-700"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleStartEdit('overarchingPromise', positioning.overarchingPromise)}
                className="text-gray-500 hover:text-gray-700"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {editingField === 'overarchingPromise' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-lg text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
              rows={2}
              autoFocus
            />
          ) : (
            <p className="text-gray-700 text-lg leading-relaxed">
              {positioning.overarchingPromise}
            </p>
          )}
        </div>

        {/* Positioning Statement */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Positioning Statement
            </h3>
            {editingField === 'positioningStatement' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit('positioningStatement')}
                  className="text-green-600 hover:text-green-700"
                  title="Save"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-red-600 hover:text-red-700"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleStartEdit('positioningStatement', positioning.positioningStatement)}
                className="text-gray-500 hover:text-gray-700"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {editingField === 'positioningStatement' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
              rows={3}
              autoFocus
            />
          ) : (
            <p className="text-gray-700 leading-relaxed">
              {positioning.positioningStatement}
            </p>
          )}
        </div>

        {/* Unified Job Statement */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Unified Job Statement
            </h3>
            {editingField === 'unifiedJobStatement' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit('unifiedJobStatement')}
                  className="text-green-600 hover:text-green-700"
                  title="Save"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-red-600 hover:text-red-700"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleStartEdit('unifiedJobStatement', positioning.unifiedJobStatement)}
                className="text-gray-500 hover:text-gray-700"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {editingField === 'unifiedJobStatement' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
              rows={2}
              autoFocus
            />
          ) : (
            <p className="text-gray-700">
              {positioning.unifiedJobStatement}
            </p>
          )}
        </div>

        {/* Shared Elements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Shared Pains */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Shared Pains
                {positioning.primarySegments.length > 1 && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    (aggregated across {positioning.primarySegments.length} segments)
                  </span>
                )}
              </h3>
              {editingField === 'sharedPains' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit('sharedPains')}
                    className="text-green-600 hover:text-green-700"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-red-600 hover:text-red-700"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleStartEdit('sharedPains', positioning.sharedPains)}
                  className="text-gray-500 hover:text-gray-700"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {editingField === 'sharedPains' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                rows={4}
                placeholder="One item per line"
                autoFocus
              />
            ) : positioning.sharedPains.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {positioning.sharedPains.map((pain, idx) => (
                  <li key={idx}>{pain}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-sm">No shared pains identified</p>
            )}
          </div>

          {/* Shared Gains */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Shared Gains
                {positioning.primarySegments.length > 1 && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    (aggregated across {positioning.primarySegments.length} segments)
                  </span>
                )}
              </h3>
              {editingField === 'sharedGains' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit('sharedGains')}
                    className="text-green-600 hover:text-green-700"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-red-600 hover:text-red-700"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleStartEdit('sharedGains', positioning.sharedGains)}
                  className="text-gray-500 hover:text-gray-700"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {editingField === 'sharedGains' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                rows={4}
                placeholder="One item per line"
                autoFocus
              />
            ) : positioning.sharedGains.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {positioning.sharedGains.map((gain, idx) => (
                  <li key={idx}>{gain}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-sm">No shared gains identified</p>
            )}
          </div>

          {/* Shared Differentiators */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Shared Differentiators
                {positioning.primarySegments.length > 1 && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    (from {positioning.primarySegments.length} segments)
                  </span>
                )}
              </h3>
              {editingField === 'sharedDifferentiators' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit('sharedDifferentiators')}
                    className="text-green-600 hover:text-green-700"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-red-600 hover:text-red-700"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleStartEdit('sharedDifferentiators', positioning.sharedDifferentiators)}
                  className="text-gray-500 hover:text-gray-700"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {editingField === 'sharedDifferentiators' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                rows={4}
                placeholder="One item per line"
                autoFocus
              />
            ) : positioning.sharedDifferentiators.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {positioning.sharedDifferentiators.map((diff, idx) => (
                  <li key={idx}>{diff}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-sm">No differentiators identified</p>
            )}
          </div>
        </div>

        {/* Primary Segments */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Currently Based on Segment(s)
            </h3>
          </div>
          
          {/* Segments Display */}
          {positioning.primarySegments.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {positioning.primarySegments.map((segment, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-accent-100 text-accent-800 group"
                >
                  {segment}
                  <button
                    onClick={() => handleRemoveSegment(segment)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-accent hover:text-accent-800"
                    title="Remove segment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-sm mb-3">No segments specified. Add a segment below.</p>
          )}

          {/* Add Segment Input */}
          <div className="space-y-2 relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newSegmentInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Add a new segment (e.g., CMOs in technology-driven enterprises)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                
                {/* Autocomplete Dropdown */}
                {showAutocomplete && getAutocompleteSuggestions().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {getAutocompleteSuggestions().map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddSegment(suggestion)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-accent-50 focus:bg-accent-50 focus:outline-none"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleAddSegment()}
                disabled={!newSegmentInput.trim()}
                className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                title="Add segment"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            
            {/* Suggested Segments (Quick Add) */}
            {getFilteredSuggestions().length > 0 && newSegmentInput.trim().length === 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-gray-500">Quick add:</span>
                {getFilteredSuggestions()
                  .slice(0, 5)
                  .map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddSegment(suggestion)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Alternative: Bulk Edit Option */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {positioning.primarySegments.length === 1 
                  ? 'When you add more segments in the future, the summary will automatically aggregate insights across all canvases.'
                  : positioning.primarySegments.length > 1
                  ? `This summary aggregates insights from ${positioning.primarySegments.length} segments.`
                  : 'Add segments to build a multi-segment company positioning.'}
              </p>
              {editingField !== 'primarySegments' && (
                <button
                  onClick={() => handleStartEdit('primarySegments', positioning.primarySegments)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  title="Bulk edit (one per line)"
                >
                  <Edit2 className="w-3 h-3" />
                  Bulk edit
                </button>
              )}
            </div>
            
            {/* Regenerate Button */}
            {hasChanges && onRegenerate && (
              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className={`w-full px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 text-sm font-medium ${
                    isRegenerating
                      ? 'bg-accent-400 text-white cursor-not-allowed'
                      : 'bg-accent text-white hover:bg-accent-600'
                  }`}
                >
                  {isRegenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Regenerating...</span>
                    </>
                  ) : (
                    <span>Regenerate Summary with Updated Segments</span>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {isRegenerating 
                    ? 'Aggregating data across all segments...'
                    : 'Update the company positioning summary based on the current segments'}
                </p>
              </div>
            )}
          </div>

          {/* Bulk Edit Mode */}
          {editingField === 'primarySegments' && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Bulk Edit (one segment per line)</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit('primarySegments')}
                    className="text-green-600 hover:text-green-700"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-red-600 hover:text-red-700"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                rows={4}
                placeholder="One segment per line"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

