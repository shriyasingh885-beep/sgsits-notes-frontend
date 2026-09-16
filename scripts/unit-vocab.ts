// Rich per-unit topic vocabulary, hand-extracted from the official SGSITS
// syllabus PDF (SGSITS_Syllabus_BTech_1st Year 2025.pdf) — not just the
// short unit title, but the actual named sub-topics inside each unit's
// "Course Contents" table. Used to catch resources whose title/content uses
// a sub-topic word (e.g. "Karnaugh Map") that never appears in the unit's
// own short title ("Digital Electronics").
export const UNIT_VOCAB: Record<string, string[][]> = {
  MA10021: [
    ["Baudhayana", "Aryabhata", "Brahmagupta", "Bhaskara", "Madhava", "Ramanujan", "Bhatnagar", "Chandra", "Indian mathematicians", "partial derivatives", "Jacobians", "Taylor", "Maclaurin", "maxima", "minima", "differential calculus"],
    ["Beta", "Gamma", "multiple integrals", "double integrals", "change of order", "change of variables", "integral calculus"],
    ["matrices", "matrix", "rank", "echelon", "normal form", "Gauss-Jordan", "eigen values", "eigen vectors", "eigenvalue", "Cayley-Hamilton"],
    ["differential equations", "ordinary differential equations", "linear differential equations", "variation of parameters"],
    ["fuzzy sets", "fuzzy set", "membership functions", "crisp sets", "normality", "convexity"],
  ],
  IT10007: [
    ["information concepts", "digital computer", "hardware", "software", "operating system", "computer networks", "internet", "information security", "IT act", "digital ethics"],
    ["flowchart", "algorithm", "C program", "keywords", "identifiers", "constants", "variables", "data types", "operators", "operator precedence", "type casting", "storage classes", "decision making", "branching", "switch case"],
    ["looping", "while", "for", "nesting", "functions", "call by value", "call by reference", "recursive", "arrays", "structure", "union", "pointers", "dynamic memory", "files", "file I/O"],
    ["databases", "DBMS", "relational model", "tables", "rows", "columns", "primary key", "foreign key", "SQL", "DDL", "DML", "create", "select", "insert", "update", "delete"],
    ["artificial intelligence", "problem solving", "search", "neural network", "machine learning", "deep learning", "generative AI"],
  ],
  ME10008: [
    ["engineering materials", "properties", "tensile", "shear", "thermal stress", "stress-strain", "ductile", "brittle", "elastic constants"],
    ["mechanism", "machines", "kinematic pair", "kinematic chain", "linkage", "four-bar chain", "slider crank", "hook's joint", "gears", "gear trains"],
    ["fluid kinematics", "langragian", "eulerian", "types of flow", "continuity equation"],
    ["IC engines", "automobile", "otto cycle", "diesel cycle", "air standard efficiency", "electrical vehicle", "brakes", "clutch"],
    ["engineering graphics", "drawing instruments", "projection of line", "plane", "solid", "section of solid", "orthographic", "isometric"],
  ],
  PH10009: [
    ["laser", "photon absorption", "emission", "optical resonator", "einstein", "population inversion", "ruby", "he-ne"],
    ["fiber optics", "fibre optics", "kapany", "classification of fibers", "acceptance angle", "numerical aperture", "losses", "fo sensors"],
    ["relativity", "postulate", "time dilation", "length contraction", "twin paradox", "mass-energy"],
    ["quantum theory", "superposition", "planck", "black hole", "compton", "de broglie", "heisenberg", "schrodinger", "wave function", "potential well"],
    ["quantum computation", "quantum computing", "classical gates", "unitary operations", "pauli", "quantum logic", "hadamard", "cnot", "swap gates"],
  ],
  CH10010: [
    ["water technology", "hardness", "BIS", "boiler troubles", "softening"],
    ["lubricants", "lubrication", "fuel", "combustion"],
  ],
  MA10509: [
    ["statistics", "probability theory", "scale classification", "central tendency", "mean", "mode", "median", "dispersion", "quartile", "standard deviation", "bayes"],
    ["random variables", "probability mass function", "probability density function", "cumulative distribution", "binomial", "poisson", "normal distribution"],
    ["descriptive statistics", "inferential statistics", "histograms", "box plots", "sampling", "central limit theorem", "hypothesis testing", "p-value"],
    ["correlation", "regression", "pearson", "spearman", "least squares", "coefficient of determination"],
    ["data science tools", "excel", "r-programming", "matlab", "case studies"],
  ],
  EE10510: [
    ["voltage sources", "current sources", "resistors", "capacitors", "inductors", "kirchhoff", "mesh", "nodal", "star-delta", "superposition", "thevenin", "norton", "maximum power transfer"],
    ["sinusoidal steady state", "phasor", "impedance", "admittance", "reactive power", "power factor", "three phase", "star", "delta", "three-phase power"],
    ["magnetic circuits", "B-H curve", "hysteresis", "eddy current", "transformer", "EMF equation", "induction motor", "name plate"],
    ["semiconductor", "PN junction", "diode", "rectifier", "zener diode", "voltage regulator", "bipolar junction transistor", "BJT", "biasing"],
    ["number system", "binary codes", "boolean algebra", "boolean functions", "logic gates", "karnaugh", "k map", "half adder", "full adder", "flip-flop", "flip flop"],
  ],
  HU10512: [
    ["communication skills", "grammar", "linguistics", "LSRW", "listening", "speaking", "reading comprehension", "SQ3R", "verbal", "nonverbal"],
    ["project writing", "structure and format", "resume", "résumé", "cover letter", "business letter", "letter writing", "enquiry letter", "technical writing"],
    ["oral presentation", "presentation strategies", "audience", "power point"],
  ],
  CE10513: [
    ["forces", "equilibrium", "concurrent", "co-planer", "free body diagram", "bow's notation", "trusses", "truss", "method of joints", "method of sections"],
    ["centroid", "centre of gravity", "moment of inertia", "radius of gyration", "product of inertia"],
    ["beams", "support reaction", "simply supported", "overhanging", "cantilever", "shear force", "bending moment"],
    ["introduction to civil engineering", "history of civil engineering", "historical perspective", "branches of civil engineering"],
    ["geomatics", "surveying", "plane surveying", "chain surveying", "compass surveying", "leveling", "contours", "traverse"],
  ],
  PY10514: [
    ["origin of life", "cell structure", "biomolecules", "biomolecule", "proteins", "nucleic acids", "lipids", "carbohydrates", "enzymes", "enzyme", "amylase", "protease", "cellulase"],
    ["genetics", "molecular biology", "DNA structure", "DNA replication", "central dogma", "transcription", "translation", "genetic code", "mutations", "recombinant DNA", "CRISPR"],
    ["microbiology", "bacteria", "bacteriology", "bacterial", "virus", "fungi", "fermentation", "biofuels", "probiotics", "biosafety", "sterilization", "micro-organisms", "microorganisms"],
    ["human physiology", "nervous system", "cardiovascular", "respiratory", "circulatory", "tissue engineering", "biomedical devices", "biomaterials"],
    ["biomimicry", "biomimetic", "bioinspired", "bio-inspired", "gecko", "shark-skin", "systems biology", "synthetic biology", "bio-robots", "DNA computing"],
  ],
  IP10584: [
    ["design thinking", "innovation", "mind mapping", "project selection", "brainstorming"],
    ["ideation", "lateral thinking", "synectics", "analogical thinking", "concept evaluation", "prototyping"],
    ["woodworking", "wood working", "carpentry", "timber", "plywood", "foundry", "moulding", "casting", "pattern"],
    ["forging", "forge", "hammers", "anvil", "welding", "weld", "electrode", "arc welding", "gas welding", "oxyacetylene"],
    ["machining", "lathe", "drill", "shaper", "planer", "cutting tool", "fitting", "micrometer", "vernier", "hacksaw"],
  ],
};
