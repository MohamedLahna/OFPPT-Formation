import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/client';

const initialAssistantMessage = {
  id: 'assistant-welcome',
  role: 'assistant',
  content: 'Bonjour. Je peux vous aider sur vos sessions, plans, documents, absences et evaluations. Que voulez-vous verifier ?',
  questions: [
    'Quelles sont mes prochaines sessions ?',
    'Combien de documents sont disponibles pour moi ?',
    'Ai-je des evaluations en attente ?',
  ],
};

function GlowBubbleIcon() {
  const bubblePath = 'M24 35C31 23 45 19 61 20C83 22 98 35 98 53C98 66 90 75 79 81L75 93C73 100 69 104 63 104C58 104 54 100 52 93L50 82C37 83 27 80 20 72C13 63 13 47 24 35Z';

  return (
    <svg viewBox="0 0 120 120" className="participant-advisor-trigger-icon" aria-hidden="true">
      <defs>
        <radialGradient id="advisorIconInner" cx="46%" cy="34%" r="76%">
          <stop offset="0%" stopColor="#0b1629" />
          <stop offset="100%" stopColor="#040817" />
        </radialGradient>
        <linearGradient id="advisorIconStroke" x1="18" y1="16" x2="92" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67dcff" />
          <stop offset="45%" stopColor="#47cfff" />
          <stop offset="78%" stopColor="#c07bff" />
          <stop offset="100%" stopColor="#ffe7db" />
        </linearGradient>
        <linearGradient id="advisorIconBars" x1="60" y1="44" x2="60" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c5f7ff" />
        </linearGradient>
        <filter id="advisorIconGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#advisorIconGlow)">
        <path
          d={bubblePath}
          fill="url(#advisorIconInner)"
          opacity="0.95"
        />
        <path
          d={bubblePath}
          fill="none"
          stroke="url(#advisorIconStroke)"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>

      <rect x="40" y="43" width="12" height="36" rx="6" fill="url(#advisorIconBars)" />
      <rect x="67" y="43" width="12" height="36" rx="6" fill="url(#advisorIconBars)" />
    </svg>
  );
}

export default function ParticipantAdvisorWidget() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([initialAssistantMessage]);
  const viewportRef = useRef(null);
  const messagesRef = useRef(messages);
  const nextIdRef = useRef(1);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const node = viewportRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, open, pending]);

  const hasUserMessage = useMemo(
    () => messages.some((message) => message.role === 'user'),
    [messages]
  );

  const askAdvisor = async (text) => {
    const normalized = String(text || '').trim();
    if (!normalized || pending) return;

    setError('');
    const userMessage = {
      id: `user-${nextIdRef.current++}`,
      role: 'user',
      content: normalized,
    };

    const historyForApi = [...messagesRef.current, userMessage]
      .map((message) => ({ role: message.role, content: message.content }))
      .slice(-22);

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setPending(true);

    try {
      const { data } = await api.post(
        '/participant/advisor',
        { messages: historyForApi, language: 'fr' },
        { timeout: 30000 }
      );

      const reply = String(data?.reply || '').trim() || 'Je n ai pas pu generer une reponse precise maintenant.';
      const assistantMessage = {
        id: `assistant-${nextIdRef.current++}`,
        role: 'assistant',
        content: reply,
        questions: Array.isArray(data?.questions) ? data.questions.filter(Boolean).slice(0, 3) : [],
        disclaimer: data?.disclaimer ? String(data.disclaimer) : '',
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message;
      setError(apiMessage || 'Assistant indisponible pour le moment. Reessayez dans quelques instants.');
      setMessages((current) => [...current, {
        id: `assistant-${nextIdRef.current++}`,
        role: 'assistant',
        content: 'Je rencontre un probleme de connexion pour le moment. Vous pouvez continuer en consultant vos pages Sessions, Documents et Absences.',
        questions: [],
      }]);
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    askAdvisor(input);
  };

  return (
    <section className={`participant-advisor-widget ${open ? 'is-open' : ''}`} aria-label="Assistant participant">
      {!open && (
        <button
          type="button"
          className="participant-advisor-trigger"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir assistant participant"
        >
          <span className="participant-advisor-trigger-art">
            <GlowBubbleIcon />
          </span>
        </button>
      )}

      {open && (
        <div className="participant-advisor-panel">
          <div className="participant-advisor-head">
            <div>
              <p className="eyebrow">Assistant participant</p>
              <h3>Conseiller formation</h3>
            </div>
            <button
              type="button"
              className="participant-advisor-close"
              onClick={() => setOpen(false)}
              aria-label="Fermer assistant participant"
            >
              x
            </button>
          </div>

          <div ref={viewportRef} className="participant-advisor-messages">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`participant-advisor-message ${message.role === 'user' ? 'from-user' : 'from-assistant'}`}
              >
                <p>{message.content}</p>
                {message.role === 'assistant' && Array.isArray(message.questions) && message.questions.length > 0 && (
                  <div className="participant-advisor-questions">
                    {message.questions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        disabled={pending}
                        onClick={() => askAdvisor(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
                {message.role === 'assistant' && message.disclaimer && (
                  <small>{message.disclaimer}</small>
                )}
              </article>
            ))}
            {pending && <div className="participant-advisor-typing">Assistant en cours de reponse...</div>}
          </div>

          {!hasUserMessage && (
            <div className="participant-advisor-quick-prompts">
              {initialAssistantMessage.questions.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={pending}
                  onClick={() => askAdvisor(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {error && <p className="participant-advisor-error">{error}</p>}

          <form className="participant-advisor-form" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Posez votre question..."
              maxLength={1000}
            />
            <button type="submit" disabled={pending || input.trim() === ''}>
              Envoyer
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
