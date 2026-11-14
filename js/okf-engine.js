/**
 * Maestro AI — Ontology & Knowledge Framework (OKF v2.0) Engine
 * Data-driven architecture: swap venues or inject custom JSON without code changes.
 */

window.MAESTRO_VENUES_CATALOG = [
  {
    venueId: "exploratorium_pier15",
    venueName: "The Exploratorium — Pier 15 Waterfront Galleries",
    shortName: "Exploratorium (Pier 15)",
    city: "San Francisco, CA (Embarcadero Pier 15)",
    officialRentalUrl: "https://www.exploratorium.edu/rentals",
    contactEmail: "events@exploratorium.edu",
    contactPhone: "+1 (415) 528-4500",
    isPublicMuseum: true,
    museumCloseTime: "17:00",
    loadInWindowHours: 2.0,
    architectureMaterial: ["Glass", "Steel", "Concrete", "Panoramic Waterfront"],
    curatorialConstraints: [
      "FlameProhibited (LED/Electronic Candles Only)",
      "MaxDecibelThreshold (88dB Main / 65dB Terrace Sanctuary)",
      "RiggingWeightLimit (Pre-Approved Truss Points)",
      "ApprovedCatererListEnforced",
      "ZeroStepElevatorAccessRequiredForSeniors"
    ],
    portalClue: "Prismatic light beams refracting through suspended kinetic sculptures as twilight settles over the Bay Bridge and shimmering water.",
    levelsAndGalleries: [
      {
        level: 1,
        id: "bechtel_central",
        name: "Level 1: Bechtel Central Gallery (Light, Vision & Sound Portal)",
        role: "Arrival Portal, Interactive Cocktail Reception & Kinetic Light Immersion",
        standingCapacity: 800,
        seatedCapacity: 350,
        baseRate: 14000,
        acousticProfile: "Dynamic Interactive (78 dB)",
        accessibility: "Ground-level step-free entry from Embarcadero Pier 15",
        ledSkinPreset: "Bioluminescent Deep Ocean & Prismatic Refraction"
      },
      {
        level: 2,
        id: "moore_east_mezzanine",
        name: "Level 2: Moore East Gallery & Mezzanine (Dual-Level Transition)",
        role: "Main Seated Banquet, Academic Speakeasy & Live Jazz Stage",
        standingCapacity: 450,
        seatedCapacity: 150,
        baseRate: 12500,
        acousticProfile: "DSP Calibrated Jazz & Dining (72–82 dB)",
        accessibility: "Dual-elevator access to Mezzanine + wide aisle geometry",
        ledSkinPreset: "Warm Amber Speakeasy & Architectural Column Skins"
      },
      {
        level: 3,
        id: "fisher_bay_observatory",
        name: "Level 3: Fisher Bay Observatory Gallery & Waterfront Terrace",
        role: "Chuppah / Keynote Apex, VIP Caviar Lounge & Senior Acoustic Sanctuary",
        standingCapacity: 200,
        seatedCapacity: 150,
        ceremonySeated: 120,
        baseRate: 11000,
        acousticProfile: "Protected Acoustic Sanctuary (<65 dB on Terrace)",
        accessibility: "Direct dedicated elevator + heated wind-shielded waterfront seating",
        ledSkinPreset: "Obsidian Glass Starlight & Bay Bridge Reflection"
      },
      {
        level: 4,
        id: "kanbar_forum",
        name: "Modular Bonus: Kanbar Forum (Mid-Week Tech Keynote & Cinema Hall)",
        role: "Executive Keynotes, Product Launches, Live Broadcasts & Chamber Sets",
        standingCapacity: 300,
        seatedCapacity: 200,
        baseRate: 9500,
        acousticProfile: "Studio-Grade Meyer Sound Constellation Acoustics",
        accessibility: "ADA stadium ramp & hearing-loop induction system",
        ledSkinPreset: "Silicon Valley Keynote Matrix & Live Telemetry"
      }
    ],
    pricingPackages: [
      {
        packageId: "observatory_standalone",
        name: "Fisher Bay Observatory & Terrace Package",
        maxGuestsSeated: 150,
        maxGuestsStanding: 200,
        basePrice: 11000,
        bestFor: "Intimate Waterfront Weddings & Executive VIP Dinners (up to 150 seated)"
      },
      {
        packageId: "observatory_east_bundle",
        name: "Observatory + Moore East Gallery Wedding Bundle",
        maxGuestsSeated: 300,
        maxGuestsStanding: 450,
        basePrice: 16500,
        bestFor: "Signature 3-Level Flow: Ceremony in Observatory -> Dinner & Jazz in East Gallery (150–450 guests)"
      },
      {
        packageId: "full_pier15_flagship",
        name: "Full Pier 15 Multi-Gallery Buyout (Bechtel + East + Observatory)",
        maxGuestsSeated: 500,
        maxGuestsStanding: 1200,
        basePrice: 28000,
        bestFor: "450+ Guest High-Society Galas, Large Weddings & Enterprise Summits"
      }
    ],
    includedPerks: [
      "On-site 'Explainer' Science Educators facilitating live interactive exhibits",
      "1-Hour Private Museum Photo Shoot across Pier 15 galleries",
      "Dedicated Get-Ready Classroom / Green Room for Couple or Keynote Speakers",
      "In-house Architectural LED Lighting & Base PA System",
      "1-Year Complimentary Dual Explorers Museum Membership",
      "14-Day Complimentary Soft Hold (Zero Deposit Required to Lock Date)",
      "15% Base Rental Discount for 501(c)(3) Nonprofit Organizations"
    ]
  },
  {
    venueId: "sfmoma",
    venueName: "SFMOMA — Evelyn & Walter Haas Jr. Atrium & Galleries",
    shortName: "SFMOMA (SoMa)",
    city: "San Francisco, CA (151 Third St)",
    officialRentalUrl: "https://www.sfmoma.org/event-rentals/",
    contactEmail: "specialevents@sfmoma.org",
    contactPhone: "+1 (415) 357-4075",
    isPublicMuseum: true,
    museumCloseTime: "17:00",
    loadInWindowHours: 2.0,
    architectureMaterial: ["Marble", "HighCeilingSteel", "OculusGlass"],
    curatorialConstraints: [
      "FlameProhibited",
      "StrictArtProximityBuffers",
      "ApprovedCatererListEnforced"
    ],
    portalClue: "Oculus skylight casting geometric beams across white Carrara marble staircases.",
    levelsAndGalleries: [
      {
        level: 1,
        id: "haas_atrium",
        name: "Level 1: Evelyn & Walter Haas Jr. Atrium",
        role: "Grand Arrival & Seated Gala Banquet",
        standingCapacity: 600,
        seatedCapacity: 350,
        baseRate: 18000,
        acousticProfile: "High Reverb Marble (Requires Argus HD DSP)",
        accessibility: "Full ADA elevator & ramp access",
        ledSkinPreset: "Monochrome Modernist Halo"
      },
      {
        level: 2,
        id: "schwab_hall",
        name: "Level 2: Helen & Charles Schwab Hall",
        role: "Cocktail Reception & Interactive Installations",
        standingCapacity: 450,
        seatedCapacity: 220,
        baseRate: 15000,
        acousticProfile: "Warm Mid-Ceiling Gallery",
        accessibility: "Direct elevator bank",
        ledSkinPreset: "Rothko Warm Crimson Gradient"
      },
      {
        level: 3,
        id: "sculpture_terrace",
        name: "Level 3: Living Wall & Sculpture Terrace",
        role: "Chuppah Ceremony & Quiet Senior Garden Sanctuary",
        standingCapacity: 250,
        seatedCapacity: 160,
        baseRate: 12000,
        acousticProfile: "Natural Botanical Absorption (<62 dB)",
        accessibility: "Step-free terrace doors",
        ledSkinPreset: "Botanical Emerald Glow"
      }
    ],
    pricingPackages: [
      {
        packageId: "sfmoma_atrium_bundle",
        name: "Atrium + Schwab Hall + Living Wall Bundle",
        maxGuestsSeated: 450,
        maxGuestsStanding: 700,
        basePrice: 25000,
        bestFor: "High-Society Museum Weddings & Executive Galas"
      }
    ],
    includedPerks: [
      "Private Gallery Security & Curatorial Docents",
      "Dedicated Museum Event Manager",
      "14-Day Soft Hold Option"
    ]
  },
  {
    venueId: "the_pearl_sf",
    venueName: "The Pearl — Dogpatch Multi-Level Industrial Venue",
    shortName: "The Pearl (Dogpatch)",
    city: "San Francisco, CA (601 19th St)",
    officialRentalUrl: "https://www.thepearlsf.com/private-events",
    contactEmail: "info@thepearlsf.com",
    contactPhone: "+1 (415) 598-8309",
    isPublicMuseum: false,
    museumCloseTime: "14:00",
    loadInWindowHours: 4.5,
    architectureMaterial: ["Steel", "WarmWood", "RooftopGlass"],
    curatorialConstraints: [
      "FlamePermittedInEnclosedVotives",
      "InHouseBarProgramRequired"
    ],
    portalClue: "Golden hour over the Bay transitioning into warm candlelight across dark oak tables.",
    levelsAndGalleries: [
      {
        level: 1,
        id: "pearl_main_floor",
        name: "Level 1: Main Industrial Floor & Custom Stage",
        role: "Main Reception, Banquet & Keynote Stage",
        standingCapacity: 450,
        seatedCapacity: 230,
        baseRate: 10500,
        acousticProfile: "Meyer Sound In-House Array",
        accessibility: "Ground level + elevator to all floors",
        ledSkinPreset: "Industrial Copper & Obsidian"
      },
      {
        level: 2,
        id: "pearl_mezzanine",
        name: "Level 2: Art Mezzanine & Lounge Overlook",
        role: "VIP Speakeasy & Cocktail Overlook",
        standingCapacity: 150,
        seatedCapacity: 80,
        baseRate: 4500,
        acousticProfile: "Intimate Lounge",
        accessibility: "Elevator access",
        ledSkinPreset: "Velvet Violet Speakeasy"
      },
      {
        level: 3,
        id: "pearl_rooftop",
        name: "Level 3: Living Rooftop Garden",
        role: "Outdoor Chuppah Ceremony & Senior Quiet Sanctuary",
        standingCapacity: 200,
        seatedCapacity: 160,
        baseRate: 5000,
        acousticProfile: "Open-Air Garden (<60 dB)",
        accessibility: "Direct rooftop elevator",
        ledSkinPreset: "Sunset Amber & String Lights"
      }
    ],
    pricingPackages: [
      {
        packageId: "pearl_full_3level",
        name: "Full 3-Level Exclusive Buyout (Main + Mezzanine + Rooftop)",
        maxGuestsSeated: 250,
        maxGuestsStanding: 600,
        basePrice: 14500,
        bestFor: "3-Level Weddings & Mid-Week Tech Summits"
      }
    ],
    includedPerks: [
      "Built-in Meyer Sound & Rigging Truss",
      "Custom Brass Bars & Lounge Furniture",
      "Full Commercial Catering Kitchen"
    ]
  }
];

