import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { ITool, ToolContext, ToolResult } from '../../domain/tool/ITool';
import type { ToolDefinition } from '../../domain/llm/ILLMService';
import type { IHRApiClient } from './IHRApiClient';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'VacationDaysTool' });

const ParamsSchema = z.object({
  employeeId: z.string().describe('The employee ID to check vacation balance for'),
});

type Params = z.infer<typeof ParamsSchema>;

export class VacationDaysTool implements ITool {
  readonly name = 'get_vacation_balance';

  readonly description = `
Returns the current vacation day balance for an employee.
Use this tool when the user asks about:
- How many vacation days they have left
- Their PTO or time-off balance
- How many days they've used this year
Do NOT use this for general vacation policy questions — use the document context for that.
`.trim();

  constructor(private readonly hrClient: IHRApiClient) {}

  async execute(rawParams: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const parsed = ParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return { success: false, error: `Invalid parameters: ${parsed.error.message}` };
    }

    // Use authenticated employee ID from context if not explicitly provided or if different
    const employeeId = context.employeeId ?? parsed.data.employeeId;

    log.info({ employeeId, sessionId: context.sessionId }, 'Fetching vacation balance');

    try {
      const balance = await this.hrClient.getVacationBalance(employeeId);
      return {
        success: true,
        data: {
          employeeId: balance.employeeId,
          remainingDays: balance.remainingDays,
          usedDays: balance.usedDays,
          totalDays: balance.totalDays,
          year: balance.year,
          message: `As of ${new Date().toLocaleDateString()}, you have ${balance.remainingDays} vacation days remaining out of ${balance.totalDays} total days for ${balance.year}.`,
        },
      };
    } catch (error) {
      log.error({ error, employeeId }, 'Failed to fetch vacation balance');
      return { success: false, error: 'Unable to retrieve vacation balance. Please try again.' };
    }
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
