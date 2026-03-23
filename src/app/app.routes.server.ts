import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'policies',
    renderMode: RenderMode.Client
  },
  {
    path: 'policies/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: 'signup',
    renderMode: RenderMode.Client
  },
  {
    path: 'chat',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
