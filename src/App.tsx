import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  programmes,
  resourceTypes,
  materialTypeIcons,
  materialTypeLabels,
  type Campus,
  type Course,
  type CourseMaterial,
  type MaterialStatus,
  type MaterialType,
  type Phase,
  type Programme,
  type Track,
} from "./data/curriculum";
import {
  fetchMaterials,
  uploadMaterial,
  reviewMaterial,
  removeMaterial,
  deleteMyAccount,
  type NewMaterialInput,
} from "./lib/materials";
import { submitCampusRequest } from "./lib/campusRequests";

import "./index.css";

/* Externe link naar het Cocoon-project van Campus Geel. */
const COCOON_URL = "https://iiw.kuleuven.be/geel/cocoon2440";


/* ============================================================================
   LOGO — afstudeerhoed
============================================================================ */

function GradCapIcon() {
  return (
    <svg
      className="grad-cap"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
    >
      {/* bovenkant van de hoed */}
      <path d="M12 3L1.5 8L12 13L22.5 8L12 3Z" fill="currentColor" />
      {/* onderkant / het hoofd eronder */}
      <path
        d="M5 10.2V14.2C5 14.2 8 16.5 12 16.5C16 16.5 19 14.2 19 14.2V10.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* kwastje */}
      <path
        d="M22 8.2V12.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="22" cy="13.2" r="1" fill="currentColor" />
    </svg>
  );
}

/* ============================================================================
   HULPFUNCTIES
============================================================================ */

const MATERIAL_TYPES: MaterialType[] = resourceTypes.map((r) => r.id);

// Een eigen kleur per opleiding, voor de tegels op het startscherm.
const PROGRAMME_COLORS: Record<string, string> = {
  "geel-biowetenschappen": "#2e7d32", // groen
  "geel-industriele-wetenschappen": "#1e64c8", // KU Leuven-blauw
  "leuven-industriele-wetenschappen": "#00407a", // dieper blauw
  "leuven-biomedische-wetenschappen": "#a4328a", // magenta
  "geel-master-biowetenschappen": "#2e7d32", // groen (zoals bachelor)
  "geel-master-industriele-wetenschappen": "#1e64c8", // KU Leuven-blauw
  "leuven-master-biomedische-wetenschappen": "#a4328a", // magenta
};

const PROGRAMME_FALLBACK = "#1e64c8";

function programmeColor(id: string) {
  return PROGRAMME_COLORS[id] ?? PROGRAMME_FALLBACK;
}

/*
 * Campusfoto's staan in  public/campus/  (geel.jpg, geneeskunde.jpg)
 * en worden per kaart ingesteld in de Home-component hieronder.
 */

function getApprovedMaterials(materials: CourseMaterial[], courseId: string) {
  return materials.filter((m) => m.courseId === courseId && m.status === "approved");
}

/** Alle unieke vakken van een richting (kern + opties). */
function collectCourses(track: Track | undefined): Course[] {
  if (!track) return [];

  const result: Course[] = [];
  const ids = new Set<string>();

  const addPhases = (phases: Phase[]) =>
    phases.forEach((phase) =>
      phase.semesters.forEach((semester) =>
        semester.courses.forEach((course) => {
          if (!ids.has(course.id)) {
            ids.add(course.id);
            result.push(course);
          }
        })
      )
    );

  addPhases(track.phases);
  track.options?.forEach((option) => addPhases(option.phases));

  return result;
}

function matchesQuery(course: Course, query: string) {
  return (
    course.name.toLowerCase().includes(query) || course.code.toLowerCase().includes(query)
  );
}

function statusLabel(status: MaterialStatus) {
  switch (status) {
    case "pending":
      return "In behandeling";
    case "approved":
      return "Goedgekeurd";
    case "rejected":
      return "Afgekeurd";
    default:
      return status;
  }
}

function statusClass(status: MaterialStatus) {
  return `status ${status}`;
}

/* ============================================================================
   APP
============================================================================ */

