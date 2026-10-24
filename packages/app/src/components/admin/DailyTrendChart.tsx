'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface DailyPoint {
  date: string;
  openCount: number;
  completionCount: number;
  newUsers: number;
  newGames: number;
  totalTokens: number;
  imageCount: number;
  videoCount: number;
  audioCount: number;
}

interface DailyStatsResponse {
  days: DailyPoint[];
  previous: DailyPoint[];
}

type MetricKey = Exclude<keyof DailyPoint, 'date'>;

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'openCount', label: '打开数' },
  { key: 'completionCount', label: '完成数' },
  { key: 'newUsers', label: '新增用户' },
  { key: 'newGames', label: '新增游戏' },
  { key: 'totalTokens', label: 'AI Token（计费）' },
  { key: 'imageCount', label: '图片生成' },
  { key: 'videoCount', label: '视频生成' },
  { key: 'audioCount', label: '音频生成' },
];

const RANGE_OPTIONS = [7, 30, 90] as const;

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function formatMetric(key: MetricKey, value: number): string {
  if (key === 'totalTokens') return formatCompact(value);
  return value.toLocaleString();
}

function formatShortDate(date: string): string {
  return date.slice(5);
}

function ChangeBadge({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) {
    return <span className="text-sm text-gray-400">上期无数据</span>;
  }
  const isUp = changePercent > 0;
  const isFlat = changePercent === 0;
  return (
    <span
      className={`text-sm font-medium ${
        isFlat ? 'text-gray-500' : isUp ? 'text-green-600' : 'text-red-600'
      }`}>
      {isFlat ? '持平' : `${isUp ? '+' : ''}${changePercent.toFixed(1)}%`}
      <span className="ml-1 font-normal text-gray-400">对比上期</span>
    </span>
  );
}

export default function DailyTrendChart() {
  const [metric, setMetric] = useState<MetricKey>('openCount');
  const [days, setDays] = useState<number>(30);

  const { data, isLoading } = useQuery<DailyStatsResponse>({
    queryKey: ['admin', 'stats-daily', days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats/daily?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch daily stats');
      return res.json();
    },
  });

  // 上期按「第 N 天」与本期对齐：X 轴用本期日期，tooltip 里提示上期对应日期
  const chartData = data
    ? data.days.map((point, index) => ({
        date: point.date,
        current: point[metric],
        previous: data.previous[index]?.[metric] ?? null,
        previousDate: data.previous[index]?.date ?? '',
      }))
    : [];

  const metricLabel = METRICS.find((item) => item.key === metric)?.label ?? '';
  const currentTotal = data?.days.reduce((sum, point) => sum + point[metric], 0) ?? 0;
  const previousTotal = data?.previous.reduce((sum, point) => sum + point[metric], 0) ?? 0;
  const changePercent =
    data && previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">按天趋势</h2>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700">
            {RANGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                最近 {option} 天
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {METRICS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMetric(item.key)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                metric === item.key
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {item.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">加载趋势数据中...</div>
        ) : !data || data.days.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">暂无数据</div>
        ) : (
          <>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-2xl font-bold text-gray-900">
                {formatMetric(metric, currentTotal)}
              </span>
              <span className="text-sm text-gray-500">
                本期{metricLabel}合计（虚线为上一周期对比）
              </span>
              <ChangeBadge changePercent={changePercent} />
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(value: number) => formatCompact(value)}
                  />
                  <Tooltip
                    formatter={(value) => formatMetric(metric, Number(value))}
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload as (typeof chartData)[number] | undefined;
                      return row?.previousDate ? `${label}（上期：${row.previousDate}）` : String(label);
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    name={metricLabel}
                    stroke="#ea580c"
                    strokeWidth={2}
                    dot={days <= 7}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="previous"
                    name="上一周期"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
