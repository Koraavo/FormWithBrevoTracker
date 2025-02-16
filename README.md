# FormWithBrevoTracker
Using an already available form to add the functionalities of the tracker to test things

https://koraavo.github.io/FormWithBrevoTracker/

Steps:
- create the form
- in order to make sure that the API key and the ma keys are not directly visible
    - save the API key and the MA key under github repository
    https://github.com/Koraavo/FormWithBrevoTracker/settings/secrets/actions
    Save the keys under Repository secrets.
    Saved the keys as:
    BREVO_API_KEY and BREVO_MA_KEY

- in the static.yml page
added the following code before the page set up so that the necessary keys are derived
    - name: Replace placeholders with secrets
        run: |
          sed -i 's/{{BREVO_MA_KEY}}/${{ secrets.BREVO_MA_KEY }}/g' index.html
          sed -i 's/{{BREVO_API_KEY}}/${{ secrets.BREVO_API_KEY }}/g' app.js

---------------------------------------------------------------------------------------

index.html file
header only uses the tracker basic script with the makey used as a variable

app.js file

## Overview
This JavaScript file (`app.js`) is responsible for handling form submissions, tracking user interactions, and managing contacts using Brevo's API. It consists of several key functionalities:
- **Tracking user actions** (identification, form submission, page visit)
- **Validating and cleaning input data**
- **Creating or updating contacts via Brevo API**
- **Handling form submission logic**
- **Initializing the script when the page loads**

---

## Step-by-Step Execution

### 1. Brevo Tracking Functions
These functions manage interactions with Brevo, such as identifying users, tracking form submissions, and logging page visits.

#### **1.1 Identify Contact**
- When a user submits a form, this function sends their details (email, name, phone number) to Brevo.
- **Code:**
  ```js
  brevoTracker.identifyContact(email, firstname, lastname, phone);
  ```

#### **1.2 Track Form Submission**
- Logs form submissions as an event in Brevo.
- Stores details such as email, name, phone, and subscription status.
- **Code:**
  ```js
  brevoTracker.trackFormSubmission(email, firstname, lastname, phone, isSubscribed);
  ```

#### **1.3 Track Page Visit**
- Captures page visit details like title and URL.
- Triggered when the page loads.
- **Code:**
  ```js
  brevoTracker.trackPageVisit();
  ```

---

### 2. Cleaning the Phone Number
Since Brevo requires phone numbers in a standardized format (without non-numeric characters), the function `cleanPhoneNumber(phone)`:
- Removes non-numeric characters.
- Issues a warning if the phone number starts with `0` or is too short.
- **Code:**
  ```js
  const cleanedPhone = cleanPhoneNumber(phone);
  ```

---

### 3. Creating or Updating a Contact
The function `createContact(email, firstname, lastname, phone, isSubscribed)`:
- Calls Brevo API (`POST /contacts`) to create or update a contact.
- Uses `cleanPhoneNumber()` to ensure a valid phone number format.
- Assigns the user to a mailing list based on their subscription status.
- Handles errors and logs failed attempts.
- **Code:**
  ```js
  await createContact(email, firstname, lastname, phone, isSubscribed);
  ```

---

### 4. Form Handling Functions
The `formHandler` object processes form input and validates user entries.

#### **4.1 Validate Email**
Checks whether an email contains `@` to ensure it's correctly formatted.
- **Code:**
  ```js
  formHandler.validateEmail(formData.email);
  ```

#### **4.2 Parse Full Name**
Splits the full name input into `firstname` and `lastname`.
- **Code:**
  ```js
  const { firstname, lastname } = formHandler.parseFullName(formData.fullName);
  ```

#### **4.3 Get Form Data**
Retrieves values from form fields and trims whitespace.
- **Code:**
  ```js
  const formData = formHandler.getFormData(event.target);
  ```

#### **4.4 Reset Form**
Clears all form fields and displays a success alert.
- **Code:**
  ```js
  formHandler.resetForm(event.target);
  ```

---

### 5. Handling Form Submission
The function `handleFormSubmission(event)`:
- Prevents default form submission.
- Retrieves, validates, and processes form data.
- Calls:
  - `brevoTracker.identifyContact()` (to track the user)
  - `createContact()` (to update Brevo database)
  - `brevoTracker.trackFormSubmission()` (to log the event)
  - `formHandler.resetForm()` (to clear the form)
- **Code:**
  ```js
  handleFormSubmission(event);
  ```

---

### 6. Initializing the Script
When the page loads, `DOMContentLoaded` triggers:
- Form event listener for submission handling.
- `brevoTracker.trackPageVisit()` to log page views.
- **Code:**
  ```js
  document.addEventListener("DOMContentLoaded", function () {
      const form = document.querySelector("#contact_form");
      if (form) {
          form.addEventListener("submit", handleFormSubmission);
      }
      brevoTracker.trackPageVisit();
  });
  ```

---

## Summary of Execution Flow
1. **Page loads** → Tracks visit (`trackPageVisit`).
2. **User submits form** → `handleFormSubmission()` triggers.
3. **Form data is retrieved and validated.**
4. **User is identified in Brevo** (`identifyContact`).
5. **Contact is created/updated** via `createContact`.
6. **Form submission is tracked** (`trackFormSubmission`).
7. **Form is reset** and success message is shown.

This ensures seamless user tracking, data management, and a smooth UX for form submissions.



