import { describe, expect, it } from 'vitest';
import { generateReport } from '../../scripts/impact-utils/report-generator.mjs';

// The impact report is posted on every dev PR. Its footer must link the tracking
// issue in the repository that now hosts it (github/squad), not the pre-move slug.

describe('impact report footer', () => {
  it('links issue #733 in github/squad', () => {
    const report = generateReport({
      prNumber: 1,
      risk: { tier: 'LOW', factors: ['Small change'] },
      modules: { scripts: ['scripts/demo.mjs'] },
      files: { all: ['scripts/demo.mjs'], added: [], modified: ['scripts/demo.mjs'], deleted: [] },
      criticalFiles: [],
    });
    const footer = report.split('\n').at(-1);

    expect(footer).toBe(
      '*This report is generated automatically for every PR. See [#733](https://github.com/github/squad/issues/733) for details.*',
    );
    expect(report).not.toMatch(/github\.com\/bradygaster\/squad/);
  });
});
