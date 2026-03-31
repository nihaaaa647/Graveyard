export type Failure = {
  id: string
  name: string
  domain: string
  year: number
  what_was_attempted: string
  what_happened: string
  official_cause: string
  real_cause: string
  mechanisms: string[]
  abstracted_pattern: string
  broken_assumption: string
  scale: string
}

export type TaxonomyCard = {
  query: string
  mechanisms: Array<{
    name: string
    frequency: string  // "High / Medium / Low across sources"
    warning_signs: string[]
    description: string
  }>
  broken_assumptions: Array<{
    assumption: string
    who_held_it: string
    what_revealed_it: string
  }>
  cross_domain_insights: Array<{
    source_domain: string
    source_failure: string
    pattern_match: string
    concrete_translation: string
  }>
  uncomfortable_truth: string
  if_starting_today: string[]
  direct_matches: Array<{ name: string; domain: string; year: number; mechanism_overlap: string }>
  cross_domain_matches: Array<{ name: string; domain: string; year: number; structural_similarity: string }>
}

export const SEEDED_FAILURES: Failure[] = [
  {
    id: "ibm-watson-oncology",
    name: "IBM Watson for Oncology",
    domain: "Clinical AI",
    year: 2017,
    what_was_attempted: "Deploy AI to recommend cancer treatments at scale",
    what_happened: "Recommended unsafe treatments; MD Anderson cancelled $62M contract",
    official_cause: "Training data quality issues",
    real_cause: "Trained on hypothetical cases curated by a single institution, never on real messy clinical data from actual deployment environments",
    mechanisms: ["lab_to_field_gap", "automation_overconfidence", "false_consensus_from_weak_source"],
    abstracted_pattern: "A system optimized on controlled, curated inputs by subject matter experts fails catastrophically when deployed into the noisy, high-stakes real environment it was supposedly designed for. The gap between training conditions and deployment conditions is known but dismissed as an implementation detail rather than a fundamental validity problem.",
    broken_assumption: "Performance on expert-curated test cases predicts performance in real clinical deployment",
    scale: "$62M contract cancelled, unknown patient harm"
  },
  {
    id: "air-france-447",
    name: "Air France 447",
    domain: "Aviation",
    year: 2009,
    what_was_attempted: "Routine transatlantic flight with highly automated aircraft",
    what_happened: "Aircraft stalled and crashed into Atlantic killing 228 people",
    official_cause: "Pilot error after pitot tube failure",
    real_cause: "Pilots had so rarely manually controlled the aircraft at altitude that when automation dropped out, they lacked the physical intuition to interpret ambiguous instrument readings under stress",
    mechanisms: ["automation_eroding_manual_competency", "authority_gradient", "normalization_of_deviance"],
    abstracted_pattern: "Automation so successfully handles nominal conditions that human operators lose the practiced intuition needed for edge cases. When the automation fails in exactly the scenario humans have stopped practicing, the humans cannot recover. The system's strength in normal conditions creates the fatal brittleness in abnormal ones.",
    broken_assumption: "Proficiency is maintained passively even when manual skill is rarely exercised",
    scale: "228 deaths"
  },
  {
    id: "theranos",
    name: "Theranos",
    domain: "Biotech / Diagnostics",
    year: 2018,
    what_was_attempted: "Revolutionary blood testing from a single finger-prick",
    what_happened: "Technology never worked; $9B fraud; criminal convictions",
    official_cause: "Deliberate fraud",
    real_cause: "Culture of secrecy prevented the external validation that would have exposed the gap between claims and reality. Investors and partners accepted charismatic narrative as substitute for peer-reviewed evidence.",
    mechanisms: ["false_consensus_from_weak_source", "authority_gradient", "survivorship_bias"],
    abstracted_pattern: "When the cost of external validation feels too high or too threatening to the narrative, a closed epistemic loop forms. Internal belief substitutes for external verification. Each unchallenged claim raises the social cost of the next challenge, until the system is structurally incapable of self-correction.",
    broken_assumption: "A compelling founder narrative backed by board prestige is sufficient evidence of technical validity",
    scale: "$9B fraud, patient harm from incorrect test results"
  },
  {
    id: "boeing-737-max",
    name: "Boeing 737 MAX MCAS",
    domain: "Aerospace / Manufacturing",
    year: 2019,
    what_was_attempted: "Engine upgrade to compete with Airbus A320neo without requiring new pilot type rating",
    what_happened: "MCAS software pushed nose down repeatedly; 346 deaths across two crashes",
    official_cause: "Software design flaw and inadequate pilot training",
    real_cause: "Commercial pressure to avoid expensive recertification created engineering constraints that made a safety-critical system dependent on a single sensor with no redundancy. Individual engineers raised concerns that were normalized away by project timelines.",
    mechanisms: ["incentive_misalignment", "normalization_of_deviance", "diffusion_of_responsibility"],
    abstracted_pattern: "Commercial constraints become engineering requirements. Safety margins are treated as negotiable when they conflict with schedule or cost. Individual warnings are absorbed by a system that rewards hitting milestones more than surfacing risks. The failure was not one bad decision but a process that consistently resolved tension between safety and speed in the same direction.",
    broken_assumption: "Competitive and timeline pressure can be absorbed by engineering without changing the risk profile of the system",
    scale: "346 deaths, $20B+ in costs, global fleet grounding"
  },
  {
    id: "google-flu-trends",
    name: "Google Flu Trends",
    domain: "Data / Predictive AI",
    year: 2013,
    what_was_attempted: "Predict flu outbreaks in real time using search query volume",
    what_happened: "Overestimated peak flu by 140%; abandoned by 2015",
    official_cause: "Big data overfitting",
    real_cause: "Correlation between search terms and flu was real but fragile. The model captured media-driven search behavior, not flu incidence. When media coverage of flu increased independent of actual cases, the model broke. No causal mechanism was ever validated.",
    mechanisms: ["correlation_mistaken_for_causation", "single_model_overgeneralized", "ignored_prior_art_in_adjacent_field"],
    abstracted_pattern: "A model achieves impressive correlation on historical data and is deployed as causal inference. The distinction between the signal it captures and the signal it claims to measure is never rigorously tested. When the unmeasured confounder varies, the correlation collapses and the model fails loudest in exactly the high-stakes moments when accuracy matters most.",
    broken_assumption: "Strong historical correlation between a proxy signal and a target variable means the proxy measures the target",
    scale: "Misled public health decision-making during multiple flu seasons"
  },
  {
    id: "knewton",
    name: "Knewton Adaptive Learning",
    domain: "Edtech AI",
    year: 2019,
    what_was_attempted: "Personalized AI-driven learning recommendations for every student",
    what_happened: "Massively overpromised capabilities, failed to deliver outcomes, sold for parts to Wiley for ~$25M after raising $105M",
    official_cause: "Market timing and competition",
    real_cause: "Learning outcomes depend on teacher relationship, motivation, and environment — factors the algorithm had no access to. The product could optimize engagement proxies but had no mechanism to improve actual learning. Customers bought the pitch, not the product.",
    mechanisms: ["customer_behavior_assumption_wrong", "lab_to_field_gap", "single_model_overgeneralized"],
    abstracted_pattern: "A system optimizes a measurable proxy for a complex human outcome and achieves good proxy metrics. The gap between proxy and actual outcome is dismissed as a measurement problem rather than a fundamental limitation. The system is sold on the actual outcome it cannot deliver.",
    broken_assumption: "Optimizing measurable engagement signals in learning software translates to improved learning outcomes",
    scale: "$105M raised, sold for $25M, widespread classroom deployment with undelivered outcomes"
  },
  {
    id: "kodak-digital",
    name: "Kodak Digital Camera",
    domain: "Corporate Strategy",
    year: 2012,
    what_was_attempted: "Kodak invented the digital camera in 1975 but suppressed it to protect film revenue",
    what_happened: "Kodak filed for bankruptcy in 2012 as digital photography destroyed film",
    official_cause: "Failure to adapt to digital transition",
    real_cause: "The team that invented digital photography was institutionally punished. Film revenue was so profitable that any internal analysis showing digital's potential was a threat to the business. Kodak didn't fail to see the future — they saw it clearly and chose present revenue over it.",
    mechanisms: ["incentive_misalignment", "sunk_cost_continuation", "survivorship_bias"],
    abstracted_pattern: "An organization correctly identifies a disruptive technology it has invented, then systematically suppresses adoption because the disruption would cannibalize its most profitable business. The organization's incentive structure is perfectly designed to protect current revenue and perfectly designed to enable its own obsolescence.",
    broken_assumption: "The business unit most threatened by a new technology is the right team to evaluate whether to develop it",
    scale: "Bankruptcy, 145,000 jobs lost, destruction of a $30B company"
  },
  {
    id: "ftx-collapse",
    name: "FTX Collapse",
    domain: "Fintech / Crypto",
    year: 2022,
    what_was_attempted: "Build the world's most trusted crypto exchange",
    what_happened: "$8B in customer funds missing; criminal fraud conviction",
    official_cause: "Fraud and misuse of customer funds",
    real_cause: "No functional board, no CFO for years, no audit trail. Organizational structure was designed — intentionally or not — to eliminate all checkpoints that would have caught the commingling. Key person dependency was total: one person's belief that he was optimizing for good outcomes substituted for all institutional controls.",
    mechanisms: ["key_person_dependency", "diffusion_of_responsibility", "information_siloing"],
    abstracted_pattern: "An organization scales faster than its control structures. The founding team's values substitute for formal governance. When the founding team's judgment is impaired or wrong, there is no institutional backstop. The organization achieves the appearance of legitimacy while remaining structurally incapable of catching founder-level misconduct.",
    broken_assumption: "A high-profile founder with strong effective altruism branding can substitute for institutional governance at scale",
    scale: "$8B customer funds lost, industry-wide contagion"
  },
  {
    id: "healthcare-gov-launch",
    name: "Healthcare.gov Launch",
    domain: "Government Tech",
    year: 2013,
    what_was_attempted: "Launch national health insurance marketplace for the Affordable Care Act",
    what_happened: "Complete failure on launch day; site crashed under minimal load",
    official_cause: "Poor testing and vendor management",
    real_cause: "No single accountable technical owner. 55 contractors with no integrator. CMS (Centers for Medicare & Medicaid) had policy authority but no technical authority. End-to-end load testing was never done because no one had the authority to require all contractors to participate simultaneously.",
    mechanisms: ["diffusion_of_responsibility", "information_siloing", "scope_creep"],
    abstracted_pattern: "A complex system with multiple independent components is built without a single entity responsible for system-level integration and testing. Each component works in isolation. The interfaces and the integrated whole are nobody's explicit responsibility. The failure mode is invisible until the system is fully assembled — which first happens in production.",
    broken_assumption: "Individual component testing by separate vendors is sufficient to validate an integrated system",
    scale: "National embarrassment, political damage to ACA, $2B+ remediation cost"
  },
  {
    id: "quibi",
    name: "Quibi",
    domain: "Consumer Tech / Media",
    year: 2020,
    what_was_attempted: "Premium short-form mobile video streaming for commuters",
    what_happened: "Shut down 6 months after launch after raising $1.75B",
    official_cause: "COVID-19 killed commuting",
    real_cause: "The commuter use case was an assumption, never validated. When COVID removed commuting, there was no fallback because the core behavior (premium video in 10-min chunks, portrait mode, phone only) had no natural alternative context. The product was designed for a context, not a need.",
    mechanisms: ["customer_behavior_assumption_wrong", "timing_mismatch", "false_consensus_from_weak_source"],
    abstracted_pattern: "A product is designed around an assumed user context rather than a validated user need. The context is treated as a permanent given. When the context disappears, the product has no value proposition independent of it, because the underlying need was never identified or validated.",
    broken_assumption: "Commuters want premium short-form video and will pay for it if the quality is high enough",
    scale: "$1.75B raised, $0 returned to investors"
  }
]
