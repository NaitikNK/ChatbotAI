import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should chat and return answer', () => {
    const mockResponse = {
      success: true,
      data: {
        conversationId: 'test-123',
        answer: 'Hello, I am an AI assistant!'
      },
      error: null
    };
    const testMessage = 'Hello';
    let result: string | undefined;

    service.chat(testMessage).subscribe((answer) => {
      result = answer;
    });

    const req = httpMock.expectOne('/api/ai/chat');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ message: testMessage });
    req.flush(mockResponse);

    expect(result).toBe(mockResponse.data.answer);
  });

  it('should handle API errors', () => {
    const testMessage = 'Hello';
    const mockError = 'Internal Server Error';
    let errorResult: any;

    service.chat(testMessage).subscribe({
      next: () => {
        throw new Error('expected an error, not a successful response');
      },
      error: (error) => {
        errorResult = error;
      }
    });

    const req = httpMock.expectOne('/api/ai/chat');
    req.flush(mockError, { status: 500, statusText: mockError });

    expect(errorResult).toBeDefined();
    expect(errorResult.status).toBe(500);
    expect(errorResult.statusText).toBe(mockError);
  });
});
