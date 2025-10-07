# Privacy Policy for EPSM (Energy Performance Simulation Manager)

**Last Updated:** 7 October 2025  
**Service Provider:** Chalmers University of Technology  
**Service URL:** https://epsm.chalmers.se  
**Contact:** sanjay.somanath@chalmers.se

---

## 1. Introduction

This Privacy Policy describes how the Energy Performance Simulation Manager (EPSM) service collects, uses, and protects your personal information when you use our service.

EPSM is operated by Chalmers University of Technology for research and education purposes in the field of building energy performance simulation.

---

## 2. Service Description

EPSM is a web-based platform that enables researchers, students, and building professionals to:
- Manage building energy simulation projects
- Run EnergyPlus simulations for building performance analysis
- Create and evaluate energy renovation scenarios
- Analyze simulation results with interactive visualizations
- Collaborate on building stock optimization studies

---

## 3. Legal Basis for Processing

We process your personal data based on:
- **Legitimate Interest:** To provide you with access to EPSM for research and educational purposes
- **Consent:** By logging into EPSM, you consent to the processing of your personal data as described in this policy
- **Legal Obligation:** To comply with Swedish data protection law (GDPR)

---

## 4. Personal Data We Collect

EPSM receives the following attributes from Chalmers Identity Provider (IdP) via SAML authentication when you log in:

### 4.1 Required Attributes (REFEDS Personalized Access)

| Attribute | Purpose | Example |
|-----------|---------|---------|
| **samlSubjectID** or **eduPersonPrincipalName** | Unique user identifier | `ssanjay@chalmers.se` |
| **mail** | Email address for notifications and account recovery | `sanjay.somanath@chalmers.se` |
| **displayName** or **givenName + sn** | User's name for display in the interface | `Sanjay Somanath` |
| **eduPersonScopedAffiliation** | Organizational affiliation (student/staff/faculty) | `staff@chalmers.se` |
| **schacHomeOrganization** | Home organization identifier | `chalmers.se` |
| **eduPersonAssurance** | Identity assurance level (optional) | `http://www.swamid.se/policy/assurance/al2` |

### 4.2 Data Generated During Service Use

In addition to the attributes received from the IdP, EPSM collects and stores:

- **Simulation Projects:** Building models, simulation parameters, and configurations you create
- **Uploaded Files:** IDF (EnergyPlus Input) and EPW (weather data) files
- **Simulation Results:** Energy consumption data, environmental impact calculations, and cost analysis
- **Usage Logs:** Login timestamps, simulation job history, and error logs (for troubleshooting)
- **Session Data:** Browser session information for authentication state management

---

## 5. How We Use Your Personal Data

We use your personal information **only** for the following purposes:

1. **User Account Management**
   - Create and maintain your EPSM user account
   - Authenticate you when you log in
   - Display your name in the user interface

2. **Service Functionality**
   - Associate simulation projects with your account
   - Track simulation jobs you submit
   - Store and display your simulation results
   - Enable project organization and management

3. **Collaboration Features**
   - Show project ownership (who created a simulation)
   - Display modification history (who last edited a project)
   - Enable sharing of results with other authenticated users (future feature)

4. **System Administration**
   - Monitor service usage and performance
   - Troubleshoot technical issues
   - Ensure system security and prevent abuse

5. **Communication**
   - Send notifications about simulation job completion
   - Notify you of important service updates or maintenance
   - Respond to your support requests

**Data Minimization Commitment:** We only collect and process the minimum personal data necessary to provide EPSM's functionality. We do not use your data for marketing, profiling, or any purpose not listed above.

---

## 6. Data Sharing and Disclosure

### 6.1 Internal Sharing

Your personal data is accessible to:
- **EPSM System Administrators:** For technical support and system maintenance
- **Principal Investigator:** Alexander Hollberg (alexander.hollberg@chalmers.se) for project oversight
- **Chalmers IT:** For infrastructure support and security monitoring

### 6.2 External Sharing

We **do not** share your personal data with third parties except:
- **When legally required:** To comply with Swedish law or court orders
- **With your explicit consent:** If you choose to share simulation results externally

### 6.3 International Transfers

EPSM is hosted on infrastructure within Sweden (Chalmers University). Your data **does not leave the European Economic Area (EEA)**.

---

## 7. Data Retention

