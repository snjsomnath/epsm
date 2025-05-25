// Mock data for materials
export const mockMaterials = [
  {
    id: 1,
    name: 'Brick',
    roughness: 'MediumRough',
    thickness_m: 0.1016,
    conductivity_w_mk: 0.89,
    density_kg_m3: 1920,
    specific_heat_j_kgk: 790,
    thermal_absorptance: 0.9,
    solar_absorptance: 0.7,
    visible_absorptance: 0.7,
    gwp_kgco2e_per_m2: 85.2,
    cost_sek_per_m2: 450,
    wall_allowed: true,
    roof_allowed: false,
    floor_allowed: false,
    window_layer_allowed: false,
    author: 'John Doe',
    date_created: '2024-01-15',
    date_modified: '2024-01-15',
    source: 'ASHRAE 90.1'
  },
  {
    id: 2,
    name: 'Insulation Fiberglass',
    roughness: 'MediumRough',
    thickness_m: 0.0889,
    conductivity_w_mk: 0.043,
    density_kg_m3: 12,
    specific_heat_j_kgk: 840,
    thermal_absorptance: 0.9,
    solar_absorptance: 0.7,
    visible_absorptance: 0.7,
    gwp_kgco2e_per_m2: 12.5,
    cost_sek_per_m2: 120,
    wall_allowed: true,
    roof_allowed: true,
    floor_allowed: true,
    window_layer_allowed: false,
    author: 'John Doe',
    date_created: '2024-01-15',
    date_modified: '2024-01-15',
    source: 'ASHRAE 90.1'
  },
  {
    id: 3,
    name: 'Concrete Block',
    roughness: 'MediumRough',
    thickness_m: 0.2032,
    conductivity_w_mk: 0.51,
    density_kg_m3: 1400,
    specific_heat_j_kgk: 1000,
    thermal_absorptance: 0.9,
    solar_absorptance: 0.7,
    visible_absorptance: 0.7,
    gwp_kgco2e_per_m2: 120.4,
    cost_sek_per_m2: 380,
    wall_allowed: true,
    roof_allowed: false,
    floor_allowed: true,
    window_layer_allowed: false,
    author: 'Jane Smith',
    date_created: '2024-01-20',
    date_modified: '2024-01-20',
    source: 'ASHRAE 90.1'
  },
  {
    id: 4,
    name: 'Gypsum Board',
    roughness: 'Smooth',
    thickness_m: 0.0127,
    conductivity_w_mk: 0.16,
    density_kg_m3: 800,
    specific_heat_j_kgk: 1090,
    thermal_absorptance: 0.9,
    solar_absorptance: 0.7,
    visible_absorptance: 0.7,
    gwp_kgco2e_per_m2: 7.2,
    cost_sek_per_m2: 85,
    wall_allowed: true,
    roof_allowed: true,
    floor_allowed: false,
    window_layer_allowed: false,
    author: 'Jane Smith',
    date_created: '2024-01-22',
    date_modified: '2024-01-22',
    source: 'ASHRAE 90.1'
  },
  {
    id: 5,
    name: 'Wood Siding',
    roughness: 'MediumSmooth',
    thickness_m: 0.0191,
    conductivity_w_mk: 0.14,
    density_kg_m3: 530,
    specific_heat_j_kgk: 900,
    thermal_absorptance: 0.9,
    solar_absorptance: 0.7,
    visible_absorptance: 0.7,
    gwp_kgco2e_per_m2: 8.3,
    cost_sek_per_m2: 175,
    wall_allowed: true,
    roof_allowed: false,
    floor_allowed: false,
    window_layer_allowed: false,
    author: 'John Doe',
    date_created: '2024-02-05',
    date_modified: '2024-02-05',
    source: 'ASHRAE 90.1'
  }
];

// Mock data for window glazing
export const mockWindowGlazing = [
  {
    id: 1,
    name: 'Clear 3mm',
    thickness_m: 0.003,
    conductivity_w_mk: 0.9,
    solar_transmittance: 0.837,
    visible_transmittance: 0.898,
    infrared_transmittance: 0.0,
    front_ir_emissivity: 0.84,
    back_ir_emissivity: 0.84,
    gwp_kgco2e_per_m2: 25.5,
    cost_sek_per_m2: 350,
    author: 'John Doe',
    date_created: '2024-01-15'
  },
  {
    id: 2,
    name: 'Low-E 6mm',
    thickness_m: 0.006,
    conductivity_w_mk: 0.9,
    solar_transmittance: 0.42,
    visible_transmittance: 0.71,
    infrared_transmittance: 0.0,
    front_ir_emissivity: 0.1,
    back_ir_emissivity: 0.84,
    gwp_kgco2e_per_m2: 35.8,
    cost_sek_per_m2: 620,
    author: 'Jane Smith',
    date_created: '2024-01-20'
  },
  {
    id: 3,
    name: 'Triple Low-E 4mm',
    thickness_m: 0.004,
    conductivity_w_mk: 0.9,
    solar_transmittance: 0.33,
    visible_transmittance: 0.65,
    infrared_transmittance: 0.0,
    front_ir_emissivity: 0.05,
    back_ir_emissivity: 0.84,
    gwp_kgco2e_per_m2: 42.3,
    cost_sek_per_m2: 780,
    author: 'Jane Smith',
    date_created: '2024-01-22'
  }
];

