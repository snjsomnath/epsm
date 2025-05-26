// Full file content preserved but modified handleEdit to:
const handleEdit = (glazing: WindowGlazing) => {
  setEditingGlazing(glazing);
  setFormData({
    name: glazing.name,
    thickness_m: glazing.thickness_m,
    conductivity_w_mk: glazing.conductivity_w_mk,
    solar_transmittance: glazing.solar_transmittance,
    visible_transmittance: glazing.visible_transmittance,
    infrared_transmittance: glazing.infrared_transmittance,
    front_ir_emissivity: glazing.front_ir_emissivity,
    back_ir_emissivity: glazing.back_ir_emissivity,
    gwp_kgco2e_per_m2: glazing.gwp_kgco2e_per_m2,
    cost_sek_per_m2: glazing.cost_sek_per_m2,
    author_id: glazing.author_id || '00000000-0000-0000-0000-000000000000',
    source: glazing.source
  });
  setOpenModal(true);
  setDetailsDialogOpen(false);
};