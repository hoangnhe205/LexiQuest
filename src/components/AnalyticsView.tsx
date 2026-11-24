import React from 'react';
import {
  BookOpen,
  Flame,
  Ghost,
  Headphones,
  PenTool,
  RotateCcw,
  ShieldAlert,
  Wind,
} from 'lucide-react';
import { ENCOUNTERS } from '../data/gameData';
import type { HeroSaveState } from '../types/game';

interface AnalyticsViewProps {
  hero: HeroSaveState;
  onHuntShadowMimic: () => void;
  onResetSave: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  hero,
  onHuntShadowMimic,
  onResetSave,
}) => {
  const { telemetry } = hero;

  const listenPct =
    telemetry.listening.total > 0
      ? Math.round((telemetry.listening.correct / telemetry.listening.total) * 100)
      : 0;
  const readPct =
    telemetry.reading.total > 0
      ? Math.round((telemetry.reading.correct / telemetry.reading.total) * 100)
      : 0;
  const writePct =
    telemetry.writing.total > 0
      ? Math.round((telemetry.writing.correct / telemetry.writing.total) * 100)
      : 0;
  const avgWriteScore =
    telemetry.writing.total > 0
      ? Math.round(telemetry.writing.totalScore / telemetry.writing.total)
      : 0;

  const parryPct =
    telemetry.parryTotal > 0
      ? Math.round((telemetry.parrySuccess / telemetry.parryTotal) * 100)
      : 0;
  const dodgePct =
    telemetry.dodgeTotal > 0
      ? Math.round((telemetry.dodgeSuccess / telemetry.dodgeTotal) * 100)
      : 0;

  const totalAttempts =
    telemetry.listening.total + telemetry.reading.total + telemetry.writing.total;
  const totalCorrect =
    telemetry.listening.correct + telemetry.reading.correct + telemetry.writing.correct;
  const overallAcc = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const skillRows = [
    {
      label: 'Kỹ năng Nghe (Listening)',
      pct: listenPct,
      correct: telemetry.listening.correct,
      total: telemetry.listening.total,
      barColor: 'bg-sky-400',
      textColor: 'text-sky-400',
      icon: <Headphones className="w-4 h-4 shrink-0" />,
      advice:
        telemetry.listening.total === 0
          ? 'Chưa có lượt Nghe nào — hãy thử trận Slime Âm Tiết!'
          : listenPct < 70
            ? 'Gợi ý: Trang bị Mũ Trùm Lữ Hành hoặc Kính Tinh Thính để bật Nghe chậm 0.75x miễn phí.'
            : 'Phản xạ nghe ngữ cảnh rất tốt!',
    },
    {
      label: 'Kỹ năng Đọc (Reading)',
      pct: readPct,
      correct: telemetry.reading.correct,
      total: telemetry.reading.total,
      barColor: 'bg-emerald-400',
      textColor: 'text-emerald-400',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
      advice:
        telemetry.reading.total === 0
          ? 'Chưa có lượt Đọc nào — hãy bắt đầu từ Chương 1!'
          : readPct < 70
            ? 'Gợi ý: Farm Áo Choàng Soi Ngữ Cảnh để kích hoạt nút tô sáng manh mối.'
            : 'Khả năng đọc hiểu ngữ cảnh và cấu trúc ngữ pháp rất vững.',
    },
    {
      label: 'Kỹ năng Viết (Writing · Trọng Kích AI chấm)',
      pct: writePct,
      correct: telemetry.writing.correct,
      total: telemetry.writing.total,
      barColor: 'bg-rose-400',
      textColor: 'text-rose-400',
      icon: <PenTool className="w-4 h-4 shrink-0" />,
      advice:
        telemetry.writing.total === 0
          ? 'Chưa có câu Viết nào — chọn Đòn Trọng Kích để luyện viết được AI chấm trực tiếp!'
          : avgWriteScore < 75
            ? 'Gợi ý: Lồng ghép đủ từ khóa mục tiêu và đối chiếu câu sửa tự nhiên từ AI bên dưới.'
            : 'Điểm AI rất ấn tượng! Vũ khí Viết sẽ giúp bạn tung đòn Chí Mạng cực lớn.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-pixel text-xl sm:text-2xl text-white">
            Thống Kê Năng Lực & Phản Xạ Chiến Đấu
          </h1>
          <p className="text-sm text-slate-400">
            Theo dõi độ chính xác Nghe – Đọc – Viết, tỉ lệ Parry/Né Trọng Kích và lịch sử AI chấm câu.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetSave}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-300 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Xóa dữ liệu & chơi lại</span>
        </button>
      </div>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pixel-panel p-4 space-y-1">
          <div className="text-xs text-slate-400">Độ chính xác tổng</div>
          <div className="font-pixel text-2xl text-emerald-400 font-mono-num">
            {overallAcc}%
          </div>
          <div className="text-xs text-slate-400 font-mono-num">
            {totalCorrect}/{totalAttempts} lượt đúng · {hero.clearedNodeIds.length}/{ENCOUNTERS.length} ải
          </div>
        </div>

        <div className="pixel-panel p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            <span>Tỉ lệ Parry thành công</span>
          </div>
          <div className="font-pixel text-2xl text-sky-400 font-mono-num">
            {parryPct}%
          </div>
          <div className="text-xs text-slate-400 font-mono-num">
            {telemetry.parrySuccess}/{telemetry.parryTotal} lần đỡ phản công
          </div>
        </div>

        <div className="pixel-panel p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-rose-400" />
            <span>Tỉ lệ Né Trọng Kích</span>
          </div>
          <div className="font-pixel text-2xl text-rose-400 font-mono-num">
            {dodgePct}%
          </div>
          <div className="text-xs text-slate-400 font-mono-num">
            {telemetry.dodgeSuccess}/{telemetry.dodgeTotal} lần né câu khó nhất
          </div>
        </div>

        <div className="pixel-panel p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Trọng Kích & Thanh tẩy SRS</span>
          </div>
          <div className="font-pixel text-2xl text-amber-400 font-mono-num">
            {telemetry.heavyHits}
          </div>
          <div className="text-xs text-slate-400 font-mono-num">
            Điểm Viết AI: {avgWriteScore}/100 · Đã thanh tẩy {telemetry.purifiedCount}
          </div>
        </div>
      </section>

      {/* Skill Breakdown */}
      <section className="pixel-panel p-5 sm:p-6 space-y-5">
        <h2 className="font-pixel text-base text-white">
          Phân tích 3 kỹ năng Nghe · Đọc · Viết
        </h2>

        <div className="space-y-5">
          {skillRows.map((row) => (
            <div key={row.label} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className={`flex items-center gap-2 font-semibold ${row.textColor}`}>
                  {row.icon}
                  {row.label}
                </span>
                <span className="font-mono-num text-slate-200">
                  {row.pct}% ({row.correct}/{row.total} lượt)
                </span>
              </div>
              <div className="h-3 bg-[#121624] border border-[#343e5c] overflow-hidden">
                <div
                  className={`h-full transition-transform duration-300 origin-left ${row.barColor}`}
                  style={{ transform: `scaleX(${row.pct / 100})` }}
                />
              </div>
              <p className="text-xs text-slate-400">{row.advice}</p>
            </div>
          ))}
        </div>

        {hero.cursedQueue.length > 0 && (
          <div className="pt-3 border-t border-[#343e5c] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm text-slate-300">
              Hàng đợi ôn tập SRS hiện có{' '}
              <strong className="text-rose-400 font-mono-num">
                {hero.cursedQueue.length}
              </strong>{' '}
              từ/câu từng trả lời sai.
            </div>
            <button
              type="button"
              onClick={onHuntShadowMimic}
              className="pixel-btn inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <Ghost className="w-4 h-4" />
              <span>Triệu hồi Quái Bóng Tối ôn tập</span>
            </button>
          </div>
        )}
      </section>

      {/* AI Writing History */}
      <section className="pixel-panel p-5 sm:p-6 space-y-4">
        <h2 className="font-pixel text-base text-white">
          Nhật ký Lò Rèn Câu Chữ (AI Chấm Viết gần đây)
        </h2>

        {telemetry.writingHistory.length === 0 ? (
          <p className="text-sm text-slate-400">
            Chưa có lịch sử viết câu. Khi bạn chọn Đòn Trọng Kích dạng Viết trong trận đấu, Gemini AI sẽ lưu lại điểm số và câu sửa chuẩn tại đây.
          </p>
        ) : (
          <div className="space-y-3">
            {telemetry.writingHistory.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className="bg-[#121624] border border-[#343e5c] p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num">
                  <span className="text-slate-400">Đấu với {entry.monsterNameVi}</span>
                  <span
                    className={
                      entry.verdict === 'CRITICAL'
                        ? 'text-amber-400 font-bold'
                        : entry.verdict === 'HIT'
                          ? 'text-emerald-400 font-bold'
                          : 'text-rose-400 font-bold'
                    }
                  >
                    {entry.verdict} · {entry.score}/100
                  </span>
                </div>
                <div className="text-sm text-white">
                  <span className="text-slate-400">Câu bạn viết: </span>
                  {entry.sentence}
                </div>
                <div className="text-sm text-emerald-300">
                  <span className="text-slate-400">Gợi ý tự nhiên: </span>
                  {entry.correctedSentence}
                </div>
                <div className="text-xs text-slate-400">{entry.feedbackVi}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
