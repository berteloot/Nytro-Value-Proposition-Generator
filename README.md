# Value Proposition Generator + Prospect Universe Builder

A full-stack application that guides users through building strategic value propositions using value mapping framework principles combined with Jobs-to-Be-Done market definition. The app also converts pain segments into searchable prospect universes for B2B lead generation.

## Features

1. **Minimal Input Required**: Users only need to provide:
   - Product/service name
   - One-sentence description
   - Target decision maker (role)
   - Website link (optional but recommended)

2. **Automated Research**: 
   - Web search integration
   - Website scraping
   - Market analysis
   - Competitive landscape research

3. **Value Mapping Framework Generation**:
   - Customer Jobs (functional, emotional, social)
   - Customer Pains (risk, barriers, frustrations, financial consequences)
   - Customer Gains (required, expected, desired, unexpected)
   - Products/Services
   - Pain Relievers
   - Gain Creators

4. **Validation & Refinement**:
   - Edit, delete, approve, or add canvas items
   - Prioritize top 3 pains and top 3 gains
   - Confidence tags (high, medium, low)

5. **Value Proposition Statements**:
   - 2-3 focused statements per segment
   - Measurable outcomes
   - Competitive contrast
   - Export functionality

6. **Prospect Universe Mapping**:
   - LinkedIn job titles
   - Industries
   - Company size
   - Buying triggers
   - Tools in stack
   - Keywords and hashtags
   - Events

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nytro-value-proposition-engine
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   - Update `.env.local` with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o
   HUBSPOT_API_KEY=your_hubspot_api_key_here  # Optional
   SENDGRID_API_KEY=your_sendgrid_api_key_here  # Optional
   SENDGRID_FROM_EMAIL=your_email@example.com  # Optional
   ```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key for AI-powered content generation |
| `OPENAI_MODEL` | No | OpenAI model to use (default: `gpt-4o`) |
| `HUBSPOT_API_KEY` | No | HubSpot API key for lead integration |
| `SENDGRID_API_KEY` | No | SendGrid API key for email functionality |
| `SENDGRID_FROM_EMAIL` | No | Email address to send emails from (required if using SendGrid) |

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── research/          # Research and canvas generation
│   │   ├── generate-propositions/  # Value proposition generation
│   │   └── generate-universe/     # Prospect universe generation
│   ├── layout.tsx
│   ├── page.tsx              # Main app page
│   └── globals.css
├── components/
│   ├── InitialInputForm.tsx
│   ├── ResearchProgress.tsx
│   ├── CanvasValidation.tsx
│   ├── ValuePropositions.tsx
│   └── ProspectUniverse.tsx
├── lib/
│   ├── research.ts           # Research and scraping logic
│   ├── proposition-generator.ts  # Value proposition generation
│   └── universe-generator.ts    # Prospect universe generation
├── types/
│   └── index.ts             # TypeScript type definitions
└── package.json
```

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Web Scraping**: Cheerio

## Workflow

1. **Input**: User provides minimal product information
2. **Research**: System conducts automated research
3. **Canvas Generation**: AI generates value mapping framework
4. **Validation**: User validates and refines canvas items (mandatory)
5. **Prioritization**: User selects top 3 pains and top 3 gains
6. **Value Propositions**: System generates 2-3 value proposition statements
7. **Prospect Universe**: System maps pains into targetable segments
8. **Export**: User can export all deliverables

## Notes

- The validation step is **mandatory** - users must confirm, edit, or reject items before value propositions are generated
- Confidence tags help users understand the reliability of AI-generated content
- All outputs are editable and exportable
- The app avoids generic marketing cliches and prioritizes specificity

## Future Enhancements

- Integration with real search APIs (Google Custom Search, SerpAPI)
- Deep search over internal documents
- LLM integration for better content generation
- Lead magnet suggestions
- Advanced export formats (PDF, CSV)
- User accounts and saved canvases

## Deployment

### Deploying to Render

This project includes a `render.yaml` configuration file for easy deployment to Render.

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" and select "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

3. **Set Environment Variables**:
   - In the Render dashboard, go to your service settings
   - Navigate to "Environment" tab
   - Add the following environment variables:
     - `OPENAI_API_KEY` (required)
     - `OPENAI_MODEL` (optional, defaults to `gpt-4o`)
     - `HUBSPOT_API_KEY` (optional)
     - `SENDGRID_API_KEY` (optional)
     - `SENDGRID_FROM_EMAIL` (optional)

4. **Deploy**:
   - Render will automatically build and deploy your application
   - The build command: `npm install && npm run build`
   - The start command: `npm start`

### Manual Render Deployment

If you prefer to set up manually:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
   - **Plan**: Starter (or higher for production)

### Build for Production

```bash
npm run build
npm start
```

## License

MIT


