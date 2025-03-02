const TRANSACTIONAL_TEMPLATE_ID = 116;
const WEBHOOK_URL = "https://webhookbrevo.kinjalvoraa.workers.dev/";
const SENDER = "kinjal.vora@sendinblue.com";
let API_KEY = "";
let MA_KEY = "";


// 1️⃣ Fetch API and MA Keys Securely
async function fetchKeys() {
    try {
        const [apiResponse, maResponse] = await Promise.all([
            fetch("https://webhookbrevo.kinjalvoraa.workers.dev/get-brevo-key"),
            fetch("https://webhookbrevo.kinjalvoraa.workers.dev/get-ma-key")
        ]);
        
        const apiData = await apiResponse.json();
        const maData = await maResponse.json();
        
        API_KEY = apiData.key;
        MA_KEY = maData.key;
        
        initializeBrevoTracking();
        initializeFormHandling();
    } catch (error) {
        console.error("❌ Error fetching API or MA key:", error);
    }
}

// 2️⃣ Initialize Brevo Tracking with Secure MA Key
function initializeBrevoTracking() {
    window.Brevo = window.Brevo || [];
    Brevo.push(["init", { client_key: MA_KEY }]);
    brevoTracker.trackPageVisit();
}

// 3️⃣ Initialize Form Handling
function initializeFormHandling() {
    const form = document.querySelector("#contact_form");
    if (form) {
        form.addEventListener("submit", handleFormSubmission);
    }
}

// 4️⃣ Main Form Submission Handler
async function handleFormSubmission(event) {
    event.preventDefault();
    const formData = formHandler.getFormData(event.target);

    if (!formHandler.validateEmail(formData.email)) {
        alert("Please enter a valid email address.");
        return;
    }

    const { firstname, lastname } = formHandler.parseFullName(formData.fullName);

    try {
        brevoTracker.identifyContact(formData.email, firstname, lastname, formData.phone);
        
        const success = await createContactOrSendEmail(formData.email, firstname, lastname, formData.phone, formData.isSubscribed);
        if (!success) console.warn("⚠️ Failed to create/update contact");

        brevoTracker.trackFormSubmission(formData.email, firstname, lastname, formData.phone, formData.isSubscribed);
        formHandler.resetForm(event.target);
    } catch (error) {
        console.error("❌ Error in form submission:", error);
        alert("There was an error processing your submission. Please try again.");
    }
}


// 5️⃣ Brevo Tracking Functions
const brevoTracker = {
    identifyContact: function (email, firstname, lastname, phone) {
        Brevo.push(function () {
            Brevo.identify({
                identifiers: { email_id: email },
                attributes: { FIRSTNAME: firstname, LASTNAME: lastname, SMS: phone, WHATSAPP: phone }
            });
        });
    },
    trackFormSubmission: function (email, firstname, lastname, phone, isSubscribed) {
        Brevo.push(["track", "formSubmitted", { email, FIRSTNAME: firstname, LASTNAME: lastname, phone, subscribed: isSubscribed }]);
    },
    trackPageVisit: function () {
        Brevo.push(["page", document.title || "Subscription Form", { ma_url: window.location.href }]);
    }
};

// 6️⃣ Brevo API Integration
async function createContactOrSendEmail(email, firstname, lastname, phone, isSubscribed) {
    try {
        if (isSubscribed) {
            await sendTransactionalEmail(email, firstname, lastname);
            console.log("✅ Transactional email sent instead of adding to list 37.");
        } else {
            await fetch("https://api.brevo.com/v3/contacts", {
                method: "POST",
                headers: { accept: "application/json", "content-type": "application/json", "api-key": API_KEY },
                body: JSON.stringify({
                    email, emailBlacklisted: !isSubscribed, smsBlacklisted: phone === "", updateEnabled: true,
                    listIds: [4], attributes: { FIRSTNAME: firstname, LASTNAME: lastname, SMS: phone || null, WHATSAPP: phone || null }
                })
            });
            console.log("✅ Contact added to list 4.");
        }
    } catch (error) {
        console.error("❌ Error creating contact or sending email:", error);
    }
}

// 7️⃣ Send Transactional Email
async function sendTransactionalEmail(email, firstname, lastname) {
    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: { accept: "application/json", "content-type": "application/json", "api-key": API_KEY },
            body: JSON.stringify({
                sender: { email: SENDER, name: "Kinjal-Brevo" },
                to: [{ email: email, name: `${firstname} ${lastname}` }],
                templateId: TRANSACTIONAL_TEMPLATE_ID,
                params: { FIRSTNAME: firstname, LASTNAME: lastname }
            })
        });
        if (!response.ok) throw new Error(await response.text());
        console.log("✅ Transactional email sent successfully!");
    } catch (error) {
        console.error("❌ Error sending transactional email:", error);
    }
}

// 8️⃣ Helper Functions
const formHandler = {
    validateEmail: email => email && email.includes("@"),
    parseFullName: fullName => {
        const [firstname, ...lastNameParts] = fullName.split(" ");
        return { firstname, lastname: lastNameParts.join(" ") || "" };
    },
    cleanPhoneNumber: phone => phone ? phone.replace(/\D/g, "") : "",
    getFormData: form => ({
        email: form.querySelector("#email_input")?.value.trim(),
        fullName: form.querySelector("#name_input")?.value.trim(),
        phone: formHandler.cleanPhoneNumber(form.querySelector("#telephone_input")?.value.trim()),
        isSubscribed: form.querySelector("#subscribe")?.checked
    }),
    resetForm: form => { form.reset(); alert("Thank you for your submission!"); }
};

// 9️⃣ Start Fetching API & MA Keys
fetchKeys();