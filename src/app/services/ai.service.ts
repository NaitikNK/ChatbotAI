import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { map, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

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

export interface ChatMessageResponse {
  role: string;
  content: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient, private readonly authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const user = this.authService.currentUserValue;
    if (user && user.id) {
      headers = headers.set('X-User-Id', user.id.toString());
      headers = headers.set('X-User-Role', user.role || 'User');
    }
    return headers;
  }

  chat(message: string): Observable<string> {
    return this.http
      .post<ChatApiResponse>(`${this.apiUrl}/ai/chat`, { message }, { headers: this.getHeaders() })
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
      .get<GenericApiResponse<string>>(`${this.apiUrl}/ai/greeting`, { headers: this.getHeaders() })
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

  getSessions(): Observable<string[]> {
    return this.http
      .get<GenericApiResponse<string[]>>(`${this.apiUrl}/chat/sessions`, { headers: this.getHeaders() })
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'Failed to fetch sessions');
          }
          return res.data;
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  getHistory(conversationId: string): Observable<ChatMessageResponse[]> {
    return this.http
      .get<GenericApiResponse<ChatMessageResponse[]>>(`${this.apiUrl}/chat/history/${conversationId}`, { headers: this.getHeaders() })
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'Failed to fetch history');
          }
          return res.data;
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  deleteHistory(conversationId: string): Observable<void> {
    return this.http
      .delete<GenericApiResponse<any>>(`${this.apiUrl}/chat/history/${conversationId}`, { headers: this.getHeaders() })
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'Failed to delete history');
          }
        }),
        catchError((error) => throwError(() => error))
      );
  }

  deleteAllHistory(): Observable<void> {
    return this.http
      .delete<GenericApiResponse<any>>(`${this.apiUrl}/chat/history/all`, { headers: this.getHeaders() })
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.error || 'Failed to delete all history');
          }
        }),
        catchError((error) => throwError(() => error))
      );
  }
}
