const API_KEY = "{{BREVO_API_KEY}}";
const TRANSACTIONAL_TEMPLATE_ID = 116;
const WEBHOOK_URL = "https://webhookbrevo.kinjalvoraa.workers.dev/";

// 1. Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("#contact_form");
    if (form) {
        form.addEventListener("submit", handleFormSubmission);
    }

    // Track initial page visit
    brevoTracker.trackPageVisit();
});


// 2. Main Form Submission Handler
async function handleFormSubmission(event) {
    event.preventDefault();

    // Get form data
    const formData = formHandler.getFormData(event.target);

    // Validate email
    if (!formHandler.validateEmail(formData.email)) {
        alert("Please enter a valid email address.");
        return;
    }

    // Parse name
    const { firstname, lastname } = formHandler.parseFullName(formData.fullName);

    try {
        // Step 1: Identify contact in Brevo tracker
        brevoTracker.identifyContact(formData.email, firstname, lastname, formData.phone);

        // Step 2: Create or update contact in Brevo API
        const success = await createContact(formData.email, firstname, lastname, formData.phone, formData.isSubscribed);

        if (!success) {
            console.warn("Failed to create/update contact, but continuing with form submission");
        }

        // Step 3: Track form submission
        brevoTracker.trackFormSubmission(formData.email, firstname, lastname, formData.phone, formData.isSubscribed);

        // Step 4: Reset form
        formHandler.resetForm(event.target);
    } catch (error) {
        console.error("Error in form submission:", error);
        alert("There was an error processing your submission. Please try again.");
    }
}

// 3. Brevo Tracking Functions
const brevoTracker = {
    identifyContact: function (email, firstname, lastname, phone) {
        Brevo.push(function () {
            Brevo.identify({
                identifiers: { email_id: email },
                attributes: {
                    FIRSTNAME: firstname,
                    LASTNAME: lastname,
                    SMS: phone,
                    WHATSAPP: phone
                }
            });
        });
    },

    trackFormSubmission: function (email, firstname, lastname, phone, isSubscribed) {
        const event_name = "formSubmitted";
        const properties = {
            email: email,
            FIRSTNAME: firstname,
            LASTNAME: lastname,
            phone: phone,
            subscribed: isSubscribed
        };
        const event_data = {
            id: "form:" + Date.now(),
            data: {
                form_type: "newsletter",
                url: window.location.href
            }
        };

        Brevo.push(["track", event_name, properties, event_data]);
    },

    trackPageVisit: function () {
        const pageTitle = document.title || "Subscription Form";
        Brevo.push([
            "page",
            pageTitle,
            {
                ma_title: pageTitle,
                ma_url: window.location.href,
                ma_path: window.location.pathname
            }
        ]);
    }
};

// 4. Brevo API Integration
async function createContactOrSendEmail(email, firstname, lastname, phone, isSubscribed) {
    try {
        if (isSubscribed) {
            // Send a transactional email instead of adding to list 37
            await sendTransactionalEmail(email, firstname, lastname);
            console.log("Transactional email sent instead of adding to list 37.");
        } else {
            // Add contact to list 4
            await fetch("https://api.brevo.com/v3/contacts", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "content-type": "application/json",
                    "api-key": API_KEY
                },
                body: JSON.stringify({
                    email,
                    emailBlacklisted: !isSubscribed,
                    smsBlacklisted: phone === "",
                    updateEnabled: true,
                    listIds: [4],
                    attributes: { FIRSTNAME: firstname, LASTNAME: lastname, SMS: phone || null, WHATSAPP: phone || null }
                })
            });
            console.log("Contact added to list 4.");
        }
    } catch (error) {
        console.error("Error creating contact or sending email:", error);
    }
}

// 5. Send Transactional Email
async function sendTransactionalEmail(email, firstname, lastname) {
    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                "api-key": API_KEY
            },
            body: JSON.stringify({
                sender: { email: "kinjal.vora@sendinblue.com", name: "Kinjal-Brevo" },
                to: [{ email: email, name: `${firstname} ${lastname}` }],
                templateId: TRANSACTIONAL_TEMPLATE_ID,
                params: { FIRSTNAME: firstname, LASTNAME: lastname }
            })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        console.log("Transactional email sent successfully!");
    } catch (error) {
        console.error("Error sending transactional email:", error);
    }
}

// 6. Listen for Webhook Events
async function listenForWebhookEvents() {
    try {
        const response = await fetch(WEBHOOK_URL);
        const events = await response.json();
        
        events.forEach(async (webhookevent) => {
            if (
                webhookevent.event === "click" &&
                webhookevent.email &&
                webhookevent.tags.includes("DOI") && webhookevent.tags.includes("optin") &&
                webhookevent.link === "https://koraavo.github.io/TigersWithAccessibility/"
            ) {
                await addToList37(webhookevent.email);
            }
        });
    } catch (error) {
        console.error("Error fetching webhook data:", error);
    }
}

// 7. Add Contact to List 37
async function addToList37(email) {
    try {
        await fetch("https://api.brevo.com/v3/contacts", {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                "api-key": API_KEY
            },
            body: JSON.stringify({
                email,
                updateEnabled: true,
                listIds: [37]
            })
        });

        console.log("Contact added to list 37.");
    } catch (error) {
        console.error("Error adding contact to list 37:", error);
    }
}

// 5. Helper Functions
const formHandler = {
    validateEmail: function (email) {
        return email && email.includes("@");
    },

    parseFullName: function (fullName) {
        const [firstname, ...lastNameParts] = fullName.split(" ");
        const lastname = lastNameParts.join(" ") || "";
        return { firstname, lastname };
    },

    cleanPhoneNumber: function (phone) {
        if (!phone) return "";
        
        // Remove all non-numeric characters
        let cleanedPhone = phone.replace(/\D/g, "");

        // Log a warning if the phone number seems too short
        if (cleanedPhone.length < 10) {
            console.warn("Phone number may be too short:", cleanedPhone);
        }

        return cleanedPhone;
    },

    getFormData: function (form) {
        return {
            email: form.querySelector("#email_input")?.value.trim(),
            fullName: form.querySelector("#name_input")?.value.trim(),
            phone: formHandler.cleanPhoneNumber(form.querySelector("#telephone_input")?.value.trim()), 
            isSubscribed: form.querySelector("#subscribe")?.checked
        };
    },

    resetForm: function (form) {
        form.reset();
        alert("Thank you for your submission!");
    }
};
