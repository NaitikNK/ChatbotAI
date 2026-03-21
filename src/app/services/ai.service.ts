import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface ChatApiResponse {
  success: boolean;
  data: {
    conversationId: string;
    answer: string;
  };
  error: string | null;
}

interface GenericApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  chat(message: string): Observable<string> {
    return this.http
      .post<ChatApiResponse>(`${this.apiUrl}/ai/chat`, { message })
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'An unexpected error occurred');
          }
          return res.data.answer;
        }),
        catchError((error) => {
          // If it's already an error we threw, rethrow it
          if (error instanceof Error) {
            return throwError(() => error);
          }
          // Otherwise it's an HTTP error, handle it
          return throwError(() => error);
        })
      );
  }

  getGreeting(): Observable<string> {
    return this.http
      .get<GenericApiResponse<string>>(`${this.apiUrl}/ai/greeting`)
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'Failed to fetch greeting');
          }
          return res.data;
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }
}
