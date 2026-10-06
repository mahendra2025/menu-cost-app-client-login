export function shouldUseSecureSessionCookie(
  request: Request,
) {
  try {
    const url = new URL(request.url);

    if (url.protocol === 'https:') {
      return true;
    }
  } catch {
    // Fall through to proxy headers.
  }

  const forwardedProto =
    request.headers
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim()
      .toLowerCase();

  return forwardedProto === 'https';
}
