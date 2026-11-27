import { NextResponse } from 'next/server';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const language = searchParams.get('language') || 'en';

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      name: name.trim(),
      count: '1',
      language,
      format: 'json',
    });

    const res = await fetch(`${GEOCODING_URL}?${params.toString()}`, {
      next: { revalidate: 300 }, // cache 5 min server-side
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Geocoding API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const top = data?.results?.[0] || null;
    return NextResponse.json({ result: top });
  } catch (err) {
    console.error('[geocode route]', err);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
