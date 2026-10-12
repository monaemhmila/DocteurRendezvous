import { Request, Response } from "express";
import nodemailer from "nodemailer";

export const requestSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, country, plan, message } = req.body;

    if (!name || !email || !plan) {
      res.status(400).json({ error: "Missing required fields (name, email, plan)" });
      return;
    }

    const user = process.env.EMAIL_USER || "dummy_user";
    const pass = process.env.EMAIL_PASS || "dummy_pass";
    const host = process.env.EMAIL_HOST || "smtp.ethereal.email";
    const port = Number(process.env.EMAIL_PORT) || 587;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from: `"Medical AI Subscriptions" <${user}>`,
      to: "mohamedjasserbensmida@gmail.com",
      subject: `Nouvelle demande d'abonnement : ${plan}`,
      text: `Nouvelle demande d'abonnement reçue !
        
Plan sélectionné : ${plan}
Nom : ${name}
Email : ${email}
Téléphone : ${phone || "Non renseigné"}
Pays : ${country || "Non renseigné"}
        
Message / Demande :
${message || "Aucun message spécifique."}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Subscription email sent successfully to mohamedjasserbensmida@gmail.com");
    } catch (mailError) {
      console.error("Failed to send email. Either credentials are wrong or not configured in .env:", mailError);
    }

    res.status(200).json({ success: true, message: "Subscription request received" });
  } catch (error) {
    console.error("Error in requestSubscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
