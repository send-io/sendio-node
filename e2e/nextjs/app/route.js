import { Sendio } from '@sendio/node';

export function GET() {
  new Sendio('');

  return new Response('Hello from this API route!', { status: 200 });
}
