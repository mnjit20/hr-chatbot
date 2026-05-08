import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { ITool, ToolContext, ToolResult } from '../../domain/tool/ITool';
import type { ToolDefinition } from '../../domain/llm/ILLMService';

const ParamsSchema = z.object({
  topic: z.enum(['maternity_leave', 'sick_leave', 'remote_work', 'performance_review', 'expense_policy'])
    .describe('The HR policy topic to look up'),
});

const POLICY_DATA: Record<z.infer<typeof ParamsSchema>['topic'], string> = {
  maternity_leave: 'JohnDoe GmbH provides 16 weeks of fully paid maternity leave. Paternity/partner leave is 8 weeks fully paid. Adoption leave matches maternity leave policy.',
  sick_leave: 'Employees receive unlimited sick days for personal illness. A doctor\'s note is required for absences longer than 5 consecutive days.',
  remote_work: 'Employees may work remotely up to 3 days per week. Core hours are 10am-3pm in the employee\'s local timezone. Full remote arrangements require VP approval.',
  performance_review: 'Performance reviews occur twice per year: July and January. Ratings are 1-5 scale. Ratings of 4+ are eligible for merit increases.',
  expense_policy: 'Meal expenses up to $75/day while traveling. Business travel requires manager approval for trips over $500. Receipts required for all expenses over $25.',
};

/**
 * Demonstrates a tool that retrieves structured data from a mock internal system.
 * In production this would call an internal wiki, Confluence, or policy management system.
 */
export class HRPolicyLookupTool implements ITool {
  readonly name = 'get_hr_policy';

  readonly description = `
Retrieves specific HR policy details for well-defined policy topics.
Use this when the user asks about a specific policy and you need exact, authoritative numbers or rules.
Available topics: maternity_leave, sick_leave, remote_work, performance_review, expense_policy.
For general document questions, prefer using the document context instead.
`.trim();

  async execute(rawParams: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
    const parsed = ParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return { success: false, error: `Invalid topic. Choose from: ${Object.keys(POLICY_DATA).join(', ')}` };
    }

    const policy = POLICY_DATA[parsed.data.topic];
    return {
      success: true,
      data: { topic: parsed.data.topic, policy },
    };
  }

  toDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: zodToJsonSchema(ParamsSchema, { $refStrategy: 'none' }) as Record<string, unknown>,
      },
    };
  }
}
