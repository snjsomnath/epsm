export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      materials: {
        Row: {
          id: string
          name: string
          roughness: string
          thickness_m: number
          conductivity_w_mk: number
          density_kg_m3: number
          specific_heat_j_kgk: number
          thermal_absorptance: number
          solar_absorptance: number
          visible_absorptance: number
          gwp_kgco2e_per_m2: number
          cost_sek_per_m2: number
          wall_allowed: boolean
          roof_allowed: boolean
          floor_allowed: boolean
          window_layer_allowed: boolean
          author_id: string | null
          date_created: string
          date_modified: string
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          roughness: string
          thickness_m: number
          conductivity_w_mk: number
          density_kg_m3: number
          specific_heat_j_kgk: number
          thermal_absorptance?: number
          solar_absorptance?: number
          visible_absorptance?: number
          gwp_kgco2e_per_m2: number
          cost_sek_per_m2: number
          wall_allowed?: boolean
          roof_allowed?: boolean
          floor_allowed?: boolean
          window_layer_allowed?: boolean
          author_id?: string | null
          date_created?: string
          date_modified?: string
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          roughness?: string
          thickness_m?: number
          conductivity_w_mk?: number
          density_kg_m3?: number
          specific_heat_j_kgk?: number
          thermal_absorptance?: number
          solar_absorptance?: number
          visible_absorptance?: number
          gwp_kgco2e_per_m2?: number
          cost_sek_per_m2?: number
          wall_allowed?: boolean
          roof_allowed?: boolean
          floor_allowed?: boolean
          window_layer_allowed?: boolean
          author_id?: string | null
          date_created?: string
          date_modified?: string
          source?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      window_glazing: {
        Row: {
          id: string
          name: string
          thickness_m: number
          conductivity_w_mk: number
          solar_transmittance: number | null
          visible_transmittance: number | null
          infrared_transmittance: number
          front_ir_emissivity: number
          back_ir_emissivity: number
          gwp_kgco2e_per_m2: number
          cost_sek_per_m2: number
          author_id: string | null
          date_created: string
          date_modified: string
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          thickness_m: number
          conductivity_w_mk: number
          solar_transmittance?: number | null
          visible_transmittance?: number | null
          infrared_transmittance?: number
          front_ir_emissivity?: number
          back_ir_emissivity?: number
          gwp_kgco2e_per_m2: number
          cost_sek_per_m2: number
          author_id?: string | null
          date_created?: string
          date_modified?: string
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          thickness_m?: number
          conductivity_w_mk?: number
          solar_transmittance?: number | null
          visible_transmittance?: number | null
          infrared_transmittance?: number
          front_ir_emissivity?: number
          back_ir_emissivity?: number
          gwp_kgco2e_per_m2?: number
          cost_sek_per_m2?: number
          author_id?: string | null
          date_created?: string
          date_modified?: string
          source?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "window_glazing_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      constructions: {
        Row: {
          id: string
          name: string
          element_type: string
          is_window: boolean
          u_value_w_m2k: number
          gwp_kgco2e_per_m2: number
          cost_sek_per_m2: number
          author_id: string | null
          date_created: string
          date_modified: string
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          element_type: string
          is_window?: boolean
          u_value_w_m2k: number
          gwp_kgco2e_per_m2: number
          cost_sek_per_m2: number
          author_id?: string | null
          date_created?: string
          date_modified?: string
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          element_type?: string
          is_window?: boolean
          u_value_w_m2k?: number
          gwp_kgco2e_per_m2?: number
          cost_sek_per_m2?: number
          author_id?: string | null
          date_created?: string
          date_modified?: string
          source?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "constructions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      layers: {
        Row: {
          id: string
          construction_id: string | null
          material_id: string | null
          glazing_id: string | null
          layer_order: number
          is_glazing_layer: boolean
          created_at: string
        }
        Insert: {
          id?: string
          construction_id?: string | null
          material_id?: string | null
          glazing_id?: string | null
          layer_order: number
          is_glazing_layer?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          construction_id?: string | null
          material_id?: string | null
          glazing_id?: string | null
          layer_order?: number
          is_glazing_layer?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "layers_construction_id_fkey"
            columns: ["construction_id"]
            isOneToOne: false
            referencedRelation: "constructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layers_glazing_id_fkey"
            columns: ["glazing_id"]
            isOneToOne: false
            referencedRelation: "window_glazing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          }
        ]
      }
      construction_sets: {
        Row: {
          id: string
          name: string
          description: string | null
          wall_construction_id: string | null
          roof_construction_id: string | null
          floor_construction_id: string | null
          window_construction_id: string | null
          author_id: string | null
          date_created: string
          date_modified: string
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          wall_construction_id?: string | null
          roof_construction_id?: string | null
          floor_construction_id?: string | null
          window_construction_id?: string | null
          author_id?: string | null
          date_created?: string
          date_modified?: string
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          wall_construction_id?: string | null
          roof_construction_id?: string | null
          floor_construction_id?: string | null
          window_construction_id?: string | null
          author_id?: string | null
          date_created?: string
          date_modified?: string
          source?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_sets_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_sets_floor_construction_id_fkey"
            columns: ["floor_construction_id"]
            isOneToOne: false
            referencedRelation: "constructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_sets_roof_construction_id_fkey"
            columns: ["roof_construction_id"]
            isOneToOne: false
            referencedRelation: "constructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_sets_wall_construction_id_fkey"
            columns: ["wall_construction_id"]
            isOneToOne: false
            referencedRelation: "constructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_sets_window_construction_id_fkey"
            columns: ["window_construction_id"]
            isOneToOne: false
            referencedRelation: "constructions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
  }
}