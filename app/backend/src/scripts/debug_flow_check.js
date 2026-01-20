
async function verifyPatientCreation() {
    const BASE_URL = 'http://127.0.0.1:5000/api';
    const HEALTH_URL = 'http://127.0.0.1:5000/health';
    console.log('🧪 Starting Verification Test (JS via 127.0.0.1)...');

    // 0. Health Check
    try {
        console.log(`GET ${HEALTH_URL}`);
        const healthRes = await fetch(HEALTH_URL);
        const healthText = await healthRes.text();
        console.log('0. Health Check:', healthRes.status, healthText.substring(0, 100));

        if (!healthRes.ok && healthRes.status !== 200) {
            console.warn('⚠️ Health check did not return 200 OK');
        }
    } catch (e) {
        console.error('❌ Health check failed (Server might be down):', e);
        process.exit(1);
    }

    // 1. Authenticate
    console.log('\n1. Attempting login...');
    let token = '';
    try {
        const loginUrl = `${BASE_URL}/auth/login`;
        console.log(`POST ${loginUrl}`);
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@theophilus.local',
                password: 'Admin@123'
            })
        });

        if (!loginRes.ok) {
            const txt = await loginRes.text();
            console.error(`❌ Login failed: ${loginRes.status} ${loginRes.statusText}`);
            console.error('Response Body snippet:', txt.substring(0, 200));
            process.exit(1);
        }

        const loginData = await loginRes.json();
        token = loginData.accessToken;
        console.log('✅ Login successful. Token received.');
    } catch (error) {
        console.error('❌ Login error (exception):', error);
        process.exit(1);
    }

    // 2. Create Patient (Simulating Frontend Payload)
    console.log('\n2. Attempting to create patient with STRING date format...');
    const patientPayload = {
        firstName: "Verified",
        lastName: "UserJS",
        dateOfBirth: "1995-05-20",
        gender: "Female",
        phoneNumber: "555-8888",
        address: "789 JS Lane"
    };

    try {
        const createUrl = `${BASE_URL}/patients`;
        console.log(`POST ${createUrl}`);
        const createRes = await fetch(createUrl, {
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
            console.log('   Response Data:', JSON.stringify(data, null, 2));

            // Verify date
            const createdDob = data.dateOfBirth;
            // The backend might return it as a string or Date object JSON format
            if (new Date(createdDob).toISOString().startsWith('1995-05-20')) {
                console.log('✅ Date correctly stored and returned.');
            } else {
                console.warn('⚠️ Date mismatch properly:', createdDob);
            }
        } else {
            const errText = await createRes.text();
            console.log('⚠️ Unexpected status code:', createRes.status, errText.substring(0, 200));
        }

    } catch (error) {
        console.error('❌ Patient creation failed:', error);
    }
}

verifyPatientCreation();
