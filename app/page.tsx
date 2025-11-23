'use client';

import { useState } from 'react';
import { UserInput } from '@/types';
import InitialInputForm from '@/components/InitialInputForm';
import ResearchProgress from '@/components/ResearchProgress';
import CanvasValidation from '@/components/CanvasValidation';
import ValuePropositions from '@/components/ValuePropositions';
import ProspectUniverse from '@/components/ProspectUniverse';
import { ValuePropositionCanvas, ValuePropositionStatement, ProspectSegment } from '@/types';

type Step = 'input' | 'researching' | 'validating' | 'propositions' | 'universe';

interface StepInfo {
  id: Step;
  name: string;
  number: number;
}

const STEPS: StepInfo[] = [
  { id: 'input', name: 'Product Input', number: 1 },
  { id: 'validating', name: 'Canvas Validation', number: 2 },
  { id: 'propositions', name: 'Value Propositions', number: 3 },
  { id: 'universe', name: 'Prospect Universe', number: 4 },
];

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [userInput, setUserInput] = useState<UserInput | null>(null);
  const [canvas, setCanvas] = useState<ValuePropositionCanvas | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [generatedPropositions, setGeneratedPropositions] = useState<ValuePropositionStatement[] | null>(null);
  const [generatedUniverse, setGeneratedUniverse] = useState<ProspectSegment[] | null>(null);

  const handleInputSubmit = async (input: UserInput) => {
    setUserInput(input);
    setStep('researching');
    
    // Trigger research and canvas generation
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      const data = await response.json();
      setCanvas(data.canvas);
      setStep('validating');
    } catch (error) {
      console.error('Research failed:', error);
      alert('Research failed. Please try again.');
      setStep('input');
    }
  };

  const handleValidationComplete = () => {
    setIsValidated(true);
    setStep('propositions');
  };

  const handlePropositionsComplete = () => {
    setStep('universe');
  };

  // Determine if a step is accessible
  const isStepAccessible = (stepId: Step): boolean => {
    switch (stepId) {
      case 'input':
        return true; // Always accessible
      case 'validating':
        return canvas !== null; // Requires canvas to be generated
      case 'propositions':
        return canvas !== null && isValidated && userInput !== null; // Requires validated canvas
      case 'universe':
        return canvas !== null && isValidated; // Requires validated canvas
      default:
        return false;
    }
  };

  // Handle step navigation
  const handleStepClick = (targetStep: Step) => {
    if (isStepAccessible(targetStep)) {
      setStep(targetStep);
    }
  };

  // Get step status
  const getStepStatus = (stepId: Step): 'current' | 'completed' | 'upcoming' | 'disabled' => {
    // Map 'researching' to 'validating' for status calculation
    const effectiveStep = step === 'researching' ? 'validating' : step;
    const currentStepIndex = STEPS.findIndex(s => s.id === effectiveStep);
    const targetStepIndex = STEPS.findIndex(s => s.id === stepId);
    
    if (stepId === effectiveStep || (step === 'researching' && stepId === 'validating')) {
      return 'current';
    } else if (targetStepIndex < currentStepIndex && targetStepIndex >= 0) {
      return 'completed';
    } else if (isStepAccessible(stepId)) {
      return 'upcoming';
    } else {
      return 'disabled';
    }
  };

  return (
    <main className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Logo */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img 
              src="/logo_Nytro_color.svg" 
              alt="Nytro Logo" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Value Proposition Generator
              </h1>
              <p className="mt-2 text-gray-600">
                Build your strategic value proposition using value mapping framework and Jobs-to-Be-Done methodology
              </p>
            </div>
          </div>
          <p className="mt-4 text-gray-700 max-w-3xl leading-relaxed">
            Choose one clear customer segment and map the job your product truly solves for them. By focusing on a single segment's real pains, outcomes, and buying triggers, you'll generate a sharp value proposition rooted in evidence — and leave with a precise audience you can target with confidence.
          </p>
        </header>

        {/* Progress indicator with clickable steps */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {STEPS.map((stepInfo, idx) => {
              const status = getStepStatus(stepInfo.id);
              const isAccessible = isStepAccessible(stepInfo.id);
              
              return (
                <div key={stepInfo.id} className="flex items-center flex-1 min-w-[200px]">
                  <button
                    onClick={() => handleStepClick(stepInfo.id)}
                    disabled={!isAccessible}
                    className={`flex items-center gap-3 flex-1 group ${
                      !isAccessible ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      status === 'current' ? 'bg-accent text-white ring-4 ring-accent-200' :
                      status === 'completed' ? 'bg-green-600 text-white' :
                      status === 'upcoming' ? 'bg-gray-200 text-gray-600 group-hover:bg-gray-300' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {stepInfo.number}
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${
                        status === 'current' ? 'text-accent' :
                        status === 'completed' ? 'text-green-600' :
                        status === 'upcoming' ? 'text-gray-700' :
                        'text-gray-400'
                      }`}>
                        {stepInfo.name}
                      </div>
                      {status === 'current' && (
                        <div className="text-xs text-gray-500 mt-0.5">Current step</div>
                      )}
                      {status === 'completed' && (
                        <div className="text-xs text-gray-500 mt-0.5">Completed</div>
                      )}
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-12 h-1 mx-2 ${
                      status === 'completed' ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {step === 'input' && (
          <InitialInputForm onSubmit={handleInputSubmit} />
        )}

        {step === 'researching' && (
          <ResearchProgress />
        )}

        {step === 'validating' && canvas && (
          <CanvasValidation 
            canvas={canvas} 
            onCanvasUpdate={setCanvas}
            onComplete={handleValidationComplete}
          />
        )}

        {step === 'propositions' && canvas && userInput && (
          <ValuePropositions 
            canvas={canvas}
            userInput={userInput}
            onComplete={handlePropositionsComplete}
            initialPropositions={generatedPropositions}
            onPropositionsGenerated={setGeneratedPropositions}
          />
        )}

        {step === 'universe' && canvas && (
          <ProspectUniverse 
            canvas={canvas}
            initialSegments={generatedUniverse}
            onSegmentsGenerated={setGeneratedUniverse}
            propositions={generatedPropositions || []}
            userInput={userInput}
          />
        )}
      </div>
    </main>
  );
}

