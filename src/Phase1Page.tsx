import { useMemo, useState } from "react";
import {
  Check, ChevronDown, RotateCcw, Search,
  FlaskConical, Globe2, Calculator, BookOpen,
} from "lucide-react";
import "./Phase1Page.css";

type Subject = "Science" | "Social Studies" | "Maths";
type Zone = "Red" | "Yellow" | "Green" | "Needs Review";

type PhaseTask = {
  id: string;
  subject: Subject;
  section: string;
  chapter: string;
  zone: Zone;
  focus?: string;
};

const STORAGE_KEY = "iris-phase1-tasks";

const PHASE1_TASKS: PhaseTask[] = [
  // SCIENCE — RED
  { id: "chem-equations", subject: "Science", section: "Chemistry", chapter: "Chemical Equations & Reactions", zone: "Red", focus: "Overview" },
  { id: "chem-carbon", subject: "Science", section: "Chemistry", chapter: "Carbon & Its Compounds", zone: "Red", focus: "Core + Detailed" },
  { id: "bio-life-processes", subject: "Science", section: "Biology", chapter: "Life Processes", zone: "Red", focus: "Detailed" },
  { id: "bio-reproduction", subject: "Science", section: "Biology", chapter: "How Do Organisms Reproduce?", zone: "Red", focus: "Detailed" },
  { id: "phy-light", subject: "Science", section: "Physics", chapter: "Light", zone: "Red", focus: "Key Formulae + Numericals" },
  { id: "phy-electricity", subject: "Science", section: "Physics", chapter: "Electricity", zone: "Red", focus: "Core + Short Questions + Numericals" },

  // SCIENCE — YELLOW
  { id: "chem-acids", subject: "Science", section: "Chemistry", chapter: "Acids, Bases & Salts", zone: "Yellow", focus: "Core + Detailed" },
  { id: "chem-metals", subject: "Science", section: "Chemistry", chapter: "Metals & Non-Metals", zone: "Yellow", focus: "Core Concepts" },
  { id: "bio-control-coordination", subject: "Science", section: "Biology", chapter: "Control & Coordination", zone: "Yellow", focus: "Core" },
  { id: "phy-magnetic", subject: "Science", section: "Physics", chapter: "Magnetic Effects of Electric Current", zone: "Yellow", focus: "Core + Short Questions" },

  // SCIENCE — GREEN
  { id: "bio-heredity", subject: "Science", section: "Biology", chapter: "Heredity", zone: "Green", focus: "Core + Detailed" },
  { id: "phy-eye", subject: "Science", section: "Physics", chapter: "Human Eye & Colourful World", zone: "Green", focus: "Numericals + Core" },
  { id: "bio-environment", subject: "Science", section: "Biology", chapter: "Our Environment", zone: "Green" },

  // SOCIAL STUDIES — RED
  { id: "his-europe", subject: "Social Studies", section: "History", chapter: "The Rise of Nationalism in Europe", zone: "Red" },
  { id: "his-india", subject: "Social Studies", section: "History", chapter: "Nationalism in India", zone: "Red", focus: "Detailed" },
  { id: "his-print-culture", subject: "Social Studies", section: "History", chapter: "Print Culture and the Modern World", zone: "Red" },
  { id: "geo-agriculture", subject: "Social Studies", section: "Geography", chapter: "Agriculture", zone: "Red", focus: "Core + Detailed" },
  { id: "civ-power-sharing", subject: "Social Studies", section: "Civics", chapter: "Power Sharing", zone: "Red", focus: "Core + Detailed" },
  { id: "civ-federalism", subject: "Social Studies", section: "Civics", chapter: "Federalism", zone: "Red", focus: "Core Concepts" },
  { id: "civ-political-parties", subject: "Social Studies", section: "Civics", chapter: "Political Parties", zone: "Red" },
  { id: "eco-sectors", subject: "Social Studies", section: "Economics", chapter: "Sectors of the Indian Economy", zone: "Red", focus: "Overview" },
  { id: "eco-money", subject: "Social Studies", section: "Economics", chapter: "Money and Credit", zone: "Red" },

  // SOCIAL STUDIES — YELLOW
  { id: "his-global-world", subject: "Social Studies", section: "History", chapter: "The Making of a Global World", zone: "Yellow", focus: "Core + Detailed" },
  { id: "geo-resources", subject: "Social Studies", section: "Geography", chapter: "Resources and Development", zone: "Yellow", focus: "Overview + Map" },
  { id: "geo-water", subject: "Social Studies", section: "Geography", chapter: "Water Resources", zone: "Yellow", focus: "Map + Overview" },
  { id: "geo-minerals", subject: "Social Studies", section: "Geography", chapter: "Minerals and Energy Resources", zone: "Yellow" },
  { id: "geo-manufacturing", subject: "Social Studies", section: "Geography", chapter: "Manufacturing Industries", zone: "Yellow" },
  { id: "civ-gender", subject: "Social Studies", section: "Civics", chapter: "Gender, Religion and Caste", zone: "Yellow" },
  { id: "eco-development", subject: "Social Studies", section: "Economics", chapter: "Development", zone: "Yellow", focus: "Overview" },

  // SOCIAL STUDIES — GREEN
  { id: "geo-forest", subject: "Social Studies", section: "Geography", chapter: "Forest and Wildlife Resources", zone: "Green", focus: "Core" },
  { id: "geo-lifelines", subject: "Social Studies", section: "Geography", chapter: "Lifelines of National Economy", zone: "Green" },
  { id: "civ-outcomes-democracy", subject: "Social Studies", section: "Civics", chapter: "Outcomes of Democracy", zone: "Green" },
  { id: "eco-globalisation", subject: "Social Studies", section: "Economics", chapter: "Globalisation and the Indian Economy", zone: "Green" },

  // SOCIAL STUDIES — NEEDS REVIEW (not assigned a zone in the supplied PDF)
  { id: "his-industrialisation", subject: "Social Studies", section: "History", chapter: "The Age of Industrialisation", zone: "Needs Review" },
  { id: "eco-consumer", subject: "Social Studies", section: "Economics", chapter: "Consumer Rights", zone: "Needs Review" },

  // MATHS — RED
  { id: "math-pair-linear-equations", subject: "Maths", section: "Maths", chapter: "Pair of Linear Equations in Two Variables", zone: "Red", focus: "Core concepts + board questions" },
  { id: "math-quadratic", subject: "Maths", section: "Maths", chapter: "Quadratic Equations", zone: "Red", focus: "Basic" },
  { id: "math-triangles", subject: "Maths", section: "Maths", chapter: "Triangles", zone: "Red", focus: "BPT & Converse BPT" },
  { id: "math-trigonometry", subject: "Maths", section: "Maths", chapter: "Trigonometry", zone: "Red", focus: "Basic" },
  { id: "math-surface-volume", subject: "Maths", section: "Maths", chapter: "Surface Areas & Volumes", zone: "Red" },
  { id: "math-statistics", subject: "Maths", section: "Maths", chapter: "Statistics", zone: "Red" },

  // MATHS — YELLOW
  { id: "math-ap", subject: "Maths", section: "Maths", chapter: "Arithmetic Progression", zone: "Yellow", focus: "Formula Based" },
  { id: "math-coordinate", subject: "Maths", section: "Maths", chapter: "Coordinate Geometry", zone: "Yellow", focus: "Core" },
  { id: "math-applications-trigonometry", subject: "Maths", section: "Maths", chapter: "Some Applications of Trigonometry", zone: "Yellow", focus: "Questions" },
  { id: "math-circles", subject: "Maths", section: "Maths", chapter: "Circles", zone: "Yellow", focus: "Core" },

  // MATHS — GREEN
  { id: "math-real-numbers", subject: "Maths", section: "Maths", chapter: "Real Numbers", zone: "Green", focus: "HCF/LCM + Board Questions" },
  { id: "math-polynomials", subject: "Maths", section: "Maths", chapter: "Polynomials", zone: "Green", focus: "Basic + Zeros" },
  { id: "math-areas-circles", subject: "Maths", section: "Maths", chapter: "Areas Related to Circles", zone: "Green" },
  { id: "math-probability", subject: "Maths", section: "Maths", chapter: "Probability", zone: "Green" },
];

