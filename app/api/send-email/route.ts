import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { ValuePropositionCanvas, ValuePropositionStatement, ProspectSegment, UserInput, CompanyPositioningSummary } from '@/types';
import { createHubSpotLead } from '@/lib/hubspot';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SendEmailRequest {
  toEmail: string;
  canvas: ValuePropositionCanvas;
  propositions: ValuePropositionStatement[];
  segments: ProspectSegment[];
  userInput: UserInput;
  companyPositioning?: CompanyPositioningSummary;
}

function formatEmailContent(
  canvas: ValuePropositionCanvas,
  propositions: ValuePropositionStatement[],
  segments: ProspectSegment[],
  userInput: UserInput,
  companyPositioning?: CompanyPositioningSummary
): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #F96E11;
      padding-bottom: 10px;
    }
    h2 {
      color: #2c3e50;
      margin-top: 30px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 5px;
    }
    h3 {
      color: #34495e;
      margin-top: 20px;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      background-color: #f9f9f9;
      border-left: 4px solid #F96E11;
    }
    .item {
      margin: 10px 0;
      padding: 8px;
      background-color: white;
      border-radius: 4px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 0.85em;
      margin-left: 10px;
    }
    .badge-high { background-color: #d4edda; color: #155724; }
    .badge-medium { background-color: #fff3cd; color: #856404; }
    .badge-low { background-color: #f8d7da; color: #721c24; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
    .proposition {
      margin: 20px 0;
      padding: 15px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 5px;
    }
    .segment {
      margin: 20px 0;
      padding: 15px;
      background-color: #f5f5f5;
      border-left: 4px solid #3498db;
      border-radius: 5px;
    }
    .tag {
      display: inline-block;
      padding: 4px 10px;
      margin: 3px;
      background-color: #e8e8e8;
      border-radius: 3px;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>Value Mapping Report - Complete Analysis</h1>
  
  <div class="section">
    <h2>Product Information</h2>
    <p><strong>Product Name:</strong> ${userInput.productName}</p>
    <p><strong>Description:</strong> ${userInput.description}</p>
    <p><strong>Target Segment:</strong> ${userInput.primarySegment || userInput.targetDecisionMaker}</p>
    ${userInput.websiteUrl ? `<p><strong>Website:</strong> <a href="${userInput.websiteUrl}">${userInput.websiteUrl}</a></p>` : ''}
  </div>

  <h2>Customer Jobs</h2>
  ${canvas.customerJobs.map(job => `
    <div class="item">
      <strong>${job.text}</strong>
      <span class="badge badge-${job.confidence}">${job.confidence} confidence</span>
    </div>
  `).join('')}

  <h2>Customer Pains</h2>
  ${canvas.customerPains.map(pain => `
    <div class="item">
      <strong>${pain.text}</strong>
      ${pain.intensity ? `<span class="badge badge-${pain.intensity}">${pain.intensity} intensity</span>` : ''}
      ${pain.isPrioritized ? '<span class="badge badge-high">Top 3</span>' : ''}
    </div>
  `).join('')}

  <h2>Customer Gains</h2>
  ${canvas.customerGains.map(gain => `
    <div class="item">
      <strong>${gain.text}</strong>
      <span class="badge">${gain.type}</span>
      ${gain.isPrioritized ? '<span class="badge badge-high">Top 3</span>' : ''}
    </div>
  `).join('')}

  <h2>Products & Services</h2>
  ${canvas.productsServices.map(product => `
    <div class="item">${product.text}</div>
  `).join('')}

  ${canvas.painRelievers.length > 0 ? `
    <h2>Pain Relievers</h2>
    ${canvas.painRelievers.map(reliever => `
      <div class="item">
        <strong>${reliever.title || reliever.text}</strong>
        ${reliever.description ? `<p style="margin-top: 5px; color: #666;">${reliever.description}</p>` : ''}
      </div>
    `).join('')}
  ` : ''}

  ${canvas.gainCreators.length > 0 ? `
    <h2>Gain Creators</h2>
    ${canvas.gainCreators.map(creator => `
      <div class="item">
        <strong>${creator.title || creator.text}</strong>
        ${creator.description ? `<p style="margin-top: 5px; color: #666;">${creator.description}</p>` : ''}
      </div>
    `).join('')}
  ` : ''}

  ${companyPositioning ? `
    <h2>Company Positioning Summary</h2>
    <div class="section" style="background-color: #f0f7ff; border-left-color: #2563eb;">
      <h3>Overarching Promise</h3>
      <p style="font-size: 1.1em; font-weight: 500; color: #1e40af;">${companyPositioning.overarchingPromise}</p>
      
      <h3>Positioning Statement</h3>
      <p style="font-size: 1.05em; line-height: 1.8;">${companyPositioning.positioningStatement}</p>
      
      <h3>Unified Job Statement</h3>
      <p>${companyPositioning.unifiedJobStatement}</p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
        <div>
          <h4 style="color: #374151; margin-bottom: 10px;">Shared Pains</h4>
          <ul>
            ${companyPositioning.sharedPains.map(pain => `<li>${pain}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h4 style="color: #374151; margin-bottom: 10px;">Shared Gains</h4>
          <ul>
            ${companyPositioning.sharedGains.map(gain => `<li>${gain}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h4 style="color: #374151; margin-bottom: 10px;">Shared Differentiators</h4>
          <ul>
            ${companyPositioning.sharedDifferentiators.map(diff => `<li>${diff}</li>`).join('')}
          </ul>
        </div>
      </div>
      
      ${companyPositioning.primarySegments.length > 0 ? `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          <h4 style="color: #374151; margin-bottom: 10px;">Based on Segment(s)</h4>
          <div>
            ${companyPositioning.primarySegments.map(segment => `<span class="tag" style="background-color: #dbeafe; color: #1e40af; margin: 5px;">${segment}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  ` : ''}

  <h2>Value Propositions</h2>
  ${propositions.map((prop, idx) => `
    <div class="proposition">
      <h3>Value Proposition ${idx + 1}: ${prop.label || 'Untitled'}</h3>
      <p><strong>Statement:</strong> ${prop.statement}</p>
      <p><strong>Segment Targeted:</strong> ${prop.segmentTargeted}</p>
      <p><strong>Primary Job:</strong> ${prop.primaryJob}</p>
      <p><strong>Core Outcome:</strong> ${prop.coreOutcome}</p>
      <p><strong>Competitive Contrast:</strong> ${prop.competitiveContrast}</p>
      <p><strong>Measurable Impact:</strong> ${prop.measurableImpact}</p>
      <p><strong>Key Pains Relieved:</strong></p>
      <ul>
        ${prop.keyPainsRelieved.map(id => {
          const pain = canvas.customerPains.find(p => p.id === id);
          return `<li>${pain ? pain.text : id}</li>`;
        }).join('')}
      </ul>
      <p><strong>Key Gains Created:</strong></p>
      <ul>
        ${prop.keyGainsCreated.map(id => {
          const gain = canvas.customerGains.find(g => g.id === id);
          return `<li>${gain ? gain.text : id}</li>`;
        }).join('')}
      </ul>
    </div>
  `).join('')}

  <h2>Prospect Universe</h2>
  ${segments.map(segment => `
    <div class="segment">
      <h3>${segment.name}</h3>
      <p><strong>Job Titles:</strong></p>
      <div>
        ${segment.jobTitles.map(title => `<span class="tag">${title}</span>`).join('')}
      </div>
      <p><strong>Industries:</strong></p>
      <div>
        ${segment.industries.map(industry => `<span class="tag">${industry}</span>`).join('')}
      </div>
      ${segment.companySize ? `
        <p><strong>Company Size:</strong> ${segment.companySize.join(', ')}</p>
      ` : ''}
      <p><strong>Buying Triggers:</strong></p>
      <ul>
        ${segment.buyingTriggers.map(trigger => `<li>${trigger}</li>`).join('')}
      </ul>
      ${segment.toolsInStack && segment.toolsInStack.length > 0 ? `
        <p><strong>Tools in Stack:</strong></p>
        <div>
          ${segment.toolsInStack.map(tool => `<span class="tag">${tool}</span>`).join('')}
        </div>
      ` : ''}
      <p><strong>Keywords:</strong></p>
      <div>
        ${segment.keywords.map(keyword => `<span class="tag">${keyword}</span>`).join('')}
      </div>
      <p><strong>Hashtags:</strong></p>
      <div>
        ${segment.hashtags.map(hashtag => `<span class="tag">#${hashtag}</span>`).join('')}
      </div>
      ${segment.events && segment.events.length > 0 ? `
        <p><strong>Events:</strong></p>
        <div>
          ${segment.events.map(event => `<span class="tag">${event}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('')}

  <div style="margin-top: 40px; padding: 20px; background-color: #f0f0f0; border-radius: 5px; text-align: center;">
    <p style="margin: 0; color: #666;">Generated by Nytro Value Proposition Engine</p>
    <p style="margin: 5px 0 0 0; color: #999; font-size: 0.9em;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
</body>
</html>
  `;

  return html;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json(
        { error: 'SendGrid API key not configured' },
        { status: 500 }
      );
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      return NextResponse.json(
        { error: 'SendGrid from email not configured' },
        { status: 500 }
      );
    }

    const body: SendEmailRequest = await request.json();
    const { toEmail, canvas, propositions, segments, userInput, companyPositioning } = body;

    if (!toEmail || !toEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    const emailContent = formatEmailContent(canvas, propositions, segments, userInput, companyPositioning);

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Value Mapping Report: ${userInput.productName}`,
      html: emailContent,
      text: `Value Mapping Report for ${userInput.productName}\n\nPlease view this email in HTML format for the complete report.`,
    };

    // Send email
    await sgMail.send(msg);

    // Create HubSpot lead with report as note (if email domain is not excluded)
    // Await this to ensure it completes and log any errors properly
    const hubspotResult = await createHubSpotLead(toEmail, canvas, propositions, segments, userInput, companyPositioning);
    
    if (!hubspotResult.success) {
      console.error('HubSpot lead creation failed:', hubspotResult.error);
      // Log the error but don't fail the request since email was sent successfully
    } else {
      console.log('HubSpot lead created successfully for:', toEmail);
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      hubspotLeadCreated: hubspotResult.success,
      hubspotError: hubspotResult.success ? undefined : hubspotResult.error,
    });
  } catch (error: any) {
    // Log full error server-side only (may contain sensitive details)
    console.error('SendGrid error:', error);
    // Return generic error message to client (never expose API keys or sensitive details)
    return NextResponse.json(
      { error: 'Failed to send email. Please try again later.' },
      { status: 500 }
    );
  }
}

