/* ============================================================================
   curriculum.ts — KU Leuven Campus Geel + Campus Leuven, academiejaar 2026-2027
   Bevat enkel structuur en metadata. De bestanden zelf komen later in
   Storage (Supabase / Firebase / S3).
   ============================================================================ */

/* ---------------------------------------------------------------------------
   TYPES
   --------------------------------------------------------------------------- */

export type Campus = "Geel" | "Leuven";
export type CourseType = "verplicht" | "keuze";
export type SemesterName = "Semester 1" | "Semester 2" | "Beide semesters";

export type ResourceType =
  | "oefeningen"
  | "examens"
  | "examenvragen"
  | "notities"
  | "samenvattingen"
  | "cursus"
  | "slides"
  | "verbeteringen"
  | "andere";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Course = {
  id: string;
  name: string;
  code: string;
  credits: number;
  type: CourseType;
  /** True wanneer het vak tot de gemeenschappelijke basis behoort. */
  common?: boolean;
  /** Categorieën waarin studenten materiaal kunnen uploaden. */
  resources?: ResourceType[];
};

export type Semester = { id: string; name: SemesterName; courses: Course[] };
export type Phase = { id: string; name: string; semesters: Semester[] };
export type Option = { id: string; name: string; phases: Phase[] };
export type Track = {
  id: string;
  name: string;
  phases: Phase[];
  options?: Option[];
};

export type Programme = {
  id: string;
  name: string;
  level: string;
  campus: Campus;
  academicYear: string;
  description: string;
  tracks: Track[];
};

/* ---------------------------------------------------------------------------
   STUDENTENMATERIAAL
   --------------------------------------------------------------------------- */

export type CourseResource = {
  id: string;
  courseId: string;
  title: string;
  type: ResourceType;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
  description?: string;
  uploadedBy: string;
  uploaderName?: string;
  status: SubmissionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  downloadCount?: number;
  createdAt: string;
  updatedAt?: string;
};

export type ResourceSubmission = {
  id: string;
  courseId: string;
  title: string;
  type: ResourceType;
  description?: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
  submittedBy: string;
  submittedByName?: string;
  status: SubmissionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
};

export const resourceTypes: {
  id: ResourceType;
  name: string;
  description: string;
}[] = [
  { id: "oefeningen", name: "Oefeningen", description: "Oefeningen, werkcolleges en oefenreeksen." },
  { id: "examens", name: "Examens", description: "Oude examens en examenbundels." },
  { id: "examenvragen", name: "Examenvragen", description: "Losse examenvragen en oude examenvragen." },
  { id: "notities", name: "Notities", description: "Studentennotities." },
  { id: "samenvattingen", name: "Samenvattingen", description: "Samenvattingen en studiefiches." },
  { id: "cursus", name: "Cursus", description: "Cursusmateriaal en cursusdocumenten." },
  { id: "slides", name: "Slides", description: "Slides van lessen en presentaties." },
  { id: "verbeteringen", name: "Verbeteringen", description: "Verbeterde oefeningen en oplossingen." },
  { id: "andere", name: "Andere", description: "Ander relevant studiemateriaal." },
];

/* ---------------------------------------------------------------------------
   MATERIAL-TYPES (gebruikt door App.tsx)
   Moet NA resourceTypes staan.
   --------------------------------------------------------------------------- */

export type MaterialType = ResourceType;
export type MaterialStatus = SubmissionStatus;

