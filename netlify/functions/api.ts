import { handleApiRequest } from '../../apiHandlers';

export default async function handler(request: Request) {
  const { pathname } = new URL(request.url);
  let body: unknown = {};

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
  }

  const result = await handleApiRequest(pathname, request.method, body);
  return Response.json(result.body, { status: result.status });
}
