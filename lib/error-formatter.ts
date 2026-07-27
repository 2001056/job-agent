/**
 * 기술적 에러 메시지를 사용자 친화적 메시지로 변환합니다.
 * 상세 로그는 호출부에서 console.error로 처리합니다.
 */
export function toUserMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (/429|rate.?limit|quota|too.?many.?request/i.test(msg)) {
    return 'AI 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (/스크래핑|scraping|fetch.*공고|공고.*fetch|jina/i.test(msg)) {
    return '채용 공고를 불러올 수 없습니다. URL이 올바른지 확인해주세요.';
  }
  if (/200자 미만|too short/i.test(msg)) {
    return '채용 공고 내용이 너무 짧습니다. 다른 URL을 입력해주세요.';
  }
  if (/generateJSON|generateText|groq|llm|ai.*분석/i.test(msg)) {
    return 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (/generateEmbedding|embed/i.test(msg)) {
    return '이력서 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (/resume_chunks|supabase|database|db/i.test(msg)) {
    return '데이터 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (/pdf|파일|file/i.test(msg)) {
    return '파일을 읽을 수 없습니다. 올바른 PDF 파일인지 확인해주세요.';
  }
  if (/network|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg)) {
    return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
  }
  if (/url|주소|invalid.*url/i.test(msg)) {
    return '잘못된 URL입니다. 채용 공고 주소를 확인해주세요.';
  }

  return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}
