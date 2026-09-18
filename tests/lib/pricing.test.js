import { describe, it, expect } from 'vitest';
import { calculateQuote, buildIncludedBullets, DEFAULT_CONFIG } from '@/lib/design-studio/pricing';

describe('buildIncludedBullets', () => {
  it('matches the original inline bullet list for the Essentials level (no 3D, no views, no finish direction)', () => {
    const inc = { concepts: '1', revisions: 1, model3d: false, finishDirection: 'Not included', styling: 'Basic placement', renderedViews: 0 };
    expect(buildIncludedBullets(inc)).toEqual([
      'Existing conditions set up as a working base plan',
      '1 proposed layout concept',
      'Finalised dimensioned 2D floor plan',
      'Furniture and fixture layout — basic placement',
      '1 revision round',
      'Presentation-ready PDF package',
    ]);
  });

  it('includes the 3D model, rendered views, and finish direction lines when present, and pluralizes correctly', () => {
    const inc = { concepts: 'Up to 3', revisions: 2, model3d: true, finishDirection: 'Basic direction', styling: 'Detailed placement', renderedViews: 4 };
    expect(buildIncludedBullets(inc)).toEqual([
      'Existing conditions set up as a working base plan',
      'Up to 3 proposed layout concepts',
      'Finalised dimensioned 2D floor plan',
      'Furniture and fixture layout — detailed placement',
      'Complete 3D model of the design',
      '4 rendered presentation views',
      'Material and finish direction — basic direction',
      '2 revision rounds',
      'Presentation-ready PDF package',
    ]);
  });

  it('matches calculateQuote()\'s own `included` output end-to-end for a real config/input pair', () => {
    const quote = calculateQuote({ projectType: 'adu', serviceLevel: 'design', areaSqft: 600 }, DEFAULT_CONFIG);
    const bullets = buildIncludedBullets(quote.included);
    expect(bullets).toContain('Complete 3D model of the design');
    expect(bullets[0]).toBe('Existing conditions set up as a working base plan');
    expect(bullets[bullets.length - 1]).toBe('Presentation-ready PDF package');
  });
});

describe('minimum fee is no longer enforced as a floor', () => {
  it('lets a large manual discount push the total below the project type\'s minimum fee', () => {
    const quote = calculateQuote(
      { projectType: 'kitchen', serviceLevel: 'essentials', areaSqft: 200, manualAdjustment: -1000 },
      DEFAULT_CONFIG
    );
    // essentials/kitchen base is 1250, minimumFee is 950 — a -1000 adjustment
    // should land well below 950 now, not get floored back up to it.
    expect(quote.total).toBeLessThan(quote.minimum.fee);
    expect(quote.minimum.applied).toBe(true);
  });

  it('still never goes negative', () => {
    const quote = calculateQuote(
      { projectType: 'kitchen', serviceLevel: 'essentials', areaSqft: 200, manualAdjustment: -100000 },
      DEFAULT_CONFIG
    );
    expect(quote.total).toBe(0);
  });

  it('a normal quote with no adjustment is unaffected', () => {
    const quote = calculateQuote({ projectType: 'adu', serviceLevel: 'design', areaSqft: 600 }, DEFAULT_CONFIG);
    expect(quote.total).toBeGreaterThan(quote.minimum.fee);
    expect(quote.minimum.applied).toBe(false);
  });
});