window.MAESTRO_VENDORS_CATALOG = [
  {
    vendorID: "v_paula_leduc",
    vendorName: "Paula LeDuc Fine Catering & Events",
    primaryCategory: "Catering (Michelin Tier)",
    serviceTier: "Tier1_Enterprise_Michelin",
    capabilities: "Synchronized 450-Guest Seated Service · Multicultural/Kosher/Vegan Matrix · Approved Exploratorium Caterer",
    costFormula: (guests) => guests * 235,
    contact: "info@paulaleduc.com · +1 (510) 547-7825"
  },
  {
    vendorID: "v_blueprint_studios",
    vendorName: "Blueprint Studios",
    primaryCategory: "Full Production & Spatial Furniture",
    serviceTier: "Tier1_Enterprise_Michelin",
    capabilities: "300k+ SKU Inventory · Off-Site Pre-Fabrication · Flexible LED Column Skins & Custom Bars",
    costFormula: () => 18500,
    contact: "info@blueprintstudios.com · +1 (415) 922-9004"
  },
  {
    vendorID: "v_argus_hd",
    vendorName: "Argus HD — Audio, Video & Lighting",
    primaryCategory: "AV, DSP Acoustics & LED Skins",
    serviceTier: "Tier1_Enterprise_Michelin",
    capabilities: "Glass/Steel DSP Calibration · Directional Line-Array · Flexible LED Skins & 90-Min Museum Turnaround",
    costFormula: () => 16000,
    contact: "production@argushd.com · +1 (415) 285-2748"
  },
  {
    vendorID: "v_entire_productions",
    vendorName: "Entire Productions",
    primaryCategory: "Live Jazz & Talent Curation",
    serviceTier: "Bespoke_Luxury",
    capabilities: "SFJAZZ-Caliber Ensembles · Academic Speakeasy & Bossa Nova Quartets · Zero-Latency Show Calling",
    costFormula: () => 9500,
    contact: "events@entireproductions.com · +1 (415) 291-9191"
  },
  {
    vendorID: "v_tonic_beverage",
    vendorName: "Tonic Beverage Catering",
    primaryCategory: "Zero-Queue Mixology (3 Bars)",
    serviceTier: "Bespoke_Luxury",
    capabilities: "3 Distributed Speakeasy Mixology Stations · Molecular Cocktails & Zero-Proof Botanical Elixirs",
    costFormula: (guests) => guests * 65,
    contact: "cheers@tonicbeverage.com · +1 (415) 339-9933"
  },
  {
    vendorID: "v_caviar_co",
    vendorName: "The Caviar Co. San Francisco",
    primaryCategory: "VIP Observatory Lounge Activation",
    serviceTier: "Bespoke_Luxury",
    capabilities: "Sustainable Sturgeon Caviar Service · Observatory Terrace Champagne Pairing",
    costFormula: () => 4800,
    contact: "events@thecaviarco.com · +1 (415) 857-9550"
  },
  {
    vendorID: "v_espresso_subito",
    vendorName: "Espresso Subito Specialty Coffee",
    primaryCategory: "Dual Artisan Espresso Carts",
    serviceTier: "Boutique_Eco",
    capabilities: "Dual Espresso & Matcha Bars · Late-Night Jazz Club Affogato Service",
    costFormula: () => 2400,
    contact: "hello@espressosubito.com · +1 (415) 515-3150"
  },
  {
    vendorID: "v_orangepiel_rugs",
    vendorName: "OrangePiel & The Rug Company",
    primaryCategory: "Acoustic Velvet & Carpet Damping",
    serviceTier: "Bespoke_Luxury",
    capabilities: "Sound-Absorbing Velvet Drapery · Luxury Acoustic Rugs for Glass/Steel Galleries",
    costFormula: () => 6200,
    contact: "design@orangepiel.com · +1 (415) 621-5800"
  },
  {
    vendorID: "v_jays_small_moves",
    vendorName: "Jay's Small Moves — Rapid Logistics",
    primaryCategory: "90-Min Museum Turnaround Fleet",
    serviceTier: "Tier1_Enterprise_Michelin",
    capabilities: "Synchronized 17:00 Pier 15 Load-In Fleet · 00:30 AM Rapid Strike Crew",
    costFormula: () => 3800,
    contact: "dispatch@jayssmallmoves.com · +1 (415) 285-2600"
  }
];

