'use client';

import { useState, useRef, useEffect } from 'react';
import { ValuePropositionCanvas, CustomerJob, CustomerPain, CustomerGain, ConfidenceLevel } from '@/types';
import { Edit2, Trash2, Plus, Check, X } from 'lucide-react';

interface CanvasValidationProps {
  canvas: ValuePropositionCanvas;
  onCanvasUpdate: (canvas: ValuePropositionCanvas) => void;
  onComplete: () => void;
}

const CONFIDENCE_COLORS = {
  high: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-red-100 text-red-800 border-red-300',
};

const VALIDATION_SECTIONS = [
  { id: 'customer-jobs', name: 'Customer Jobs', key: 'customerJobs' as keyof ValuePropositionCanvas },
  { id: 'customer-pains', name: 'Customer Pains', key: 'customerPains' as keyof ValuePropositionCanvas },
  { id: 'customer-gains', name: 'Customer Gains', key: 'customerGains' as keyof ValuePropositionCanvas },
  { id: 'products-services', name: 'Products & Services', key: 'productsServices' as keyof ValuePropositionCanvas },
  { id: 'pain-relievers', name: 'Pain Relievers', key: 'painRelievers' as keyof ValuePropositionCanvas },
  { id: 'gain-creators', name: 'Gain Creators', key: 'gainCreators' as keyof ValuePropositionCanvas },
];

