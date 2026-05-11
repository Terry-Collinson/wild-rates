import axios from 'axios';

async function testRest() {
  const projectId = 'booking-service-1c217';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/room_types`;
  
  try {
    console.log('Fetching from REST API:', url);
    const res = await axios.get(url);
    console.log('Success! Documents found:', res.data.documents?.length || 0);
    if (res.data.documents) {
        console.log('First doc ID:', res.data.documents[0].name.split('/').pop());
    }
  } catch (err: any) {
    console.error('REST API Error:', err.response?.data || err.message);
  }
}

testRest();
