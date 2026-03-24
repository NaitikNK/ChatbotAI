import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Automatically attaches the X-User-Id header to every outgoing HTTP request.
 * Reads the user ID from localStorage (set during login).
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Only add header in a browser environment (not during SSR)
  if (typeof localStorage !== 'undefined') {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user?.id) {
          const cloned = req.clone({
            setHeaders: { 'X-User-Id': user.id.toString() }
          });
          return next(cloned);
        }
      } catch {
        // If parsing fails, proceed without the header
      }
    }
  }
  return next(req);
};
