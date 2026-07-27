export async function runScraper(jobUrl: string): Promise<string> {
  const encodedUrl = encodeURIComponent(jobUrl);

  try {
    const response = await fetch(`https://r.jina.ai/${encodedUrl}`, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text',
      },
    });

    if (!response.ok) {
      throw new Error(`Jina Reader 응답 오류: ${response.status}`);
    }

    const text = await response.text();

    if (text.length < 200) {
      throw new Error('스크래핑 결과가 너무 짧습니다');
    }

    return text;
  } catch {
    const response = await fetch(jobUrl);
    const html = await response.text();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (text.length < 200) {
      throw new Error('스크래핑 결과가 너무 짧습니다');
    }

    return text;
  }
}
