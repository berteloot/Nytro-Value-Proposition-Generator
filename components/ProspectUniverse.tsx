'use client';

import { useState, useEffect } from 'react';
import { ValuePropositionCanvas, ProspectSegment, ValuePropositionStatement, UserInput } from '@/types';
import { ExternalLink, Mail, X } from 'lucide-react';

interface ProspectUniverseProps {
  canvas: ValuePropositionCanvas;
  initialSegments?: ProspectSegment[] | null;
  onSegmentsGenerated?: (segments: ProspectSegment[]) => void;
  propositions?: ValuePropositionStatement[];
  userInput?: UserInput;
}

export default function ProspectUniverse({ 
  canvas,
  initialSegments,
  onSegmentsGenerated,
  propositions = [],
  userInput
}: ProspectUniverseProps) {
  const [segments, setSegments] = useState<ProspectSegment[]>(initialSegments || []);
  const [loading, setLoading] = useState(!initialSegments);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);


  useEffect(() => {
    // Only generate if we don't have initial segments
    if (!initialSegments) {
      generateUniverse();
    }
  }, []);

  const generateUniverse = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-universe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas }),
      });
      const data = await response.json();
      setSegments(data.segments);
      // Notify parent component of generated segments
      if (onSegmentsGenerated) {
        onSegmentsGenerated(data.segments);
      }
    } catch (error) {
      console.error('Failed to generate prospect universe:', error);
      alert('Failed to generate prospect universe. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  const handleEventClick = (eventName: string) => {
    // Create a Google search URL for the event
    const searchQuery = encodeURIComponent(`${eventName} conference event`);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    if (!userInput || !propositions || propositions.length === 0) {
      alert('Missing required data to send email');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: emailAddress,
            canvas,
            propositions,
            segments,
            userInput,
          }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEmailSent(true);
        setEmailAddress('');
        setTimeout(() => {
          setEmailModalOpen(false);
          setEmailSent(false);
        }, 2000);
      } else {
        alert(data.error || 'Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Generating prospect universe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Email CTA Banner */}
      <div className="bg-gradient-to-r from-accent to-accent-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">Get Your Complete Report via Email</h3>
            <p className="text-accent-100">
              Receive a beautifully formatted email with your complete value mapping report, including all value propositions, customer insights, and prospect segments.
            </p>
          </div>
          <button
            onClick={() => setEmailModalOpen(true)}
            className="ml-6 px-6 py-3 bg-white text-accent rounded-md font-semibold hover:bg-accent-50 transition-colors flex items-center gap-2 shadow-md"
          >
            <Mail className="w-5 h-5" />
            Send Report via Email
          </button>
        </div>
      </div>

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-gray-900">Send Report via Email</h3>
              <button
                onClick={() => {
                  setEmailModalOpen(false);
                  setEmailAddress('');
                  setEmailSent(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {emailSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">Email Sent Successfully!</p>
                <p className="text-gray-600">Check your inbox for the complete report.</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  Enter your email address to receive a beautifully formatted report with all your value proposition insights.
                </p>
                <div className="mb-6">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                    disabled={sendingEmail}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !emailAddress}
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                      sendingEmail || !emailAddress
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-accent text-white hover:bg-accent-600'
                    }`}
                  >
                    {sendingEmail ? 'Sending...' : 'Send Report'}
                  </button>
                  <button
                    onClick={() => {
                      setEmailModalOpen(false);
                      setEmailAddress('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={sendingEmail}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Prospect Universe
          </h2>
          <p className="text-gray-600 mt-2">
            Targetable segments ready for B2B lead generation and list building.
          </p>
        </div>

        <div className="space-y-8">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="border border-gray-200 rounded-lg p-6 bg-gray-50"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {segment.name}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Job Titles
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {segment.jobTitles.map((title, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-900"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Industries
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {segment.industries.map((industry, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-900"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>

                {segment.companySize && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Company Size</h4>
                    <div className="flex flex-wrap gap-2">
                      {segment.companySize.map((size, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-900"
                        >
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Buying Triggers</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
                    {segment.buyingTriggers.map((trigger, i) => (
                      <li key={i}>{trigger}</li>
                    ))}
                  </ul>
                </div>

                {segment.toolsInStack && segment.toolsInStack.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tools in Stack</h4>
                    <div className="flex flex-wrap gap-2">
                      {segment.toolsInStack.map((tool, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-900"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {segment.keywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-900"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Hashtags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {segment.hashtags.map((hashtag, i) => {
                      const tag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
                      return (
                        <span
                          key={i}
                          className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-900"
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {segment.events && segment.events.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Events
                      <span className="text-xs text-gray-500 font-normal">(click to search)</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {segment.events.map((event, i) => (
                        <button
                          key={i}
                          onClick={() => handleEventClick(event)}
                          className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-900 hover:bg-accent-50 hover:border-accent-300 hover:text-accent-700 transition-colors cursor-pointer flex items-center gap-1.5 group"
                          title={`Search for "${event}" on Google`}
                        >
                          {event}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

