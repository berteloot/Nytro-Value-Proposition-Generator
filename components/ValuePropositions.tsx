'use client';

import { useState, useEffect } from 'react';
import { ValuePropositionCanvas, ValuePropositionStatement, UserInput } from '@/types';
import { ArrowRight, Edit2, Check, X } from 'lucide-react';

interface ValuePropositionsProps {
  canvas: ValuePropositionCanvas;
  userInput: UserInput;
  onComplete: () => void;
  initialPropositions?: ValuePropositionStatement[] | null;
  onPropositionsGenerated?: (propositions: ValuePropositionStatement[]) => void;
}

export default function ValuePropositions({ 
  canvas, 
  userInput, 
  onComplete,
  initialPropositions,
  onPropositionsGenerated
}: ValuePropositionsProps) {
  const [propositions, setPropositions] = useState<ValuePropositionStatement[]>(initialPropositions || []);
  const [loading, setLoading] = useState(!initialPropositions);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    // Only generate if we don't have initial propositions
    if (!initialPropositions) {
      generatePropositions();
    }
  }, []);

  const generatePropositions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-propositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas, userInput }),
      });
      const data = await response.json();
      setPropositions(data.propositions);
      // Notify parent component of generated propositions
      if (onPropositionsGenerated) {
        onPropositionsGenerated(data.propositions);
      }
    } catch (error) {
      console.error('Failed to generate propositions:', error);
      alert('Failed to generate value propositions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (propId: string, field: string, currentValue: string | string[]) => {
    const value = Array.isArray(currentValue) ? currentValue.join('\n') : currentValue;
    setEditingField({ id: propId, field });
    setEditValue(value);
  };

  const handleSaveEdit = (propId: string, field: string) => {
    const updatedPropositions = propositions.map(prop => {
      if (prop.id === propId) {
        const updated = { ...prop };
        if (field === 'painsRelieved' || field === 'gainsCreated') {
          // Convert text back to IDs if possible, otherwise keep as text array
          const textValues = editValue.split('\n').filter(line => line.trim() !== '');
          if (field === 'painsRelieved') {
            // Try to map back to IDs
            const ids = textValues.map(text => {
              const pain = canvas.customerPains.find(p => p.text === text);
              return pain ? pain.id : text;
            });
            (updated as any).keyPainsRelieved = ids;
            (updated as any).painsRelieved = textValues; // Keep for backward compatibility
          } else {
            const ids = textValues.map(text => {
              const gain = canvas.customerGains.find(g => g.text === text);
              return gain ? gain.id : text;
            });
            (updated as any).keyGainsCreated = ids;
            (updated as any).gainsCreated = textValues; // Keep for backward compatibility
          }
        } else {
          // Handle field name mappings
          if (field === 'segmentTargeted') {
            (updated as any).segmentTargeted = editValue;
            // Keep old field for backward compatibility
            if (!(updated as any).segment) {
              (updated as any).segment = editValue;
            }
          } else if (field === 'primaryJob') {
            (updated as any).primaryJob = editValue;
            // Keep old field for backward compatibility
            if (!(updated as any).mainJob) {
              (updated as any).mainJob = editValue;
            }
          } else if (field === 'measurableImpact') {
            (updated as any).measurableImpact = editValue;
            // Keep old field for backward compatibility
            if (!(updated as any).measurable) {
              (updated as any).measurable = editValue;
            }
          } else {
            (updated as any)[field] = editValue;
          }
        }
        return updated;
      }
      return prop;
    });
    
    setPropositions(updatedPropositions);
    // Notify parent of updated propositions
    if (onPropositionsGenerated) {
      onPropositionsGenerated(updatedPropositions);
    }
    setEditingField(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };


  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Generating value propositions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Value Proposition Statements
          </h2>
          <p className="text-gray-600 mt-2">
            Review and refine your value propositions. Each focuses on one segment, one main job, and one core outcome.
          </p>
        </div>

        <div className="space-y-6">
          {propositions.map((prop, idx) => (
            <div
              key={prop.id}
              className="border border-gray-200 rounded-lg p-6 bg-gray-50"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Value Proposition {idx + 1}
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-700">Statement</h4>
                    {editingField?.id === prop.id && editingField?.field === 'statement' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(prop.id, 'statement')}
                          className="text-green-600 hover:text-green-700"
                          title="Sauvegarder"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-700"
                          title="Annuler"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(prop.id, 'statement', prop.statement)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Éditer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {editingField?.id === prop.id && editingField?.field === 'statement' ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-lg font-medium text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <p className="text-lg text-gray-900 font-medium">{prop.statement}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-700">Segment Targeted</h4>
                      {editingField?.id === prop.id && editingField?.field === 'segmentTargeted' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(prop.id, 'segmentTargeted')}
                            className="text-green-600 hover:text-green-700"
                            title="Sauvegarder"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-red-600 hover:text-red-700"
                            title="Annuler"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                      <button
                        onClick={() => handleStartEdit(prop.id, 'segmentTargeted', prop.segmentTargeted)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Éditer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {editingField?.id === prop.id && editingField?.field === 'segmentTargeted' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                      autoFocus
                    />
                  ) : (
                    <p className="text-gray-900">{prop.segmentTargeted}</p>
                  )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-700">Main Job</h4>
                      {editingField?.id === prop.id && editingField?.field === 'primaryJob' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(prop.id, 'primaryJob')}
                            className="text-green-600 hover:text-green-700"
                            title="Sauvegarder"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-red-600 hover:text-red-700"
                            title="Annuler"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                      <button
                        onClick={() => handleStartEdit(prop.id, 'primaryJob', prop.primaryJob)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Éditer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {editingField?.id === prop.id && editingField?.field === 'primaryJob' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                      autoFocus
                    />
                  ) : (
                    <p className="text-gray-900">{prop.primaryJob}</p>
                  )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-700">Core Outcome</h4>
                      {editingField?.id === prop.id && editingField?.field === 'coreOutcome' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(prop.id, 'coreOutcome')}
                            className="text-green-600 hover:text-green-700"
                            title="Sauvegarder"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-red-600 hover:text-red-700"
                            title="Annuler"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(prop.id, 'coreOutcome', prop.coreOutcome)}
                          className="text-gray-500 hover:text-gray-700"
                          title="Éditer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {editingField?.id === prop.id && editingField?.field === 'coreOutcome' ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                        autoFocus
                      />
                    ) : (
                      <p className="text-gray-900">{prop.coreOutcome}</p>
                    )}
                  </div>
                  {(prop.measurableImpact) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-700">Measurable Impact</h4>
                        {editingField?.id === prop.id && editingField?.field === 'measurableImpact' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(prop.id, 'measurableImpact')}
                              className="text-green-600 hover:text-green-700"
                              title="Sauvegarder"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-700"
                              title="Annuler"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(prop.id, 'measurableImpact', prop.measurableImpact || '')}
                            className="text-gray-500 hover:text-gray-700"
                            title="Éditer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {editingField?.id === prop.id && editingField?.field === 'measurableImpact' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                          autoFocus
                        />
                      ) : (
                        <p className="text-gray-900">{prop.measurableImpact}</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Key Pains Relieved</h4>
                    {editingField?.id === prop.id && editingField?.field === 'painsRelieved' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(prop.id, 'painsRelieved')}
                          className="text-green-600 hover:text-green-700"
                          title="Sauvegarder"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-700"
                          title="Annuler"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const pains = prop.keyPainsRelieved 
                            ? prop.keyPainsRelieved.map(id => {
                                const pain = canvas.customerPains.find(p => p.id === id);
                                return pain ? pain.text : id;
                              }).join('\n')
                            : '';
                          handleStartEdit(prop.id, 'painsRelieved', pains);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                        title="Éditer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {editingField?.id === prop.id && editingField?.field === 'painsRelieved' ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                      rows={4}
                      placeholder="Un élément par ligne"
                      autoFocus
                    />
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-gray-900">
                      {(() => {
                        // Handle both old format (text array) and new format (ID array)
                        const pains = prop.keyPainsRelieved 
                          ? prop.keyPainsRelieved.map(id => {
                              const pain = canvas.customerPains.find(p => p.id === id);
                              return pain ? pain.text : id;
                            })
                          : (prop.keyPainsRelieved || []);
                        return pains.length > 0 ? pains.map((pain, i) => (
                          <li key={i}>{pain}</li>
                        )) : <li className="text-gray-500 italic">No pains specified</li>;
                      })()}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Key Gains Created</h4>
                    {editingField?.id === prop.id && editingField?.field === 'gainsCreated' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(prop.id, 'gainsCreated')}
                          className="text-green-600 hover:text-green-700"
                          title="Sauvegarder"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-700"
                          title="Annuler"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const gains = prop.keyGainsCreated 
                            ? prop.keyGainsCreated.map(id => {
                                const gain = canvas.customerGains.find(g => g.id === id);
                                return gain ? gain.text : id;
                              }).join('\n')
                            : '';
                          handleStartEdit(prop.id, 'gainsCreated', gains);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                        title="Éditer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {editingField?.id === prop.id && editingField?.field === 'gainsCreated' ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                      rows={4}
                      placeholder="Un élément par ligne"
                      autoFocus
                    />
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-gray-900">
                      {(() => {
                        // Handle both old format (text array) and new format (ID array)
                        const gains = prop.keyGainsCreated 
                          ? prop.keyGainsCreated.map(id => {
                              const gain = canvas.customerGains.find(g => g.id === id);
                              return gain ? gain.text : id;
                            })
                          : (prop.keyGainsCreated || []);
                        return gains.length > 0 ? gains.map((gain, i) => (
                          <li key={i}>{gain}</li>
                        )) : <li className="text-gray-500 italic">No gains specified</li>;
                      })()}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-700">Competitive Contrast</h4>
                    {editingField?.id === prop.id && editingField?.field === 'competitiveContrast' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(prop.id, 'competitiveContrast')}
                          className="text-green-600 hover:text-green-700"
                          title="Sauvegarder"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-700"
                          title="Annuler"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(prop.id, 'competitiveContrast', prop.competitiveContrast)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Éditer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {editingField?.id === prop.id && editingField?.field === 'competitiveContrast' ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <p className="text-gray-900">{prop.competitiveContrast}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onComplete}
          className="mt-8 w-full bg-accent text-white px-6 py-3 rounded-md hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 font-medium flex items-center justify-center gap-2"
        >
          Continue to Prospect Universe
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

