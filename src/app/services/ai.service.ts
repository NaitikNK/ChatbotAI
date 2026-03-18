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
}
