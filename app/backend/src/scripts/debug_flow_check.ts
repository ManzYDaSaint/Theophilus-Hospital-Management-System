
async function verifyPatientCreation() {
    const BASE_URL = 'http://localhost:5000/api';
    console.log('🧪 Starting Verification Test (using fetch)...');

    // 1. Authenticate
    console.log('1. Attempting login...');
    let token = '';
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@theophilus.local',
                password: 'Admin@123'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json();
        token = loginData.accessToken;
        console.log('✅ Login successful. Token received.');
    } catch (error) {
        console.error('❌ Login failed:', error);
        process.exit(1);
    }

    // 2. Create Patient (Simulating Frontend Payload)
    console.log('\n2. Attempting to create patient with STRING date format...');
    const patientPayload = {
        firstName: "Verified",
        lastName: "User",
        dateOfBirth: "1990-05-20", // Sending raw string as frontend does
        gender: "Female",
        phoneNumber: "555-9999",
        address: "789 Verification Lane"
    };

    try {
        const createRes = await fetch(`${BASE_URL}/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(patientPayload)
        });

        if (createRes.status === 201) {
            const data = await createRes.json();
            console.log('✅ Patient created successfully (Status 201)');
            console.log('   Response Data:', data);

            // Verify date
            const createdDob = data.dateOfBirth;
            // The backend might return it as a string or Date object JSON format
            if (new Date(createdDob).toISOString().startsWith('1990-05-20')) {
                console.log('✅ Date correctly stored and returned.');
            } else {
                console.warn('⚠️ Date mismatch properly:', createdDob);
            }
        } else {
            const errText = await createRes.text();
            console.log('⚠️ Unexpected status code:', createRes.status, errText);
        }

    } catch (error) {
        console.error('❌ Patient creation failed:', error);
    }
}

verifyPatientCreation();
