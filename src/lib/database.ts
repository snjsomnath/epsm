// Add these functions to the existing database.ts file

// Scenarios
export const getScenarios = async () => {
  try {
    console.log('Fetching scenarios...');
    const { data, error } = await supabase
      .from('scenarios')
      .select(`
        *,
        scenario_constructions (
          *,
          construction:constructions(*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to fetch scenarios:', err);
    throw err;
  }
};

export const createScenario = async (
  scenario: ScenarioInsert,
  constructions: { constructionId: string, elementType: string }[]
) => {
  try {
    // First create the scenario
    const { data: scenarioData, error: scenarioError } = await supabase
      .from('scenarios')
      .insert([scenario])
      .select()
      .single();
    
    if (scenarioError) throw scenarioError;

    // Then add the constructions
    if (constructions.length > 0) {
      const scenarioConstructions = constructions.map(c => ({
        scenario_id: scenarioData.id,
        construction_id: c.constructionId,
        element_type: c.elementType
      }));

      const { error: constructionsError } = await supabase
        .from('scenario_constructions')
        .insert(scenarioConstructions);
      
      if (constructionsError) throw constructionsError;
    }

    return scenarioData;
  } catch (err) {
    console.error('Failed to create scenario:', err);
    throw err;
  }
};

export const updateScenario = async (
  id: string,
  scenario: Partial<ScenarioInsert>,
  constructions: { constructionId: string, elementType: string }[]
) => {
  try {
    // Update scenario
    const { data: scenarioData, error: scenarioError } = await supabase
      .from('scenarios')
      .update(scenario)
      .eq('id', id)
      .select()
      .single();
    
    if (scenarioError) throw scenarioError;

    // Delete existing constructions
    const { error: deleteError } = await supabase
      .from('scenario_constructions')
      .delete()
      .eq('scenario_id', id);
    
    if (deleteError) throw deleteError;

    // Add new constructions
    if (constructions.length > 0) {
      const scenarioConstructions = constructions.map(c => ({
        scenario_id: id,
        construction_id: c.constructionId,
        element_type: c.elementType
      }));

      const { error: constructionsError } = await supabase
        .from('scenario_constructions')
        .insert(scenarioConstructions);
      
      if (constructionsError) throw constructionsError;
    }

    return scenarioData;
  } catch (err) {
    console.error('Failed to update scenario:', err);
    throw err;
  }
};

export const deleteScenario = async (id: string) => {
  try {
    const { error } = await supabase
      .from('scenarios')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (err) {
    console.error('Failed to delete scenario:', err);
    throw err;
  }
};

// Subscribe to scenario changes
export const subscribeToScenarios = (callback: (scenarios: Scenario[]) => void) => {
  return supabase
    .channel('scenarios_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'scenarios' 
    }, async () => {
      const data = await getScenarios();
      if (data) callback(data);
    })
    .subscribe();
};