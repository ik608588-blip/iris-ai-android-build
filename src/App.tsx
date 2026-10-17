import { AppLauncher } from "./appLauncher";
import { apiUrl } from "./api";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import "./App.css";
import Phase1Page from "./Phase1Page";

import {
  Menu,
  X,
  Home,
  MessageSquare,
  Monitor,
  Settings,
  Trash2,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Wifi,
  Cpu,
  Shield,
  ChevronRight,
  Sparkles,
  User,
  BarChart3,
  Trophy,
  CalendarDays,
  Brain,
  BookOpen,
} from "lucide-react";

type BoardQuestion = {
  number: number;
  difficulty: string;
  topic: string;
  question: string;
  answer: string;
  explanation: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface SpeechRecognitionResultEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

type Page =
  | "dashboard"
  | "chat"
  | "system"
  | "settings"
  | "board-prep"
  | "phase1"
  | "memory";

const STORAGE_KEY = "iris-conversation";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [message, setMessage] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    },
  );


  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);


  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversationHistory),
    );
  }, [conversationHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [conversationHistory, loading]);

  const speak = async (text: string) => {
    if (!text || !text.trim()) return;

    console.log("IRIS TTS START:", text);

    try {
      setSpeaking(true);

      const response = await fetch(apiUrl("/api/tts"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (!audioRef.current) {
        URL.revokeObjectURL(audioUrl);
        throw new Error("Audio element missing");
      }

      const audio = audioRef.current;

      audio.pause();
      audio.currentTime = 0;
      audio.src = audioUrl;
      audio.volume = 1;
      audio.load();

      audio.onplay = () => {
        console.log("IRIS ELEVENLABS PLAYING");
      };

      audio.onended = () => {
        console.log("IRIS ELEVENLABS ENDED");
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        console.error("IRIS ELEVENLABS AUDIO ERROR");
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();

    } catch (error) {
      console.error("IRIS ELEVENLABS ERROR:", error);

      // Fallback only if ElevenLabs fails.
      speakWithDeviceVoice(text);
    }
  };

  const speakWithDeviceVoice = (text: string) => {
    if (!("speechSynthesis" in window)) {
      console.error("IRIS DEVICE TTS unavailable");
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log("IRIS DEVICE TTS PLAYING");
      setSpeaking(true);
    };

    utterance.onend = () => {
      console.log("IRIS DEVICE TTS ENDED");
      setSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error("IRIS DEVICE TTS ERROR:", event);
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (inputText?: string) => {
    const text = (inputText ?? message).trim();

    if (!text || loading) return;

    const historyBeforeReply = conversationHistory;

    setMessage("");
    setLoading(true);

    const userMessage: Message = {
      role: "user",
      content: text,
    };

    setConversationHistory((prev) => [
      ...prev,
      userMessage,
    ]);

    const command = text
      .replace(/^(?:hey\s+iris[, ]*)/i, "")
      .replace(/^please\s+/i, "")
      .trim()
      .replace(/[.!?]+$/, "")
      .trim();

    let serviceKey = "";
    let query = "";
    let isPlayCommand = false;

    // Search service first: "search YouTube for cats"
    let match = command.match(
      /^(?:search|find)\s+(google|youtube music|youtube)\s+(?:for\s+)?(.+)$/i
    );

    if (match) {
      serviceKey = match[1].toLowerCase() === "youtube music"
        ? "youtube_music"
        : match[1].toLowerCase();
      query = match[2].trim();
    } else {
      // Search query first: "search cats on YouTube"
      match = command.match(
        /^(?:search|find)\s+(.+?)\s+(?:on|in)\s+(google|youtube music|youtube)$/i
      );

      if (match) {
        query = match[1].trim();
        serviceKey = match[2].toLowerCase() === "youtube music"
          ? "youtube_music"
          : match[2].toLowerCase();
      } else {
        // Play/watch/listen with a specified service
        match = command.match(
          /^(play|watch|listen to)\s+(.+?)\s+(?:on|in)\s+(youtube music|youtube)$/i
        );

        if (match) {
          isPlayCommand = true;
          query = match[2].trim();
          serviceKey = match[3].toLowerCase() === "youtube music"
            ? "youtube_music"
            : "youtube";
        } else {
          // Unspecified "play ..." defaults to YouTube Music
          match = command.match(
            /^(?:play|listen to)\s+(.+)$/i
          );

          if (match) {
            isPlayCommand = true;
            query = match[1].trim();
            serviceKey = "youtube_music";
          } else {
            // Natural wording: "Google cats", "YouTube search cats"
            match = command.match(
              /^(google|youtube music|youtube)\s+(?:search\s+)?(.+)$/i
            );

            if (match) {
              serviceKey = match[1].toLowerCase() === "youtube music"
                ? "youtube_music"
                : match[1].toLowerCase();
              query = match[2].trim();
            }
          }
        }
      }
    }

    if (serviceKey && query) {
      const serviceName =
        serviceKey === "youtube_music"
          ? "YouTube Music"
          : serviceKey === "youtube"
            ? "YouTube"
            : "Google";

      try {
        await AppLauncher.search({
          service: serviceKey,
          query,
          play: isPlayCommand,
        });

        const reply = isPlayCommand
          ? `Opened ${serviceName} results for ${query}. Select a result to start playback.`
          : `Searching ${serviceName} for ${query}.`;

        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: reply },
        ]);

        if (voiceEnabled) await speak(reply);
      } catch (error) {
        console.error("IRIS search error:", error);
        const reply = error instanceof Error
          ? error.message
          : `I couldn't open ${serviceName} search.`;

        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: reply },
        ]);

        if (voiceEnabled) await speak(reply);
      } finally {
        setLoading(false);
      }

      return;
    }

    const launchMatch = text.match(
      /^(?:hey\s+iris[, ]*)?(?:please\s+)?(?:open|launch|start)\s+(?:the\s+)?(.+?)[.!?]*$/i
    );

    if (launchMatch) {
      const requestedApp = launchMatch[1]
        .trim()
        .replace(/[.!?]+$/, "")
        .replace(/\s+(?:app|application)$/i, "")
        .trim();

      const appAliases: Record<string, string> = {
        chrome: "Chrome",
        browser: "Chrome",
        youtube: "YouTube",
        yt: "YouTube",
        settings: "Settings",
        whatsapp: "WhatsApp",
        instagram: "Instagram",
        termux: "Termux",
      };

      const normalizedApp = requestedApp.toLowerCase().replace(/\s+/g, "");

      if (appAliases[normalizedApp]) {
        const appName = appAliases[normalizedApp];

        try {
          const result = await AppLauncher.open({ app: normalizedApp });
          const reply = result.success
            ? `Requested Android to open ${appName}.`
            : `I couldn't open ${appName}.`;

          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant", content: reply },
          ]);

          if (voiceEnabled) await speak(reply);
        } catch (error) {
          console.error("IRIS app launch error:", error);
          const reply =
            error instanceof Error
              ? error.message
              : `I couldn't open ${appName}. Check that it is installed.`;

          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant", content: reply },
          ]);

          if (voiceEnabled) await speak(reply);
        } finally {
          setLoading(false);
        }

        return;
      }
    }

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: historyBeforeReply,
          source: "web",
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const data = await response.json();

      const reply =
        data.reply ||
        data.message ||
        data.response ||
        "I couldn't generate a response.";

      let finalReply = reply;

      if (data.action?.status === "completed") {
        finalReply = `${reply}\\n\\n✓ Action completed`;
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: finalReply,
      };

      setConversationHistory((prev) => [
        ...prev,
        assistantMessage,
      ]);

      const speechText = data.ttsText || reply;

      console.log("IRIS TTS:", speechText);

      if (voiceEnabled) {
        await speak(speechText);
      }
    } catch (error) {
      console.error("IRIS chat error:", error);

      setConversationHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't connect to the IRIS server.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    setPage("dashboard");
    setMenuOpen(false);
  };

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    setMenuOpen(false);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const MenuItem = ({
    icon,
    label,
    active = false,
    onClick,
    danger = false,
  }: {
    icon: ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    danger?: boolean;
  }) => (
    <button
      className={`menu-item ${active ? "active" : ""} ${
        danger ? "danger-menu" : ""
      }`}
      onClick={onClick}
    >
      <span className="menu-icon">{icon}</span>
      <span>{label}</span>
      <ChevronRight size={15} className="menu-arrow" />
    </button>
  );

