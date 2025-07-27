const nodemailer = require("nodemailer");

exports.sendEmail = (toEmail, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // You can use other services too
    auth: {
      user: process.env.EMAIL, // Your email (e.g., youremail@gmail.com)
      pass: process.env.EMAIL_PASSWORD, // Your email password or an app password if 2FA is enabled
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: toEmail,
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email: ", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

