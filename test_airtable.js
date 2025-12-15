const AIRTABLE_PAT = 'patjDDBcNO2O76jvk.e1e8b4c23ceb36dd1f6d1e0d56c4d1c64e61a0bb42d8e1de85cc044b5e58c66f';
const AIRTABLE_BASE_ID = 'appw7b4hNkpwJLdsg';

async function testTechnician() {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Servicios?maxRecords=10`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_PAT}`,
    }
  });
  const data = await response.json();
  
  if (!data.records) {
    console.log('Error:', data);
    return;
  }
  
  console.log('Sample records from Servicios:');
  data.records.forEach((r, i) => {
    console.log(`\nRecord ${i + 1}:`);
    console.log('  All fields:', Object.keys(r.fields));
    console.log('  Trabajador field:', r.fields['Trabajador']);
    console.log('  Trabajadores field:', r.fields['Trabajadores']);
    console.log('  Fecha de registro:', r.fields['Fecha de registro']);
    console.log('  Estado:', r.fields['Estado']);
    console.log('  Último cambio:', r.fields['Último cambio']);
  });
}

testTechnician();