// Mock data for constructions
export const mockConstructions = [
  {
    id: 1,
    name: 'Brick Wall with Insulation',
    element_type: 'wall',
    is_window: false,
    u_value_w_m2k: 0.35,
    gwp_kgco2e_per_m2: 95.5,
    cost_sek_per_m2: 620,
    author: 'John Doe',
    date_created: '2024-01-15',
    layers: [
      { id: 1, name: 'Brick', thickness_m: 0.1016, is_glazing_layer: false },
      { id: 2, name: 'Insulation Fiberglass', thickness_m: 0.0889, is_glazing_layer: false },
      { id: 4, name: 'Gypsum Board', thickness_m: 0.0127, is_glazing_layer: false }
    ]
  },
  {
    id: 2,
    name: 'Concrete Floor',
    element_type: 'floor',
    is_window: false,
    u_value_w_m2k: 0.4,
    gwp_kgco2e_per_m2: 125.8,
    cost_sek_per_m2: 480,
    author: 'Jane Smith',
    date_created: '2024-01-20',
    layers: [
      { id: 3, name: 'Concrete Block', thickness_m: 0.2032, is_glazing_layer: false },
      { id: 2, name: 'Insulation Fiberglass', thickness_m: 0.0508, is_glazing_layer: false }
    ]
  },
  {
    id: 3,
    name: 'Insulated Roof',
    element_type: 'roof',
    is_window: false,
    u_value_w_m2k: 0.25,
    gwp_kgco2e_per_m2: 65.3,
    cost_sek_per_m2: 550,
    author: 'Jane Smith',
    date_created: '2024-01-22',
    layers: [
      { id: 5, name: 'Wood Siding', thickness_m: 0.0191, is_glazing_layer: false },
      { id: 2, name: 'Insulation Fiberglass', thickness_m: 0.1524, is_glazing_layer: false },
      { id: 4, name: 'Gypsum Board', thickness_m: 0.0127, is_glazing_layer: false }
    ]
  },
  {
    id: 4,
    name: 'Double Glazed Window',
    element_type: 'window',
    is_window: true,
    u_value_w_m2k: 1.8,
    gwp_kgco2e_per_m2: 55.2,
    cost_sek_per_m2: 1200,
    author: 'John Doe',
    date_created: '2024-02-05',
    layers: [
      { id: 1, name: 'Clear 3mm', thickness_m: 0.003, is_glazing_layer: true },
      { id: 6, name: 'Air Gap 13mm', thickness_m: 0.013, is_glazing_layer: false },
      { id: 1, name: 'Clear 3mm', thickness_m: 0.003, is_glazing_layer: true }
    ]
  },
  {
    id: 5,
    name: 'Triple Glazed Low-E Window',
    element_type: 'window',
    is_window: true,
    u_value_w_m2k: 0.8,
    gwp_kgco2e_per_m2: 85.6,
    cost_sek_per_m2: 2200,
    author: 'Jane Smith',
    date_created: '2024-02-10',
    layers: [
      { id: 2, name: 'Low-E 6mm', thickness_m: 0.006, is_glazing_layer: true },
      { id: 6, name: 'Argon Gap 12mm', thickness_m: 0.012, is_glazing_layer: false },
      { id: 1, name: 'Clear 3mm', thickness_m: 0.003, is_glazing_layer: true },
      { id: 6, name: 'Argon Gap 12mm', thickness_m: 0.012, is_glazing_layer: false },
      { id: 2, name: 'Low-E 6mm', thickness_m: 0.006, is_glazing_layer: true }
    ]
  }
];

