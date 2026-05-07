import type { IHRApiClient, VacationBalance, EmployeeInfo } from './IHRApiClient';

const MOCK_VACATION_DATA: Record<string, Omit<VacationBalance, 'employeeId' | 'year'>> = {
  EMP001: { remainingDays: 12, usedDays: 8, totalDays: 20 },
  EMP002: { remainingDays: 5, usedDays: 15, totalDays: 20 },
  EMP003: { remainingDays: 18, usedDays: 2, totalDays: 20 },
  EMP004: { remainingDays: 0, usedDays: 20, totalDays: 20 },
};

const MOCK_EMPLOYEE_DATA: Record<string, Omit<EmployeeInfo, 'employeeId'>> = {
  EMP001: { name: 'Alice Johnson', department: 'Engineering', role: 'Senior Engineer', startDate: '2021-03-15', manager: 'Bob Smith' },
  EMP002: { name: 'Carlos Rivera', department: 'Product', role: 'Product Manager', startDate: '2020-07-01', manager: 'Diana Lee' },
  EMP003: { name: 'Sarah Chen', department: 'Design', role: 'UX Designer', startDate: '2022-01-10', manager: 'Bob Smith' },
  EMP004: { name: 'James Wilson', department: 'Engineering', role: 'Staff Engineer', startDate: '2019-05-20', manager: 'Eva Martinez' },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock HR API client simulating real API latency.
 * In production, replace with a real HTTP client pointing at your HRIS.
 */
export class MockHRApiClient implements IHRApiClient {
  async getVacationBalance(employeeId: string): Promise<VacationBalance> {
    await delay(80); // simulate network round-trip

    const data = MOCK_VACATION_DATA[employeeId] ?? {
      remainingDays: 15,
      usedDays: 5,
      totalDays: 20,
    };

    return {
      employeeId,
      year: new Date().getFullYear(),
      ...data,
    };
  }

  async getEmployeeInfo(employeeId: string): Promise<EmployeeInfo | null> {
    await delay(60);
    const data = MOCK_EMPLOYEE_DATA[employeeId];
    if (!data) return null;
    return { employeeId, ...data };
  }
}
