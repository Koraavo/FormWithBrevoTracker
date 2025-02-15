// Brevo tracking functions
const brevoTracker = {
    identifyContact: function(email, firstname, lastname, phone) {
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

    trackFormSubmission: function(email, firstname, lastname, phone, isSubscribed) {
        const event_name = "formSubmitted";
        const properties = {
            "email": email,
            "FIRSTNAME": firstname,
            "LASTNAME": lastname,
            "phone": phone,
            "subscribed": isSubscribed
        };
        const event_data = {
            "id": "form:" + Date.now(),
            "data": {
                "form_type": "newsletter",
                "url": window.location.href
            }
        };

        Brevo.push([
            "track",
            event_name,
            properties,
            event_data
        ]);
    },

    trackPageVisit: function() {
        const pageTitle = document.title || "Subscription Form";
        Brevo.push([
            "page",
            pageTitle,
            {
                "ma_title": pageTitle,
                "ma_url": window.location.href,
                "ma_path": window.location.pathname
            }
        ]);
    }
};

// API functions
const brevoAPI = {
    updateContact: async function(email, firstname, lastname, phone, isSubscribed) {
        try {
            const response = await fetch('https://api.brevo.com/v3/contacts', {
                method: 'PUT',
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'api-key': 'YOUR-API-KEY'  // Replace with your actual API key
                },
                body: JSON.stringify({
                    email: email,
                    emailBlacklisted: !isSubscribed, // Blacklist only if not subscribed
                    listIds: isSubscribed ? [37] : [4], // Add to list 37 if subscribed
                    attributes: {
                        FIRSTNAME: firstname,
                        LASTNAME: lastname,
                        SMS: phone,
                        WHATSAPP: phone
                    }
                })
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }
            
            return true;
        } catch (error) {
            console.error('Error updating contact:', error);
            return false;
        }
    }
};

// Form handling functions
const formHandler = {
    validateEmail: function(email) {
        return email && email.includes('@');
    },

    parseFullName: function(fullName) {
        const [firstname, ...lastNameParts] = fullName.split(" ");
        const lastname = lastNameParts.join(" ") || "";
        return { firstname, lastname };
    },

    getFormData: function(form) {
        return {
            email: form.querySelector('#email_input')?.value.trim(),
            fullName: form.querySelector('#name_input')?.value.trim(),
            phone: form.querySelector('#telephone_input')?.value.trim(),
            isSubscribed: form.querySelector('#subscribe')?.checked
        };
    },

    resetForm: function(form) {
        form.reset();
        alert("Thank you for your submission!");
    }
};

// Main form submission handler
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
        brevoTracker.identifyContact(
            formData.email, 
            firstname, 
            lastname, 
            formData.phone
        );
        
        // Step 2: Update contact in Brevo API
        const updateSuccess = await brevoAPI.updateContact(
            formData.email,
            firstname,
            lastname,
            formData.phone,
            formData.isSubscribed
        );
        
        if (!updateSuccess) {
            console.warn('Failed to update contact, but continuing with form submission');
        }
        
        // Step 3: Track form submission
        brevoTracker.trackFormSubmission(
            formData.email,
            firstname,
            lastname,
            formData.phone,
            formData.isSubscribed
        );
        
        // Step 4: Reset form
        formHandler.resetForm(event.target);
        
    } catch (error) {
        console.error('Error in form submission:', error);
        alert('There was an error processing your submission. Please try again.');
    }
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    // Set up form submission handler
    const form = document.querySelector('#contact_form');
    if (form) {
        form.addEventListener("submit", handleFormSubmission);
    }
    
    // Track initial page visit
    brevoTracker.trackPageVisit();
});