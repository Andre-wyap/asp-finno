import { onRequest } from 'firebase-functions/v2/https';

export const placeholder = onRequest({ region: 'asia-southeast1' }, (_request, response) => {
  response.status(200).json({ ok: true, service: 'asp-functions' });
});
