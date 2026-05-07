export interface VacationBalance {
  employeeId: string;
  remainingDays: number;
  usedDays: number;
  totalDays: number;
  year: number;
}

export interface EmployeeInfo {
  employeeId: string;
  name: string;
  department: string;
  role: string;
  startDate: string;
  manager: string;
}

export interface IHRApiClient {
  getVacationBalance(employeeId: string): Promise<VacationBalance>;
  getEmployeeInfo(employeeId: string): Promise<EmployeeInfo | null>;
}
