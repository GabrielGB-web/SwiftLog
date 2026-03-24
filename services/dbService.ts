
import { supabase } from './supabase';

export const saveData = async (storeName: string, data: any[]) => {
  console.log(`[dbService] Tentando salvar ${data?.length || 0} registros em "${storeName}"`);
  try {
    if (!data) {
      console.warn(`[dbService] Dados inválidos para "${storeName}":`, data);
      return false;
    }

    // Se o array estiver vazio, deletamos tudo da tabela
    if (data.length === 0) {
      console.log(`[dbService] Limpando tabela "${storeName}"...`);
      const { error: deleteError } = await supabase
        .from(storeName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) {
        console.error(`[dbService] Erro ao limpar "${storeName}":`, deleteError);
        throw deleteError;
      }
      return true;
    }

    // Identificar IDs para deletar (aqueles que estão no DB mas não nos dados atuais)
    const { data: existingRecords, error: fetchError } = await supabase
      .from(storeName)
      .select('id');
    
    if (fetchError) {
      console.error(`[dbService] Erro ao buscar IDs existentes em "${storeName}":`, fetchError);
      throw fetchError;
    }

    const currentIds = data.map(item => item.id);
    const idsToDelete = existingRecords
      ?.map(r => r.id)
      .filter(id => !currentIds.includes(id)) || [];

    if (idsToDelete.length > 0) {
      console.log(`[dbService] Deletando ${idsToDelete.length} registros obsoletos de "${storeName}"`);
      const { error: deleteError } = await supabase
        .from(storeName)
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.error(`[dbService] Erro ao deletar registros de "${storeName}":`, deleteError);
        throw deleteError;
      }
    }

    // Upsert the data
    console.log(`[dbService] Realizando upsert de ${data.length} registros em "${storeName}"`);
    const { error: upsertError } = await supabase
      .from(storeName)
      .upsert(data, { onConflict: 'id' });

    if (upsertError) {
      console.error(`[dbService] Erro no upsert de "${storeName}":`, upsertError);
      throw upsertError;
    }
    
    console.log(`[dbService] "${storeName}" sincronizado com sucesso!`);
    return true;
  } catch (error) {
    console.error(`[dbService] Falha crítica ao salvar em "${storeName}":`, error);
    return false;
  }
};

export const getData = async (storeName: string): Promise<any[] | null> => {
  console.log(`[dbService] Buscando dados da tabela "${storeName}"...`);
  try {
    const { data, error } = await supabase
      .from(storeName)
      .select('*');
    
    if (error) {
      console.warn(`[dbService] Tabela "${storeName}" não encontrada ou erro de acesso:`, error.message);
      throw error;
    }
    console.log(`[dbService] ${data?.length || 0} registros recuperados de "${storeName}"`);
    return data || [];
  } catch (error) {
    console.error(`[dbService] Erro ao ler de "${storeName}":`, error);
    return null; // Retorna null para indicar falha crítica
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