const startListening = () => {
  const speechWindow = window as SpeechRecognitionWindow;

  const SpeechRecognition =
    speechWindow.SpeechRecognition ||
    speechWindow.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice recognition is not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  setListening(true);

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;

    setListening(false);
    sendMessage(text);
  };

  recognition.onerror = () => {
    setListening(false);
  };

  recognition.onend = () => {
    setListening(false);
  };

  recognition.start();
};
 

const Dashboard = () => (
  <section className="page-content">
    <div className="hero-orb">
      <div
        className={`iris-orb
          ${listening ? "orb-listening" : ""}
          ${loading ? "orb-thinking" : ""}
          ${speaking ? "orb-speaking" : ""}
        `}
      >
        <div className="orb-aura" />

        <div className="orb-ring orb-ring-one" />
        <div className="orb-ring orb-ring-two" />
        <div className="orb-ring orb-ring-three" />

        <div className="iris-eye">
          <div className="eye-glow" />

          <div className="eye-outer">
            <div className="eye-inner">
              <div className="eye-pupil" />
              <div className="eye-highlight" />
            </div>
          </div>

          <div className="eye-scan" />
        </div>

        <div className="orb-particles">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>

    <p className="eyebrow">IRIS AI SYSTEM</p>

    <h1>
      Your intelligent
      <br />
      <span>digital workspace.</span>
    </h1>

    <p className="hero-text">
      Ask anything, explore ideas, write code, or let IRIS
      help you get things done.
    </p>

    <button
      className="voice-button"
      onClick={startListening}
    >
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
      {listening ? "Listening..." : "Activate Voice"}
    </button>

    <div className="suggestions">
      <div className="section-title">
        <Sparkles size={14} />
        <span>Try asking IRIS</span>
      </div>

      <div className="suggestion-grid">
        <button
          className="suggestion-card"
          onClick={() => sendMessage("Help me plan my day")}
        >
          <span>Help me plan my day</span>
          <ChevronRight size={15} />
        </button>

        <button
          className="suggestion-card"
          onClick={() => sendMessage("Explain a difficult topic")}
        >
          <span>Explain a difficult topic</span>
          <ChevronRight size={15} />
        </button>

        <button
          className="suggestion-card"
          onClick={() => sendMessage("Write some code")}
        >
          <span>Write some code</span>
          <ChevronRight size={15} />
        </button>

        <button
          className="suggestion-card"
          onClick={() => sendMessage("Summarize something")}
        >
          <span>Summarize something</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>

    <SystemCards />
  </section>
);

  const SystemCards = () => (
    <div className="system-cards">
      <div className="system-card">
        <Cpu size={18} />
        <div>
          <strong>AI Core</strong>
          <span>Online</span>
        </div>
      </div>

      <div className="system-card">
        <Wifi size={18} />
        <div>
          <strong>Network</strong>
          <span>Connected</span>
        </div>
      </div>

      <div className="system-card">
        <Shield size={18} />
        <div>
          <strong>Security</strong>
          <span>Protected</span>
        </div>
      </div>
    </div>
  );

  const formatMessageContent = (content: string) => {
    const normalized = String(content || "")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n");

    const formatInline = (text: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*)/g);

      return parts.map((part, index) => {
        if (
          part.startsWith("**") &&
          part.endsWith("**") &&
          part.length >= 4
        ) {
          return (
            <strong key={index}>
              {part.slice(2, -2)}
            </strong>
          );
        }

        return <span key={index}>{part}</span>;
      });
    };

    return normalized.split("\n").map((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return <div className="message-spacer" key={index} />;
      }

      const bulletMatch = trimmed.match(/^[-•]\s+(.*)$/);

      if (bulletMatch) {
        return (
          <div className="message-list-item" key={index}>
            <span className="message-bullet">•</span>
            <span>{formatInline(bulletMatch[1])}</span>
          </div>
        );
      }

      const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);

      if (numberedMatch) {
        return (
          <div className="message-list-item" key={index}>
            <span className="message-number">
              {numberedMatch[1]}.
            </span>
            <span>{formatInline(numberedMatch[2])}</span>
          </div>
        );
      }

      return (
        <div className="message-line" key={index}>
          {formatInline(line)}
        </div>
      );
    });
  };

  const Conversation = () => (
    <div className="chat-panel">
      {conversationHistory.length === 0 ? (
        <div className="empty-chat">
          <img src="/iris-logo.png" alt="IRIS" className="iris-logo-large" />
          <h3>No conversation yet</h3>
          <p>Start a conversation with IRIS.</p>
        </div>
      ) : (
        <div className="conversation">
          {conversationHistory.map((item, index) => (
            <div
              className={`message-row ${item.role}`}
              key={`${item.role}-${index}`}
            >
              <div className="message-avatar">
                {item.role === "assistant" ? (
                  <img src="/iris-logo.png" alt="IRIS" className="message-avatar-logo" />
                ) : (
                  <User size={15} />
                )}
              </div>

              <div className="message-bubble">
                <div className="message-role">
                  {item.role === "assistant" ? "IRIS" : "YOU"}
                </div>

                <div className="message-text">
                  {formatMessageContent(item.content)}
                </div>

                {item.role === "assistant" && (
                  <button
                    className="speak-message"
                    onClick={() => speak(item.content)}
                  >
                    <Volume2 size={12} />
                    Speak
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="message-avatar">
                <img src="/iris-logo.png" alt="IRIS" className="message-avatar-logo" />
              </div>

              <div className="message-bubble">
                <div className="message-role">IRIS</div>

                <div className="thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}
    </div>
  );

  const ChatPage = () => (
    <section className="page-content inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h2>Conversation</h2>
        </div>

        <button
          className="small-action danger"
          onClick={clearConversation}
        >
          <Trash2 size={14} />
          Clear
        </button>
      </div>

      <Conversation />
    </section>
  );

  const SystemPage = () => {
    const cards = [
      {
        title: "AI Core",
        text: "IRIS intelligence engine",
        icon: <Cpu size={19} />,
      },
      {
        title: "Network",
        text: "Backend connection",
        icon: <Wifi size={19} />,
      },
      {
        title: "Security",
        text: "Local session protected",
        icon: <Shield size={19} />,
      },
      {
        title: "Voice",
        text: voiceEnabled ? "Voice output enabled" : "Voice output disabled",
        icon: <Volume2 size={19} />,
      },
      {
        title: "Interface",
        text: "IRIS mobile workspace",
        icon: <Monitor size={19} />,
      },
      {
        title: "Session",
        text: `${conversationHistory.length} messages`,
        icon: <MessageSquare size={19} />,
      },
    ];

    return (
      <section className="page-content inner-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">IRIS AI</p>
            <h2>System</h2>
          </div>
        </div>

        <div className="system-large-grid">
          {cards.map((card) => (
            <div
              className="system-large-card"
              key={card.title}
            >
              <div className="large-card-icon">
                {card.icon}
              </div>

              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <span className="online-dot">● ACTIVE</span>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const SettingsPage = () => (
    <section className="page-content inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">IRIS AI</p>
          <h2>Settings</h2>
        </div>

        <Settings size={21} color="var(--accent)" />
      </div>

      <div className="settings-list">
        <div className="setting">
          <div>
            <strong>Voice output</strong>
            <span>IRIS reads responses aloud</span>
          </div>

          <button
            className={`toggle ${voiceEnabled ? "on" : ""}`}
            onClick={() => setVoiceEnabled((value) => !value)}
            aria-label="Toggle voice output"
          >
            <span />
          </button>
        </div>

        <div className="setting">
          <div>
            <strong>Voice input</strong>
            <span>Microphone interface</span>
          </div>

          <button
            className={`toggle ${listening ? "on" : ""}`}
            onClick={() => setListening((value) => !value)}
            aria-label="Toggle voice input"
          >
            <span />
          </button>
        </div>

        <div className="setting">
          <div>
            <strong>Conversation storage</strong>
            <span>Saved locally on this device</span>
          </div>

          <span className="setting-status">LOCAL</span>
        </div>

        <button
          className="setting"
          onClick={clearConversation}
        >
          <div>
            <strong>Clear conversation data</strong>
            <span>Remove saved IRIS chat history</span>
          </div>

          <Trash2 size={18} color="#d27676" />
        </button>
      </div>
    </section>
  );

  const BoardPrepPage = () => {
    const [boardQuestions, setBoardQuestions] = useState<BoardQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [checked, setChecked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [stats, setStats] = useState(() => {
      try {
        const saved = localStorage.getItem("iris-board-stats");

        return saved
          ? JSON.parse(saved)
          : {
              challengesCompleted: 0,
              problemsSolved: 0,
              correct: 0,
              streak: 0,
              lastChallengeDate: "",
            };
      } catch {
        return {
          challengesCompleted: 0,
          problemsSolved: 0,
          correct: 0,
          streak: 0,
          lastChallengeDate: "",
        };
      }
    });

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date("2026-12-31T23:59:59").getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `iris-board-challenge-${todayKey}`;

    const loadBoardChallenge = async () => {
      setLoading(true);
      setError("");
      setChecked(false);

      try {
        const cached = localStorage.getItem(storageKey);

        if (cached) {
          const parsed = JSON.parse(cached);

          if (Array.isArray(parsed) && parsed.length === 3) {
            setBoardQuestions(parsed);
            setLoading(false);
            return;
          }
        }

        const response = await fetch(
          apiUrl("/api/board-prep"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: "{}",
          },
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Failed to generate today's challenge",
          );
        }

        if (
          !Array.isArray(data.questions) ||
          data.questions.length !== 3
        ) {
          throw new Error(
            "IRIS returned an invalid Maths challenge.",
          );
        }

        localStorage.setItem(
          storageKey,
          JSON.stringify(data.questions),
        );

        setBoardQuestions(data.questions);
      } catch (err) {
        console.error("Board Prep error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Could not load today's Maths challenge.",
        );
      } finally {
        setLoading(false);
      }
    };

    const [challengeAvailable, setChallengeAvailable] = useState(
      new Date().getHours() >= 19,
    );

    useEffect(() => {
      const checkChallengeTime = () => {
        const now = new Date();
        const available = now.getHours() >= 19;

        setChallengeAvailable(available);

        if (available) {
          loadBoardChallenge();
        }
      };

      checkChallengeTime();

      const now = new Date();
      const next7PM = new Date(now);

      next7PM.setHours(19, 0, 0, 0);

      if (next7PM <= now) {
        next7PM.setDate(next7PM.getDate() + 1);
      }

      const delay = next7PM.getTime() - now.getTime();

      const timer = window.setTimeout(() => {
        setChallengeAvailable(true);
        loadBoardChallenge();
      }, delay);

      return () => window.clearTimeout(timer);
    }, []);

    const formatMathText = (value: string) => {
      const superscriptMap: Record<string, string> = {
        "0": "⁰",
        "1": "¹",
        "2": "²",
        "3": "³",
        "4": "⁴",
        "5": "⁵",
        "6": "⁶",
        "7": "⁷",
        "8": "⁸",
        "9": "⁹",
      };

      return value.replace(/\^([0-9]+)/g, (_, digits: string) =>
        digits
          .split("")
          .map((digit) => superscriptMap[digit] || digit)
          .join("")
      );
    };

    const normalizeAnswer = (value: string) =>
      value
        .toLowerCase()
        .replace(/\band\b/g, ",")
        .replace(/\s+/g, "")
        .replace(/[₹$€£,]/g, "")
        .replace(/[.]+$/g, "");

    const checkChallenge = () => {
      if (boardQuestions.length !== 3) return;

      let correctCount = 0;
      let solvedCount = 0;

      for (const question of boardQuestions) {
        const userAnswer = answers[question.number]?.trim();

        if (!userAnswer) continue;

        solvedCount++;

        if (
          normalizeAnswer(userAnswer) ===
          normalizeAnswer(question.answer)
        ) {
          correctCount++;
        }
      }

      const alreadyCompleted =
        stats.lastChallengeDate === todayKey;

      const newStats = {
        challengesCompleted:
          stats.challengesCompleted +
          (alreadyCompleted ? 0 : 1),

        problemsSolved:
          stats.problemsSolved + solvedCount,

        correct:
          stats.correct + correctCount,

        streak:
          alreadyCompleted
            ? stats.streak
            : stats.streak + 1,

        lastChallengeDate: todayKey,
      };

      setStats(newStats);

      localStorage.setItem(
        "iris-board-stats",
        JSON.stringify(newStats),
      );

      setChecked(true);
    };

    const accuracy =
      stats.problemsSolved > 0
        ? Math.round(
            (stats.correct / stats.problemsSolved) * 100,
          )
        : 0;

    return (
      <section className="page-content inner-page board-prep-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">IRIS AI • CLASS 10</p>

            <h2>📊 Board Prep</h2>

            <p className="page-subtitle">
              Your daily CBSE preparation workspace
            </p>
          </div>

          <Trophy size={24} color="var(--accent)" />
        </div>

        <div className="board-stats-grid">
          <div className="board-stat-card">
            <BarChart3 size={20} />
            <strong>{stats.challengesCompleted}</strong>
            <span>Maths Challenges</span>
          </div>

          <div className="board-stat-card">
            <Cpu size={20} />
            <strong>{stats.problemsSolved}</strong>
            <span>Problems Solved</span>
          </div>

          <div className="board-stat-card">
            <Trophy size={20} />
            <strong>{stats.correct}</strong>
            <span>Correct</span>
          </div>

          <div className="board-stat-card">
            <Sparkles size={20} />
            <strong>{accuracy}%</strong>
            <span>Accuracy</span>
          </div>
        </div>

        <div className="board-progress-row">
          <div className="board-progress-item">
            <span>🔥 Current Streak</span>
            <strong>{stats.streak} days</strong>
          </div>

          <div className="board-progress-item">
            <span>
              <CalendarDays size={16} /> Days Remaining
            </span>
            <strong>{daysRemaining}</strong>
          </div>
        </div>

        <div className="board-challenge-header">
          <div>
            <p className="eyebrow">TODAY'S CHALLENGE</p>
            <h3>🧠 3 Maths Problems</h3>
          </div>

          <span className="challenge-time">7:00 PM</span>
        </div>

        {!challengeAvailable && !loading && (
          <div className="board-loading">
            <div>
              <p className="eyebrow">NEXT CHALLENGE</p>
              <h3>⏰ Your Maths challenge arrives at 7:00 PM</h3>
              <p>
                IRIS will generate 3 fresh Class 10 Maths questions
                for you every day at 7:00 PM.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="board-loading">
            <div className="loading-spinner" />
            <p>
              IRIS is generating today's Maths challenge...
            </p>
          </div>
        )}

        {error && (
          <div className="board-error">
            <strong>⚠️ Could not load challenge</strong>
            <p>{error}</p>

            <button
              className="board-submit-button"
              onClick={loadBoardChallenge}
            >
              Try Again
              <ChevronRight size={19} />
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          boardQuestions.length === 3 && (
            <>
              <div className="maths-question-list">
                {boardQuestions.map((item) => {
                  const userAnswer =
                    answers[item.number] || "";

                  const isCorrect =
                    checked &&
                    normalizeAnswer(userAnswer) ===
                      normalizeAnswer(item.answer);

                  return (
                    <article
                      className="maths-question-card"
                      key={item.number}
                    >
                      <div className="maths-question-top">
                        <span className="question-number">
                          Q{item.number}
                        </span>

                        <span className="question-topic">
                          {item.topic}
                        </span>

                        <span className="question-difficulty">
                          {item.difficulty}
                        </span>
                      </div>

                      <p>{formatMathText(item.question)}</p>

                      <input
                        className="math-answer-input"
                        value={userAnswer}
                        disabled={checked}
                        onChange={(event) =>
                          setAnswers((previous) => ({
                            ...previous,
                            [item.number]:
                              event.target.value,
                          }))
                        }
                        placeholder="Enter your answer..."
                        aria-label={`Answer for question ${item.number}`}
                      />

                      {checked && (
                        <div
                          className={
                            isCorrect
                              ? "board-answer-result correct"
                              : "board-answer-result incorrect"
                          }
                        >
                          <strong>
                            {isCorrect
                              ? "✅ Correct!"
                              : "❌ Not quite"}
                          </strong>

                          {!isCorrect && (
                            <p>
                              <strong>
                                Correct answer:
                              </strong>{" "}
                              {item.answer}
                            </p>
                          )}

                          <p>
                            <strong>
                              Explanation:
                            </strong>{" "}
                            {item.explanation}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {!checked ? (
                <button
                  className="board-submit-button"
                  onClick={checkChallenge}
                >
                  Check Today's Challenge
                  <ChevronRight size={19} />
                </button>
              ) : (
                <button
                  className="board-submit-button"
                  onClick={() => {
                    setAnswers({});
                    setChecked(false);
                  }}
                >
                  Practice Again
                  <ChevronRight size={19} />
                </button>
              )}
            </>
          )}
      </section>
    );
  };


  const MemoryPage = () => {
    type Memory = {
      id: string;
      title: string;
      content: string;
      category: string;
      enabled: boolean;
      createdAt: string;
      updatedAt: string;
    };

    const [memories, setMemories] = useState<Memory[]>([]);
    const [search, setSearch] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("General");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loadingMemories, setLoadingMemories] = useState(true);
    const [saving, setSaving] = useState(false);
    const [memoryError, setMemoryError] = useState("");

    const loadMemories = async () => {
      try {
        setLoadingMemories(true);
        setMemoryError("");

        const response = await fetch(apiUrl("/api/memories"));

        if (!response.ok) {
          throw new Error("Failed to load memories");
        }

        const data = await response.json();

        setMemories(Array.isArray(data.memories) ? data.memories : []);
      } catch (error) {
        setMemoryError(
          error instanceof Error
            ? error.message
            : "Could not load memories"
        );
      } finally {
        setLoadingMemories(false);
      }
    };

    useEffect(() => {
      loadMemories();
    }, []);

    const resetForm = () => {
      setTitle("");
      setContent("");
      setCategory("General");
      setEditingId(null);
    };

    const saveMemory = async () => {
      if (!content.trim()) {
        setMemoryError("Memory content cannot be empty.");
        return;
      }

      try {
        setSaving(true);
        setMemoryError("");

        const endpoint = editingId
          ? apiUrl(`/api/memories/${editingId}`)
          : apiUrl("/api/memories");

        const response = await fetch(endpoint, {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            content,
            category,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to save memory");
        }

        await loadMemories();
        resetForm();
      } catch (error) {
        setMemoryError(
          error instanceof Error
            ? error.message
            : "Failed to save memory"
        );
      } finally {
        setSaving(false);
      }
    };

    const editMemory = (memory: Memory) => {
      setEditingId(memory.id);
      setTitle(memory.title);
      setContent(memory.content);
      setCategory(memory.category);
      setMemoryError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const deleteMemory = async (id: string) => {
      if (!window.confirm("Delete this memory?")) {
        return;
      }

      try {
        const response = await fetch(
          apiUrl(`/api/memories/${id}`),
          {
            method: "DELETE",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to delete memory");
        }

        if (editingId === id) {
          resetForm();
        }

        await loadMemories();
      } catch (error) {
        setMemoryError(
          error instanceof Error
            ? error.message
            : "Failed to delete memory"
        );
      }
    };

    const toggleMemory = async (memory: Memory) => {
      try {
        const response = await fetch(
          apiUrl(`/api/memories/${memory.id}`),
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              enabled: !memory.enabled,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to update memory");
        }

        setMemories((previous) =>
          previous.map((item) =>
            item.id === memory.id
              ? { ...item, enabled: !item.enabled }
              : item
          )
        );
      } catch (error) {
        setMemoryError(
          error instanceof Error
            ? error.message
            : "Failed to update memory"
        );
      }
    };

    const clearAllMemories = async () => {
      if (
        !window.confirm(
          "Delete ALL saved memories? This cannot be undone."
        )
      ) {
        return;
      }

      try {
        const response = await fetch(
          apiUrl("/api/memories"),
          {
            method: "DELETE",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to clear memories");
        }

        resetForm();
        setMemories([]);
      } catch (error) {
        setMemoryError(
          error instanceof Error
            ? error.message
            : "Failed to clear memories"
        );
      }
    };

    const filteredMemories = memories.filter((memory) => {
      const query = search.toLowerCase().trim();

      if (!query) {
        return true;
      }

      return [
        memory.title,
        memory.content,
        memory.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    return (
      <section className="page-content inner-page memory-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">IRIS AI • MEMORY</p>
            <h2>🧠 Memory</h2>
            <p className="page-subtitle">
              Give IRIS information it can remember between conversations.
            </p>
          </div>

          <Brain size={25} color="var(--accent)" />
        </div>

        <div className="memory-editor-card">
          <div className="memory-editor-header">
            <div>
              <p className="eyebrow">
                {editingId ? "EDIT MEMORY" : "NEW MEMORY"}
              </p>

              <h3>
                {editingId
                  ? "Update saved information"
                  : "Teach IRIS something"}
              </h3>
            </div>

            {editingId && (
              <button
                className="memory-secondary-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>

          <input
            className="memory-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Memory title"
          />

          <textarea
            className="memory-textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Example: I am preparing for my Class 10 board exams."
            rows={4}
          />

          <div className="memory-editor-row">
            <input
              className="memory-input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category"
            />

            <button
              className="memory-save-button"
              onClick={saveMemory}
              disabled={saving || !content.trim()}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Memory"
                  : "Save Memory"}
            </button>
          </div>
        </div>

        <div className="memory-toolbar">
          <div className="memory-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search memories..."
            />
          </div>

          <button
            className="memory-clear-button"
            onClick={clearAllMemories}
            disabled={!memories.length}
          >
            <Trash2 size={16} />
            Clear All
          </button>
        </div>

        {memoryError && (
          <div className="memory-error">
            ⚠️ {memoryError}
          </div>
        )}

        {loadingMemories ? (
          <div className="memory-empty">
            <Brain size={28} />
            <strong>Loading memories...</strong>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="memory-empty">
            <Brain size={32} />
            <strong>
              {search
                ? "No matching memories"
                : "No memories saved yet"}
            </strong>

            <span>
              {search
                ? "Try another search."
                : "Add your first memory above."}
            </span>
          </div>
        ) : (
          <div className="memory-list">
            {filteredMemories.map((memory) => (
              <article
                className={`memory-card ${
                  memory.enabled ? "" : "memory-disabled"
                }`}
                key={memory.id}
              >
                <div className="memory-card-top">
                  <div>
                    <span className="memory-category">
                      {memory.category}
                    </span>

                    <h3>{memory.title}</h3>
                  </div>

                  <button
                    className={`memory-toggle ${
                      memory.enabled ? "enabled" : ""
                    }`}
                    onClick={() => toggleMemory(memory)}
                    title={
                      memory.enabled
                        ? "Disable memory"
                        : "Enable memory"
                    }
                  >
                    <span />
                    {memory.enabled ? "ON" : "OFF"}
                  </button>
                </div>

                <p>{memory.content}</p>

                <div className="memory-card-bottom">
                  <span>
                    Updated{" "}
                    {new Date(memory.updatedAt).toLocaleDateString()}
                  </span>

                  <div className="memory-actions">
                    <button onClick={() => editMemory(memory)}>
                      Edit
                    </button>

                    <button
                      className="memory-delete"
                      onClick={() => deleteMemory(memory.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderPage = () => {
    switch (page) {
      case "chat":
        return <ChatPage />;

      case "system":
        return <SystemPage />;

      case "settings":
        return <SettingsPage />;

      case "board-prep":
        return <BoardPrepPage />;

      case "phase1":
        return <Phase1Page />;

      case "memory":
        return <MemoryPage />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <>
    <audio
      ref={audioRef}
      preload="auto"
      playsInline
    />

    <div className="iris-app">
      <header className="topbar">
        <button
          className="menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={23} />
        </button>

        <div className="topbar-brand">
          <div className="brand-mark">
            <img src="/iris-logo.png" alt="IRIS AI" className="brand-logo" />
          </div>

          <div>
            <strong>IRIS AI</strong>
            <span>PERSONAL ASSISTANT</span>
          </div>
        </div>

        <div className="topbar-status">
          <span />
          ONLINE
        </div>
      </header>

      {menuOpen && (
        <div
          className="menu-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`side-menu ${menuOpen ? "open" : ""}`}>
        <div className="menu-header">
          <div className="menu-brand">
            <div className="menu-logo">
              <img src="/iris-logo.png" alt="IRIS" className="iris-logo-menu" />
            </div>

            <div>
              <strong>IRIS AI</strong>
              <span>PERSONAL ASSISTANT</span>
            </div>
          </div>

          <button
            className="close-menu"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="menu-section">
          <p className="menu-section-title">WORKSPACE</p>

          <MenuItem
            icon={<Home size={20} />}
            label="Dashboard"
            active={page === "dashboard"}
            onClick={() => navigate("dashboard")}
          />

          <MenuItem
            icon={<BarChart3 size={20} />}
            label="Board Prep"
            active={page === "board-prep"}
            onClick={() => navigate("board-prep")}
          />

          <MenuItem
            icon={<BookOpen size={20} />}
            label="Phase 1 Tasks"
            active={page === "phase1"}
            onClick={() => navigate("phase1")}
          />

          <MenuItem
            icon={<Brain size={20} />}
            label="Memory"
            active={page === "memory"}
            onClick={() => navigate("memory")}
          />

          <MenuItem
            icon={<MessageSquare size={20} />}
            label="Chat"
            active={page === "chat"}
            onClick={() => navigate("chat")}
          />

          <MenuItem
            icon={<Monitor size={20} />}
            label="System"
            active={page === "system"}
            onClick={() => navigate("system")}
          />
        </div>

        <div className="menu-section">
          <p className="menu-section-title">ASSISTANT</p>

          <MenuItem
            icon={
              voiceEnabled ? (
                <Volume2 size={20} />
              ) : (
                <VolumeX size={20} />
              )
            }
            label={voiceEnabled ? "Voice ON" : "Voice OFF"}
            onClick={() =>
              setVoiceEnabled((value) => !value)
            }
          />

          <MenuItem
            icon={<Settings size={20} />}
            label="Settings"
            active={page === "settings"}
            onClick={() => navigate("settings")}
          />

          <MenuItem
            icon={<Trash2 size={20} />}
            label="Clear Conversation"
            danger
            onClick={clearConversation}
          />
        </div>

        <div className="menu-bottom">
          <div className="menu-user">
            <div className="user-avatar">
              <User size={17} />
            </div>

            <div>
              <strong>IRIS USER</strong>
              <span>LOCAL SESSION</span>
            </div>
          </div>

          <div className="menu-version">
            IRIS AI • FRONTEND
          </div>
        </div>
      </aside>

      <main>{renderPage()}</main>

      {(page === "dashboard" || page === "chat") && (
        <div className="composer-wrap">
          <div className="composer">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message IRIS..."
              rows={1}
              disabled={loading}
            />

            <button
              className={`composer-mic ${
                listening ? "active" : ""
              }`}
              onClick={startListening}
              aria-label="Start voice input"
              disabled={loading}
            >
              {listening ? (
                <MicOff size={18} />
              ) : (
                <Mic size={18} />
              )}
            </button>

            <button
              className="send-button"
              onClick={() => sendMessage()}
              disabled={!message.trim() || loading}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="composer-hint">
            Enter to send • Shift + Enter for new line
          </div>
        </div>
      )}

      {speaking && (
        <div style={{ display: "none" }}>
          Speaking
        </div>
      )}
    </div>
      </>
  );
}

export default App;


