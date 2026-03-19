import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DropdownOption {
  label: string;
  value: string;
}

/*
export enum PolicyType {
  Personal = 0,
  Vehicle = 1,
  Medical = 2
}

export enum PolicyName {
  // Personal Policies
  GeneralInsurance = 0,
  PersonalShieldPlan = 1,
  FamilyProtectionPlan = 2,

  // Vehicle Policies
  AutoInsurance = 10,
  CommercialAuto = 11,
  MotorcycleInsurance = 12,
  EVInsurance = 13,
  CarProtectionPlan = 14,
  BikeInsurancePlan = 15,

  // Medical Policies
  HealthInsurance = 20,
  GroupHealth = 21,
  CriticalIllness = 22,
  SeniorHealth = 23,
  HealthSecurePlan = 24
}
*/

export interface Policy {
  id: string;
  firstName: string;
  lastName: string;
  policyNumber: string;
  email: string;
  policyType: string | number;
  policyName?: string | number;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

export interface PolicyListResponse {
  success: boolean;
  data: {
    items: Policy[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
  };
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PolicyService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * Get list of policies with pagination
   */
  getPolicies(pageNumber: number = 1, pageSize: number = 10): Observable<PolicyListResponse> {
    return this.http
      .get<any>(`${this.apiUrl}/users/list`, {
        params: {
          pageNumber: pageNumber.toString(),
          pageSize: pageSize.toString()
        }
      })
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'An unexpected error occurred');
          }
          return {
            success: true,
            data: res.data,
            error: null
          } as PolicyListResponse;
        }),
        catchError((error) => {
          if (error instanceof Error) {
            return throwError(() => error);
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a single policy by ID
   */
  getPolicyById(policyId: string): Observable<Policy> {
    return this.http
      .get<any>(`${this.apiUrl}/users/${policyId}`)
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'An unexpected error occurred');
          }
          return res.data as Policy;
        }),
        catchError((error) => {
          if (error instanceof Error) {
            return throwError(() => error);
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Get policy by policy number
   */
  getPolicyByPolicyNumber(policyNumber: string): Observable<Policy> {
    return this.http
      .get<any>(`${this.apiUrl}/users/by-policy/${policyNumber}`)
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'An unexpected error occurred');
          }
          return res.data as Policy;
        }),
        catchError((error) => {
          if (error instanceof Error) {
            return throwError(() => error);
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Create a new policy
   */
  createPolicy(policy: Partial<Policy>): Observable<Policy> {
    return this.http
      .post<any>(`${this.apiUrl}/users`, policy)
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'An unexpected error occurred');
          }
          return res.data as Policy;
        }),
        catchError((error) => {
          if (error instanceof Error) {
            return throwError(() => error);
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Update an existing policy
   */
  updatePolicy(policyId: string, policy: Partial<Policy>): Observable<Policy> {
    return this.http
      .put<any>(`${this.apiUrl}/users/${policyId}`, policy)
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'An unexpected error occurred');
          }
          return res.data as Policy;
        }),
        catchError((error) => {
          if (error instanceof Error) {
            return throwError(() => error);
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a policy by ID
   */
  deletePolicy(policyId: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${this.apiUrl}/users/${policyId}`)
      .pipe(
        catchError((error) => {
          if (error instanceof Error) {
            return throwError(() => error);
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a policy by policy number
   */
  deletePolicyByPolicyNumber(policyNumber: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${this.apiUrl}/users/by-policy/${policyNumber}`)
      .pipe(
        catchError((error) => {
          if (error instanceof Error) {
            return throwError(() => error);
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Get all policy types
   */
  getPolicyTypes(): Observable<DropdownOption[]> {
    return this.http.get<any>(`${this.apiUrl}/policies/types`).pipe(
      map((res) => {
        if (res.success) return res.data;
        return [];
      }),
      catchError(() => {
        return throwError(() => new Error('Failed to load policy types'));
      })
    );
  }

  /**
   * Get policy names by type ID
   */
  getPolicyNames(typeId: string | number): Observable<DropdownOption[]> {
    return this.http.get<any>(`${this.apiUrl}/policies/names`, {
      params: { typeId: typeId.toString() }
    }).pipe(
      map((res) => {
        if (res.success) return res.data;
        return [];
      }),
      catchError(() => {
        return throwError(() => new Error('Failed to load policy names'));
      })
    );
  }
}
