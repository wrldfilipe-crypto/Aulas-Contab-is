import { migrateFirestoreConversationsMembers } from '../src/lib/firebase';

async function runMigration() {
  console.log('A iniciar migração do campo "members" nas conversas do Firestore...');
  try {
    const result = await migrateFirestoreConversationsMembers();
    console.log(`Migração concluída com sucesso! Total de conversas atualizadas: ${result.migratedCount}`);
  } catch (error) {
    console.error('Erro ao executar a migração de conversas:', error);
  }
}

runMigration();
