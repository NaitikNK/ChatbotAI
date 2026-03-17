import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

type ChatApiResponse = { answer: string };

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly baseUrl = 'https://chatbot-be-tjge.onrender.com';

  constructor(private readonly http: HttpClient) {}

  chat(message: string): Observable<string> {
    return this.http
      .post<ChatApiResponse>(`${this.baseUrl}/api/ai/chat`, { message })
      .pipe(map((res) => res.answer));
  }
}