| Data Type | Retention Period | Justification |
|-----------|------------------|---------------|
| **User Account Information** | Duration of your affiliation with Chalmers + 1 year | To allow alumni access for ongoing research |
| **Simulation Projects and Results** | 3 years after last access | For research reproducibility and archival |
| **Usage Logs** | 1 year | For security auditing and troubleshooting |
| **Session Data** | 30 days after session expiry | For authentication state management |

After the retention period, data is permanently deleted unless required for legal or archival purposes.

---

## 8. Data Security

We implement appropriate technical and organizational measures to protect your personal data:

### 8.1 Technical Measures
- **Encryption:** HTTPS/TLS encryption for all data in transit
- **Access Control:** Role-based access control (RBAC) for user data
- **Authentication:** SAML-based single sign-on with Chalmers IdP
- **Database Security:** Encrypted database connections, regular backups
- **Containerization:** Docker isolation for application components

### 8.2 Organizational Measures
- **Limited Access:** Only authorized administrators can access user data
- **Logging and Monitoring:** Security event logging for incident response
- **Regular Updates:** Security patches applied promptly
- **Incident Response:** Procedures in place for data breach notification

---

## 9. Your Rights (GDPR)

Under the General Data Protection Regulation (GDPR), you have the following rights:

1. **Right to Access:** Request a copy of your personal data we hold
2. **Right to Rectification:** Correct inaccurate or incomplete data
3. **Right to Erasure ("Right to be Forgotten"):** Request deletion of your account and data
4. **Right to Restriction:** Limit how we process your data
5. **Right to Data Portability:** Receive your data in a machine-readable format
6. **Right to Object:** Object to processing based on legitimate interest
7. **Right to Withdraw Consent:** Withdraw consent at any time (results in account deletion)

### How to Exercise Your Rights

Contact the EPSM team at: **sanjay.somanath@chalmers.se**

We will respond to your request within **30 days** as required by GDPR.

---

## 10. Cookies and Tracking

EPSM uses the following cookies:

| Cookie Name | Purpose | Type | Duration |
|-------------|---------|------|----------|
| `sessionid` | Maintain your login session | Essential | 30 days |
| `csrftoken` | Prevent cross-site request forgery attacks | Essential | 1 year |
| `saml_session` | SAML authentication state | Essential | Session |

We **do not use** tracking cookies, analytics cookies, or advertising cookies.

---

## 11. Children's Privacy

EPSM is intended for use by university students, researchers, and professionals. We do not knowingly collect data from individuals under 16 years of age. If you believe a child has provided personal data to EPSM, please contact us immediately.

---

## 12. Changes to This Privacy Policy

We may update this Privacy Policy to reflect changes in our practices or legal requirements. When we make significant changes, we will:
- Update the "Last Updated" date at the top of this document
- Notify active users via email
- Display a prominent notice on the EPSM login page

Continued use of EPSM after changes constitutes acceptance of the updated policy.

---

## 13. Compliance and Supervisory Authority

EPSM complies with:
- **GDPR** (Regulation EU 2016/679)
- **Swedish Data Protection Act** (SFS 2018:218)
- **REFEDS Personalized Access Entity Category** requirements
- **Chalmers University data protection policies**

### Data Protection Officer (DPO)

**Chalmers Data Protection Officer**  
Email: dataskyddsombud@chalmers.se  
Phone: +46 31 772 1000

### Supervisory Authority

If you are not satisfied with our response to your data protection concerns, you may lodge a complaint with:

**Swedish Authority for Privacy Protection (IMY)**  
Website: https://www.imy.se  
Email: imy@imy.se  
Phone: +46 8 657 6100

---

## 14. Contact Information

### Service Provider

**Chalmers University of Technology**  
Department of Architecture and Civil Engineering  
Division of Building Technology  
SE-412 96 Gothenburg, Sweden

### EPSM Service Contacts

- **Technical Support:** sanjay.somanath@chalmers.se
- **Principal Investigator:** Alexander Hollberg (alexander.hollberg@chalmers.se)
- **Chalmers IT Support:** support@chalmers.se, +46 31 772 6000
- **Security/Abuse Reports:** abuse@chalmers.se, +46 31 772 8450

---

## 15. Acknowledgments

This privacy policy is based on the SWAMID Service Provider Privacy Policy Template and adheres to the requirements of the REFEDS Personalized Access Entity Category.

**Funding:** This service is supported by the Swedish Energy Agency (Project ID P2024-04053).

---

**Document Version:** 1.0  
**Effective Date:** 7 October 2025  
**Entity Category:** REFEDS Personalized Access (https://refeds.org/category/personalized)
