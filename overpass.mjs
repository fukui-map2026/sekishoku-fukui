const ENDPOINTS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POSTで問い合わせてください。' }), {
      status: 405, headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: '送信データを読み取れません。' }), {
      status: 400, headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  const query = typeof body.query === 'string' ? body.query : '';
  if (!query.startsWith('[out:json]') || query.length > 12000) {
    return new Response(JSON.stringify({ error: '検索条件が不正です。' }), {
      status: 400, headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  const errors = [];
  for (const url of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'user-agent': 'SekishokuForestNav/1.0 (Netlify Function)'
        },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal
      });
      if (!upstream.ok) throw new Error('HTTP ' + upstream.status);
      const data = await upstream.json();
      if (!data || !Array.isArray(data.elements)) throw new Error('応答形式が不正です');
      return new Response(JSON.stringify({ data, source: new URL(url).hostname }), {
        status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
      });
    } catch (error) {
      errors.push(new URL(url).hostname + ': ' + (error.name === 'AbortError' ? '時間切れ' : error.message));
    } finally { clearTimeout(timer); }
  }
  return new Response(JSON.stringify({ error: '全ての林道データ取得先で失敗しました。' + errors.join(' / ') }), {
    status: 502, headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};