window.DEFAULT_OKF_PROJECT = {
  projectID: "OKF-EXP-2027-0122",
  venueId: "exploratorium_pier15",
  targetDate: "2027-01-22",
  dayOfWeek: "Friday",
  eventType: "IntellectualJazzWedding", // or "MidWeekCorporateKeynote"
  guestCount: 220,
  aestheticConcept: "Academic Speakeasy & Prismatic Waterfront Jazz",
  budgetEnvelope: 125000,
  nonProfit501c3: false,
  inclusiveSeniorSanctuary: true,
  lgbtqMulticulturalInclusive: true,
  tableLayoutStyle: "modular_imperial_and_rounds",
  lifecycleStatus: "1.5_StakeholderAlignment",
  stakeholders: [
    {
      id: "st_1",
      name: "Alex & Jordan (The Couple)",
      role: "Primary Couple / Hosts",
      channel: "WhatsApp (+1 415-890-2211)",
      status: "Completed",
      vibeChoice: "Electric Jazz & Swing Speakeasy + Waterfront Chuppah",
      musicRule: "Classic Miles Davis, Bossa Nova & Live Brass — No cheesy top-40 DJ tracks",
      priority: "Prismatic LED atmosphere, LGBTQ+-inclusive ceremony language & zero bar queues",
      harmonyWeight: 96
    },
    {
      id: "st_2",
      name: "David & Miriam (Parents of the Couple)",
      role: "Parents & Senior Family Elders",
      channel: "WhatsApp (+1 415-442-9810)",
      status: "Completed",
      vibeChoice: "Cultural Salon & Seated Michelin Conversation",
      musicRule: "Warm acoustic jazz during dinner (<72 dB) so grandparents can converse comfortably",
      priority: "Step-free elevator routing, seated gourmet dinner, and a quiet acoustic sanctuary away from loud exhibits",
      harmonyWeight: 88
    },
    {
      id: "st_3",
      name: "Maya & Liam (Chief Attendants / Best Friends)",
      role: "Wedding Party & Speakeasy Crew",
      channel: "SMS (+1 650-771-3094)",
      status: "Completed",
      vibeChoice: "High-Energy Late-Night Speakeasy & Interactive Exhibits",
      musicRule: "Upbeat Swing, Funk-Jazz & Late-Night Vinyl Set until 00:30 AM",
      priority: "Interactive Exploratorium 'Explainer' demos, Caviar & Espresso Martini carts, and After-Party flow",
      harmonyWeight: 92
    }
  ]
};

