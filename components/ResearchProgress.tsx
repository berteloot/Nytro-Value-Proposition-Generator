'use client';

import { Loader2 } from 'lucide-react';

export default function ResearchProgress() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Conducting Research & Analysis
        </h2>
        <p className="text-gray-600 text-center max-w-md">
          We're analyzing your product, researching the market, identifying customer jobs, pains, and gains, 
          and mapping competitive alternatives. This may take a minute...
        </p>
        <div className="mt-8 w-full max-w-md">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm text-gray-700">Scraping website and gathering product information</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="text-sm text-gray-700">Researching market and competitive landscape</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              <span className="text-sm text-gray-700">Identifying customer jobs-to-be-done</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
              <span className="text-sm text-gray-700">Mapping pains and gains</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.8s' }} />
              <span className="text-sm text-gray-700">Building Value Mapping Framework</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