// Mock data for construction sets
export const mockConstructionSets = [
  {
    id: 1,
    name: 'Standard Construction Set',
    description: 'Basic construction set for typical buildings',
    wall_construction: {
      id: 1,
      name: 'Brick Wall with Insulation',
      u_value_w_m2k: 0.35
    },
    roof_construction: {
      id: 3,
      name: 'Insulated Roof',
      u_value_w_m2k: 0.25
    },
    floor_construction: {
      id: 2,
      name: 'Concrete Floor',
      u_value_w_m2k: 0.4
    },
    window_construction: {
      id: 4,
      name: 'Double Glazed Window',
      u_value_w_m2k: 1.8
    },
    author: 'John Doe',
    date_created: '2024-02-15'
  },
  {
    id: 2,
    name: 'High Performance Set',
    description: 'Energy efficient construction set for passive buildings',
    wall_construction: {
      id: 1,
      name: 'Brick Wall with Insulation',
      u_value_w_m2k: 0.35
    },
    roof_construction: {
      id: 3,
      name: 'Insulated Roof',
      u_value_w_m2k: 0.25
    },
    floor_construction: {
      id: 2,
      name: 'Concrete Floor',
      u_value_w_m2k: 0.4
    },
    window_construction: {
      id: 5,
      name: 'Triple Glazed Low-E Window',
      u_value_w_m2k: 0.8
    },
    author: 'Jane Smith',
    date_created: '2024-02-20'
  },
  {
    id: 3,
    name: 'Budget Friendly Set',
    description: 'Cost-effective construction set with moderate performance',
    wall_construction: {
      id: 1,
      name: 'Brick Wall with Insulation',
      u_value_w_m2k: 0.35
    },
    roof_construction: {
      id: 3,
      name: 'Insulated Roof',
      u_value_w_m2k: 0.25
    },
    floor_construction: null,
    window_construction: {
      id: 4,
      name: 'Double Glazed Window',
      u_value_w_m2k: 1.8
    },
    author: 'John Doe',
    date_created: '2024-03-01'
  }
];

// Mock data for extracted components from IDF files
export const mockExtractedComponents = [
  {
    fileName: 'office.idf',
    materials: [
      {
        id: 'mat1',
        name: 'BRICK',
        type: 'Material',
        properties: {
          thickness: 0.1016,
          conductivity: 0.89,
          density: 1920,
          specificHeat: 790
        },
        existsInDatabase: true
      },
      {
        id: 'mat2',
        name: 'INS-FIBERGLASS',
        type: 'Material',
        properties: {
          thickness: 0.0889,
          conductivity: 0.043,
          density: 12,
          specificHeat: 840
        },
        existsInDatabase: true
      },
      {
        id: 'mat3',
        name: 'CONCRETE-HEAVY',
        type: 'Material',
        properties: {
          thickness: 0.1016,
          conductivity: 1.95,
          density: 2240,
          specificHeat: 900
        },
        existsInDatabase: false
      }
    ],
    constructions: [
      {
        id: 'con1',
        name: 'EXTERIOR-WALL',
        type: 'Wall',
        properties: {
          layers: ['BRICK', 'INS-FIBERGLASS', 'GYPSUM']
        },
        existsInDatabase: true
      },
      {
        id: 'con2',
        name: 'OFFICE-FLOOR',
        type: 'Floor',
        properties: {
          layers: ['CONCRETE-HEAVY', 'CARPET']
        },
        existsInDatabase: false
      }
    ],
    zones: [
      {
        id: 'zone1',
        name: 'OFFICE-ZONE-1',
        type: 'Zone',
        properties: {
          area: 250,
          volume: 750,
          ceilingHeight: 3
        },
        existsInDatabase: false
      }
    ]
  },
  {
    fileName: 'residential.idf',
    materials: [
      {
        id: 'mat4',
        name: 'WOOD-SIDING',
        type: 'Material',
        properties: {
          thickness: 0.0191,
          conductivity: 0.14,
          density: 530,
          specificHeat: 900
        },
        existsInDatabase: true
      },
      {
        id: 'mat5',
        name: 'MINERAL-WOOL',
        type: 'Material',
        properties: {
          thickness: 0.1016,
          conductivity: 0.038,
          density: 30,
          specificHeat: 840
        },
        existsInDatabase: false
      }
    ],
    constructions: [
      {
        id: 'con3',
        name: 'APARTMENT-WALL',
        type: 'Wall',
        properties: {
          layers: ['WOOD-SIDING', 'MINERAL-WOOL', 'GYPSUM']
        },
        existsInDatabase: false
      }
    ],
    zones: [
      {
        id: 'zone2',
        name: 'APARTMENT-ZONE',
        type: 'Zone',
        properties: {
          area: 85,
          volume: 230,
          ceilingHeight: 2.7
        },
        existsInDatabase: false
      }
    ]
  }
];