function App({
  userEmail,
  isModerator,
  onSignOut,
}: {
  userEmail: string;
  isModerator: boolean;
  onSignOut: () => void;
}) {
  const [view, setView] = useState<"home" | "courses">("home");
  const [campus, setCampus] = useState<Campus>("Geel");
  const [programmeId, setProgrammeId] = useState(programmes[0]?.id ?? "");
  const [trackId, setTrackId] = useState(programmes[0]?.tracks[0]?.id ?? "");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [search, setSearch] = useState("");
  const [phaseId, setPhaseId] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCourseId, setUploadCourseId] = useState<string | undefined>();
  const [moderatorOpen, setModeratorOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const accountType = userEmail.toLowerCase().endsWith("@student.kuleuven.be")
    ? "Student"
    : "Medewerker";

  // Toont de initialen op basis van het e-mailadres (voornaam.naam -> "VN").
  const userInitials = (() => {
    const local = (userEmail.split("@")[0] || "").toLowerCase();
    const parts = local.split(/[.\-_]/).filter(Boolean);
    const letters = parts.map((p) => p[0]).filter((c) => /[a-z]/.test(c));
    if (letters.length >= 2) return (letters[0] + letters[1]).toUpperCase();
    return (local[0] || "?").toUpperCase();
  })();

  async function reload() {
    try {
      setMaterials(await fetchMaterials());
    } catch (error) {
      console.error("Materiaal laden mislukt", error);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const campusProgrammes = useMemo(
    () => programmes.filter((p) => p.campus === campus),
    [campus]
  );

  const selectedProgramme = useMemo(
    () => campusProgrammes.find((p) => p.id === programmeId) ?? campusProgrammes[0],
    [campusProgrammes, programmeId]
  );

  const selectedTrack = useMemo(() => {
    if (!selectedProgramme) return undefined;
    return (
      selectedProgramme.tracks.find((t) => t.id === trackId) ?? selectedProgramme.tracks[0]
    );
  }, [selectedProgramme, trackId]);

  // Houd programma- en richting-state in sync met wat er echt getoond wordt.
  useEffect(() => {
    if (!selectedProgramme) return;

    if (selectedProgramme.id !== programmeId) {
      setProgrammeId(selectedProgramme.id);
    }

    if (!selectedProgramme.tracks.some((t) => t.id === trackId)) {
      setTrackId(selectedProgramme.tracks[0]?.id ?? "");
    }
  }, [selectedProgramme, programmeId, trackId]);

  const allCourses = useMemo(() => collectCourses(selectedTrack), [selectedTrack]);

  const pendingMaterials = useMemo(
    () => materials.filter((m) => m.status === "pending"),
    [materials]
  );

  const approvedCount = useMemo(
    () => materials.filter((m) => m.status === "approved").length,
    [materials]
  );

  function changeCampus(nextCampus: Campus) {
    setCampus(nextCampus);

    const first = programmes.find((p) => p.campus === nextCampus);
    if (first) {
      setProgrammeId(first.id);
      setTrackId(first.tracks[0]?.id ?? "");
    }

    setPhaseId("all");
    setSelectedCourse(null);
    setSidebarOpen(false);
  }

  function selectProgramme(id: string) {
    const programme = campusProgrammes.find((p) => p.id === id);
    if (!programme) return;

    setProgrammeId(programme.id);
    setTrackId(programme.tracks[0]?.id ?? "");
    setPhaseId("all");
    setSelectedCourse(null);
    setSidebarOpen(false);
  }

  function selectTrack(id: string) {
    setTrackId(id);
    setPhaseId("all");
    setSelectedCourse(null);
    setSidebarOpen(false);
  }

  // Vanuit het startscherm naar een opleiding springen.
  function openProgramme(id: string) {
    const programme = programmes.find((p) => p.id === id);
    if (!programme) return;

    setCampus(programme.campus);
    setProgrammeId(programme.id);
    setTrackId(programme.tracks[0]?.id ?? "");
    setPhaseId("all");
    setSelectedCourse(null);
    setView("courses");
  }

  function goHome() {
    setView("home");
    setSelectedCourse(null);
    setSidebarOpen(false);
  }

  async function handleDeleteAccount() {
    const sure = window.confirm(
      "Weet je zeker dat je je account wil verwijderen?\n\n" +
        "Je login, je profiel en al het materiaal dat je uploadde worden " +
        "definitief verwijderd. Dit kan niet ongedaan gemaakt worden."
    );
    if (!sure) return;
    try {
      await deleteMyAccount();
      alert("Je account is verwijderd.");
      onSignOut();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwijderen is mislukt.");
    }
  }

  async function approveMaterial(id: string) {
    try {
      await reviewMaterial(id, "approved");
      await reload();
    } catch {
      window.alert("Goedkeuren is mislukt.");
    }
  }

  async function rejectMaterial(id: string) {
    const reason = window.prompt("Waarom wordt dit materiaal afgekeurd?");
    if (!reason?.trim()) return;

    try {
      await reviewMaterial(id, "rejected", reason.trim());
      await reload();
    } catch {
      window.alert("Afkeuren is mislukt.");
    }
  }

  async function deleteMaterial(id: string) {
    try {
      await removeMaterial(id);
      await reload();
    } catch {
      window.alert("Verwijderen is mislukt.");
    }
  }

  function openUpload(courseId?: string) {
    setUploadCourseId(courseId);
    setUploadOpen(true);
  }

  async function handleUpload(input: NewMaterialInput) {
    await uploadMaterial(input);
    await reload();
    setUploadOpen(false);
  }

  return (
    <div className="app">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="brand">
          {view === "courses" && (
            <button
              className="mobile-menu"
              aria-label="Menu"
              onClick={() => setSidebarOpen((value) => !value)}
            >
              ☰
            </button>
          )}

          <button className="brand-link" onClick={goHome} aria-label="Naar startscherm">
            <span className="brand-mark">
              <GradCapIcon />
            </span>
            <span className="brand-text">
              <strong>BlokHub</strong>
              <span>Studentenplatform</span>
            </span>
          </button>
        </div>

        <div className="topbar-actions">
          {isModerator && (
            <button className="secondary-button" onClick={() => setModeratorOpen(true)}>
              Moderatie
              {pendingMaterials.length > 0 && (
                <span className="notification-count">{pendingMaterials.length}</span>
              )}
            </button>
          )}

          <button className="primary-button" onClick={() => openUpload()}>
            + Materiaal uploaden
          </button>

          <div className="user-menu">
            <button
              className="user-button"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
            >
              <span className="user-avatar">{userInitials}</span>
              <span className="user-button-email">{userEmail}</span>
              <span className="user-caret" aria-hidden="true">▾</span>
            </button>

            {userMenuOpen && (
              <>
                <div className="user-menu-overlay" onClick={() => setUserMenuOpen(false)} />
                <div className="user-dropdown" role="menu">
                  <div className="user-dropdown-head">
                    <span className="user-avatar big">{userInitials}</span>
                    <div className="user-dropdown-id">
                      <strong>{userEmail}</strong>
                      <span className="user-role">
                        {accountType}
                        {isModerator ? " · Moderator" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="user-dropdown-info">
                    <span className="user-info-title">Wat we van je weten</span>
                    <ul>
                      <li>Je e-mailadres: {userEmail}</li>
                      <li>Type account: {isModerator ? "Moderator" : accountType}</li>
                      <li>Het materiaal dat je uploadt en de status ervan</li>
                    </ul>
                    <a href="/privacy.html" target="_blank" rel="noreferrer">
                      Bekijk ons privacybeleid →
                    </a>
                  </div>

                  <div className="user-dropdown-actions">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSignOut();
                      }}
                    >
                      Uitloggen
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleDeleteAccount();
                      }}
                    >
                      Account verwijderen
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {view === "home" ? (
        <Home
          materials={materials}
          isModerator={isModerator}
          userEmail={userEmail}
          onOpenProgramme={openProgramme}
          onBrowse={() => setView("courses")}
          onUpload={() => openUpload()}
          onModerate={() => setModeratorOpen(true)}
        />
      ) : (
      <main className="layout">
        {/* SIDEBAR */}
        <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
          <div className="sidebar-section">
            <span className="sidebar-label">Campus</span>

            <div className="campus-switch">
              <button
                className={campus === "Geel" ? "active" : ""}
                onClick={() => changeCampus("Geel")}
              >
                Geel
              </button>

              <button
                className={campus === "Leuven" ? "active" : ""}
                onClick={() => changeCampus("Leuven")}
              >
                Leuven
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">Opleidingen</span>

            <div className="programme-list">
              {campusProgrammes.map((programme) => (
                <button
                  key={programme.id}
                  className={
                    programme.id === selectedProgramme?.id
                      ? "programme-button active"
                      : "programme-button"
                  }
                  onClick={() => selectProgramme(programme.id)}
                >
                  <strong>{programme.name}</strong>
                  <span>{programme.level}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedProgramme && (
            <div className="sidebar-section">
              <span className="sidebar-label">Richtingen</span>

              <div className="track-list">
                {selectedProgramme.tracks.map((track) => (
                  <button
                    key={track.id}
                    className={
                      track.id === selectedTrack?.id ? "track-button active" : "track-button"
                    }
                    onClick={() => selectTrack(track.id)}
                  >
                    {track.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-bottom">
            <div className="sidebar-stat">
              <span>Goedgekeurd materiaal</span>
              <strong>{approvedCount}</strong>
            </div>

            <div className="sidebar-stat">
              <span>In behandeling</span>
              <strong>{pendingMaterials.length}</strong>
            </div>
          </div>
        </aside>

        {/* CONTENT */}
        <section
          className="content"
          style={
            selectedProgramme
              ? ({ "--accent": programmeColor(selectedProgramme.id) } as CSSProperties)
              : undefined
          }
        >
          <div className="content-bg" aria-hidden="true">
            <span className="cblob cblob-1" />
            <span className="cblob cblob-2" />
            <span className="cblob cblob-3" />
            <span className="cblob cblob-4" />
          </div>

          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {campus}
                {selectedProgramme && ` · ${selectedProgramme.academicYear}`}
              </div>

              <h1>{selectedProgramme?.name ?? "Curriculum"}</h1>

              <p>
                {selectedProgramme?.description ??
                  "Bekijk vakken en deel studiemateriaal met medestudenten."}
              </p>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-wrapper">
              <span>⌕</span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Zoek op vaknaam of vakcode..."
              />

              {search && (
                <button
                  className="search-clear"
                  aria-label="Zoekopdracht wissen"
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              )}
            </div>

            {selectedTrack && (
              <select
                className="phase-select"
                value={phaseId}
                onChange={(event) => setPhaseId(event.target.value)}
                aria-label="Kies een fase"
              >
                <option value="all">Alle fasen</option>
                {selectedTrack.phases.map((phase) => (
                  <option value={phase.id} key={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </select>
            )}

            <button className="secondary-button" onClick={() => openUpload()}>
              Upload materiaal
            </button>
          </div>

          <div className="materials-info">
            <div className="materials-info-icon">📚</div>

            <div className="materials-info-text">
              <strong>Deel materiaal met medestudenten</strong>
              <span>
                Upload je notities, oefeningen, examens, oplossingen of samenvattingen. Elke
                upload wordt eerst gecontroleerd door een moderator.
              </span>
            </div>

            <button className="primary-button" onClick={() => openUpload()}>
              Materiaal uploaden
            </button>
          </div>

          {selectedTrack ? (
            <Curriculum
              track={selectedTrack}
              search={search}
              phaseId={phaseId}
              materials={materials}
              onCourseClick={setSelectedCourse}
            />
          ) : (
            <div className="empty-state">
              <strong>Geen richting gevonden</strong>
              <span>Selecteer een richting om de vakken te bekijken.</span>
            </div>
          )}
        </section>
      </main>
      )}

      {selectedCourse && (
        <CourseModal
          course={selectedCourse}
          materials={materials}
          onClose={() => setSelectedCourse(null)}
          onUpload={() => openUpload(selectedCourse.id)}
        />
      )}

      {uploadOpen && (
        <UploadModal
          courses={allCourses}
          initialCourseId={uploadCourseId}
          onClose={() => setUploadOpen(false)}
          onSubmit={handleUpload}
        />
      )}

      {moderatorOpen && (
        <ModeratorModal
          materials={materials}
          onClose={() => setModeratorOpen(false)}
          onApprove={approveMaterial}
          onReject={rejectMaterial}
          onDelete={deleteMaterial}
        />
      )}
    </div>
  );
}

/* ============================================================================
   HOME — startscherm
============================================================================ */

/* ============================================================================
   Aanvraagformulier — andere campussen vragen een nieuwe campus aan.
   Staat op top-niveau (niet genest in Home) zodat de velden hun focus houden.
============================================================================ */
function CampusRequestForm({ defaultEmail }: { defaultEmail: string }) {
  const [campusName, setCampusName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [programmesWanted, setProgrammesWanted] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMsg("");
    try {
      await submitCampusRequest({
        campusName: campusName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        programmes: programmesWanted.trim() || undefined,
        message: message.trim() || undefined,
      });
      setStatus("done");
      setCampusName("");
      setContactName("");
      setProgrammesWanted("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Er ging iets mis. Probeer het later opnieuw.");
    }
  }

  if (status === "done") {
    return (
      <div className="request-card request-done">
        <span className="request-done-icon" role="img" aria-label="verzonden">✅</span>
        <strong>Bedankt! Je aanvraag is verzonden.</strong>
        <p>We nemen ze door en contacteren je via het opgegeven e-mailadres.</p>
        <button type="button" className="request-reset" onClick={() => setStatus("idle")}>
          Nog een aanvraag indienen
        </button>
      </div>
    );
  }

  return (
    <form className="request-card" onSubmit={handleSubmit}>
      <div className="request-grid">
        <label className="request-field">
          <span>Campus of instelling *</span>
          <input
            value={campusName}
            onChange={(e) => setCampusName(e.target.value)}
            required
            placeholder="bv. Campus Brugge"
          />
        </label>
        <label className="request-field">
          <span>Contactpersoon *</span>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
            placeholder="Voor- en achternaam"
          />
        </label>
        <label className="request-field">
          <span>E-mail *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jij@kuleuven.be"
          />
        </label>
        <label className="request-field">
          <span>Gewenste opleiding(en)</span>
          <input
            value={programmesWanted}
            onChange={(e) => setProgrammesWanted(e.target.value)}
            placeholder="bv. industriële wetenschappen"
          />
        </label>
      </div>

      <label className="request-field">
        <span>Bericht</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Vertel kort wat jullie nodig hebben."
        />
      </label>

      {status === "error" && <p className="request-error">{errorMsg}</p>}

      <button type="submit" className="request-submit" disabled={status === "sending"}>
        {status === "sending" ? "Versturen…" : "Aanvraag versturen"}
      </button>
    </form>
  );
}

function Home({
  materials,
  isModerator,
  userEmail,
  onOpenProgramme,
  onBrowse,
  onUpload,
  onModerate,
}: {
  materials: CourseMaterial[];
  isModerator: boolean;
  userEmail: string;
  onOpenProgramme: (id: string) => void;
  onBrowse: () => void;
  onUpload: () => void;
  onModerate: () => void;
}) {
  const approvedCount = materials.filter((m) => m.status === "approved").length;
  const pendingCount = materials.filter((m) => m.status === "pending").length;

  // Eén kaart per campuslocatie. Elke kaart heeft een titel, eigen foto,
  // kleurgradient en een lijst opleidingen.
  const campusCards: {
    title: string;
    icon: string;
    photo?: string;
    gradient: string;
    programmeIds: string[];
  }[] = [
    {
      title: "Campus Geel",
      icon: "🌿",
      photo: "/campus/geel.jpg",
      gradient: "linear-gradient(135deg, #1f7a43, #1e64c8)",
      programmeIds: [
        "geel-biowetenschappen",
        "geel-industriele-wetenschappen",
        "geel-master-biowetenschappen",
        "geel-master-industriele-wetenschappen",
      ],
    },
    {
      title: "Campus Leuven — Geneeskunde",
      icon: "🩺",
      photo: "/campus/geneeskunde.jpg",
      gradient: "linear-gradient(135deg, #5b1a6b, #a4328a)",
      programmeIds: [
        "leuven-biomedische-wetenschappen",
        "leuven-master-biomedische-wetenschappen",
      ],
    },
  ];

  function CampusCard({
    title,
    icon,
    photo,
    gradient,
    programmeIds,
    position,
  }: {
    title: string;
    icon: string;
    photo?: string;
    gradient: string;
    programmeIds: string[];
    position: "left" | "right";
  }) {
    const items = programmeIds
      .map((id) => programmes.find((p) => p.id === id))
      .filter((p): p is Programme => Boolean(p));

    return (
      <div className={`campus-card campus-${position}`} style={{ background: gradient }}>
        <div
          className="campus-photo"
          style={photo ? { backgroundImage: `url("${photo}")` } : undefined}
          aria-hidden="true"
        />
        <div className="campus-body">
          <span className="campus-name">
            <span className="campus-icon" aria-hidden="true">{icon}</span>
            {title}
          </span>

          <div className="campus-programmes">
            {items.map((programme) => (
              <button
                className="campus-programme"
                key={programme.id}
                style={{ borderLeftColor: programmeColor(programme.id) }}
                onClick={() => onOpenProgramme(programme.id)}
              >
                <strong>{programme.name}</strong>
                <span>
                  Bekijk vakken <span className="arrow">→</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-bg" aria-hidden="true">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
      </div>

      <section className="hero compact">
        <div className="hero-text">
          <p className="hero-eyebrow">BlokHub · KU Leuven</p>
          <h1>
            <span className="wave" role="img" aria-label="zwaai">👋</span> Welkom! Studiemateriaal
            voor en door studenten
          </h1>
          <p className="hero-sub">
            Kies je campus en opleiding, of deel je eigen samenvattingen, examens en oefeningen.
          </p>

          <div className="hero-actions">
            <button className="hero-button" onClick={onBrowse}>
              Vakken bekijken <span className="arrow">→</span>
            </button>
            <button className="hero-button ghost" onClick={onUpload}>
              Materiaal uploaden
            </button>
          </div>
        </div>
      </section>

      <section className="home-section">
        <h2>Kies je campus</h2>
        <div className="campus-stage">
          {campusCards.map((card, index) => (
            <CampusCard
              key={card.title}
              title={card.title}
              icon={card.icon}
              photo={card.photo}
              gradient={card.gradient}
              programmeIds={card.programmeIds}
              position={index % 2 === 0 ? "left" : "right"}
            />
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>Nieuwe campus aanvragen</h2>
        <p className="section-intro">
          Zit jouw campus er nog niet bij? Vraag aan om jullie opleidingen aan
          BlokHub toe te voegen, zodat ook jullie studenten materiaal kunnen delen.
        </p>
        <CampusRequestForm defaultEmail={userEmail} />
      </section>

      <section className="home-section">
        <h2>Ontdek meer</h2>
        <a
          className="cocoon-card"
          href={COCOON_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div
            className="cocoon-photo"
            style={{ backgroundImage: 'url("/campus/cocoon.jpg")' }}
            aria-hidden="true"
          />
          <div className="cocoon-body">
            <span className="cocoon-eyebrow">KU Leuven · Campus Geel</span>
            <strong className="cocoon-title">Cocoon 2440</strong>
            <span className="cocoon-sub">Ontdek het project van Campus Geel.</span>
            <span className="cocoon-button">
              Naar de website <span className="arrow">→</span>
            </span>
          </div>
        </a>
      </section>

      <section className="home-section">
        <h2>Snel aan de slag</h2>
        <div className="quick-tiles">
          <button className="quick-tile" onClick={onBrowse}>
            <span className="quick-icon">📚</span>
            <strong>Vakken bekijken</strong>
            <span>Blader door het curriculum per fase.</span>
          </button>

          <button className="quick-tile" onClick={onUpload}>
            <span className="quick-icon">⬆️</span>
            <strong>Materiaal uploaden</strong>
            <span>Deel je notities, examens of samenvattingen.</span>
          </button>

          {isModerator && (
            <button className="quick-tile" onClick={onModerate}>
              <span className="quick-icon">🔎</span>
              <strong>Moderatie</strong>
              <span>
                Beoordeel nieuwe uploads{pendingCount > 0 ? ` (${pendingCount})` : ""}.
              </span>
            </button>
          )}
        </div>
      </section>

      <p className="home-footnote">
        {programmes.length} opleidingen · {approvedCount} stuks materiaal beschikbaar
      </p>

      <footer className="site-footer">
        <span>BlokHub · onafhankelijk studentenplatform, niet officieel verbonden aan KU Leuven</span>
        <span className="site-footer-links">
          <a href="/privacy.html" target="_blank" rel="noreferrer">Privacybeleid</a>
          <span aria-hidden="true">·</span>
          <a href="/voorwaarden.html" target="_blank" rel="noreferrer">Gebruiksvoorwaarden</a>
        </span>
      </footer>
    </div>
  );
}

/* ============================================================================
   CURRICULUM
============================================================================ */

function Curriculum({
  track,
  search,
  phaseId,
  materials,
  onCourseClick,
}: {
  track: Track;
  search: string;
  phaseId: string;
  materials: CourseMaterial[];
  onCourseClick: (course: Course) => void;
}) {
  const query = search.trim().toLowerCase();

  const visible = (course: Course) => !query || matchesQuery(course, query);

  // Zoeken toont altijd alles, zodat je niets mist buiten de gekozen fase.
  const showAll = phaseId === "all" || query !== "";
  const phases = showAll ? track.phases : track.phases.filter((p) => p.id === phaseId);

  function renderPhase(phase: Phase, key: string, defaultOpen: boolean) {
    const hasCourses = phase.semesters.some((s) => s.courses.some(visible));
    if (!hasCourses) return null;

    // Nummer uit de fasenaam ("Fase 2" → "2"), anders een bolletje.
    const phaseNumber = phase.name.match(/\d+/)?.[0] ?? "•";

    return (
      // key op het keypunt zorgt dat open/dicht opnieuw instelt bij fase- of zoekwijziging.
      <details className="phase" key={`${key}-${query}`} open={defaultOpen}>
        <summary className="phase-header">
          <span className="phase-badge">{phaseNumber}</span>
          <h2>{phase.name}</h2>
        </summary>

        <div className="semester-grid">
          {phase.semesters.map((semester) => {
            const courses = semester.courses.filter(visible);
            if (courses.length === 0) return null;

            const semCredits = courses.reduce((total, c) => total + c.credits, 0);

            return (
              <div className="semester" key={semester.id}>
                <div className="semester-header">
                  <h3>{semester.name}</h3>
                  <span>{semCredits} ECTS</span>
                </div>

                <div className="course-list">
                  {courses.map((course) => {
                    const count = getApprovedMaterials(materials, course.id).length;

                    return (
                      <button
                        className="course-row"
                        key={course.id}
                        onClick={() => onCourseClick(course)}
                      >
                        <span className="course-icon">🎓</span>

                        <span className="course-row-main">
                          <strong>{course.name}</strong>
                          <small>{course.code}</small>
                        </span>

                        {count > 0 && <span className="material-badge">📚 {count}</span>}
                        <span className="course-credits">{course.credits} ECTS</span>
                        <span className="course-chevron" aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    );
  }

  const noResults = query !== "" && !collectCourses(track).some(visible);

  return (
    <div className="curriculum">
      {/* Bij zoeken alles open; anders alle fasen dicht. */}
      {phases.map((phase) => renderPhase(phase, phase.id, query !== ""))}

      {showAll && track.options && track.options.length > 0 && (
        <section className="options-section">
          <div className="phase-header">
            <h2>Opties</h2>
          </div>

          {track.options.map((option) => (
            <div className="option-card" key={option.id}>
              <h3>{option.name}</h3>
              {option.phases.map((phase) =>
                renderPhase(phase, `${option.id}-${phase.id}`, query !== "")
              )}
            </div>
          ))}
        </section>
      )}

      {noResults && (
        <div className="empty-state">
          <strong>Geen vak gevonden</strong>
          <span>Probeer een andere vaknaam of vakcode.</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   COURSE MODAL
============================================================================ */

function CourseModal({
  course,
  materials,
  onClose,
  onUpload,
}: {
  course: Course;
  materials: CourseMaterial[];
  onClose: () => void;
  onUpload: () => void;
}) {
  // Welke categorie is geopend? null = het overzicht met alle categorieën.
  const [openType, setOpenType] = useState<MaterialType | null>(null);

  const approved = getApprovedMaterials(materials, course.id);

  const grouped = Object.fromEntries(
    MATERIAL_TYPES.map((t) => [t, [] as CourseMaterial[]])
  ) as Record<MaterialType, CourseMaterial[]>;

  approved.forEach((material) => {
    grouped[material.type]?.push(material);
  });

  const detailItems = openType ? grouped[openType] : [];

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal large" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            {openType ? (
              <>
                <span className="eyebrow">{course.name}</span>
                <h2>
                  {materialTypeIcons[openType]} {materialTypeLabels[openType]}
                </h2>
              </>
            ) : (
              <>
                <span className="eyebrow">
                  {course.code} · {course.credits} ECTS
                </span>
                <h2>{course.name}</h2>
              </>
            )}
          </div>

          <button className="close-button" aria-label="Sluiten" onClick={onClose}>
            ×
          </button>
        </div>

        {openType ? (
          /* ---------- Detailpagina van één categorie ---------- */
          <>
            <button className="back-button" onClick={() => setOpenType(null)}>
              ← Terug naar overzicht
            </button>

            {detailItems.length === 0 ? (
              <div className="category-empty">
                <span className="category-empty-icon">{materialTypeIcons[openType]}</span>
                <strong>Nog geen materiaal</strong>
                <span>
                  Er is nog geen goedgekeurd materiaal in deze categorie voor dit vak.
                </span>
                <button className="primary-button" onClick={onUpload}>
                  + Als eerste uploaden
                </button>
              </div>
            ) : (
              <div className="material-list big">
                {detailItems.map((material) => (
                  <a
                    key={material.id}
                    href={material.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="material-item"
                  >
                    <div>
                      <strong>{material.title}</strong>
                      <span>{material.fileName}</span>
                      {material.description && <small>{material.description}</small>}
                    </div>

                    <span>Open →</span>
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ---------- Overzicht met alle categorieën ---------- */
          <>
            <div className="category-list">
              {MATERIAL_TYPES.map((type) => {
                const count = grouped[type].length;

                return (
                  <button
                    className="category-row"
                    key={type}
                    onClick={() => setOpenType(type)}
                  >
                    <span className="category-icon">{materialTypeIcons[type]}</span>
                    <span className="category-name">{materialTypeLabels[type]}</span>
                    {count > 0 && <span className="category-count">{count}</span>}
                    <span className="category-chevron" aria-hidden="true">›</span>
                  </button>
                );
              })}
            </div>

            <div className="upload-callout">
              <div>
                <strong>Heb jij materiaal voor dit vak?</strong>
                <span>Upload het. Een moderator controleert het eerst.</span>
              </div>

              <button className="primary-button" onClick={onUpload}>
                + Uploaden
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   UPLOAD MODAL
============================================================================ */

function UploadModal({
  courses,
  initialCourseId,
  onClose,
  onSubmit,
}: {
  courses: Course[];
  initialCourseId?: string;
  onClose: () => void;
  onSubmit: (input: NewMaterialInput) => Promise<void>;
}) {
  const [courseId, setCourseId] = useState(
    initialCourseId && courses.some((c) => c.id === initialCourseId)
      ? initialCourseId
      : ""
  );
  const [type, setType] = useState<MaterialType>("notities");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedCourse = courses.find((c) => c.id === courseId);

  // Vakken alfabetisch op naam.
  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.name.localeCompare(b.name, "nl")),
    [courses]
  );

  // Zoekveld voor het vak.
  const [courseQuery, setCourseQuery] = useState(selectedCourse ? selectedCourse.name : "");
  const [courseListOpen, setCourseListOpen] = useState(false);

  const courseMatches = useMemo(() => {
    const q = courseQuery.trim().toLowerCase();
    if (!q) return sortedCourses;
    return sortedCourses.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [sortedCourses, courseQuery]);

  function pickCourse(course: Course) {
    setCourseId(course.id);
    setCourseQuery(course.name);
    setCourseListOpen(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!selectedCourse) {
      setError("Selecteer een vak.");
      return;
    }

    if (!title.trim()) {
      setError("Geef je materiaal een titel.");
      return;
    }

    if (!file) {
      setError("Selecteer een bestand.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Het bestand is groter dan 20 MB.");
      return;
    }

    setBusy(true);

    try {
      await onSubmit({
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        courseCode: selectedCourse.code,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        file,
      });
    } catch {
      setError("Upload mislukt. Controleer je verbinding en het bestandstype, en probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Studentenbijdrage</span>
            <h2>Materiaal uploaden</h2>
          </div>

          <button type="button" className="close-button" aria-label="Sluiten" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="form-grid">
          <label className="course-field">
            <span>Vak</span>

            <div className="course-search">
              <input
                type="text"
                value={courseQuery}
                placeholder="Zoek een vak op naam of code..."
                onChange={(event) => {
                  setCourseQuery(event.target.value);
                  setCourseId("");
                  setCourseListOpen(true);
                }}
                onFocus={() => setCourseListOpen(true)}
                // Kleine vertraging zodat een klik op een optie nog registreert.
                onBlur={() => window.setTimeout(() => setCourseListOpen(false), 150)}
              />

              {courseListOpen && (
                <div className="course-options">
                  {courseMatches.length === 0 ? (
                    <div className="course-option empty">Geen vak gevonden</div>
                  ) : (
                    courseMatches.map((course) => (
                      <button
                        type="button"
                        key={course.id}
                        className={
                          course.id === courseId ? "course-option active" : "course-option"
                        }
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => pickCourse(course)}
                      >
                        <strong>{course.name}</strong>
                        <small>{course.code}</small>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </label>

          <label>
            <span>Type materiaal</span>

            <select
              value={type}
              onChange={(event) => setType(event.target.value as MaterialType)}
            >
              {MATERIAL_TYPES.map((materialType) => (
                <option value={materialType} key={materialType}>
                  {materialTypeIcons[materialType]} {materialTypeLabels[materialType]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Titel</span>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="bv. Examen juni 2026"
            />
          </label>

          <label>
            <span>Beschrijving</span>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optionele informatie over het materiaal..."
              rows={4}
            />
          </label>

          <label className="file-input">
            <span>Bestand</span>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />

            {file && <small>Geselecteerd: {file.name}</small>}
          </label>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="moderation-notice">
          <strong>🔎 Eerst controleren</strong>
          <span>
            Je upload wordt niet onmiddellijk zichtbaar voor andere studenten. Een moderator moet
            het materiaal eerst goedkeuren.
          </span>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Annuleren
          </button>

          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "Bezig met uploaden…" : "Upload ter controle"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================================
   MODERATOR MODAL
============================================================================ */

function ModeratorModal({
  materials,
  onClose,
  onApprove,
  onReject,
  onDelete,
}: {
  materials: CourseMaterial[];
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const pending = materials.filter((m) => m.status === "pending");
  const reviewed = materials.filter((m) => m.status !== "pending");

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal moderator-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Moderatoromgeving</span>
            <h2>Materiaal controleren</h2>
          </div>

          <button className="close-button" aria-label="Sluiten" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="moderator-summary">
          <div>
            <strong>{pending.length}</strong>
            <span>In behandeling</span>
          </div>

          <div>
            <strong>{materials.filter((m) => m.status === "approved").length}</strong>
            <span>Goedgekeurd</span>
          </div>

          <div>
            <strong>{materials.filter((m) => m.status === "rejected").length}</strong>
            <span>Afgekeurd</span>
          </div>
        </div>

        <div className="moderator-content">
          <h3>Nieuwe uploads</h3>

          {pending.length === 0 ? (
            <div className="moderator-empty">
              <div>✓</div>
              <strong>Geen uploads in behandeling</strong>
              <span>Nieuwe studentenuploads verschijnen hier.</span>
            </div>
          ) : (
            <div className="pending-list">
              {pending.map((material) => (
                <PendingMaterial
                  key={material.id}
                  material={material}
                  onApprove={onApprove}
                  onReject={onReject}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}

          {reviewed.length > 0 && (
            <details className="reviewed-section">
              <summary>Reeds beoordeeld ({reviewed.length})</summary>

              <div className="reviewed-list">
                {reviewed.map((material) => (
                  <div className="reviewed-item" key={material.id}>
                    <div>
                      <strong>{material.title}</strong>
                      <span>{material.courseName}</span>
                    </div>

                    <div className="reviewed-right">
                      <span className={statusClass(material.status)}>
                        {statusLabel(material.status)}
                      </span>

                      <button className="delete-button" onClick={() => onDelete(material.id)}>
                        Verwijderen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   PENDING MATERIAL
============================================================================ */

function PendingMaterial({
  material,
  onApprove,
  onReject,
  onDelete,
}: {
  material: CourseMaterial;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="pending-card">
      <div className="pending-main">
        <div className="pending-icon">{materialTypeIcons[material.type]}</div>

        <div className="pending-details">
          <span className="eyebrow">
            {material.courseCode} · {materialTypeLabels[material.type]}
          </span>

          <h3>{material.title}</h3>
          <p>{material.courseName}</p>

          <small>Bestand: {material.fileName}</small>
          {material.description && <small>{material.description}</small>}
          <small>Geüpload op {new Date(material.uploadedAt).toLocaleString("nl-BE")}</small>
        </div>
      </div>

      <div className="pending-actions">
        <a
          href={material.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="secondary-button"
        >
          Bekijken
        </a>

        <button className="danger-button" onClick={() => onReject(material.id)}>
          Afkeuren
        </button>

        <button className="primary-button" onClick={() => onApprove(material.id)}>
          ✓ Goedkeuren
        </button>

        <button className="delete-button" onClick={() => onDelete(material.id)}>
          Verwijderen
        </button>
      </div>
    </div>
  );
}

export default App;