window.MaestroOKFEngine = {
  getVenue(venueId) {
    return window.MAESTRO_VENUES_CATALOG.find(v => v.venueId === venueId) || window.MAESTRO_VENUES_CATALOG[0];
  },

  calculatePricing(project) {
    const venue = this.getVenue(project.venueId);
    const guests = Number(project.guestCount) || 150;
    const isCorp = project.eventType === "MidWeekCorporateKeynote";

    // Select optimal venue package based on guest count & event mode
    let pkg = venue.pricingPackages[0];
    if (venue.pricingPackages.length > 1) {
      if (guests <= 150 && !isCorp) {
        pkg = venue.pricingPackages[0];
      } else if (guests <= 450) {
        pkg = venue.pricingPackages[1] || venue.pricingPackages[0];
      } else {
        pkg = venue.pricingPackages[2] || venue.pricingPackages[venue.pricingPackages.length - 1];
      }
    }

    let venueBase = pkg.basePrice;
    if (isCorp && venue.venueId === "exploratorium_pier15") {
      // Mid-week corporate bundle includes Kanbar Forum + East Gallery
      venueBase = guests <= 200 ? 14500 : 21000;
    }

    const discount = project.nonProfit501c3 ? Math.round(venueBase * 0.15) : 0;
    const netVenueFee = venueBase - discount;

    // Vendor estimates
    const cateringCost = guests * (isCorp ? 165 : 235);
    const barCost = guests * (isCorp ? 48 : 65);
    const avAndLedCost = 16000;
    const productionFurniture = guests > 250 ? 18500 : 12500;
    const talentAndAcoustics = isCorp ? 8500 : (9500 + 6200);
    const vipActivations = 4800 + 2400 + 3800; // Caviar + Espresso + Jay's Small Moves

    const totalEstimated = netVenueFee + cateringCost + barCost + avAndLedCost + productionFurniture + talentAndAcoustics + vipActivations;

    return {
      packageSelected: isCorp && venue.venueId === "exploratorium_pier15"
        ? "Mid-Week Corporate Innovation Bundle (Kanbar Forum + Moore East Gallery)"
        : pkg.name,
      venueBase,
      discount,
      netVenueFee,
      cateringCost,
      barCost,
      avAndLedCost,
      productionFurniture,
      talentAndAcoustics,
      vipActivations,
      totalEstimated,
      withinBudget: totalEstimated <= project.budgetEnvelope
    };
  },

  evaluateAlignment(project) {
    const venue = this.getVenue(project.venueId);
    const isCorp = project.eventType === "MidWeekCorporateKeynote";

    if (isCorp) {
      return {
        overallScore: 95,
        consensuses: [
          "Executive Sponsor & Marketing Lead align on high-impact Silicon Valley Keynote in Kanbar Forum.",
          "100% agreement on interactive 'Explainer' science demos during networking reception.",
          "Zero-queue Espresso Subito & Tonic Beverage stations approved for peak breakouts."
        ],
        tensions: [
          {
            source: "CMO vs. Operations Lead",
            conflict: "CMO wants immersive dark-mode LED branding across all galleries, while Ops Lead requires bright wayfinding and rapid 90-minute post-museum turnaround."
          }
        ],
        architecturalResolution: `Deploy Blueprint Studios pre-fabricated Flexible LED Column Skins (90-min setup at ${venue.museumCloseTime} close) paired with Argus HD directional lighting—delivering dramatic Obsidian Glass branding while keeping all ADA pathways illuminated.`
      };
    }

    return {
      overallScore: 94,
      consensuses: [
        "100% Consensus on Live SFJAZZ-caliber ensemble (Entire Productions) & Michelin-tier seasonal dining (Paula LeDuc).",
        "Shared excitement for private access to interactive light & vision exhibits with on-site Exploratorium 'Explainers'.",
        "Universal approval of LGBTQ+-inclusive, gender-neutral ceremony framing & multi-cultural menu matrix."
      ],
      tensions: [
        {
          source: "Parents (David & Miriam) vs. Wedding Party (Maya & Liam)",
          conflict: "Parents prioritize a quiet (<72 dB) seated gourmet dinner and step-free comfort for grandparents, whereas the Wedding Party wants an electric 90 dB Jazz Speakeasy, roaming cocktails, and late-night dancing."
        }
      ],
      architecturalResolution: `Multi-Level Spatial Zoning across ${venue.shortName}: (1) Host the Chuppah & <65 dB Senior Acoustic Sanctuary in Level 3 Fisher Bay Observatory & Terrace (direct elevator, heated glass views); (2) Seat 150–300 guests for synchronized Paula LeDuc dining in Level 2 Moore East Gallery cushioned by OrangePiel velvet drapes; (3) Ignite the late-night Speakeasy & Brass Dance Floor in the adjacent Bechtel Portal after 21:15!`
    };
  },

  generateRunOfShow(project) {
    const venue = this.getVenue(project.venueId);
    const isCorp = project.eventType === "MidWeekCorporateKeynote";
    return [
      {
        timestamp: "17:00",
        phase: "LoadIn_Setup",
        title: `Museum Closes to Public — Rapid 90-Min Dock-to-Gallery Load-In`,
        vendor: "Jay's Small Moves + Blueprint Studios",
        zone: "Pier 15 Loading Bay -> All 3 Levels",
        rule: "RULE_1_MUSEUM_TURNAROUND",
        fallback: "Activate secondary Embarcadero staging dock + pre-rigged rolling truss carts."
      },
      {
        timestamp: "17:45",
        phase: "Acoustic_LED_Calibration",
        title: "DSP Acoustic Damping, Velvet Drapery & Flexible LED Skin Boot",
        vendor: "Argus HD + OrangePiel + The Rug Company",
        zone: "Level 2 Moore East & Level 3 Observatory",
        rule: "RULE_2_ACOUSTIC_DAMPING",
        fallback: "Switch to localized Meyer Sound zone limiters if reverberation exceeds 74 dB."
      },
      {
        timestamp: "18:15",
        phase: "SoundCheck_CulinaryPrep",
        title: "Live Jazz Ensemble Soundcheck & Private 1-Hr Museum Photo Shoot",
        vendor: "Entire Productions + Paula LeDuc",
        zone: "Bechtel Light Gallery & Bay Bridge Terrace",
        rule: "RULE_2_ACOUSTIC_DAMPING",
        fallback: "Dedicated Get-Ready Classroom reserved as weather-proof portrait studio."
      },
      {
        timestamp: "18:45",
        phase: "DoorsOpen_Level1",
        title: "Level 1 Portal Opens: Kinetic Light Exhibits, 'Explainers' & Welcome Elixirs",
        vendor: "Tonic Beverage + Exploratorium Explainers",
        zone: "Level 1: Bechtel Central Gallery",
        rule: "RULE_3_HIGH_VOLUME_FLOW",
        fallback: "Open 3rd mobile mixology bar if arrival wave exceeds 120 guests/10 mins."
      },
      {
        timestamp: "19:30",
        phase: isCorp ? "Keynote_Apex" : "Chuppah_Ceremony",
        title: isCorp
          ? "Executive Product Keynote & Live Telemetry Reveal"
          : "Waterfront Glass Chuppah Ceremony overlooking the Illuminated Bay Bridge",
        vendor: "Argus HD + Entire Productions",
        zone: isCorp ? "Kanbar Forum / Observatory" : "Level 3: Fisher Bay Observatory & Terrace",
        rule: "RULE_4_STAKEHOLDER_MEDIATION",
        fallback: "Priority elevator escorts & heated acoustic seating locked for senior guests."
      },
      {
        timestamp: "20:15",
        phase: "SeatedBanquet_Level2",
        title: `Synchronized Seated Michelin Dinner (${project.guestCount} Guests) + Acoustic Jazz`,
        vendor: "Paula LeDuc Fine Catering + Entire Productions",
        zone: "Level 2: Moore East Gallery & Mezzanine",
        rule: "RULE_3_HIGH_VOLUME_FLOW",
        fallback: "Observatory Terrace remains open at <65 dB as Senior Acoustic Sanctuary."
      },
      {
        timestamp: "21:45",
        phase: "Speakeasy_Transition",
        title: "LED Skins Shift to Speakeasy Mode: Live Brass, Caviar & Espresso Martinis",
        vendor: "The Caviar Co. + Espresso Subito + Tonic Beverage",
        zone: "Mezzanine VIP Lounge & Dance Floor",
        rule: "RULE_4_STAKEHOLDER_MEDIATION",
        fallback: "Dynamic LED wayfinding guides guests between quiet terrace and high-energy floor."
      },
      {
        timestamp: "00:30",
        phase: "Takedown",
        title: "Event Concludes — Synchronized 60-Minute Museum Strike & Load-Out",
        vendor: "Jay's Small Moves + Exploratorium Security",
        zone: "Pier 15 Perimeter",
        rule: "RULE_1_MUSEUM_TURNAROUND",
        fallback: "Pre-labeled flight cases ensure complete museum clearance before 01:30 AM."
      }
    ];
  }
};
