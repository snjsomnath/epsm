export function normalizeResultMetrics(r: any) {
  if (!r) return {};
  const eui_total = r.eui_total ?? r.eui ?? r.totalEnergy ?? r.totalEnergyUse ?? r.totalEnergyUse_kwh ?? r.totalEnergyUseKwh ?? r.total_energy ?? r.totalEnergyUsePerArea ?? r.totalEnergyUsePerArea_kwh ?? null;
  const eui_heating = r.eui_heating ?? r.heating ?? r.heatingDemand ?? (r.energy_use && r.energy_use.Heating && r.energy_use.Heating.total) ?? null;
  const eui_cooling = r.eui_cooling ?? r.cooling ?? r.coolingDemand ?? (r.energy_use && r.energy_use.Cooling && r.energy_use.Cooling.total) ?? null;
  const runtime_s = r.runtime_s ?? r.runtime ?? r.runTime ?? r.run_time_seconds ?? r.run_time ?? null;
  const area = r.totalArea ?? r.total_area ?? r.total_area_m2 ?? r.totalAreaM2 ?? r.total_area_m2 ?? r.totalAreaMeters ?? null;
  const status = r.status ?? r.state ?? null;
  // detect hourly presence in common places
  const hourly = r.hourly || r.hourly_values || r.hourly_timeseries || (r.raw_json && (r.raw_json.hourly_values || r.raw_json.hourly_timeseries)) || null;
  const has_hourly = Array.isArray(hourly) ? hourly.length > 0 : !!hourly;

  return { eui_total, eui_heating, eui_cooling, runtime_s, area, status, has_hourly };
}
