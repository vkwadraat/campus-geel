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

export const programmes: Programme[] = [
  geelBiowetenschappen,
  geelIndustrieleWetenschappen,
  leuvenIndustrieleWetenschappen,
  leuvenBiomedischeWetenschappen,
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