const ZONE_ORDER: Zone[] = ["Red", "Yellow", "Green", "Needs Review"];

function loadCompleted(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export default function Phase1Page() {
  const [completed, setCompleted] = useState<Record<string, boolean>>(loadCompleted);
  const [filter, setFilter] = useState<"All" | Subject>("All");
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Red: true, Yellow: true, Green: true, "Needs Review": true,
  });

  const toggleTask = (id: string) => {
    setCompleted((current) => {
      const next = { ...current, [id]: !current[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetProgress = () => {
    if (!window.confirm("Reset all Phase 1 progress?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setCompleted({});
  };

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return PHASE1_TASKS.filter((task) => {
      const matchesFilter = filter === "All" || task.subject === filter;
      const matchesSearch = !query ||
        task.zone.toLowerCase().includes(query) ||
        task.chapter.toLowerCase().includes(query) ||
        task.section.toLowerCase().includes(query) ||
        task.focus?.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  const total = PHASE1_TASKS.length;
  const completedCount = PHASE1_TASKS.filter((task) => completed[task.id]).length;
  const progress = Math.round((completedCount / total) * 100);

  const subjectProgress = (subject: Subject) => {
    const tasks = PHASE1_TASKS.filter((task) => task.subject === subject);
    const done = tasks.filter((task) => completed[task.id]).length;
    return Math.round((done / tasks.length) * 100);
  };

  const subjectIcon = (subject: Subject) => {
    if (subject === "Science") return <FlaskConical size={18} />;
    if (subject === "Social Studies") return <Globe2 size={18} />;
    return <Calculator size={18} />;
  };

  return (
    <div className="phase1-page">
      <div className="phase1-header">
        <div>
          <div className="phase1-kicker"><BookOpen size={15} /> BOARD PREPARATION</div>
          <h1>Phase 1 Tasks</h1>
          <p>Complete your Class 10 syllabus by the PDF's Red, Yellow, and Green Zones.</p>
        </div>
        <button className="phase1-reset" onClick={resetProgress} title="Reset Phase 1 progress">
          <RotateCcw size={16} /> Reset
        </button>
      </div>

      <div className="phase1-overview">
        <div className="phase1-progress-card">
          <div className="phase1-progress-top">
            <div><span>Overall Progress</span><strong>{progress}%</strong></div>
            <div className="phase1-progress-ring">{progress}%</div>
          </div>
          <div className="phase1-progress-bar"><span style={{ width: `${progress}%` }} /></div>
          <small>{completedCount} of {total} tasks completed</small>
        </div>

        {([
          ["Science", <FlaskConical size={20} />, "science"],
          ["Social Studies", <Globe2 size={20} />, "sst"],
          ["Maths", <Calculator size={20} />, "maths"],
        ] as const).map(([subject, icon, className]) => (
          <div className="phase1-subject-card" key={subject}>
            <div className={`phase1-subject-icon ${className}`}>{icon}</div>
            <div><span>{subject}</span><strong>{subjectProgress(subject)}%</strong></div>
          </div>
        ))}
      </div>

      <div className="phase1-toolbar">
        <div className="phase1-filters">
          {(["All", "Science", "Social Studies", "Maths"] as const).map((item) => (
            <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <label className="phase1-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks or zones..." />
        </label>
      </div>

      <div className="phase1-task-list">
        {ZONE_ORDER.map((zone) => {
          const zoneTasks = filteredTasks.filter((task) => task.zone === zone);
          if (!zoneTasks.length) return null;
          const zoneDone = zoneTasks.filter((task) => completed[task.id]).length;
          const isOpen = openSections[zone] ?? true;

          return (
            <section className={`phase1-section phase1-zone-section phase1-zone-${zone.toLowerCase().replace(/\s+/g, "-")}`} key={zone}>
              <button className="phase1-section-header" onClick={() => setOpenSections((current) => ({ ...current, [zone]: !isOpen }))}>
                <div className="phase1-section-title">
                  <BookOpen size={18} />
                  <div>
                    <strong>{zone === "Needs Review" ? "Needs Review" : `${zone} Zone`}</strong>
                    <span>{zoneDone}/{zoneTasks.length} completed</span>
                  </div>
                </div>
                <ChevronDown size={19} className={isOpen ? "rotate" : ""} />
              </button>

              {isOpen && (
                <div className="phase1-section-body">
                  {(["Science", "Social Studies", "Maths"] as const).map((subject) => {
                    const tasks = zoneTasks.filter((task) => task.subject === subject);
                    if (!tasks.length) return null;
                    return (
                      <div className="phase1-zone-subject" key={subject}>
                        <div className="phase1-zone-subject-title">
                          {subjectIcon(subject)}
                          <strong>{subject}</strong>
                        </div>
                        {tasks.map((task) => {
                          const done = Boolean(completed[task.id]);
                          return (
                            <button key={task.id} className={`phase1-task ${done ? "completed" : ""}`} onClick={() => toggleTask(task.id)}>
                              <span className={`phase1-checkbox ${done ? "checked" : ""}`}>{done && <Check size={14} />}</span>
                              <span className="phase1-task-content">
                                <strong>{task.chapter}</strong>
                                {task.focus && <small>{task.focus}</small>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {filteredTasks.length === 0 && <div className="phase1-empty">No Phase 1 tasks found.</div>}
      </div>
    </div>
  );
}
