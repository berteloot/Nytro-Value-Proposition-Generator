import {
  ValuePropositionCanvas,
  ValuePropositionStatement,
  CompanyPositioningSummary,
  UserInput,
} from '@/types';

export function buildCompanyPositioningSummary(
  canvases: ValuePropositionCanvas[],
  propositions: ValuePropositionStatement[],
  userInput: UserInput
): CompanyPositioningSummary {
  const companyName = userInput.companyName || userInput.productName || 'Your Company';

  // Accept many canvases for multi-segment portfolios; if none, fall back to user input only.
  const allCanvases = canvases && canvases.length ? canvases : [];

  const allJobs = allCanvases.flatMap(c => c.customerJobs);
  const allPains = allCanvases.flatMap(c => c.customerPains);
  const allGains = allCanvases.flatMap(c => c.customerGains);

  const primarySegments = Array.from(
    new Set(
      allCanvases.map(c => c.segment).filter(Boolean)
    )
  ) as string[];

  const aggregateTopItems = (items: { text: string }[], limit: number) => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = item.text.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([text]) => text);
  };

  const aggregateTopStrings = (items: string[], limit: number) => {
    const counts = new Map<string, number>();
    for (const raw of items) {
      const key = raw.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([text]) => text);
  };

  // 1) Unified Job: pick the top prioritized / most repeated functional job across canvases,
  // or fall back to a generic statement based on user input when no canvases are available.
  const unifiedJob =
    allJobs.find(j => j.confidence === 'high')?.text ||
    allJobs[0]?.text ||
    (userInput.description
      ? `get more value from ${userInput.description.toLowerCase()} with less time, cost, and risk`
      : 'help customers achieve critical outcomes with less time, cost, and risk');

  // 2) Shared pains (prioritized or frequently occurring across segments)
  const prioritizedPains = allPains.filter(p => p.isPrioritized || p.intensity === 'high');
  const sharedPains = prioritizedPains.length
    ? aggregateTopItems(prioritizedPains, 4)
    : aggregateTopItems(allPains, 4);

  // 3) Shared gains (most important across segments)
  const prioritizedGains = allGains.filter(g => g.isPrioritized);
  const sharedGains = prioritizedGains.length
    ? aggregateTopItems(prioritizedGains, 4)
    : aggregateTopItems(allGains, 4);

  // 4) Shared differentiators (from competitiveContrast across propositions)
  const differentiatorCandidates = propositions
    .map(p => (p.competitiveContrast || '').trim())
    .filter(Boolean);
  const sharedDifferentiators = aggregateTopStrings(differentiatorCandidates, 4);

  // 6) Overarching promise (short)
  const overarchingPromise =
    'Reduce time, cost, and risk for our customers by automating and streamlining critical workflows.';

  // 7) Company positioning statement (narrative)
  const positioningStatement = [
    `${companyName} helps ${primarySegments.join(' and ') || 'target customers'} to ${unifiedJob.toLowerCase()}`,
    `by delivering ${sharedGains[0] || 'measurable improvements in speed and reliability'} and`,
    `reducing ${sharedPains[0] || 'risk and uncertainty'} through ${sharedDifferentiators[0] || 'a distinctive, automation-first approach'}.`,
  ].join(' ');

  return {
    companyName,
    overarchingPromise,
    unifiedJobStatement: unifiedJob,
    sharedGains,
    sharedPains,
    sharedDifferentiators,
    primarySegments,
    positioningStatement,
  };
}
