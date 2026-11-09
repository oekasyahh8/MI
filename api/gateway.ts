import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../dist-server/index.js';

type GatewayRequest = IncomingMessage & { url?: string };

export default function handler(req: GatewayRequest, res: ServerResponse) {
  const incomingUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const apiPath = incomingUrl.searchParams.get('__vercel_api_path');

  if (apiPath !== null) {
    incomingUrl.searchParams.delete('__vercel_api_path');
    const path = apiPath.replace(/^\/+/, '');
    const query = incomingUrl.searchParams.toString();
    req.url = `${path ? `/api/${path}` : '/api'}${query ? `?${query}` : ''}`;
  }

  const expressApp = app as unknown as (request: IncomingMessage, response: ServerResponse) => void;
  return expressApp(req, res);
}

