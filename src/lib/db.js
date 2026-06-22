import { supabase } from './supabase';

export const getCollection = async (collectionName) => {
  const { data, error } = await supabase
    .from(collectionName)
    .select('*');
  
  if (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error;
  }
  return data || [];
};

export const addDocument = async (collectionName, doc) => {
  let docData = { ...doc };
  
  // Inject the authenticated guard's ID if creating activity logs
  if (collectionName === 'logs') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      docData.guardId = user.id;
    }
  }

  const { data, error } = await supabase
    .from(collectionName)
    .insert([docData])
    .select();

  if (error) {
    console.error(`Error inserting into ${collectionName}:`, error);
    throw error;
  }
  return data[0];
};

export const updateDocument = async (collectionName, id, updates) => {
  const { data, error } = await supabase
    .from(collectionName)
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
  return data[0];
};

export const deleteDocument = async (collectionName, id) => {
  const { error } = await supabase
    .from(collectionName)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
  return true;
};

export const getDocument = async (collectionName, id) => {
  const { data, error } = await supabase
    .from(collectionName)
    .select('*')
    .eq('id', id);

  if (error) {
    console.error(`Error fetching document ${id} from ${collectionName}:`, error);
    throw error;
  }
  return data && data.length > 0 ? data[0] : null;
};

export const initMockData = async () => {
  try {
    const { data: manifest, error } = await supabase
      .from('manifest')
      .select('id')
      .limit(1);

    // If table is empty or error occurs because we need to seed
    if (!error && (!manifest || manifest.length === 0)) {
      await supabase.from('manifest').insert([
        { fullName: 'Alice Example', company: 'Acme Corp' },
        { fullName: 'Bob Builder', company: 'Build Co' },
        { fullName: 'Charlie Sound', company: 'Main Stage Audio Ltd' }
      ]);
      console.log('Successfully seeded database manifest table with initial values.');
    }
  } catch (err) {
    console.error('Seeding database error:', err);
  }
};
