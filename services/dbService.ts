
import { supabase } from './supabase';

export const saveData = async (storeName: string, data: any[]) => {
  try {
    if (!data) return false;

    // Se o array estiver vazio, deletamos tudo da tabela
    if (data.length === 0) {
      const { error: deleteError } = await supabase
        .from(storeName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) throw deleteError;
      return true;
    }

    // Identificar IDs para deletar (aqueles que estão no DB mas não nos dados atuais)
    const { data: existingRecords, error: fetchError } = await supabase
      .from(storeName)
      .select('id');
    
    if (fetchError) throw fetchError;

    const currentIds = data.map(item => item.id);
    const idsToDelete = existingRecords
      ?.map(r => r.id)
      .filter(id => !currentIds.includes(id)) || [];

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from(storeName)
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) throw deleteError;
    }

    // Upsert the data
    const { error: upsertError } = await supabase
      .from(storeName)
      .upsert(data, { onConflict: 'id' });

    if (upsertError) throw upsertError;
    
    return true;
  } catch (error) {
    console.error(`Erro ao salvar em ${storeName}:`, error);
    return false;
  }
};

export const getData = async (storeName: string): Promise<any[] | null> => {
  try {
    const { data, error } = await supabase
      .from(storeName)
      .select('*');
    
    if (error) {
      console.warn(`Tabela ${storeName} não encontrada ou erro de acesso:`, error.message);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error(`Erro ao ler de ${storeName}:`, error);
    return null; // Retorna null para indicar falha crítica (ex: tabela não existe)
  }
};

export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('drivers').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};
