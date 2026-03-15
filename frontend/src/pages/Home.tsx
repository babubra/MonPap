import { Eye, EyeOff, Send, Mic, Loader, PlusCircle, AlertTriangle, X as XIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useShowAmounts } from '../hooks/useShowAmounts';
import { useTransactionMutations } from '../hooks/useTransactionMutations';
import toast from 'react-hot-toast';
import {
  transactions as txApi,
  ai,
  type TransactionSummary,
  type Transaction,
  type AiParseResult,
} from '../api';
import { ParsePreview, type ParsedData } from '../components/ParsePreview';
import { TransactionDetailsSheet } from '../components/TransactionDetailsSheet';
import { ManualTransactionSheet } from '../components/ManualTransactionSheet';
import { PullToRefresh } from '../components/PullToRefresh';
import './Home.css';

export function Home() {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const { showAmounts, toggleShowAmounts, formatAmount } = useShowAmounts();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Ручная транзакция
  const [manualOpen, setManualOpen] = useState(false);

  // AI parse
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<AiParseResult | null>(null);
  const [parseRawText, setParseRawText] = useState('');
  const [parseError, setParseError] = useState('');
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const { saveParsedTransaction } = useTransactionMutations();

  // Аудио
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [s, r] = await Promise.all([
        txApi.summary(),
        txApi.list({ limit: 10 }),
      ]);
      setSummary(s);
      
      const sortedRecent = [...r].sort((a, b) => {
        const timeDiff = new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id - a.id;
      });
      setRecent(sortedRecent);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }
  // (Методы сохранения Category/Counterpart для ParsePreview остаются)

  // ── Отправка текста на AI ──────────────────────
  async function handleSendText() {
    const text = inputText.trim();
    if (!text) return;

    setParsing(true);
    setParseError('');
    setIsErrorExpanded(false);
    try {
      const result = await ai.parse(text);
      setParseResult(result);
      setParseRawText(result.raw_text || text);
      setInputText('');
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Ошибка AI-парсинга');
    } finally {
      setParsing(false);
    }
  }

  // ── Запись аудио ───────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

        setParsing(true);
        setParseError('');
        setIsErrorExpanded(false);
        try {
          const result = await ai.parseAudio(blob);
          setParseResult(result);
          setParseRawText(result.raw_text || '[Голосовой ввод]');
        } catch (e) {
          setParseError(e instanceof Error ? e.message : 'Ошибка AI-парсинга');
        } finally {
          setParsing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch {
      setParseError('Нет доступа к микрофону');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && recording) {
      // Убираем обработчик onstop чтобы не отправлять на сервер
      mediaRecorderRef.current.onstop = () => {
        // Только останавливаем треки, не отправляем
        mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  // ── Сохранение из ParsePreview ────────────────
  async function handleSave(data: ParsedData) {
    try {
      await saveParsedTransaction(data);
      setParseResult(null);
      // Обновляем данные
      loadData();
      toast.success('Сохранено');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    }
  }

  function handleUpdatedTx(updatedTx: Transaction) {
    setRecent((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
    setSelectedTx((prev) => (prev?.id === updatedTx.id ? updatedTx : prev));
    loadData(); // To refresh summary
  }

  function handleDeletedTx(id: number) {
    setRecent((prev) => prev.filter((t) => t.id !== id));
    loadData(); // To refresh summary
  }

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="page container">
      {/* Сводка */}
      <div
        className="summary-card glass"
      >
        <div className="summary-header">
          <div>
            <h2 className="summary-month">
              {summary?.month
                ? new Date(summary.month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
                : 'Текущий месяц'}
            </h2>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleShowAmounts}
            aria-label="Скрыть/показать суммы"
          >
            {showAmounts ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>

        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-item-label">Доходы</span>
            <span className="summary-item-value text-income amount">
              {loading ? '...' : `+${formatAmount(summary?.total_income || '0')} ₽`}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-item-label">Расходы</span>
            <span className="summary-item-value text-expense amount">
              {loading ? '...' : `-${formatAmount(summary?.total_expense || '0')} ₽`}
            </span>
          </div>
        </div>

        <div className="summary-balance">
          <span className="text-secondary">Баланс</span>
          <span className={`amount ${Number(summary?.balance || 0) >= 0 ? 'text-income' : 'text-expense'}`}>
            {loading ? '...' : `${formatAmount(summary?.balance || '0')} ₽`}
          </span>
        </div>
      </div>

      {/* Ошибка парсинга */}
      {parseError && (() => {
        // Преобразуем техническую ошибку в читаемое сообщение
        let title = 'Ошибка AI';
        let detail = 'Попробуйте ещё раз позже.';
        if (parseError.includes('429') || parseError.toLowerCase().includes('quota')) {
          title = 'Превышен лимит AI';
          detail = 'Исчерпан бесплатный лимит запросов Gemini. Подождите немного или введите транзакцию вручную.';
        } else if (parseError.includes('401') || parseError.toLowerCase().includes('unauthorized')) {
          title = 'Ошибка авторизации';
          detail = 'Неверный ключ API. Проверьте настройки.';
        } else if (parseError.includes('network') || parseError.toLowerCase().includes('failed to fetch')) {
          title = 'Нет связи';
          detail = 'Не удалось достучься до AI-сервиса. Проверьте интернет.';
        } else if (parseError.includes('500') || parseError.includes('502') || parseError.includes('503')) {
          title = 'Сервер недоступен';
          detail = 'Временная ошибка сервера. Попробуйте через несколько секунд.';
        }
        return (
          <div
            className="parse-toast parse-toast--rich"
            onClick={() => setIsErrorExpanded(!isErrorExpanded)}
            style={{ cursor: 'pointer' }}
          >
            <AlertTriangle size={16} className="parse-toast-icon" />
            <div className="parse-toast-body">
              <span className="parse-toast-title">{title}</span>
              <span className="parse-toast-detail">{detail}</span>
              {isErrorExpanded && (
                <div style={{ marginTop: 8, fontSize: '13px', opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.15)', padding: '8px 10px', borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {parseError}
                </div>
              )}
            </div>
            <button className="parse-toast-close" onClick={(e) => { e.stopPropagation(); setParseError(''); setIsErrorExpanded(false); }}>
              <XIcon size={14} />
            </button>
          </div>
        );
      })()}

      {/* Последние транзакции */}
      <div className="recent-section">
        <h3 className="section-title">Последние операции</h3>
        {isInitialLoad ? (
          <div className="skeleton-list">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8 }} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div
            className="empty-state"
          >
            <p>Пока нет операций</p>
            <p className="text-secondary">Введите текст ниже для создания</p>
          </div>
        ) : (
          <div className="recent-list" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s ease-in-out' }}>
            {recent.map((tx) => (
              <div
                key={tx.id}
                className="recent-item glass-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedTx(tx)}
              >
                <div className="recent-item-info">
                  <span className="recent-item-comment">
                    {tx.category_icon && <span className="recent-item-icon">{tx.category_icon}</span>}
                    {tx.comment || tx.category_name || 'Без описания'}
                  </span>
                  <span className="recent-item-meta text-secondary">
                    {tx.category_name && <span className="badge badge-sm">{tx.category_name}</span>}
                    {new Date(tx.transaction_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <span className={`recent-item-amount amount ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)} ₽
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Кнопка ручного добавления */}
      <div style={{ position: 'fixed', bottom: 'calc(var(--navbar-height) + var(--safe-area-bottom) + 72px)', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 49 }}>
        <button
          id="manual-add-btn"
          className="btn btn-secondary btn-sm"
          onClick={() => setManualOpen(true)}
          style={{ borderRadius: 'var(--radius-full)', gap: 6, paddingLeft: 16, paddingRight: 16, background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', fontSize: 'var(--font-size-xs)' }}
        >
          <PlusCircle size={14} />
          Добавить вручную
        </button>
      </div>

      {/* Ввод внизу */}
      <div className="input-bar glass">
        {recording ? (
          /* Режим записи: кнопка отмены, индикатор записи, кнопка отправки */
          <>
            <button
              className="btn btn-icon input-bar-btn mic-cancel-btn"
              onClick={cancelRecording}
              aria-label="Отменить запись"
            >
              <XIcon size={20} />
            </button>
            <div className="recording-indicator">
              <span className="recording-dot" />
              <span className="recording-label">Запись...</span>
            </div>
            <div className={`input-bar-mic mic-recording`}>
              <span className="mic-wave mic-wave-1" />
              <span className="mic-wave mic-wave-2" />
              <span className="mic-wave mic-wave-3" />
              <button
                className="btn btn-primary btn-icon input-bar-btn mic-send-btn"
                onClick={stopRecording}
                aria-label="Отправить запись"
              >
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          /* Обычный режим: текстовое поле, микрофон, отправка */
          <>
            <input
              id="ai-input"
              type="text"
              className="input input-bar-field"
              placeholder="Получил 50000 зарплату..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              disabled={parsing}
            />
            <div className="input-bar-mic">
              <button
                className="btn btn-icon input-bar-btn mic-btn"
                onClick={startRecording}
                disabled={parsing}
                aria-label="Голосовой ввод"
              >
                <Mic size={22} />
              </button>
            </div>
            <button
              className="btn btn-primary btn-icon input-bar-btn"
              disabled={!inputText.trim() || parsing}
              onClick={handleSendText}
              aria-label="Отправить"
            >
              {parsing ? <Loader size={20} className="spin" /> : <Send size={20} />}
            </button>
          </>
        )}
      </div>

      {/* ParsePreview overlay */}
      {parseResult && (
        <ParsePreview
          result={parseResult}
          rawText={parseRawText}
          onSave={handleSave}
          onCancel={() => setParseResult(null)}
        />
      )}

      <TransactionDetailsSheet
        transaction={selectedTx}
        open={!!selectedTx}
        onOpenChange={(open) => !open && setSelectedTx(null)}
        onUpdated={handleUpdatedTx}
        onDeleted={handleDeletedTx}
      />

      <ManualTransactionSheet
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSaved={loadData}
      />
    </div>
    </PullToRefresh>
  );
}
