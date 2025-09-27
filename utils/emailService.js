import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (options) => {

  // --- START DIAGNOSTIC LOGS ---
  console.log('--- Nodemailer Configuration ---');
  console.log('Host:', process.env.EMAIL_HOST);
  console.log('Port:', process.env.EMAIL_PORT);
  console.log('User:', process.env.EMAIL_USER);
  // Do NOT log the password, just check if it exists
  console.log('Password Set:', !!process.env.EMAIL_PASS); 
  console.log('------------------------------');
  // --- END DIAGNOSTIC LOGS ---
  // Use port 465 for a secure SSL connection
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 465, // Default to 465
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // This MUST be your App Password
    },
  });

  const mailOptions = {
    from: `"TileCraft" <${process.env.EMAIL_FROM}>`, // A better "from" format
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