export type CourseMaterial = {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  type: MaterialType;
  title: string;
  description?: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  status: MaterialStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

export const materialTypeLabels = Object.fromEntries(
  resourceTypes.map((r) => [r.id, r.name])
) as Record<ResourceType, string>;

export const materialTypeIcons: Record<ResourceType, string> = {
  oefeningen: "✏️",
  examens: "📝",
  examenvragen: "❓",
  notities: "🗒️",
  samenvattingen: "📄",
  cursus: "📘",
  slides: "🖥️",
  verbeteringen: "✅",
  andere: "📁",
};

const defaultResources: ResourceType[] = resourceTypes.map((r) => r.id);

/* ---------------------------------------------------------------------------
   BOUW-HELPERS
   --------------------------------------------------------------------------- */

const course = (
  id: string,
  name: string,
  code: string,
  credits: number,
  type: CourseType = "verplicht",
  common = false,
  resources: ResourceType[] = defaultResources
): Course => ({ id, name, code, credits, type, common, resources });

/** Kort: vak waarbij id en code gelijk zijn. */
const c = (code: string, name: string, credits: number, common = false): Course =>
  course(code, name, code, credits, "verplicht", common);

/** Keuzevak. */
const k = (code: string, name: string, credits: number): Course =>
  course(code, name, code, credits, "keuze");

const semester = (id: string, name: SemesterName, courses: Course[]): Semester => ({ id, name, courses });
const phase = (id: string, name: string, semesters: Semester[]): Phase => ({ id, name, semesters });
const option = (id: string, name: string, phases: Phase[]): Option => ({ id, name, phases });

const track = (id: string, name: string, phases: Phase[], options?: Option[]): Track => ({
  id,
  name,
  phases,
  ...(options ? { options } : {}),
});

/** Optie met alleen fase 3 (semester 1 + semester 2). */
const opt = (id: string, name: string, s1: Course[], s2: Course[]): Option =>
  option(id, name, [
    phase(`${id}-fase-3`, "Fase 3", [
      semester(`${id}-s1`, "Semester 1", s1),
      semester(`${id}-s2`, "Semester 2", s2),
    ]),
  ]);

/** Fase met semester 1, semester 2 en (optioneel) beide semesters. */
const fase = (
  id: string,
  name: string,
  s1: Course[],
  s2: Course[],
  both: Course[] = []
): Phase =>
  phase(id, name, [
    semester(`${id}-s1`, "Semester 1", s1),
    semester(`${id}-s2`, "Semester 2", s2),
    ...(both.length ? [semester(`${id}-both`, "Beide semesters", both)] : []),
  ]);

/* ===========================================================================
   GEEL — BIOWETENSCHAPPEN
   =========================================================================== */

const geelBioFase1 = fase(
  "geel-bio-fase-1",
  "Fase 1",
  [
    c("Z11410", "Dierkunde-fysiologie", 4),
    c("Z12296", "Chemie-1: structuur van materie", 4),
    c("ZA0070", "Celbiologie", 4),
    c("ZA0073", "Plantkunde-fysiologie", 5),
    c("ZA0142", "Wiskundige basistechnieken", 6),
    c("ZA0144", "Dynamica en energie", 3),
    c("ZA0148", "Computationeel denken", 3),
    c("ZA0153", "Onderneming en ethiek", 3),
  ],
  [
    c("Z08590", "Ecologie", 3),
    c("Z12297", "Chemie-2: chemische reactiviteit", 4),
    c("ZA0072", "Plantkunde-biodiversiteit", 4),
    c("ZA0124", "Van zon tot vork", 3),
    c("ZA0143", "Wiskundige modellen", 3),
    c("ZA0398", "Trillingen en golven", 4),
    c("ZA0399", "Dierkunde-biodiversiteit", 4),
  ],
  [c("ZA0397", "Werken Aan Onze Wereld (WAOW)", 3)]
);

const geelBioFase2 = fase(
  "geel-bio-fase-2",
  "Fase 2",
  [
    c("Z08589", "Religie, zingeving en levensbeschouwing", 3),
    c("Z08615", "Informatica", 5),
    c("Z11423", "Genetica", 3),
    c("ZA0107", "Biochemie en moleculaire biologie", 7),
    c("ZA0120", "Bio-organische chemie", 6),
    c("ZA0184", "Statistiek en databeheer", 6),
  ],
  [
    c("ZA0108", "Analytische chemie", 5),
    c("ZA0147", "Elektriciteit", 5),
    c("ZA0150", "Statica en sterkteleer", 6),
    c("ZA0152", "Elektronica", 4),
    c("ZA0186", "Ingenieur en economie", 3),
    c("ZA0302", "Bodemkunde", 4),
  ],
  [c("Z08687", "Wetenschapscommunicatie in de Biowetenschappen", 3)]
);

const geelBioFase3 = fase(
  "geel-bio-fase-3",
  "Fase 3",
  [
    c("Z08637", "Microbiologie", 4),
    c("Z09509", "Voedselveiligheid", 3),
    c("ZA0182", "Warmte en stroming", 6),
  ],
  [
    c("Z08570", "Bioprocess Engineering", 3),
    c("ZA0128", "Biostatistiek", 4),
    c("ZA0139", "Trends in de biowetenschappen", 3),
    c("ZA0315", "Warmteoverdracht", 3),
  ],
  [
    c("ZA0129", "Instrumentele analyse", 4),
    c("ZA0187", "Ingenieur en duurzaamheid: filosofie en globale uitdagingen", 6),
    c("ZA0361", "Voedselvoorziening in 2050", 6),
  ]
);

const geelBioOptieDier = opt(
  "geel-bio-optie-dier",
  "Toegepaste dierwetenschappen",
  [c("ZA0132", "Land- en milieubeheer", 3), c("ZA0133", "Kleine huisdieren", 3)],
  [c("Z08553", "Algemene veehouderij", 3)]
);

const geelBioOptieOmgeving = opt(
  "geel-bio-optie-omgeving",
  "Toegepaste omgevingswetenschappen",
  [c("Z10201", "Omgevingsrecht", 3), c("ZA0132", "Land- en milieubeheer", 3)],
  [c("Z11431", "Natuurbeheer", 3)]
);

const geelBioOptiePlant = opt(
  "geel-bio-optie-plant",
  "Toegepaste plantwetenschappen",
  [c("ZA0132", "Land- en milieubeheer", 3), c("ZA0134", "Toegepaste plantenfysiologie", 3)],
  [c("Z09508", "Plantenbescherming", 3)]
);

const geelBioOptieVoeding = opt(
  "geel-bio-optie-voeding",
  "Toegepaste voedingswetenschappen",
  [c("ZA0135", "Kwaliteit van de voeding", 3), c("ZA0137", "Fermentatietechnologie", 3)],
  [
    c("Z08626", "Levensmiddelenchemie", 3),
    c("ZA0320", "Unit Operations for Food and Biobased Products", 3),
  ]
);

export const geelBiowetenschappen: Programme = {
  id: "geel-biowetenschappen",
  name: "Bachelor in de biowetenschappen",
  level: "Bachelor",
  campus: "Geel",
  academicYear: "2026-2027",
  description: "Bachelor in de biowetenschappen aan Campus Geel.",
  tracks: [
    track(
      "geel-biowetenschappen",
      "Biowetenschappen",
      [geelBioFase1, geelBioFase2, geelBioFase3],
      [geelBioOptieDier, geelBioOptieOmgeving, geelBioOptiePlant, geelBioOptieVoeding]
    ),
  ],
};

/* ===========================================================================
   GEEL — INDUSTRIËLE WETENSCHAPPEN
   =========================================================================== */

const geelIWFase1 = fase(
  "geel-iw-fase-1",
  "Fase 1",
  [
    c("ZA0142", "Wiskundige basistechnieken", 6, true),
    c("ZA0144", "Dynamica en energie", 3, true),
    c("ZA0146", "Chemie", 6, true),
    c("ZA0148", "Computationeel denken", 3, true),
    c("ZA0151", "Structuur, gedrag en duurzaamheid van materialen", 6, true),
    c("ZA0153", "Onderneming en ethiek", 3, true),
  ],
  [
    c("ZA0143", "Wiskundige modellen", 3, true),
    c("ZA0145", "Trillingen en golven", 3, true),
    c("ZA0147", "Elektriciteit", 5, true),
    c("ZA0149", "Biotechnologie", 3, true),
    c("ZA0150", "Statica en sterkteleer", 6, true),
    c("ZA0152", "Elektronica", 4, true),
    c("ZA0154", "Ingenieursbeleving 1", 9, true),
  ]
);

const geelEMFase2 = fase(
  "geel-iw-em-fase-2",
  "Fase 2",
  [
    c("ZA0278", "Data-acquisitie", 3),
    c("ZA0192", "Productietechnologie 1", 4),
    c("ZA0189", "Toegepaste mechanica en dynamica", 4),
  ],
  [
    c("ZA0188", "Ontwerp van een industriële sturing", 6),
    c("ZA0279", "Distributie van elektrische energie", 5),
    c("ZA0280", "Warmtetechnieken", 4),
    c("ZA0281", "Systeemtheorie en regeltechniek", 4),
    c("ZA0195", "Ingenieursbeleving 2 - Elektromechanica", 6),
  ]
);

const geelEMFase3 = fase(
  "geel-iw-em-fase-3",
  "Fase 3",
  [
    c("ZA0206", "Sterkteleer voor de machinebouw", 3),
    c("ZA0283", "Elektrische machines", 6),
    c("ZA0284", "Thermomechanical Machines and Installations", 5),
    c("ZA0285", "Informatiemanagement", 4),
    c("ZA0282", "Dimensioneren van machines", 6),
  ],
  [c("ZA0200", "Productietechnologie 2", 3), c("ZA0299", "Besturingstechnieken", 3)]
);

const geelEMOptie = opt(
  "geel-iw-em-optie",
  "Elektromechanica",
  [c("ZA0208", "Computer aided manufacturing (CAM)", 3)],
  [
    c("ZA0207", "Eindige elementengebaseerd ontwerp", 3),
    c("ZA0209", "Kwaliteitscontrole", 3),
    c("ZA0214", "Thermal Systems", 3),
    c("ZA0210", "Ingenieursbeleving 3 - EM: ontwerp en productie", 9),
  ]
);

const geelEMOptieEnergie = opt(
  "geel-iw-em-optie-energie",
  "Energie",
  [c("ZA0202", "Laagspanningsinstallaties", 3)],
  [
    c("ZA0212", "Productie en verdeling van elektriciteit", 3),
    c("ZA0213", "Toepassingen van energie", 3),
    c("ZA0214", "Thermal Systems", 3),
    c("ZA0215", "Ingenieursbeleving 3 - EM: energie", 9),
  ]
);

const geelICTFase2 = fase(
  "geel-iw-ict-fase-2",
  "Fase 2",
  [c("ZA0218", "Digitale ontwerpprincipes", 5)],
  [
    c("ZA0217", "Communicatienetwerken", 4),
    c("ZA0219", "Computerarchitecturen", 3),
    c("ZA0220", "Programmeertechnieken", 6),
    c("ZA0281", "Systeemtheorie en regeltechniek", 4),
    c("ZA0286", "Analoge schakelingen voor signaalverwerking", 5),
    c("ZA0216", "Ingenieursbeleving 2 - elektronica-ICT", 6),
  ]
);

const geelICTFase3 = fase(
  "geel-iw-ict-fase-3",
  "Fase 3",
  [
    c("ZA0226", "Digitale signaalverwerking", 4),
    c("ZA0227", "Sensoren en actuatoren", 5),
    c("ZA0233", "Transistorschakelingen en versterkers", 4),
    c("ZA0301", "Complex digitaal ontwerp", 3),
    c("ZA0394", "Software engineering", 3),
    c("ZA0395", "Webtechnologie", 3),
    c("ZA0223", "Ingenieursbeleving 3 - elektronica-ICT", 9),
  ],
  [
    c("ZA0224", "Besturingssystemen", 4),
    c("ZA0225", "Data engineering", 3),
    c("ZA0228", "Elektronisch ontwerpen", 5),
    c("ZA0287", "Machine Learning", 3),
    c("ZA0423", "Transmissie van digitale informatie", 4),
    c("ZA0424", "Analog Chip Design", 4),
  ]
);

export const geelIndustrieleWetenschappen: Programme = {
  id: "geel-industriele-wetenschappen",
  name: "Bachelor in de industriële wetenschappen",
  level: "Bachelor",
  campus: "Geel",
  academicYear: "2026-2027",
  description: "Bachelor in de industriële wetenschappen aan Campus Geel.",
  tracks: [
    track(
      "geel-iw-elektromechanica",
      "Elektromechanica",
      [geelIWFase1, geelEMFase2, geelEMFase3],
      [geelEMOptie, geelEMOptieEnergie]
    ),
    track("geel-iw-elektronica-ict", "Elektronica-ICT", [geelIWFase1, geelICTFase2, geelICTFase3]),
  ],
};

/* ===========================================================================
   LEUVEN — INDUSTRIËLE WETENSCHAPPEN
   =========================================================================== */

const leuvenIWFase1 = fase(
  "leuven-iw-fase-1",
  "Fase 1",
  [
    c("T1AWB1", "Wiskundige basistechnieken", 6, true),
    c("T1ADE1", "Dynamica en energie", 3, true),
    c("T1ACH1", "Chemie", 6, true),
    c("T1ACD1", "Computationeel denken", 3, true),
    c("T1AMA1", "Structuur, gedrag en duurzaamheid van materialen", 6, true),
    c("T1AOE1", "Onderneming en ethiek", 3, true),
  ],
  [
    c("T1AWM1", "Wiskundige modellen", 3, true),
    c("T1ATG1", "Trillingen en golven", 3, true),
    c("T1AEL1", "Elektriciteit", 5, true),
    c("T1ABI1", "Biotechnologie", 3, true),
    c("T1ASS1", "Statica en sterkteleer", 6, true),
    c("T1AEA1", "Elektronica", 4, true),
    c("T1AIB1", "Ingenieursbeleving 1", 9, true),
  ]
);

/* ---- Chemie ---- */

const leuvenChemieFase2 = fase(
  "leuven-chemie-fase-2",
  "Fase 2",
  [c("T2BOC1", "Organische chemie", 6), c("T2BIP1", "Inleiding tot procestechnologie", 3)],
  [
    c("T2BCL1", "Chemische labotechnieken", 3),
    c("T2BFC1", "Fysicochemie", 5),
    c("T2BBC1", "Biochemie en celbiologie", 6),
    c("T2BAC1", "Analytische chemie", 4),
    c("T2BIC1", "Ingenieursbeleving 2 - chemie", 6),
  ]
);

const leuvenChemieFase3 = fase(
  "leuven-chemie-fase-3",
  "Fase 3",
  [
    c("T3BAC1", "Instrumentele analytische chemie", 6),
    c("T3BST1", "Scheidingstechnologie", 5),
    c("T3BMT1", "Milieutechnologie", 3),
    c("T3BRT1", "Reactorentechnologie", 3),
  ],
  [
    c("T3BMW1", "Toegepast massa- en warmtetransport en thermodynamica", 4),
    c("T3BPC1", "Procescontrole", 3),
    c("T3BTI1", "Toegepaste ingenieurstechnieken", 3),
    c("T3BIC1", "Ingenieursbeleving 3 - chemie", 9),
  ]
);

const leuvenChemieOptieChemie = opt(
  "leuven-chemie-optie-chemie",
  "Chemie",
  [c("T3BMB1", "Microbiologie", 3), c("T3CEC2", "Chemical Engineering Computing", 3)],
  [
    c("T3CPK2", "Polymer Chemistry and Plastics Technology", 5),
    c("T3CIC2", "Industrial Chemistry", 4),
    c("T3CMB1", "Milieubeleving", 3),
  ]
);

const leuvenChemieOptieBiochemie = opt(
  "leuven-chemie-optie-biochemie",
  "Biochemie",
  [c("T3BMB1", "Microbiologie", 3), c("T3DMO2", "Molecular Biology", 4)],
  [
    c("T3DBA2", "Biochemical Analysis Techniques", 4),
    c("T3DVO1", "Voedingstechnologie", 3),
    c("T3DGM2", "Advanced Microbiology", 4),
  ]
);

/* ---- Elektromechanica ---- */

const leuvenEMFase2 = fase(
  "leuven-em-fase-2",
  "Fase 2",
  [c("T2ODA1", "Data-acquisitie", 3), c("T2OPR1", "Productietechnologie 1", 4)],
  [
    c("T2OIS1", "Ontwerp van een industriële sturing", 6),
    c("T2OMD1", "Toegepaste mechanica en dynamica", 4),
    c("T2ODE1", "Distributie van elektrische energie", 5),
    c("T2OWT2", "Thermal Technologies", 4),
    c("T2OSR1", "Systeemtheorie en regeltechniek", 4),
    c("T2OIM1", "Ingenieursbeleving 2 - elektromechanica", 6),
  ]
);

const leuvenEMFase3 = fase(
  "leuven-em-fase-3",
  "Fase 3",
  [
    c("T3ODI1", "Dimensioneren van machines", 6),
    c("T3OEM1", "Elektrische machines", 6),
    c("T3OTM1", "Thermomechanische machines en installaties", 5),
  ],
  [
    c("T3OPR2", "Manufacturing Technologies 2", 3),
    c("T3QSD1", "Sterkteleer voor de machinebouw", 6),
    c("T3OIM2", "Information Management", 4),
  ]
);

const leuvenEMOptieAutomatisering = opt(
  "leuven-em-optie-automatisering",
  "Elektromechanica: automatisering",
  [c("T3PIA1", "Industriële automatisering", 6)],
  [
    c("T3POM1", "Operations management", 3),
    c("T3PVI1", "Visiesystemen", 3),
    c("T3PIM1", "Ingenieursbeleving 3 - EM: mechatronica", 9),
  ]
);

const leuvenEMOptieOntwerp = opt(
  "leuven-em-optie-ontwerp",
  "Elektromechanica: ontwerp",
  [c("T3QAM2", "Aspects of Machine Design", 5)],
  [
    c("T3POM1", "Operations management", 3),
    c("T3QPA1", "Productie-automatisering", 4),
    c("T3QIO1", "Ingenieursbeleving 3 - EM: ontwerp", 9),
  ]
);

/* ---- Elektronica-ICT ---- */

const leuvenICTFase2 = fase(
  "leuven-ict-fase-2",
  "Fase 2",
  [c("T2VCN1", "Communicatienetwerken", 4), c("T2VDO1", "Digitale ontwerpprincipes", 5)],
  [
    c("T2VCA1", "Computerarchitecturen", 3),
    c("T2VPT2", "Programming Techniques", 6),
    c("T2VSY1", "Systeemtheorie en regeltechniek", 4),
    c("T2VAS1", "Analoge schakelingen voor signaalverwerking", 5),
    c("T2VIA1", "Ingenieursbeleving 2 - elektronica-ICT", 6),
  ]
);

const leuvenICTFase3 = fase(
  "leuven-ict-fase-3",
  "Fase 3",
  [
    c("T3VIA1", "Ingenieursbeleving 3 - elektronica-ICT", 9),
    c("T3WBS1", "Besturingssystemen", 4),
    c("T3WDS1", "Digitale signaalverwerking", 4),
    c("T3WSA2", "Sensors and Actuators", 5),
    c("T3WEO1", "Elektronisch ontwerpen", 5),
    c("T3WML1", "Machine learning", 3),
  ],
  [
    c("T3WDE1", "Data engineering", 3),
    c("T3WDO1", "Complex digitaal ontwerp", 3),
    c("T3WWW2", "Software Engineering and Web Technology", 6),
    c("T3WTD2", "Transmission of Digital Information", 5),
    c("T3WTV1", "Transistorschakelingen en versterkers", 4),
    c("T3WHC1", "Inleiding tot mens-computerinteractie", 3),
  ]
);

const leuvenICTOptieESD = option("leuven-ict-optie-esd", "Electronics and Software Design", [
  leuvenICTFase3,
]);

export const leuvenIndustrieleWetenschappen: Programme = {
  id: "leuven-industriele-wetenschappen",
  name: "Bachelor in de industriële wetenschappen",
  level: "Bachelor",
  campus: "Leuven",
  academicYear: "2026-2027",
  description: "Bachelor in de industriële wetenschappen aan Campus Leuven.",
  tracks: [
    track(
      "leuven-iw-chemie",
      "Chemie",
      [leuvenIWFase1, leuvenChemieFase2, leuvenChemieFase3],
      [leuvenChemieOptieChemie, leuvenChemieOptieBiochemie]
    ),
    track(
      "leuven-iw-elektromechanica",
      "Elektromechanica",
      [leuvenIWFase1, leuvenEMFase2, leuvenEMFase3],
      [leuvenEMOptieAutomatisering, leuvenEMOptieOntwerp]
    ),
    track(
      "leuven-iw-elektronica-ict",
      "Elektronica-ICT",
      [leuvenIWFase1, leuvenICTFase2, leuvenICTFase3],
      [leuvenICTOptieESD]
    ),
  ],
};

/* ===========================================================================
   LEUVEN — BIOMEDISCHE WETENSCHAPPEN
   =========================================================================== */

const leuvenBMFase1 = fase(
  "leuven-bm-fase-1",
  "Fase 1",
  [
    c("E04C6C", "Biofysica", 9),
    c("E04C9B", "Algemene en biologische scheikunde", 9),
    c("E05C2A", "Vergelijkende biologie", 5),
    c("E08H1C", "Wiskundige methoden voor biomedische wetenschappen", 4),
  ],
  [
    c("E04C1C", "Biochemie en moleculaire biologie", 9),
    c("E04C4C", "Celbiologie", 6),
    c("E09G1A", "Anatomie", 5),
    c("E09G2A", "Histologie", 4),
  ]
);

const leuvenBMFase2 = fase(
  "leuven-bm-fase-2",
  "Fase 2",
  [
    c("E05C5B", "Metabolisme en metabole regeling", 7),
    c("E05C6B", "Celfysiologie", 6),
    c("E06C1B", "Moleculaire genetica", 5),
    c("E0F93A", "Methoden in het biomedisch onderzoek 1", 4),
    c("E0F94A", "Methoden in het biomedisch onderzoek 2", 5),
    c("E0F96A", "Vaardigheden in biomedisch onderzoek 1", 5),
    c("E06C9B", "Beginselen van biostatistiek", 4),
  ],
  [
    c("E05C8B", "Systeemfysiologie", 8),
    c("E06C3B", "Microbiologie", 7),
    c("E06C5C", "Immunologie", 6),
    c("E06E2B", "Bio-informatica", 4),
    c("E0F98A", "Vaardigheden in biomedisch onderzoek 2", 6),
    c("E08F3B", "Filosofische reflectie voor biomedische wetenschappen", 3),
  ]
);

const leuvenBMFase3 = fase(
  "leuven-bm-fase-3",
  "Fase 3",
  [
    c("E08C0A", "Neurofysiologie", 5),
    c("E0F95A", "Methoden in het biomedisch onderzoek 3", 5),
    c("E0G03A", "Vaardigheden in biomedisch onderzoek 3", 3),
  ],
  [
    c("E07C9B", "Ontstaansmechanismen van ziekten", 7),
    c("E08C3B", "Developmental Biology", 5),
    c("E08C5D", "Bachelorproef", 6),
    c("A04D9A", "Religie, zingeving en levensbeschouwing", 3),
  ]
);

const leuvenBMLaboratoryAnimalScience = opt(
  "leuven-bm-laboratory-animal-science",
  "Laboratory Animal Science",
  [k("E05E6C", "Laboratory Animal Science - SM1", 3)],
  [k("E05E6D", "Laboratory Animal Science – SM2", 3)]
);

const leuvenBMVerdiependeKeuze = opt(
  "leuven-bm-verdiepende-keuze",
  "Verdiepende keuze",
  [
    k("E00D0A", "Morphological Techniques", 5),
    k("E00D3A", "Medische beeldvorming en -analyse", 5),
    k("E00V3A", "Organel dynamiek en disfuncties", 5),
    k("E00V4A", "Immuniteit en infecties, niet altijd in balans", 5),
    k("E01D1A", "Fysiopathologie van de voortplanting", 5),
    k("E01P8A", "Kwaliteitsmanagement voor biomedische laboratoria", 5),
    k("E09C4A", "Biomedische meet- en stimulatietechnieken", 5),
    k("E09C6A", "Microbiologie en infecties", 5),
    k("E0H52A", "Epigenetics – Basic Mechanisms to Biological Role", 5),
    k("E0N47A", "Mucosal Biology: Insights from the Human Cell Atlas", 5),
  ],
  [
    k("E00V2A", "Virale infecties: pathogenese en behandeling", 5),
    k("E04E9A", "Neurobiologie", 5),
    k(
      "E05E2A",
      "Medische biotechnologie – moleculaire geneeskunde voor zeldzame ziekten: van model systemen tot gentherapie",
      5
    ),
    k("E08C9A", "Oncobiologie", 5),
    k("E09C1A", "Humane genetica", 5),
    k("E09C8A", "Experimentele immuunpathologie", 5),
    k("E0H50A", "Allergie en het immuunsysteem", 5),
    k("E0H51A", "Eiwitten en enzymen in gezondheid en ziekte", 5),
    k("E0H53A", "Genetic Basis of Human Diversity in Health and Disease", 5),
    k("E0J57A", "Inzichten vanuit de placenta", 5),
  ]
);

const leuvenBMVerbredendeKeuze = opt(
  "leuven-bm-verbredende-keuze",
  "Verbredende keuze",
  [
    k("E08C6A", "Economie", 4),
    k("E0H48A", "Systems Thinking in Biotech Development", 3),
    k("E0H49B", "Organisatiegerichte methoden van de biomedische interventie", 5),
  ],
  [
    k("E02N0B", "Management in the Healthcare Sector", 4),
    k("E08F2A", "Medische sociologie", 3),
    k("E0J55A", "Introduction to Psychology, Medical and Health Psychology", 5),
    k("D0H24A", "Mens en organisatie (HIR)", 6),
    k("D0T33A", "Organizational Behaviour", 6),
    k("D0H22A", "Marketing (HIR)", 6),
    k("D0S18A", "Technology Entrepreneurship and New Business Development", 6),
  ]
);

export const leuvenBiomedischeWetenschappen: Programme = {
  id: "leuven-biomedische-wetenschappen",
  name: "Bachelor in de biomedische wetenschappen",
  level: "Bachelor",
  campus: "Leuven",
  academicYear: "2026-2027",
  description: "Bachelor in de biomedische wetenschappen aan Campus Leuven.",
  tracks: [
    track(
      "leuven-biomedische-wetenschappen",
      "Biomedische wetenschappen",
      [leuvenBMFase1, leuvenBMFase2, leuvenBMFase3],
      [leuvenBMLaboratoryAnimalScience, leuvenBMVerdiependeKeuze, leuvenBMVerbredendeKeuze]
    ),
  ],
};

/* ===========================================================================
   ALLE PROGRAMMA'S + OPZOEK-HELPERS
   =========================================================================== */

/* ===========================================================================
   GEEL — MASTER INDUSTRIËLE WETENSCHAPPEN
   =========================================================================== */

const geelMasterEM = track("geel-miw-elektromechanica", "Elektromechanica", [
  fase(
    "geel-miw-em-f1",
    "Master fase 1",
    [
      c("ZA0337", "Aandrijfsystemen", 5),
      c("ZA0338", "Dynamisch gedrag van mechanische systemen", 4),
      c("ZA0346", "Ontwerpen", 3),
      c("ZA0341", "Robotica", 3),
      c("ZA0415", "Smart Actuators", 3),
      c("ZA0417", "Additive Manufacturing", 3),
      k("G0N27C", "Lineaire algebra (Education)", 6),
      k("G0U13B", "Bewijzen en redeneren (Education, 6 sp)", 6),
      k("G0U13C", "Bewijzen en redeneren (Education, 3 sp)", 3),
      k("I0N48B", "Statistische dataverwerking (Education)", 4),
    ],
    [
      c("ZA0287", "Machine Learning", 3),
      c("ZA0340", "Milieutechnologie", 3),
      c("ZA0375", "Besturingstechnieken", 4),
      c("ZA0416", "Micro Manufacturing", 3),
      c("ZA0348", "Integrated Project on Micro- and Precision Manufacturing", 3),
    ],
    [
      c("ZA0336", "Innovatie en ondernemerschap", 4),
      c("ZA0339", "Masterproef elektromechanica", 20),
      c("ZA0342", "Productietechnieken en materiaaltechnologie", 6),
      c("ZA0376", "Procesautomatisering", 5),
    ]
  ),
]);

const geelMasterEICT = track("geel-miw-elektronica-ict", "Elektronica-ICT", [
  fase(
    "geel-miw-ict-f1",
    "Master fase 1",
    [
      c("ZA0328", "Embedded systems and AI applications", 5),
      c("ZA0418", "Advanced digital signal processing", 4),
      c("ZA0419", "Power Electronics on Chip", 4),
      c("ZA0420", "Explainable AI with Tensors", 4),
      c("ZA0334", "Applied AI for Big Data Analytics", 4),
      k("Z11594", "Vermogenelektronica", 3),
      k("DB4090", "Cloud computing & toepassingen", 6),
      k("DB4722", "Intelligent Systems for Robotics", 4),
      k("DB3473", "E-health", 4),
      k("ZA0335", "Bedrijfsstage elektronica-ICT: semester 1", 6),
    ],
    [
      c("ZA0332", "RF and PLL Design", 4),
      c("ZA0327", "Artificiële intelligentie", 4),
      c("ZA0330", "Digital Chip Design", 4),
      c("ZA0329", "Image Sensors", 4),
      c("ZA0422", "Analog and Mixed-Signal Chip Design", 4),
      c("ZA0421", "Knowledge-Guided AI", 4),
      k("ZA0244", "Project: Radiation to Electronics", 4),
      k("DB4724", "User-centered design", 4),
      k("DB4723", "Human AI interaction", 4),
      k("ZA0368", "Bedrijfsstage elektronica-ICT: semester 2", 6),
    ],
    [
      c("ZA0324", "Masterproef elektronica-ICT", 20),
      c("ZA0325", "Innovatie en ondernemerschap", 3),
      k("JPI25B", "Capita selecta onderzoekstopics elektronica-ICT", 3),
    ]
  ),
]);

const geelMasterEnergie = track("geel-miw-energie", "Energie", [
  fase(
    "geel-miw-energie-f1",
    "Master fase 1",
    [
      c("ZA0353", "Vermogenselektronica", 4),
      c("ZA0413", "Numeriek ontwerp van thermische componenten", 3),
      c("ZA0414", "Rationeel energiegebruik en energiebeheer in gebouwen", 3),
      k("DB3474", "Fundamentals of Battery Engineering", 4),
      k("ZA0358", "HVAC in Buildings", 4),
      k("JPI376", "Verlichting", 4),
    ],
    [
      c("ZA0352", "Elektrische aandrijvingen", 4),
      c("ZA0340", "Milieutechnologie", 3),
      c("ZA0357", "Energy Markets", 3),
    ],
    [
      c("ZA0350", "Masterproef energie", 20),
      c("ZA0351", "Innovatie en ondernemerschap", 4),
      c("ZA0356", "Energievoorziening van de toekomst", 6),
      c("ZA0355", "Refrigeration and Heat Recovery", 6),
      k("ZA0354", "Numerieke methoden in de energie (overgang)", 6),
    ]
  ),
]);

export const geelMasterIndustrieleWetenschappen: Programme = {
  id: "geel-master-industriele-wetenschappen",
  name: "Master in de industriële wetenschappen",
  level: "Master",
  campus: "Geel",
  academicYear: "2026-2027",
  description: "Master in de industriële wetenschappen aan Campus Geel.",
  tracks: [geelMasterEM, geelMasterEICT, geelMasterEnergie],
};

/* ===========================================================================
   GEEL — MASTER BIOWETENSCHAPPEN
   =========================================================================== */

const mbioLtbDier = option("geel-mbio-ltb-dier", "Toegepaste dierwetenschappen", [
  fase(
    "geel-mbio-ltb-dier-f1",
    "Master fase 1",
    [c("ZA0002", "Agrarische bouwkunde en klimatisatie", 5), c("ZA0165", "Rundveemanagement", 5)],
    [],
    [
      c("Z10198", "Dierlijke productie intensief", 5),
      c("ZA0166", "Livestock Technology", 5),
      c("ZA0175", "Masterproef toegepaste dierwetenschappen", 20),
    ]
  ),
]);

const mbioLtbOmgeving = option("geel-mbio-ltb-omgeving", "Toegepaste omgevingswetenschappen", [
  fase(
    "geel-mbio-ltb-omgeving-f1",
    "Master fase 1",
    [
      c("ZA0179", "An introduction to soils, ecosystems and livelihoods in the tropics", 5),
      c("ZA0363", "Ecosystemen", 5),
    ],
    [c("ZA0167", "Milieu", 5), c("ZA0170", "Geïntegreerd practicum omgevingswetenschappen", 5)],
    [c("ZA0235", "Masterproef toegepaste omgevingswetenschappen", 20)]
  ),
]);

const mbioLtbPlant = option("geel-mbio-ltb-plant", "Toegepaste plantwetenschappen", [
  fase(
    "geel-mbio-ltb-plant-f1",
    "Master fase 1",
    [c("ZA0172", "Fruitteelt", 5), c("ZA0174", "Sierteelt", 5)],
    [c("ZA0171", "Akkerteelten en voedergewassen", 5), c("ZA0173", "Groenteteelt", 5)],
    [c("ZA0236", "Masterproef toegepaste plantwetenschappen", 20)]
  ),
]);

const geelMasterLtb = track(
  "geel-mbio-ltb",
  "Land- en tuinbouwkunde",
  [
    fase(
      "geel-mbio-ltb-f1",
      "Master fase 1",
      [],
      [k("ZA0176", "Veevoedertechnologie en petfood", 5), k("ZA0367", "Milieutechnologie", 5)],
      [c("ZA0362", "Ondernemen LT", 5), k("ZA0177", "Interacties tussen dier en mens", 5)]
    ),
  ],
  [mbioLtbDier, mbioLtbOmgeving, mbioLtbPlant]
);

const geelMasterVoeding = track("geel-mbio-voeding", "Voedingsindustrie", [
  fase(
    "geel-mbio-voeding-f1",
    "Master fase 1",
    [
      c("Z08627", "Levensmiddelenmicrobiologie", 3),
      c("ZA0366", "Productieprocessen in de voedingsindustrie", 6),
    ],
    [c("Z08581", "Conserveringstechnologie", 3), c("ZA0162", "Fysicochemie van de levensmiddelen", 5)],
    [
      c("Z08657", "Masterproef voedingsindustrie", 20),
      c("ZA0321", "Productieprocessen in de praktijk", 5),
      c("ZA0365", "Ondernemen V", 3),
    ]
  ),
]);

export const geelMasterBiowetenschappen: Programme = {
  id: "geel-master-biowetenschappen",
  name: "Master in de biowetenschappen",
  level: "Master",
  campus: "Geel",
  academicYear: "2026-2027",
  description: "Master in de biowetenschappen aan Campus Geel.",
  tracks: [geelMasterLtb, geelMasterVoeding],
};

/* ===========================================================================
   LEUVEN — MASTER BIOMEDISCHE WETENSCHAPPEN
   =========================================================================== */

const mbmwBasis = option("leuven-mbmw-basis", "Biomedisch basis- en translationeel onderzoek", [
  fase(
    "leuven-mbmw-basis-f1",
    "Master fase 1",
    [c("E03N7A", "Ziekteleer", 6)],
    [c("E03N8A", "Toxicologie", 4)],
    [
      c("E04N2A", "Labrotaties", 5),
      c("E0K73A", "Bioinformatics and AI: Sequence, Structure and Evolution", 6),
    ]
  ),
  fase(
    "leuven-mbmw-basis-f2",
    "Master fase 2",
    [c("E0K74A", "Bioinformatics and AI: Expression, Regulation and Networks", 5)],
    [],
    [c("E08Z3A", "Masterproef biomedisch basis- en translationeel onderzoek", 30)]
  ),
]);

const mbmwKlinisch = option("leuven-mbmw-klinisch", "Klinische biomedische wetenschappen", [
  fase(
    "leuven-mbmw-klinisch-f1",
    "Master fase 1",
    [
      c("E05Z1A", "Verdieping in ziekteleer I", 7),
      c("E05Z9A", "Voeding en gezondheid", 4),
      k("E0G27B", "Klinische chemie: theorie (keuze)", 8),
    ],
    [
      c("E05Z2A", "Verdieping in ziekteleer II", 8),
      c("E0K75A", "Klinische studies", 3),
      c("E0K80A", "Datamanagement in de gezondheidszorg", 5),
      k("E0G25A", "Diagnostische microbiologie: theorie (keuze)", 8),
      k("E0H89A", "IKZ en wetgeving (keuze)", 3),
    ],
    [c("E0K78A", "Stages en vaardigheden klinische BMW", 5)]
  ),
  fase(
    "leuven-mbmw-klinisch-f2",
    "Master fase 2",
    [c("E05Z5A", "Aanpak van chronische ziekten", 4)],
    [],
    [c("E0K79A", "Masterproef klinische BMW met klinische stage", 30)]
  ),
]);

const mbmwVoeding = option("leuven-mbmw-voeding", "Toegepaste BMW — Voeding", [
  fase(
    "leuven-mbmw-voeding-f1",
    "Master fase 1",
    [c("E02Z4A", "Basisprincipes van humane voeding", 7), c("E03N7A", "Ziekteleer", 6)],
    [
      c("E02N2A", "Economische kijk op de Belgische gezondheidszorg", 5),
      c("E0K80A", "Datamanagement in de gezondheidszorg", 5),
      c("E0K82A", "Innovatie en trends in de voedingswetenschappen", 6),
    ],
    [c("E02Z3A", "Labrotatie en stages voeding", 5)]
  ),
  fase(
    "leuven-mbmw-voeding-f2",
    "Master fase 2",
    [c("E03Z5A", "Voedselveiligheid en wetgeving", 4), c("E0K84A", "Voeding bij ziekte en specifieke doelgroepen", 5)],
    [c("E0K83A", "Klinische voeding", 3)],
    [c("E0K85A", "Masterproef voeding", 30)]
  ),
]);

const mbmwForensisch = option("leuven-mbmw-forensisch", "Toegepaste BMW — Forensische BMW", [
  fase(
    "leuven-mbmw-forensisch-f1",
    "Master fase 1",
    [
      c("E03N7A", "Ziekteleer", 6),
      c("E0K86A", "Recht voor deskundigen", 4),
      c("E0K87A", "Forensische genetica", 4),
    ],
    [
      c("E05Z0A", "Multidisciplinaire forensische wetenschappen", 4),
      c("E0K88A", "Criminalistiek", 4),
      c("E0K89A", "Gevorderde forensische genetica", 4),
    ],
    [c("E0K90A", "Labrotatie en stages forensische BMW", 5)]
  ),
  fase(
    "leuven-mbmw-forensisch-f2",
    "Master fase 2",
    [c("E0K91A", "Forensische toxicologie", 4), c("E0K92A", "Forensische medische wetenschappen", 4)],
    [c("E0K93A", "Gevorderde forensische toxicologie", 4), c("E0K94A", "De deskundige en bewijsvoering", 3)],
    [c("E0K95A", "Masterproef forensische BMW", 30)]
  ),
]);

const mbmwManagement = option("leuven-mbmw-management", "Toegepaste BMW — Management", [
  fase(
    "leuven-mbmw-management-f1",
    "Master fase 1",
    [c("E03N7A", "Ziekteleer", 6), c("E0L13A", "Milieu en gezondheid", 5)],
    [
      c("E02N2A", "Economische kijk op de Belgische gezondheidszorg", 5),
      c("E02Z1A", "Riskmanagement en kwaliteitsindicatoren", 3),
      c("E0K80A", "Datamanagement in de gezondheidszorg", 5),
      c("K09N5A", "Regulatory Affairs and Market Access", 3),
    ],
    [c("E0K97A", "Labrotatie en stages management in de biomedische sector", 5)]
  ),
  fase(
    "leuven-mbmw-management-f2",
    "Master fase 2",
    [c("E01Z7A", "Diagnostische methoden en procesanalyse", 4)],
    [c("E01N8B", "Patent Law in Practice", 5), c("E01Z8A", "Kwaliteitsverbeteringsonderzoek", 5)],
    [c("E0L12A", "Masterproef management in de biomedische sector", 30)]
  ),
]);

const mbmwResearch = option("leuven-mbmw-research", "Research Tracks", [
  fase(
    "leuven-mbmw-research-f1",
    "Research Tracks — Advanced (S1) & Hot Topics (S2)",
    [
      k("E04N8A", "Advanced Biology of the Cell/Neuron", 5),
      k("E0G08A", "Advances in Biomarkers for Human Diseases", 5),
      k("E04N5A", "Fundamental and Medical Aspects of Cardiovascular Biology", 5),
      k("E09G4A", "Advances in Critical Illness", 5),
      k("E04N3A", "Advanced Studies in Developmental Biology: Organogenesis", 5),
      k("E07I6A", "Advanced Methods for Disease Modeling, Gene and Drug Therapy", 5),
      k("E08I1A", "Advances in Gastroenterology", 5),
      k("E0I91A", "Advances in Gene Therapy Development", 5),
      k("E03N0A", "Advanced Studies in Genetics", 5),
      k("E0H83A", "Advances in Genomic Medicine", 5),
      k("E08F4A", "Advances in Hormonology", 5),
      k("E05N3A", "Advanced Immunology", 5),
      k("E05N0A", "Advanced Medical Imaging", 5),
      k("E09F0A", "Advances in Metabolism and Human Disease", 5),
      k("E05N5A", "Advanced Microbiology", 5),
      k("E08F8A", "Advances in Microscopy for Biomedical Research", 5),
      k("E09F4A", "Advances in Molecular Cell Biology", 5),
      k("E09F6A", "Advances in Neurobiology of Disease", 5),
      k("E00V5A", "Advances in the Neurobiology of Psychiatric Disorders", 5),
      k("E0G10A", "Advances in Neurodegenerative Diseases", 5),
      k("E03N2A", "Advances in Oncology – Focus on Cancer Therapy", 5),
      k("E09F8A", "Advances in Oncology – Focus on Molecular Mechanisms", 5),
      k("E0H81A", "Advances in Pandemic Preparedness", 5),
      k("E0E38A", "Advances in Pathology: Functional and Oncological (Histo)Pathology", 5),
      k("E0H85A", "Advances in Skeletal Biology and Regeneration", 5),
      k("E0E36A", "Advances in Stem Cell Biology", 5),
      k("E03N4A", "Advanced Studies in System and Cognitive Neurosciences", 5),
      k("E0H87A", "Advances in Techniques in Biomedical Cancer Research", 5),
    ],
    [
      k("E04N9A", "Hot Topics in Biology of the Cell/Neuron", 5),
      k("E0G09A", "Hot Topics in Biomarkers for Human Diseases", 5),
      k("E04N6A", "Hot Topics in Cardiovascular Biology", 5),
      k("E09G5A", "Hot Topics in Critical Illness", 5),
      k("E04N4A", "Hot Topics in Developmental Biology", 5),
      k("E05N7A", "Hot Topics in Disease Modeling, Gene and Drug Therapy", 5),
      k("E08I2A", "Hot Topics in Gastroenterology", 5),
      k("E0I92A", "Hot Topics in Gene Therapy Development", 5),
      k("E03N1A", "Hot Topics in Genetics", 5),
      k("E0H84A", "Hot Topics in Genomic Medicine", 5),
      k("E08F5A", "Hot Topics in Hormonology", 5),
      k("E05N4A", "Hot Topics in Immunology", 5),
      k("E05N1A", "Hot Topics in Medical Imaging I", 5),
      k("E05N2A", "Hot Topics in Medical Imaging II", 5),
      k("E09F1A", "Hot Topics in Metabolism and Human Disease", 5),
      k("E05N6A", "Hot Topics in Microbiology", 5),
      k("E08F9A", "Hot Topics in Microscopy for Biomedical Research", 5),
      k("E09F5A", "Hot Topics in Molecular Cell Biology", 5),
      k("E09F7A", "Hot Topics in Neurobiology of Disease", 5),
      k("E00V6A", "Hot Topics in the Neurobiology of Psychiatric Disorders", 5),
      k("E0G11A", "Hot Topics in Neurodegenerative Diseases", 5),
      k("E03N3A", "Hot Topics in Oncology – Focus on Cancer Therapy", 5),
      k("E09F9A", "Hot Topics in Oncology – Focus on Molecular Mechanisms", 5),
      k("E0H82A", "Hot Topics in Pandemic Preparedness", 5),
      k("E0E39A", "Hot Topics in Pathology: Functional and Oncological (Histo)Pathology", 5),
      k("E0H86A", "Hot Topics in Skeletal Biology and Regeneration", 5),
      k("E0E37A", "Hot Topics in Stem Cell Biology", 5),
      k("E03N5A", "Hot Topics in System and Cognitive Neurosciences", 5),
      k("E0H88A", "Hot Topics in Techniques in Biomedical Cancer Research", 5),
    ]
  ),
]);

const leuvenMasterBmwTrack = track(
  "leuven-mbmw",
  "Biomedische wetenschappen",
  [
    fase(
      "leuven-mbmw-f1",
      "Master fase 1 — gemeenschappelijk",
      [
        c("E03N6A", "Farmacologie en farmacokinetiek", 7),
        c("E09Y3A", "Toegepaste biostatistiek", 5),
        c("E0K70A", "Quality and Process Management", 5),
        c("E02N9A", "Ethiek en recht in het biomedisch onderzoek", 3),
      ],
      [
        c("E02N5A", "Intellectuele eigendom en biowetenschappen", 3),
        c("E03N9A", "Pharmaceutical Medicine", 5),
        c("E0K72A", "Regulatory Sciences in Biomedicine", 3),
        c("E0K71A", "People Management", 3),
      ]
    ),
  ],
  [mbmwBasis, mbmwKlinisch, mbmwVoeding, mbmwForensisch, mbmwManagement, mbmwResearch]
);

export const leuvenMasterBiomedischeWetenschappen: Programme = {
  id: "leuven-master-biomedische-wetenschappen",
  name: "Master in de biomedische wetenschappen",
  level: "Master",
  campus: "Leuven",
  academicYear: "2026-2027",
  description: "Master in de biomedische wetenschappen aan Campus Leuven (120 ECTS).",
  tracks: [leuvenMasterBmwTrack],
};

/* ===========================================================================
   ALLE PROGRAMMA'S
   =========================================================================== */

/* ===========================================================================
   LEUVEN — FACULTEIT LETTEREN (academiejaar 2026-2027)
   Vakken rechtstreeks uit de officiële KU Leuven-curricula. Richtingen zonder
   betrouwbare vakkenlijst zijn nog niet opgenomen en worden later aangevuld.
   =========================================================================== */

/** Groep vakken zonder vaste fase/semester-indeling (als één lijst getoond). */
const groep = (id: string, name: string, courses: Course[]): Phase =>
  phase(id, name, [semester(`${id}-b`, "Beide semesters", courses)]);

/* ---- Bachelor ---- */

const letBaArcheologie = track("leuven-let-ba-archeologie", "Archeologie", [
  groep("let-ba-arch-gem", "Gemeenschappelijk", [
    c("F0BY0A", "Inleiding tot de prehistorische archeologie", 4),
    c("F0YT6A", "Introduction to Egyptian Archaeology", 4),
    c("F0YT8B", "Inleiding in de archeologie van de Griekse wereld", 4),
    c("F0YT4B", "Inleiding in de archeologie van de Romeinse wereld", 4),
    c("F0BY1A", "Inleiding tot de historische archeologie van Noordwest-Europa", 4),
    c("F0WL2A", "Geschiedenis van Griekenland en Rome", 6),
    c("F0LA3B", "Geschiedenis van de middeleeuwen", 6),
    c("F0LA0A", "Inleiding tot het historisch onderzoek", 4),
    c("F0IC3A", "Natuurwetenschappen en archeologie", 4),
    c("F0FG1A", "Statistics for Humanities", 4),
    c("F0WT1B", "Basisbegrippen van de geomorfologie en de pedologie", 6),
    c("F9XC7A", "Topografie en cartografie", 4),
    c("F0JD0B", "Museologie", 4),
    c("G0L65A", "Inleiding in de ecologie en evolutie", 3),
    c("G0P10A", "Geographic Information Systems", 4),
    c("F0ZF9A", "L-Interculturaliteit", 4),
    c("F0ZF8A", "L-Filosofische grondslagen van de geesteswetenschappen", 4),
    c("A00D6A", "Religie, zingeving en levensbeschouwing", 3),
    c("F0BR0A", "Programming for Humanities", 4),
    c("F0BX5A", "Globale uitdagingen voor een duurzame samenleving", 4),
    c("F0CP6A", "L-Storytelling", 4),
    c("F0BX4A", "Artificiële intelligentie voor letteren", 4),
    c("F0BX2A", "Theorie, methode en praktijk van de archeologie I", 10),
    c("F0WP1A", "Theorie, methode en praktijk van de archeologie II", 10),
    c("F0BX3A", "Theorie, methode en praktijk van de archeologie III", 10),
    c("F0WM7A", "Fieldschool", 4),
    c("F9XI1C", "Practicum Archeologie: Opgravingsstage", 8),
    c("F0YR4A", "L-Informatievaardigheden", 4),
    c("F0BY2A", "Academische onderzoeksvaardigheden I: Heuristiek", 3),
    c("F0WT3A", "Academische onderzoeksvaardigheden II: Schrijfoefeningen", 3),
    c("F0YR1A", "L-Dataverwerking", 4),
  ]),
  groep("let-ba-arch-afst", "Afstudeerrichting Archeologie", [
    k("F0BN3A", "Archaeology of Egypt", 6),
    k("F0BY3A", "Archeologie van de prehistorie", 6),
    k("F0BY5A", "Historische archeologie van Noordwest-Europa", 6),
    k("F0BY7A", "Archeologie van het Romeinse Imperium", 6),
    k("F0YU1A", "Archeologie van de Mediterrane protohistorie", 6),
    k("F0XH1A", "Inleiding tot de numismatiek", 4),
    k("F0BY9A", "History of Ancient Egypt", 4),
    k("F0CK9A", "Prehistory and Protohistory of Egypt and the Near East", 4),
    k("F0CA6A", "Short Term Mobility (Faculty of Arts) – semester 1", 4),
    k("F0CA7A", "Short Term Mobility (Faculty of Arts) – semester 2", 4),
    k("F0YU7A", "Bachelorpaper archeologie", 8),
    k("F0CP8A", "Inleiding in de Oudegyptische Hiërogliefen: Taal en Schrift 1", 4),
    k("F0CP9A", "Inleiding in de Oudegyptische Hiërogliefen: Taal en Schrift 2", 4),
    k("F0YH0A", "Analyse van teksten uit het Oude en Middenrijk", 4),
    k("F0YH2A", "Analyse van teksten uit het Nieuwe Rijk", 4),
    k("F0YH7B", "Lectuur Middelegyptische teksten (niet ingericht 2026–2027)", 4),
  ]),
]);

const letBaKunst = track("leuven-let-ba-kunstwetenschappen", "Kunstwetenschappen", [
  groep("let-ba-kunst-core", "Opleidingsonderdelen", [
    c("F0BB3A", "Beeld en iconografie: analyse en betekenis van het visuele medium", 6),
    c("F0BB4A", "Geschiedenis van de beeldende kunsten tot 1500", 6),
    c("F0BB6A", "Art History: 1500-1860", 6),
    c("F0BB8A", "Geschiedenis van de beeldende kunsten vanaf 1860", 6),
    c("H01S6B", "Westerse architectuurgeschiedenis: Middeleeuwen tot Nieuwste Tijd", 6),
    c("H01V0A", "Westerse architectuurgeschiedenis: 19e-21e eeuw", 6),
    c("F0JC8A", "Iconologie", 6),
    c("F0JD0A", "Museologie", 6),
    c("F0BC4A", "Fashion and Design", 6),
    c("F0JD6A", "Kunstkritiek", 6),
    c("F0WL7A", "Kunstgeschiedschrijving: evolutie en discours", 4),
    c("F0BC2A", "Kunstmarkt: evolutie en mechanismen", 6),
    c("F0BC0A", "Kunst en publiek", 6),
    c("F0CL1A", "Art and Ecology", 6),
    c("F0BC3A", "Materials, Media and Techniques", 6),
    c("F0SD1A", "Geschiedenis van de Byzantijnse kunst", 4),
    c("F0JD9B", "Esthetische theorievorming", 4),
    c("F0CO2A", "Bronnen van Europese literatuur en cultuur", 4),
    c("F0LA3A", "Geschiedenis van de middeleeuwen", 4),
    c("F0LA5A", "Geschiedenis van de nieuwe tijd", 4),
    c("F0LA7A", "Geschiedenis van de nieuwste tijd", 4),
    c("F0AA1A", "Inleiding tot de studie van de Europese literatuur en cultuur: na 1800", 4),
    c("F0JA2A", "Algemene muziekgeschiedenis", 4),
    c("F0ZF8A", "L-Filosofische grondslagen van de geesteswetenschappen", 4),
    c("F0LA9A", "Geschiedenis van interculturele contacten", 6),
    c("F0ZF9A", "L-Interculturaliteit", 4),
    c("A00D6A", "Religie, zingeving en levensbeschouwing", 3),
  ]),
]);

const letBaChinese = track("leuven-let-ba-chinese", "Chinese Studies", [
  groep("let-ba-chi-gem", "Gemeenschappelijk", [
    c("F0ZF8A", "L-Filosofische grondslagen van de geesteswetenschappen", 4),
    c("A08C0A", "Religie, zingeving en levensbeschouwing", 3),
    c("F0ZF9A", "L-Interculturaliteit", 4),
    c("F0BX4A", "Artificiële intelligentie voor letteren", 4),
    c("F0BR0A", "Programming for Humanities", 4),
    c("F0BX5A", "Globale uitdagingen voor een duurzame samenleving", 4),
    c("F0FG1A", "Statistics for Humanities", 4),
    c("F0CP6A", "L-Storytelling", 4),
    c("F0YR4A", "L-Informatievaardigheden", 4),
    c("F0YR1A", "L-Dataverwerking", 4),
    c("F0CR2A", "Sleutels tot het klassieke en moderne China", 6),
    c("F0TN2C", "Bachelorpaper", 7),
    c("F0CR3A", "Onderzoek in de Chinese Studies", 4),
  ]),
  groep("let-ba-chi-taal", "Taalmodule", [
    c("F0TA6B", "Modern Chinees I: taalkunde", 16),
    c("F0TA8B", "Modern Chinees I: oefeningen", 16),
    c("F0TA1A", "Klassiek Chinees I", 4),
    c("F0TB2B", "Modern Chinees II: taalkunde", 12),
    c("F0TB6A", "Classical Chinese II", 4),
    c("F0TB4C", "Modern Chinees II: oefeningen", 12),
    c("F0YB5B", "Modern Chinees IIIa", 12),
    c("F0YB6A", "Modern Chinees IIIb", 12),
  ]),
  groep("let-ba-chi-regio", "Regiomodule (alternerend)", [
    k("F0TA0A", "Inleiding tot de Chinese cultuur", 4),
    k("F0TA5A", "Inleiding tot hedendaags China", 4),
    k("F0CR5A", "Introduction to Chinese Thought", 4),
    k("F0CE3A", "Geschiedenis van China vanaf 1600", 4),
    k("F0TA2A", "Geschiedenis van China tot 1600", 4),
    k("F0TC0A", "Binnen- en buitenlandse politiek van China", 4),
    k("D0M10A", "Economische ontwikkeling van China", 4),
    k("C02C6A", "Modern Chinese Law", 4),
    k("F0UC2A", "Chinese Philosophy", 4),
    k("F0CQ0A", "East Asian Art and Popular Culture", 4),
  ]),
]);

const letBaArabistiek = track("leuven-let-ba-arabistiek", "Arabistiek en Islamkunde", [
  groep("let-ba-arab-taal", "Taalverwerving", [
    c("F0CQ3A", "Modern Standaardarabisch I grammatica", 3),
    c("F0CQ4A", "Modern Standaardarabisch I taalbeheersing", 17),
    c("F0CG8A", "Gesproken Arabisch: Egyptisch I", 4),
    c("F0AV6A", "Modern Standaardarabisch II, grammatica", 7),
    c("F0AW0A", "Modern Standaardarabisch II, taalbeheersing", 10),
    c("F0AV8A", "Modern Standaardarabisch II, luisteren en spreken", 7),
    c("F0WR5A", "Arabische verhalen en gedichten", 4),
    c("F0AW2A", "Modern Standaardarabisch III, media Arabisch", 8),
    c("F0AW4A", "Modern Standaardarabisch III, taalbeheersing", 10),
    c("F0CK4A", "Gesproken Arabisch: Egyptisch II", 4),
  ]),
  groep("let-ba-arab-letter", "Taal- en letterkunde", [
    c("F0VK9A", "Inleiding tot de Arabische letterkunde", 4),
    c("F0WG1A", "Sociolinguïstiek van de Arabische wereld", 4),
    c("F0YO9A", "Arabic in Context: Texts and Current Themes", 4),
  ]),
  groep("let-ba-arab-regio", "Regio — geschiedenis", [
    c("F0WG6A", "Klassieke Kennistradities in de Islam", 4),
    c("F0CQ2A", "Political Economy and Development of the modern Middle East", 4),
    c("F0WG8A", "De geschiedenis van het Midden-Oosten vanaf 1750", 4),
    c("F0WE9A", "Gender and Culture in the Middle East and North Africa", 3),
  ]),
  groep("let-ba-arab-islam", "Islamkunde", [
    c("F0TJ4A", "Inleiding tot de islam", 4),
    c("F0YQ1A", "Modern Trends and Thinkers in Islam", 4),
    c("F0AW7A", "Bronnenbegrip in de Islam", 4),
    c("A05G1A", "Islamitisch recht en fiqh", 4),
    c("F0AW6A", "Soefisme", 4),
  ]),
  groep("let-ba-arab-reflectie", "Reflectie", [
    k("W0AG3A", "Arabische filosofie", 4),
    k("W0AM9A", "Arabic Philosophy", 4),
    c("A08C0A", "Religie, zingeving en levensbeschouwing", 3),
  ]),
]);

export const leuvenLetterenBachelor: Programme = {
  id: "leuven-letteren-bachelor",
  name: "Bachelor (Faculteit Letteren)",
  level: "Bachelor",
  campus: "Leuven",
  academicYear: "2026-2027",
  description:
    "Faculteit Letteren — KU Leuven (Leuven). Richtingen met reeds beschikbare vakken; wordt verder aangevuld.",
  tracks: [letBaArcheologie, letBaKunst, letBaChinese, letBaArabistiek],
};

/* ---- Master & aansluitende programma's ---- */

const letMaMusicologie = track("leuven-let-ma-musicologie", "Musicologie", [
  groep("let-ma-mus", "Opleidingsonderdelen", [
    c("F0UM4C", "Masterproef", 20),
    c("F0CC0A", "Analyse in context: muziek tot 1750", 4),
    c("F0CC1A", "Analyse in context: muziek van 1750 tot 1900", 4),
    c("F0CC2A", "Analyse in context: muziek van de 20e en 21e eeuw", 4),
    c("F0CG0A", "Music and Anthropology", 4),
  ]),
]);

const letMaArcheologie = track("leuven-let-ma-archeologie", "Archeologie", [
  groep("let-ma-arch", "Opleidingsonderdelen", [
    c("F0CD1A", "Theorie, methode en praktijk van de archeologie IV", 4),
    c("F0YF3A", "Archaeometry", 6),
    c("F0ZI2B", "Masterproef Archeologie", 20),
  ]),
]);

const letMaKunst = track("leuven-let-ma-kunstwetenschappen", "Kunstwetenschappen", [
  groep("let-ma-kunst", "Opleidingsonderdelen (+ cluster verdieping, 24 sp)", [
    c("F0BP3A", "Masterproef", 18),
    c("F0XU1A", "Stage", 12),
    c("F0UM8A", "Verkorte stage", 6),
  ]),
]);

const letMaCultureleStudies = track("leuven-let-ma-culturele-studies", "Culturele Studies", [
  groep("let-ma-cs", "Opleidingsonderdelen", [
    c("F0YS4B", "Master's Thesis", 15),
    c("F0YS5A", "Internship", 12),
    c("F0SV6A", "Short Internship", 6),
    c("F0CP5A", "Research Seminar", 6),
    c("F0YS7A", "Cultural Studies: Capita Selecta", 4),
    c("F0BR7A", "Cultural Policy", 7),
    c("F0BR8B", "Methods of Cultural Studies", 4),
  ]),
]);

const letSchakelCS = track("leuven-let-schakel-cs", "Schakelprogramma Culturele Studies", [
  groep("let-schakel-cs", "Opleidingsonderdelen", [
    c("F0AA5A", "Algemene literatuurwetenschap I", 4),
    c("F0AS1A", "Introduction to Cultural Studies", 4),
    c("F0BB3A", "Beeld en iconografie: analyse en betekenis van het visuele medium", 6),
  ]),
]);

const letVoorbereidingCS = track("leuven-let-voorbereiding-cs", "Voorbereidingsprogramma Culturele Studies", [
  groep("let-voorb-cs", "Toegewezen opleidingsonderdeel (6 sp)", [
    k("F0CE1A", "Introduction to Cultural Studies with Reading Assignment Narrative Analysis", 6),
    k("F0CE2A", "Introduction to Cultural Studies with Reading Assignment Visual Analysis", 6),
  ]),
]);

const letMaTaalDuits = track("leuven-let-ma-taal-derde-duits", "Taal- en Letterkunde — verkort, derde taal Duits", [
  groep("let-ma-taal-duits", "Opleidingsonderdelen", [
    c("F0VI1A", "Deutsche Sprachwissenschaft: Theorie und Deskription", 6),
    c("F0VI2A", "Deutsche Sprachwissenschaft: Wandel und Variation", 6),
    c("F0UZ0A", "Deutschsprachige Gegenwartsliteratur", 6),
    c("F0UZ1A", "Deutschsprachige Literatur der Moderne (niet ingericht 2026–2027)", 6),
  ]),
]);

export const leuvenLetterenMaster: Programme = {
  id: "leuven-letteren-master",
  name: "Master (Faculteit Letteren)",
  level: "Master",
  campus: "Leuven",
  academicYear: "2026-2027",
  description:
    "Faculteit Letteren — KU Leuven (Leuven). Masters en aansluitende programma's met reeds beschikbare vakken; wordt verder aangevuld.",
  tracks: [
    letMaMusicologie,
    letMaArcheologie,
    letMaKunst,
    letMaCultureleStudies,
    letMaTaalDuits,
    letSchakelCS,
    letVoorbereidingCS,
  ],
};


export const programmes: Programme[] = [
  geelBiowetenschappen,
  geelIndustrieleWetenschappen,
  leuvenBiomedischeWetenschappen,
  geelMasterIndustrieleWetenschappen,
  geelMasterBiowetenschappen,
  leuvenMasterBiomedischeWetenschappen,
  leuvenLetterenBachelor,
  leuvenLetterenMaster,
];

export const getProgrammesByCampus = (campus: Campus): Programme[] =>
  programmes.filter((p) => p.campus === campus);

export const getProgrammeById = (id: string): Programme | undefined =>
  programmes.find((p) => p.id === id);

export const getTrackById = (programme: Programme, id: string): Track | undefined =>
  programme.tracks.find((t) => t.id === id);

export const getAllPhases = (t: Track): Phase[] => t.phases;

export const getAllSemesters = (t: Track): Semester[] => t.phases.flatMap((p) => p.semesters);

export const getCoursesFromPhases = (phases: Phase[]): Course[] =>
  phases.flatMap((p) => p.semesters.flatMap((s) => s.courses));

/** Alle unieke vakken van een opleiding (kern + opties). */
export const getAllCourses = (programme: Programme): Course[] => {
  const result: Course[] = [];
  const seen = new Set<string>();

  const add = (phases: Phase[]) =>
    getCoursesFromPhases(phases).forEach((cr) => {
      if (!seen.has(cr.id)) {
        seen.add(cr.id);
        result.push(cr);
      }
    });

  programme.tracks.forEach((t) => {
    add(t.phases);
    t.options?.forEach((o) => add(o.phases));
  });

  return result;
};

export const getCourseById = (courseId: string): Course | undefined => {
  for (const programme of programmes) {
    const found = getAllCourses(programme).find((cr) => cr.id === courseId);
    if (found) return found;
  }
  return undefined;
};

/* ---- Gemeenschappelijke basis ---- */

export const getCommonCourses = (programme: Programme): Course[] => {
  const result: Course[] = [];
  const seen = new Set<string>();

  programme.tracks.forEach((t) =>
    getCoursesFromPhases(t.phases).forEach((cr) => {
      if (cr.common && !seen.has(cr.id)) {
        seen.add(cr.id);
        result.push(cr);
      }
    })
  );

  return result;
};

export const getCommonCourseCredits = (programme: Programme): number =>
  getCommonCourses(programme).reduce((total, cr) => total + cr.credits, 0);

/* ---- Studiepunten ---- */

export const getSemesterCredits = (s: Semester): number =>
  s.courses.reduce((total, cr) => total + cr.credits, 0);

export const getPhaseCredits = (p: Phase): number =>
  p.semesters.reduce((total, s) => total + getSemesterCredits(s), 0);

/** Studiepunten van de kernvakken van een richting (zonder opties). */
export const getTrackCredits = (t: Track): number =>
  t.phases.reduce((total, p) => total + getPhaseCredits(p), 0);

export const getOptionCredits = (o: Option): number =>
  o.phases.reduce((total, p) => total + getPhaseCredits(p), 0);

export const getProgrammeCredits = (programme: Programme): number =>
  programme.tracks.length === 0 ? 0 : Math.max(...programme.tracks.map(getTrackCredits));

export const getTrackCreditsById = (programme: Programme, trackId: string): number => {
  const t = getTrackById(programme, trackId);
  return t ? getTrackCredits(t) : 0;
};

/* ---- Resource-helpers ---- */

export const getResourceType = (id: ResourceType) => resourceTypes.find((r) => r.id === id);

export const getResourceTypesForCourse = (courseId: string): ResourceType[] => {
  const cr = getCourseById(courseId);
  return cr ? cr.resources ?? defaultResources : [];
};

export const courseSupportsResourceType = (courseId: string, type: ResourceType): boolean =>
  getResourceTypesForCourse(courseId).includes(type);

export const getResourceLabel = (type: ResourceType): string =>
  resourceTypes.find((r) => r.id === type)?.name ?? "Materiaal";

/* ---- Zoeken ---- */

export const searchCourses = (query: string): Course[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const result: Course[] = [];
  const seen = new Set<string>();

  programmes.forEach((programme) =>
    getAllCourses(programme).forEach((cr) => {
      const matches = cr.name.toLowerCase().includes(q) || cr.code.toLowerCase().includes(q);
      if (matches && !seen.has(cr.id)) {
        seen.add(cr.id);
        result.push(cr);
      }
    })
  );

  return result;
};

export const searchResourceTypes = (query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return resourceTypes;

  return resourceTypes.filter(
    (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
  );
};

/* ---- Upload / moderatie ---- */

/** Maakt een nieuwe uploadaanvraag (nog geen echte storage-upload). */
export const createResourceSubmission = (
  data: Omit<ResourceSubmission, "status" | "createdAt">
): ResourceSubmission => ({
  ...data,
  status: "pending",
  createdAt: new Date().toISOString(),
});

export const approveResource = (
  resource: ResourceSubmission,
  moderatorId: string
): ResourceSubmission => ({
  ...resource,
  status: "approved",
  reviewedBy: moderatorId,
  reviewedAt: new Date().toISOString(),
  rejectionReason: undefined,
});

export const rejectResource = (
  resource: ResourceSubmission,
  moderatorId: string,
  reason: string
): ResourceSubmission => ({
  ...resource,
  status: "rejected",
  reviewedBy: moderatorId,
  reviewedAt: new Date().toISOString(),
  rejectionReason: reason,
});

export const isPendingSubmission = (s: ResourceSubmission): boolean => s.status === "pending";
export const isApprovedSubmission = (s: ResourceSubmission): boolean => s.status === "approved";
export const isRejectedSubmission = (s: ResourceSubmission): boolean => s.status === "rejected";

/** Alleen goedgekeurd materiaal mag standaard aan studenten getoond worden. */
export const canDisplayResource = (r: CourseResource): boolean => r.status === "approved";

export const filterResourcesByType = (resources: CourseResource[], type: ResourceType) =>
  resources.filter((r) => r.type === type && r.status === "approved");

export const getApprovedResourcesForCourse = (resources: CourseResource[], courseId: string) =>
  resources.filter((r) => r.courseId === courseId && r.status === "approved");

export const getPendingResources = (submissions: ResourceSubmission[]) =>
  submissions.filter((s) => s.status === "pending");

export const getApprovedSubmissions = (submissions: ResourceSubmission[]) =>
  submissions.filter((s) => s.status === "approved");

export const getRejectedSubmissions = (submissions: ResourceSubmission[]) =>
  submissions.filter((s) => s.status === "rejected");

/* ---- Samenvattingen ---- */

export type CourseResourceSummary = {
  courseId: string;
  courseName: string;
  courseCode: string;
  resources: { type: ResourceType; label: string; count: number }[];
};

export const getCourseResourceSummary = (
  courseId: string,
  resources: CourseResource[]
): CourseResourceSummary | undefined => {
  const cr = getCourseById(courseId);
  if (!cr) return undefined;

  return {
    courseId: cr.id,
    courseName: cr.name,
    courseCode: cr.code,
    resources: getResourceTypesForCourse(courseId).map((type) => ({
      type,
      label: getResourceLabel(type),
      count: resources.filter(
        (r) => r.courseId === courseId && r.type === type && r.status === "approved"
      ).length,
    })),
  };
};

export type ProgrammeSummary = {
  id: string;
  name: string;
  campus: Campus;
  level: string;
  academicYear: string;
  totalCredits: number;
  trackCount: number;
  courseCount: number;
  commonCourseCount: number;
};

export const getProgrammeSummary = (programme: Programme): ProgrammeSummary => ({
  id: programme.id,
  name: programme.name,
  campus: programme.campus,
  level: programme.level,
  academicYear: programme.academicYear,
  totalCredits: getProgrammeCredits(programme),
  trackCount: programme.tracks.length,
  courseCount: getAllCourses(programme).length,
  commonCourseCount: getCommonCourses(programme).length,
});

export const programmeSummaries: ProgrammeSummary[] = programmes.map(getProgrammeSummary);