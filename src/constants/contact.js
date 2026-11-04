// Company contact details shown on the form page (FAQ "Still have a question?" box and footer).
// Keep the numbers the same as COMPANY.phones in backend/src/utils/mailer.js
export const COMPANY_NAME = 'Maxgen Technologies Pvt. Ltd.';

export const OFFICE_ADDRESS =
  'Abhijeet 3, 603, Netaji Rd, near Pantaloons, Mithakhali, Ellisbridge, Ahmedabad, Gujarat 380006';

export const OFFICE_MAP_LINK =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('Maxgen Technologies, Abhijeet 3, Netaji Rd, Mithakhali, Ellisbridge, Ahmedabad');

// display: how it is shown, number: for tel: and WhatsApp links (country code, no +)
export const INQUIRY_PHONES = [
  { display: '+91 90990 39845', number: '919099039845' },
  { display: '+91 90821 45541', number: '919082145541' },
  { display: '+91 70434 04169', number: '917043404169' },
];

// Ready text when a student opens WhatsApp from the form page
export const WHATSAPP_HELLO = 'Hello Maxgen Technologies, I have a question about the internship.';
