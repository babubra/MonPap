import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Eye, EyeOff, Send, Mic, MicOff, Loader, PlusCircle, ChevronRight, AlertTriangle, X as XIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useShowAmounts } from '../hooks/useShowAmounts';
import {
  transactions as txApi,
  categories as catApi,
  counterparts as cpApi,
  debts as debtsApi,
  ai,
  type TransactionSummary,
  type Transaction,
  type AiParseResult,
  type Category,
} from '../api';
import { ParsePreview, type ParsedData } from '../components/ParsePreview';
import { TransactionDetailsSheet } from '../components/TransactionDetailsSheet';
import { ReferenceSheet, type ReferenceItem } from '../components/ReferenceSheet';
import { Drawer } from 'vaul';
import './Home.css';

export function Home() {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const { showAmounts, toggleShowAmounts, formatAmount } = useShowAmounts();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Ручная транзакция
  const [manualOpen, setManualOpen] = useState(false);
  const [mType, setMType] = useState<'income' | 'expense'>('expense');
  const [mAmount, setMAmount] = useState('');
  const [mComment, setMComment] = useState('');
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [mCatId, setMCatId] = useState<number | null>(null);
  const [mCatName, setMCatName] = useState('');
  const [mCatSheet, setMCatSheet] = useState(false);
  const [mSaving, setMSaving] = useState(false);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  // AI parse
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<AiParseResult | null>(null);
  const [parseRawText, setParseRawText] = useState('');
  const [parseError, setParseError] = useState('');

  // Аудио
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadData();
    catApi.list().then(setCategoriesList).catch(() => {});
  }, []);

  async function loadData() {
    try {
      const [s, r] = await Promise.all([
        txApi.summary(),
        txApi.list({ limit: 10 }),
      ]);
      setSummary(s);
      setRecent(r);
    } catch {
      // Оффлайн
    } finally {
      setLoading(false);
    }
  }

  // Ручное добавление транзакции
  const filteredCatsForManual = categoriesList.filter((c) => c.type === mType);

  async function saveManualTx() {
    if (!mAmount) return;
    setMSaving(true);
    try {
      await txApi.create({
        type: mType,
        amount: Number(mAmount),
        transaction_date: mDate,
        category_id: mCatId || undefined,
        comment: mComment || undefined,
      });
      setManualOpen(false);
      setMAmount('');
      setMComment('');
      setMCatId(null);
      setMCatName('');
      loadData();
    } catch {
      // ошибка
    } finally {
      setMSaving(false);
    }
  }

  async function handleCreateCatInSheet(name: string): Promise<ReferenceItem | null> {
    try {
      const created = await catApi.create({ name, type: mType });
      setCategoriesList((prev) => [...prev, created]);
      return created;
    } catch {
      return null;
    }
  }


  // ── Отправка текста на AI ──────────────────────
  async function handleSendText() {
    const text = inputText.trim();
    if (!text) return;

    setParsing(true);
    setParseError('');
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

  function toggleRecording() {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  // ── Сохранение из ParsePreview ────────────────
  async function handleSave(data: ParsedData) {
    // ── Авто-создание нового субъекта если AI распознал нового ──
    let counterpartId = data.counterpart_id;
    if (!counterpartId && data.counterpart_name) {
      try {
        const created = await cpApi.create({ name: data.counterpart_name });
        counterpartId = created.id;
      } catch {
        // Субъект не создался — сохраняем без него
      }
    }

    // ── Авто-создание новой категории если AI распознал новую ──
    let categoryId = data.category_id;
    if (!categoryId && data.category_name && (data.type === 'income' || data.type === 'expense')) {
      try {
        const created = await catApi.create({ name: data.category_name, type: data.type });
        categoryId = created.id;
      } catch {
        // Категория не создалась — сохраняем без неё
      }
    }

    if (data.type === 'income' || data.type === 'expense') {
      await txApi.create({
        type: data.type,
        amount: data.amount,
        transaction_date: data.date,
        category_id: categoryId || undefined,
        comment: data.raw_text || data.comment || undefined,
        raw_text: data.raw_text || undefined,
        currency: data.currency,
      });
    } else if (data.type === 'debt_give' || data.type === 'debt_take') {
      await debtsApi.create({
        direction: data.type === 'debt_give' ? 'gave' : 'took',
        amount: data.amount,
        debt_date: data.date,
        counterpart_id: counterpartId || undefined,
        comment: data.raw_text || data.comment || undefined,
        currency: data.currency,
      });
    } else if (data.type === 'debt_payment') {
      if (!data.debt_id) throw new Error('Не выбран долг для оплаты');
      await debtsApi.addPayment(data.debt_id, {
        amount: data.amount,
        payment_date: data.date,
        comment: data.raw_text || data.comment || undefined,
      });
    }

    setParseResult(null);
    // Обновляем данные
    loadData();
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
    <div className="page container">
      {/* Сводка */}
      <motion.div
        className="summary-card glass"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
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
            <div className="summary-item-icon income">
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="summary-item-label">Доходы</span>
              <span className="summary-item-value text-income amount">
                {loading ? '...' : `+${formatAmount(summary?.total_income || '0')} ₽`}
              </span>
            </div>
          </div>

          <div className="summary-item">
            <div className="summary-item-icon expense">
              <TrendingDown size={18} />
            </div>
            <div>
              <span className="summary-item-label">Расходы</span>
              <span className="summary-item-value text-expense amount">
                {loading ? '...' : `-${formatAmount(summary?.total_expense || '0')} ₽`}
              </span>
            </div>
          </div>
        </div>

        <div className="summary-balance">
          <span className="text-secondary">Баланс</span>
          <span className={`amount ${Number(summary?.balance || 0) >= 0 ? 'text-income' : 'text-expense'}`}>
            {loading ? '...' : `${formatAmount(summary?.balance || '0')} ₽`}
          </span>
        </div>
      </motion.div>

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
          <motion.div
            className="parse-toast parse-toast--rich"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertTriangle size={16} className="parse-toast-icon" />
            <div className="parse-toast-body">
              <span className="parse-toast-title">{title}</span>
              <span className="parse-toast-detail">{detail}</span>
            </div>
            <button className="parse-toast-close" onClick={() => setParseError('')}>
              <XIcon size={14} />
            </button>
          </motion.div>
        );
      })()}

      {/* Последние транзакции */}
      <div className="recent-section">
        <h3 className="section-title">Последние операции</h3>
        {loading ? (
          <div className="skeleton-list">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8 }} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>Пока нет операций</p>
            <p className="text-secondary">Введите текст ниже для создания</p>
          </motion.div>
        ) : (
          <div className="recent-list">
            {recent.map((tx, i) => (
              <motion.div
                key={tx.id}
                className="recent-item glass-card"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedTx(tx)}
              >
                <div className="recent-item-info">
                  <span className="recent-item-comment">
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
              </motion.div>
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
        <input
          id="ai-input"
          type="text"
          className="input input-bar-field"
          placeholder="Получил 50000 зарплату..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          disabled={parsing || recording}
        />
        <button
          className={`btn btn-ghost btn-icon ${recording ? 'recording-active' : ''}`}
          onClick={toggleRecording}
          disabled={parsing}
          aria-label="Голосовой ввод"
        >
          {recording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button
          className="btn btn-primary btn-icon"
          disabled={!inputText.trim() || parsing}
          onClick={handleSendText}
          aria-label="Отправить"
        >
          {parsing ? <Loader size={18} className="spin" /> : <Send size={18} />}
        </button>
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

      {/* Drawer: Ручная транзакция */}
      <Drawer.Root open={manualOpen} onOpenChange={setManualOpen}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)' }} />
          <Drawer.Content
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: 'var(--bg-secondary)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
            }}
          >
            <div className="manual-tx-content">
              <div className="manual-tx-handle" />
              <Drawer.Title className="manual-tx-title">Новая транзакция</Drawer.Title>

              <div className="manual-tx-fields">
                {/* Тип */}
                <div>
                  <label className="manual-tx-label">Тип</label>
                  <div className="manual-tx-type-row">
                    <button
                      className={`manual-tx-type-btn ${mType === 'expense' ? 'active' : ''}`}
                      onClick={() => { setMType('expense'); setMCatId(null); setMCatName(''); }}
                    >
                      Расход
                    </button>
                    <button
                      className={`manual-tx-type-btn ${mType === 'income' ? 'active' : ''}`}
                      onClick={() => { setMType('income'); setMCatId(null); setMCatName(''); }}
                    >
                      Доход
                    </button>
                  </div>
                </div>

                {/* Сумма */}
                <div>
                  <label className="manual-tx-label">Сумма</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={mAmount}
                    onChange={(e) => setMAmount(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Категория */}
                <div>
                  <label className="manual-tx-label">Категория</label>
                  <button className="manual-tx-cat-picker" onClick={() => setMCatSheet(true)}>
                    {mCatName ? (
                      <span>{mCatName}</span>
                    ) : (
                      <span className="text-muted">Выберите категорию...</span>
                    )}
                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }} />
                  </button>
                </div>

                {/* Комментарий */}
                <div>
                  <label className="manual-tx-label">Комментарий</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Необязательно"
                    value={mComment}
                    onChange={(e) => setMComment(e.target.value)}
                  />
                </div>

                {/* Дата */}
                <div>
                  <label className="manual-tx-label">Дата</label>
                  <input
                    className="input"
                    type="date"
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="parse-actions">
                <button className="btn btn-secondary" onClick={() => setManualOpen(false)}>
                  Отмена
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveManualTx}
                  disabled={!mAmount || mSaving}
                >
                  {mSaving ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <ReferenceSheet
        open={mCatSheet}
        onOpenChange={setMCatSheet}
        title="Выберите категорию"
        items={filteredCatsForManual}
        selectedId={mCatId}
        onSelect={(item) => { setMCatId(item.id); setMCatName(item.name); }}
        onCreate={handleCreateCatInSheet}
      />
    </div>
  );
}
