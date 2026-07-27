'use client';

import { useRef, useState } from 'react';

interface ResumeUploaderProps {
  userId: string;
  onUploaded: (chunkCount: number) => void;
}

type Tab = 'pdf' | 'text';

export default function ResumeUploader({ userId, onUploaded }: ResumeUploaderProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pdf');
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId);

      if (activeTab === 'pdf') {
        const file = fileRef.current?.files?.[0];
        if (!file) {
          setError('PDF 파일을 선택해주세요.');
          return;
        }
        formData.append('file', file);
      } else {
        if (!text.trim()) {
          setError('이력서 텍스트를 입력해주세요.');
          return;
        }
        formData.append('text', text);
      }

      const res = await fetch('/api/resume/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? '업로드 실패');
      }
      const data = await res.json() as { chunks?: number };
      setUploaded(true);
      onUploaded(data.chunks ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('저장된 이력서 데이터를 삭제합니다. 계속하시겠습니까?')) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/resume/delete?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? '삭제 실패');
      }
      setUploaded(false);
      setConsent(false);
      setText('');
      if (fileRef.current) fileRef.current.value = '';
      onUploaded(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">이력서 업로드</span>
        {uploaded && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              업로드 완료
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '데이터 삭제'}
            </button>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(['pdf', 'text'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setUploaded(false); setError(null); }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'pdf' ? 'PDF 파일' : '텍스트 입력'}
          </button>
        ))}
      </div>

      {activeTab === 'pdf' ? (
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="이력서 내용을 붙여넣기 하세요..."
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}

      {/* 개인정보 동의 체크박스 */}
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600"
        />
        <span className="text-xs text-gray-500 leading-relaxed">
          이력서에 포함된 개인정보가 분석 목적으로{' '}
          <span className="font-medium text-gray-700">Groq(미국), Google(미국)</span> 서버로
          전송됩니다. 세션 데이터는 &apos;데이터 삭제&apos; 버튼으로 즉시 삭제할 수 있습니다.
          이에 동의합니다.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={uploading || !consent}
        className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {uploading ? '업로드 중...' : !consent ? '동의 후 업로드 가능' : '이력서 등록'}
      </button>
    </div>
  );
}
