'use client';

import { useState } from 'react';
import type { AgentState } from '@/lib/types/agent.types';

interface ResultViewerProps {
  state: AgentState;
}

type Tab = 'gap' | 'appeal' | 'cover';

export default function ResultViewer({ state }: ResultViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('gap');
  const [coverText, setCoverText] = useState(state.finalCoverLetter ?? '');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coverText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'gap', label: '갭 분석' },
    { id: 'appeal', label: '어필 포인트' },
    { id: 'cover', label: '자기소개서' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">분석 결과</h2>

      {/* 탭 */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 갭 분석 */}
      {activeTab === 'gap' && state.matchAnalysis && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">적합도 점수</span>
            <div className="flex-1 rounded-full bg-gray-200 h-2.5">
              <div
                className="h-2.5 rounded-full bg-blue-600"
                style={{ width: `${state.matchAnalysis.fitScore}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-blue-700">
              {state.matchAnalysis.fitScore}점
            </span>
          </div>
          <p className="text-sm text-gray-700">{state.matchAnalysis.gapSummary}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">
                보유 스킬
              </h4>
              <ul className="flex flex-wrap gap-1">
                {state.matchAnalysis.matchedSkills.map((s) => (
                  <li key={s} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                부족 스킬
              </h4>
              <ul className="flex flex-wrap gap-1">
                {state.matchAnalysis.missingSkills.map((s) => (
                  <li key={s} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 어필 포인트 */}
      {activeTab === 'appeal' && state.matchAnalysis && (
        <ul className="flex flex-col gap-2">
          {state.matchAnalysis.appealPoints.map((point, i) => (
            <li key={i} className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-900">
              <span className="shrink-0 font-medium">{i + 1}.</span>
              {point}
            </li>
          ))}
        </ul>
      )}

      {/* 자기소개서 */}
      {activeTab === 'cover' && (
        <div className="flex flex-col gap-2">
          <textarea
            value={coverText}
            onChange={(e) => setCoverText(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleCopy}
            className="self-end rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-900"
          >
            {copied ? '복사됨!' : '복사'}
          </button>
        </div>
      )}
    </div>
  );
}
