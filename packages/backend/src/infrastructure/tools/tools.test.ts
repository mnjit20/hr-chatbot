import { describe, it, expect, vi } from 'vitest';
import { VacationDaysTool } from './VacationDaysTool';
import { HRPolicyLookupTool } from './HRPolicyLookupTool';
import { ToolRegistry } from './ToolRegistry';
import { MockHRApiClient } from './MockHRApiClient';
import type { ToolContext } from '../../domain/tool/ITool';

const ctx: ToolContext = { sessionId: 'test-session', employeeId: 'EMP001' };

describe('VacationDaysTool', () => {
  const client = new MockHRApiClient();
  const tool = new VacationDaysTool(client);

  it('has correct name', () => {
    expect(tool.name).toBe('get_vacation_balance');
  });

  it('returns vacation balance for known employee', async () => {
    const result = await tool.execute({ employeeId: 'EMP001' }, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      employeeId: 'EMP001',
      remainingDays: 12,
      usedDays: 8,
      totalDays: 20,
    });
  });

  it('uses context employeeId over params when set', async () => {
    const result = await tool.execute({ employeeId: 'EMP999' }, { ...ctx, employeeId: 'EMP001' });
    expect(result.success).toBe(true);
    // Should use context EMP001
    const data = result.data as { employeeId: string };
    expect(data.employeeId).toBe('EMP001');
  });

  it('returns success for unknown employee with default data', async () => {
    const result = await tool.execute({ employeeId: 'UNKNOWN' }, { sessionId: 'x' });
    expect(result.success).toBe(true);
  });

  it('returns error for invalid params', async () => {
    const result = await tool.execute({}, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('produces a valid OpenAI tool definition', () => {
    const def = tool.toDefinition();
    expect(def.type).toBe('function');
    expect(def.function.name).toBe('get_vacation_balance');
    expect(def.function.parameters).toBeTruthy();
  });
});

describe('HRPolicyLookupTool', () => {
  const tool = new HRPolicyLookupTool();

  it('returns policy data for valid topic', async () => {
    const result = await tool.execute({ topic: 'maternity_leave' }, ctx);
    expect(result.success).toBe(true);
    const data = result.data as { policy: string };
    expect(data.policy).toContain('16 weeks');
  });

  it('returns error for invalid topic', async () => {
    const result = await tool.execute({ topic: 'invalid_topic' }, ctx);
    expect(result.success).toBe(false);
  });
});

describe('ToolRegistry', () => {
  it('returns undefined for unregistered tool', () => {
    const registry = new ToolRegistry();
    expect(registry.getTool('nonexistent')).toBeUndefined();
  });

  it('returns registered tool by name', () => {
    const tool = new HRPolicyLookupTool();
    const registry = new ToolRegistry([tool]);
    expect(registry.getTool('get_hr_policy')).toBe(tool);
  });

  it('getDefinitions returns definition for each tool', () => {
    const registry = new ToolRegistry([
      new HRPolicyLookupTool(),
      new VacationDaysTool(new MockHRApiClient()),
    ]);
    const defs = registry.getDefinitions();
    expect(defs).toHaveLength(2);
    expect(defs.map((d) => d.function.name)).toContain('get_hr_policy');
    expect(defs.map((d) => d.function.name)).toContain('get_vacation_balance');
  });
});