export default function CanvasValidation({ canvas, onCanvasUpdate, onComplete }: CanvasValidationProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [activeSection, setActiveSection] = useState<string>('customer-jobs');
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSave = (section: keyof ValuePropositionCanvas, id: string) => {
    const updated = { ...canvas };
    const sectionArray = updated[section];
    if (Array.isArray(sectionArray)) {
      const item = sectionArray.find((i: any) => i.id === id) as any;
      if (item && typeof item === 'object' && 'text' in item) {
        item.text = editText;
        updated[section] = [...sectionArray] as any;
        onCanvasUpdate(updated);
      }
    }
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (section: keyof ValuePropositionCanvas, id: string) => {
    const updated = { ...canvas };
    const sectionArray = updated[section];
    if (Array.isArray(sectionArray)) {
      updated[section] = sectionArray.filter((i: any) => i.id !== id) as any;
      onCanvasUpdate(updated);
    }
  };

  const handleAdd = (section: keyof ValuePropositionCanvas) => {
    const updated = { ...canvas };
    const sectionArray = updated[section];
    if (Array.isArray(sectionArray)) {
      const newItem = {
        id: `${section}-${Date.now()}`,
        text: '',
        confidence: 'low' as ConfidenceLevel,
      };
      updated[section] = [...sectionArray, newItem] as any;
      onCanvasUpdate(updated);
      setEditingId(newItem.id);
      setEditText('');
    }
  };

  const togglePrioritize = (section: 'customerPains' | 'customerGains', id: string) => {
    const updated = { ...canvas };
    const sectionArray = updated[section];
    if (Array.isArray(sectionArray)) {
      const item = sectionArray.find((i: any) => i.id === id) as CustomerPain | CustomerGain | undefined;
      if (item) {
        const currentlyPrioritized = sectionArray.filter((i: any) => i.isPrioritized);
        
        // If trying to prioritize when already at 3, show warning but allow it
        if (!item.isPrioritized && currentlyPrioritized.length >= 3) {
          const sectionName = section === 'customerPains' ? 'pains' : 'gains';
          // Note: We allow it but will show visual feedback that only first 3 are used
        }
        
        item.isPrioritized = !item.isPrioritized;
        updated[section] = [...sectionArray] as any;
        onCanvasUpdate(updated);
      }
    }
  };

  const prioritizedPains = canvas.customerPains.filter(p => p.isPrioritized);
  const prioritizedGains = canvas.customerGains.filter(g => g.isPrioritized);

  const canProceed = prioritizedPains.length >= 3 && prioritizedGains.length >= 3;

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // Track scroll position to update active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // Offset for sticky nav
      
      for (const section of VALIDATION_SECTIONS) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const renderSection = (
    title: string,
    section: keyof ValuePropositionCanvas,
    items: any[],
    showPrioritize?: boolean,
    sectionId?: string
  ) => {
    const sectionData = VALIDATION_SECTIONS.find(s => s.key === section);
    const id = sectionId || sectionData?.id || section;
    
    // Determine which items are in the "active top 3" (first 3 prioritized)
    const isPainSection = section === 'customerPains';
    const isGainSection = section === 'customerGains';
    let activeTop3Ids: Set<string> = new Set();
    
    if (showPrioritize && (isPainSection || isGainSection)) {
      const prioritizedItems = items.filter((item: any) => item.isPrioritized);
      const activeTop3 = prioritizedItems.slice(0, 3);
      activeTop3Ids = new Set(activeTop3.map((item: any) => item.id));
    }
    
    // Add encouraging text for Customer Pains, Customer Gains, and Pain Relievers
    const getEncouragingText = () => {
      if (section === 'customerPains') {
        return (
          <p className="text-sm text-gray-600 italic mb-4 bg-accent-50 border-l-4 border-accent-400 p-3 rounded">
            💡 <strong>Tip:</strong> Add real pains experienced by your own clients to make this canvas as grounded in facts as possible. Consider specific frustrations, risks, or barriers your customers have shared with you.
          </p>
        );
      }
      if (section === 'customerGains') {
        return (
          <p className="text-sm text-gray-600 italic mb-4 bg-accent-50 border-l-4 border-accent-400 p-3 rounded">
            💡 <strong>Tip:</strong> Add real gains achieved by your own clients to make this canvas as grounded in facts as possible. Consider specific outcomes, benefits, or results your customers have experienced with your product or service.
          </p>
        );
      }
      if (section === 'painRelievers') {
        return (
          <p className="text-sm text-gray-600 italic mb-4 bg-accent-50 border-l-4 border-accent-400 p-3 rounded">
            💡 <strong>Tip:</strong> Add real pain relievers based on how your product or service actually addresses client pains. Describe the concrete mechanisms and solutions you've implemented based on real customer feedback.
          </p>
        );
      }
      return null;
    };
    
    return (
    <div 
      id={id}
      ref={(el) => { sectionRefs.current[id] = el; }}
      className="bg-gray-50 rounded-lg p-6 scroll-mt-24"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => handleAdd(section)}
          className="text-sm text-accent hover:text-accent-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
      {getEncouragingText()}
      <div className="space-y-3">
        {items.map((item) => {
          const isPrioritized = item.isPrioritized;
          const isInActiveTop3 = isPrioritized && activeTop3Ids.has(item.id);
          const isPrioritizedButNotActive = isPrioritized && !isInActiveTop3;
          
          // Get position in prioritized list
          const prioritizedItems = items.filter((i: any) => i.isPrioritized);
          const position = isPrioritized ? prioritizedItems.findIndex((i: any) => i.id === item.id) + 1 : null;
          
          return (
            <div
              key={item.id}
              className={`bg-white border rounded-md p-4 flex items-start justify-between gap-3 relative ${
                isInActiveTop3 
                  ? 'border-green-400 border-2 bg-green-50' 
                  : isPrioritizedButNotActive
                  ? 'border-yellow-300 border-2 bg-yellow-50 opacity-75'
                  : 'border-gray-200'
              }`}
            >
              {editingId === item.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSave(section, item.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-gray-900">{item.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded border ${CONFIDENCE_COLORS[item.confidence as ConfidenceLevel]}`}>
                        {item.confidence} confidence
                      </span>
                      {item.source && (
                        <span className="text-xs text-gray-500">Source: {item.source}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showPrioritize && (
                      <button
                        onClick={() => togglePrioritize(section as any, item.id)}
                        disabled={!item.isPrioritized && 
                          (isPainSection 
                            ? prioritizedPains.length >= 3 
                            : prioritizedGains.length >= 3)}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${
                          item.isPrioritized
                            ? 'bg-accent text-white'
                            : !item.isPrioritized && 
                              (isPainSection 
                                ? prioritizedPains.length >= 3 
                                : prioritizedGains.length >= 3)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={
                          !item.isPrioritized && 
                          (isPainSection 
                            ? prioritizedPains.length >= 3 
                            : prioritizedGains.length >= 3)
                            ? 'Maximum 3 items can be prioritized. Deselect one first.'
                            : item.isPrioritized 
                            ? 'Click to remove from top 3'
                            : 'Click to add to top 3'
                        }
                      >
                        {item.isPrioritized ? 'Top 3' : 'Prioritize'}
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(item.id, item.text)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(section, item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {isInActiveTop3 && (
                    <div className="absolute top-2 right-2">
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded font-medium">
                        #{position} of 3
                      </span>
                    </div>
                  )}
                  {isPrioritizedButNotActive && (
                    <div className="absolute top-2 right-2">
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                        Not in top 3
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Validate & Refine Your Canvas
        </h2>
        <p className="text-gray-600 mb-6">
          Review, edit, delete, or add items. You must prioritize exactly 3 pains and 3 gains before proceeding.
        </p>

        {/* Navigation Menu */}
        <div className="sticky top-4 z-10 bg-white border border-gray-200 rounded-lg p-4 mb-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Navigate to:</span>
            {VALIDATION_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeSection === section.id
                    ? 'bg-accent text-white font-medium'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-md font-semibold text-gray-700 mb-4">Customer Profile</h3>
            {renderSection('Customer Jobs', 'customerJobs', canvas.customerJobs, false, 'customer-jobs')}
            <div className="mt-6">
              {renderSection('Customer Pains', 'customerPains', canvas.customerPains, true, 'customer-pains')}
            </div>
            <div className="mt-6">
              {renderSection('Customer Gains', 'customerGains', canvas.customerGains, true, 'customer-gains')}
            </div>
          </div>

          <div>
            <h3 className="text-md font-semibold text-gray-700 mb-4">Value Map</h3>
            {renderSection('Products & Services', 'productsServices', canvas.productsServices, false, 'products-services')}
            <div className="mt-6">
              {renderSection('Pain Relievers', 'painRelievers', canvas.painRelievers, false, 'pain-relievers')}
            </div>
            <div className="mt-6">
              {renderSection('Gain Creators', 'gainCreators', canvas.gainCreators, false, 'gain-creators')}
            </div>
          </div>
        </div>

        <div className={`border rounded-md p-4 mb-6 ${
          prioritizedPains.length > 3 || prioritizedGains.length > 3
            ? 'bg-yellow-50 border-yellow-300'
            : prioritizedPains.length === 3 && prioritizedGains.length === 3
            ? 'bg-green-50 border-green-300'
            : 'bg-accent-50 border-accent-200'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="font-medium text-accent-900">
                Prioritization Status
              </p>
              <div className="group relative">
                <span className="text-accent-600 cursor-help text-sm">ℹ️</span>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Select exactly 3 pains and 3 gains that are most important for your value proposition. Only these will be used to generate your value propositions.
                </div>
              </div>
            </div>
            
            {(prioritizedPains.length > 3 || prioritizedGains.length > 3) && (
              <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Only the first 3 selected items will be used for value propositions.
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  {prioritizedPains.length > 3 && (
                    <span>{prioritizedPains.length - 3} pain{prioritizedPains.length - 3 > 1 ? 's' : ''} will be ignored. </span>
                  )}
                  {prioritizedGains.length > 3 && (
                    <span>{prioritizedGains.length - 3} gain{prioritizedGains.length - 3 > 1 ? 's' : ''} will be ignored.</span>
                  )}
                </p>
              </div>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-accent-900">Pains</span>
                <span className={`text-sm font-medium ${
                  prioritizedPains.length === 3 ? 'text-green-700' : 
                  prioritizedPains.length > 3 ? 'text-yellow-700' : 
                  'text-accent-700'
                }`}>
                  {prioritizedPains.length}/3
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    prioritizedPains.length === 3 ? 'bg-green-500' : 
                    prioritizedPains.length > 3 ? 'bg-yellow-500' : 
                    'bg-accent-500'
                  }`}
                  style={{ width: `${Math.min((prioritizedPains.length / 3) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-accent-900">Gains</span>
                <span className={`text-sm font-medium ${
                  prioritizedGains.length === 3 ? 'text-green-700' : 
                  prioritizedGains.length > 3 ? 'text-yellow-700' : 
                  'text-accent-700'
                }`}>
                  {prioritizedGains.length}/3
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    prioritizedGains.length === 3 ? 'bg-green-500' : 
                    prioritizedGains.length > 3 ? 'bg-yellow-500' : 
                    'bg-accent-500'
                  }`}
                  style={{ width: `${Math.min((prioritizedGains.length / 3) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            {canProceed && prioritizedPains.length === 3 && prioritizedGains.length === 3 && (
              <div className="pt-2 border-t border-accent-200">
                <span className="text-green-700 font-medium text-sm">✓ Ready to proceed</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onComplete}
          disabled={!canProceed}
          className={`w-full py-3 rounded-md font-medium ${
            canProceed
              ? 'bg-accent text-white hover:bg-accent-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Value Propositions
        </button>
      </div>
    </div>
  );
}

